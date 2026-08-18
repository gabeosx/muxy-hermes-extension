import { createHash, randomBytes } from "node:crypto";
import { createServer, request as requestHttp } from "node:http";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildBearerConfig } from "../src/curl-relay.js";

const RECEIPT_DIGEST = /^sha256:[a-f0-9]{64}$/;
const PANEL_DIGEST = /^[a-f0-9]{64}$/;
const DOCKER_SIGNATURES = Object.freeze(["buffered_or_delayed", "observer_interrupted", "observer_restored", "refused_or_unreachable"]);

function recoveryFailure(code) { throw new Error(`recovery_${code}`); }

function exact(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) recoveryFailure(code);
  return value;
}

function digest(value) {
  if (typeof value !== "string" || !RECEIPT_DIGEST.test(value)) recoveryFailure("digest_invalid");
  return value;
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function digestReceipt(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }

function signatures(value) {
  if (!Array.isArray(value) || value.length !== DOCKER_SIGNATURES.length) recoveryFailure("signatures_invalid");
  const normalized = [...value].sort();
  if (normalized.join("\0") !== DOCKER_SIGNATURES.join("\0")) recoveryFailure("signatures_invalid");
  return normalized;
}

function validateConnectionReceipt(value) {
  exact(value, ["version", "challengeDigest", "panelDigest", "sessionOrdinal", "outcomes"], "connection_receipt_invalid");
  if (value.version !== 1 || value.sessionOrdinal !== 1 || !PANEL_DIGEST.test(value.challengeDigest) || !PANEL_DIGEST.test(value.panelDigest)) recoveryFailure("connection_receipt_invalid");
  exact(value.outcomes, ["relay", "authentication", "capabilities", "stream", "cleanup", "digests"], "connection_receipt_invalid");
  if (![value.outcomes.relay, value.outcomes.authentication, value.outcomes.capabilities, value.outcomes.stream, value.outcomes.cleanup].every((outcome) => outcome === "passed")) recoveryFailure("connection_receipt_invalid");
  exact(value.outcomes.digests, ["execution", "timing", "frames", "cleanup"], "connection_receipt_invalid");
  if (!Object.values(value.outcomes.digests).every((item) => PANEL_DIGEST.test(item))) recoveryFailure("connection_receipt_invalid");
  return value;
}

function validateChallenge(value) {
  exact(value, ["version", "nonce", "expiresAt", "expectedCondition", "expectedLifecycle", "expectedSignatures", "challengeDigest"], "challenge_invalid");
  if (value.version !== 1 || typeof value.nonce !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(value.nonce)
    || typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt))
    || value.expectedCondition !== "docker_published_loopback" || value.expectedLifecycle !== "same_panel") recoveryFailure("challenge_invalid");
  signatures(value.expectedSignatures);
  digest(value.challengeDigest);
  return value;
}

function validateRecoveryReceipt(value, challenge) {
  exact(value, ["version", "challengeDigest", "panelDigest", "lifecycle", "observerAttempts", "statusClass", "signatures", "outcomeDigests"], "receipt_invalid");
  if (value.version !== 1 || value.challengeDigest !== challenge.challengeDigest || !RECEIPT_DIGEST.test(value.panelDigest)
    || value.lifecycle !== "same_panel" || value.observerAttempts < 1 || value.observerAttempts > 2 || value.statusClass !== "terminal") recoveryFailure("receipt_invalid");
  signatures(value.signatures);
  exact(value.outcomeDigests, ["recovery", "status"], "receipt_invalid");
  digest(value.outcomeDigests.recovery); digest(value.outcomeDigests.status);
  return value;
}

/** Reduces a transient curl process result to the one safe refusal signature. */
export function normalizeRefusalOutcome(result) {
  if (result?.exitCode === 6 || result?.exitCode === 7) return "refused_or_unreachable";
  throw new Error("recovery_refusal_unproved");
}

