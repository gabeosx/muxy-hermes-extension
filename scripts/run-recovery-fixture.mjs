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

function closeServer(server) { return new Promise((resolve) => server.close(() => resolve())); }

/** Test-only loopback relay. It never writes request/response data to disk or stdout. */
export async function startRecoveryProxy({ upstream, runId } = {}) {
  const target = parseLoopbackUpstream(upstream);
  const safeId = safeRunId(runId);
  const eventsPath = `/v1/runs/${safeId}/events`;
  let interrupted = false;
  let forwardedSubscriptions = 0;
  let buffered = false;
  const server = createServer((incoming, outgoing) => {
    if (!incoming.url?.startsWith("/v1/") || incoming.url.includes("..") || incoming.method === "CONNECT") {
      outgoing.writeHead(404, { Connection: "close" }).end();
      return;
    }
    const isEvents = incoming.method === "GET" && incoming.url === eventsPath;
    if (isEvents) forwardedSubscriptions += 1;
    const upstreamRequest = requestHttp({
      hostname: target.hostname,
      port: target.port,
      method: incoming.method,
      path: incoming.url,
      headers: incoming.headers,
    }, (upstreamResponse) => {
      outgoing.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      if (!isEvents || interrupted) {
        upstreamResponse.pipe(outgoing);
        return;
      }
      let cut = false;
      upstreamResponse.on("data", (chunk) => {
        if (cut) return;
        outgoing.write(chunk);
        cut = true;
        interrupted = true;
        upstreamResponse.destroy();
        outgoing.end();
      });
      upstreamResponse.on("end", () => { if (!cut) outgoing.end(); });
      upstreamResponse.on("error", () => { if (!outgoing.writableEnded) outgoing.end(); });
    });
    upstreamRequest.on("error", () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(upstreamRequest);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = server.address().port;
  return Object.freeze({
    url: `http://127.0.0.1:${port}`,
    observation: () => Object.freeze({ interrupted, forwardedSubscriptions, buffered }),
    close: () => closeServer(server),
  });
}
