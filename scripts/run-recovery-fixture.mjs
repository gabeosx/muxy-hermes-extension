import { createServer, request as requestHttp } from "node:http";

function parseLoopbackUpstream(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("recovery_proxy_upstream_unsafe"); }
  if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("recovery_proxy_upstream_unsafe");
  }
  return parsed;
}

function safeRunId(value) {
  if (typeof value !== "string" || !/^run_[A-Za-z0-9_-]{3,120}$/.test(value)) throw new Error("recovery_proxy_run_id_invalid");
  return value;
}

function closeServer(server, sockets, upstreamRequests, timers) {
  return new Promise((resolve) => {
    server.close(() => resolve());
    for (const timer of timers) clearTimeout(timer);
    for (const request of upstreamRequests) request.destroy();
    for (const socket of sockets) socket.destroy();
  });
}

function allowedFixtureRoute(method, pathname, learnedRunId) {
  if (pathname === "/v1/capabilities") return method === "GET" || method === "OPTIONS";
  if (pathname === "/v1/runs") return method === "POST" || method === "OPTIONS";
  if (!learnedRunId) return false;
  if (pathname === `/v1/runs/${learnedRunId}` || pathname === `/v1/runs/${learnedRunId}/events`) return method === "GET" || method === "OPTIONS";
  return false;
}

/** Test-only loopback relay. It never writes request/response data to disk or stdout. */
export async function startRecoveryProxy({ upstream, runId, bufferFirstEventsMs = 0 } = {}) {
  const target = parseLoopbackUpstream(upstream);
  if (!Number.isInteger(bufferFirstEventsMs) || bufferFirstEventsMs < 0 || bufferFirstEventsMs > 5_000) throw new Error("recovery_proxy_buffer_invalid");
  let learnedRunId = runId == null ? null : safeRunId(runId);
  let interrupted = false;
  let forwardedSubscriptions = 0;
  let buffered = false;
  const sockets = new Set();
  const upstreamRequests = new Set();
  const timers = new Set();
  const server = createServer((incoming, outgoing) => {
    let requestUrl;
    try { requestUrl = new URL(incoming.url, "http://fixture.invalid"); } catch { requestUrl = null; }
    const pathname = requestUrl?.pathname;
    if (!requestUrl || incoming.url.includes("..") || requestUrl.search || requestUrl.hash || !allowedFixtureRoute(incoming.method, pathname, learnedRunId)) {
      outgoing.writeHead(404, { Connection: "close" }).end();
      return;
    }
    const eventsPath = learnedRunId ? `/v1/runs/${learnedRunId}/events` : null;
    const isEvents = incoming.method === "GET" && pathname === eventsPath;
    const isRunSubmission = incoming.method === "POST" && pathname === "/v1/runs" && learnedRunId === null;
    if (isEvents) forwardedSubscriptions += 1;
    const upstreamRequest = requestHttp({
      hostname: target.hostname,
      port: target.port,
      method: incoming.method,
      path: incoming.url,
      headers: incoming.headers,
    }, (upstreamResponse) => {
      outgoing.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      if (isRunSubmission) {
        const chunks = [];
        let size = 0;
        upstreamResponse.on("data", (chunk) => {
          size += chunk.length;
          if (size <= 64 * 1024) chunks.push(chunk);
          outgoing.write(chunk);
        });
        upstreamResponse.on("end", () => {
          if (size <= 64 * 1024) {
            try { learnedRunId = safeRunId(JSON.parse(Buffer.concat(chunks).toString("utf8")).run_id); } catch { /* fail closed: no interruption target */ }
          }
          outgoing.end();
        });
        upstreamResponse.on("error", () => { if (!outgoing.writableEnded) outgoing.end(); });
        return;
      }
      if (!isEvents || interrupted) {
        upstreamResponse.pipe(outgoing);
        return;
      }
      let cut = false;
      upstreamResponse.on("data", (chunk) => {
        if (cut) return;
        cut = true;
        const forwardAndCut = () => {
          if (bufferFirstEventsMs > 0) buffered = true;
          if (!outgoing.writableEnded) outgoing.write(chunk);
          interrupted = true;
          upstreamResponse.destroy();
          outgoing.end();
        };
        if (bufferFirstEventsMs > 0) {
          upstreamResponse.pause();
          const timer = setTimeout(() => { timers.delete(timer); forwardAndCut(); }, bufferFirstEventsMs);
          timers.add(timer);
        } else forwardAndCut();
      });
      upstreamResponse.on("end", () => { if (!cut) outgoing.end(); });
      upstreamResponse.on("error", () => { if (!outgoing.writableEnded) outgoing.end(); });
    });
    upstreamRequests.add(upstreamRequest);
    upstreamRequest.once("close", () => upstreamRequests.delete(upstreamRequest));
    upstreamRequest.on("error", () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(upstreamRequest);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = server.address().port;
  return Object.freeze({
    url: `http://127.0.0.1:${port}`,
    observation: () => Object.freeze({ interrupted, forwardedSubscriptions, buffered }),
    close: () => closeServer(server, sockets, upstreamRequests, timers),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    if (process.argv[2] !== "--serve" || process.argv.length !== 3) throw new Error("recovery_proxy_mode_invalid");
    const proxy = await startRecoveryProxy({ upstream: process.env.RECOVERY_PROXY_UPSTREAM });
    process.stdout.write(`${JSON.stringify({ status: "ready", url: proxy.url })}\n`);
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
    process.stdout.write(`${JSON.stringify({ status: "stopping", observation: proxy.observation() })}\n`);
    await proxy.close();
  } catch (error) {
    process.stderr.write(`${/^recovery_proxy_/.test(error?.message ?? "") ? error.message : "recovery_proxy_failed"}\n`);
    process.exitCode = 1;
  }
}