/** A Docker cleanup claim is possible only after every owned resource has disappeared. */
export function createDockerCleanupReceipt({ challengeDigest, checks } = {}) {
  digest(challengeDigest);
  exact(checks, ["composeRemoved", "proxyClosed", "portsFree", "runtimeRemoved", "verifierFilesRemoved", "refusalExercised"], "cleanup_checks_invalid");
  if (!Object.values(checks).every((value) => value === true)) throw new Error("recovery_cleanup_unproved");
  return Object.freeze({ version: 1, challengeDigest, cleanup: "scrubbed_removed", cleanupDigest: digestReceipt({ kind: "docker_published_loopback", checks: Object.keys(checks).sort() }) });
}

/** Builds the only Docker row bundle accepted by the receipt projector. */
export function buildDockerRecoveryBundle({ connectionReceipt, recoveryChallenge, recoveryReceipt, fixtureDigest, cleanup } = {}) {
  const initial = validateConnectionReceipt(connectionReceipt);
  const challenge = validateChallenge(recoveryChallenge);
  const recovery = validateRecoveryReceipt(recoveryReceipt, challenge);
  if (initial.panelDigest !== recovery.panelDigest.slice("sha256:".length)) recoveryFailure("fresh_panel_required");
  digest(fixtureDigest);
  exact(cleanup, ["version", "challengeDigest", "cleanup", "cleanupDigest"], "cleanup_invalid");
  if (cleanup.version !== 1 || cleanup.challengeDigest !== challenge.challengeDigest || cleanup.cleanup !== "scrubbed_removed") recoveryFailure("cleanup_invalid");
  digest(cleanup.cleanupDigest);
  return Object.freeze({
    challenge,
    panel: recovery,
    fixture: Object.freeze({ version: 1, challengeDigest: challenge.challengeDigest, condition: "docker_published_loopback", lifecycle: "same_panel", signatures: DOCKER_SIGNATURES, fixtureDigest }),
    cleanup: Object.freeze({ ...cleanup }),
  });
}

function unusedLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const listener = createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const port = listener.address().port;
      listener.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

/** Allocates a unique test-only namespace. It neither starts Docker nor grants production code any process authority. */
export async function createDockerQualificationResources() {
  const suffix = randomBytes(10).toString("hex");
  const root = await mkdtemp(join(tmpdir(), "hermes-docker-qualification-"));
  await chmod(root, 0o700);
  const [gatewayPort, proxyPort, refusedPort] = await Promise.all([unusedLoopbackPort(), unusedLoopbackPort(), unusedLoopbackPort()]);
  if (new Set([gatewayPort, proxyPort, refusedPort]).size !== 3) {
    await rm(root, { recursive: true, force: true });
    recoveryFailure("ports_not_unique");
  }
  let cleaned = false;
  return Object.freeze({
    projectName: `muxy-hermes-${suffix}`,
    root,
    gatewayPort,
    proxyPort,
    refusedPort,
    composeEnvironment: Object.freeze({ HERMES_SIM_PORT: String(gatewayPort), HERMES_SIM_HOME: join(root, "home") }),
    bearer: randomBytes(32).toString("base64url"),
    cleanup: async () => {
      if (cleaned) return Object.freeze({ cleanup: "scrubbed_removed" });
      cleaned = true;
      await rm(root, { recursive: true, force: true });
      return Object.freeze({ cleanup: "scrubbed_removed" });
    },
  });
}

/** Keeps the bearer in stdin and discards all curl diagnostics after classifying a refused endpoint. */
export async function exerciseRefusedLoopback({ port, bearer, execFile } = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof execFile !== "function") recoveryFailure("refusal_request_invalid");
  const result = await execFile("/usr/bin/curl", ["--silent", "--show-error", "--no-buffer", "--config", "-", "--connect-timeout", "1", "--max-time", "2", `http://127.0.0.1:${port}/v1/capabilities`], { input: buildBearerConfig(bearer), encoding: "utf8" });
  return normalizeRefusalOutcome(result);
}

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
