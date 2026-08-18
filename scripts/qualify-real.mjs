import { createHash, randomBytes } from "node:crypto";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, open, readFile, readdir, rename, rmdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { promisify } from "node:util";

import { resolveVersionTuple } from "./resolve-versions.mjs";
import { projectRecoveryObservation } from "./project-recovery-observation.mjs";

export const FIXTURE_REQUEST = "{\"model\":\"hermes-agent\",\"messages\":[{\"role\":\"user\",\"content\":\"HERMES_STREAM_QUALIFICATION_V1\"}],\"stream\":true}";
const FIXTURE_ROOT_PREFIX = "/private/tmp/";
const ORIGIN_HANDOFF_PREFIX = "hermes-origin-handoff-";
const ORIGIN_HANDOFF_NAME = "captured-origin.json";
const ORIGIN_CAPTURE_PATH = "/v1/capabilities";
const execFile = promisify(execFileCallback);
const PINNED_HERMES_VERSION = "0.20.2";
const PINNED_HERMES_RELEASE = "2026.8.16";
const PINNED_HERMES_REVISION = "df4b65147d7ddd74dd449f9067aabbca5aef0ec7";
const VERIFIER_DIRECTORY = ".muxy-hermes-qualification/current";
const CONNECTION_CHALLENGE = "challenge.json";
const CONNECTION_RECEIPT = "panel-session.json";
const RECOVERY_CHALLENGE = "recovery-challenge.json";
const RECOVERY_RECEIPT = "recovery-panel-session.json";
const RECEIPT_DIGEST = /^sha256:[a-f0-9]{64}$/;
const PANEL_DIGEST = /^[a-f0-9]{64}$/;

function recoveryFailure(code) { throw new Error(`qualification_recovery_${code}`); }

function safeRecoveryDigest(value) {
  if (typeof value !== "string" || !RECEIPT_DIGEST.test(value)) recoveryFailure("digest_invalid");
  return value;
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    recoveryFailure(code);
  }
  return value;
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function digestReceipt(value) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

function validateConnectionReceipt(value) {
  exactObject(value, ["version", "challengeDigest", "panelDigest", "sessionOrdinal", "outcomes"], "connection_receipt_invalid");
  if (value.version !== 1 || !PANEL_DIGEST.test(value.challengeDigest) || !PANEL_DIGEST.test(value.panelDigest) || value.sessionOrdinal !== 1) recoveryFailure("connection_receipt_invalid");
  exactObject(value.outcomes, ["relay", "authentication", "capabilities", "stream", "cleanup", "digests"], "connection_receipt_invalid");
  if (![value.outcomes.relay, value.outcomes.authentication, value.outcomes.capabilities, value.outcomes.stream, value.outcomes.cleanup].every((outcome) => outcome === "passed")) recoveryFailure("connection_receipt_invalid");
  exactObject(value.outcomes.digests, ["execution", "timing", "frames", "cleanup"], "connection_receipt_invalid");
  if (!Object.values(value.outcomes.digests).every((item) => PANEL_DIGEST.test(item))) recoveryFailure("connection_receipt_invalid");
  return value;
}

function validateRecoveryChallenge(value) {
  exactObject(value, ["version", "nonce", "expiresAt", "expectedCondition", "expectedLifecycle", "expectedSignatures", "challengeDigest"], "challenge_invalid");
  if (value.version !== 1 || typeof value.nonce !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(value.nonce)
    || typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt))
    || value.expectedCondition !== "host_native_loopback" || value.expectedLifecycle !== "recreated_panel"
    || !Array.isArray(value.expectedSignatures) || value.expectedSignatures.length !== 1 || value.expectedSignatures[0] !== "panel_recreated") {
    recoveryFailure("challenge_invalid");
  }
  return { ...value, challengeDigest: safeRecoveryDigest(value.challengeDigest) };
}

function validateHostRecoveryReceipt(value, challenge) {
  exactObject(value, ["version", "challengeDigest", "panelDigest", "lifecycle", "observerAttempts", "statusClass", "signatures", "outcomeDigests"], "receipt_invalid");
  if (value.version !== 1 || value.challengeDigest !== challenge.challengeDigest || !RECEIPT_DIGEST.test(value.panelDigest)
    || value.lifecycle !== "recreated_panel" || value.observerAttempts !== 0 || value.statusClass !== "terminal"
    || !Array.isArray(value.signatures) || value.signatures.length !== 1 || value.signatures[0] !== "panel_recreated") recoveryFailure("receipt_invalid");
  exactObject(value.outcomeDigests, ["recovery", "status"], "receipt_invalid");
  safeRecoveryDigest(value.outcomeDigests.recovery); safeRecoveryDigest(value.outcomeDigests.status);
  return value;
}

/** Builds the only host-native bundle accepted by the receipt projector. */
export function buildHostRecoveryBundle({ connectionReceipt, recoveryChallenge, recoveryReceipt, fixtureDigest, cleanup } = {}) {
  const first = validateConnectionReceipt(connectionReceipt);
  const challenge = validateRecoveryChallenge(recoveryChallenge);
  const second = validateHostRecoveryReceipt(recoveryReceipt, challenge);
  if (first.panelDigest === second.panelDigest.slice("sha256:".length)) recoveryFailure("fresh_panel_required");
  safeRecoveryDigest(fixtureDigest);
  exactObject(cleanup, ["version", "challengeDigest", "cleanup", "cleanupDigest"], "cleanup_invalid");
  if (cleanup.version !== 1 || cleanup.challengeDigest !== challenge.challengeDigest || cleanup.cleanup !== "scrubbed_removed") recoveryFailure("cleanup_invalid");
  safeRecoveryDigest(cleanup.cleanupDigest);
  return Object.freeze({
    challenge,
    panel: second,
    fixture: Object.freeze({ version: 1, challengeDigest: challenge.challengeDigest, condition: "host_native_loopback", lifecycle: "recreated_panel", signatures: ["panel_recreated"], fixtureDigest }),
    cleanup: Object.freeze({ ...cleanup }),
  });
}

/** A cleanup claim is constructible only after all qualifier-owned resource checks pass. */
export function createQualificationCleanupReceipt({ challengeDigest, checks } = {}) {
  safeRecoveryDigest(challengeDigest);
  exactObject(checks, ["gatewayStopped", "modelStopped", "portsFree", "runtimeRemoved", "verifierFilesRemoved"], "cleanup_checks_invalid");
  if (!Object.values(checks).every((value) => value === true)) throw new Error("qualification_cleanup_unproved");
  return Object.freeze({ version: 1, challengeDigest, cleanup: "scrubbed_removed", cleanupDigest: digestReceipt({ kind: "host_native", checks: Object.keys(checks).sort() }) });
}

function qualificationProjectDirectory(projectRoot) {
  if (typeof projectRoot !== "string" || !projectRoot) recoveryFailure("project_root_invalid");
  const root = resolve(projectRoot);
  const directory = resolve(root, VERIFIER_DIRECTORY);
  if (!directory.startsWith(`${root}/`)) recoveryFailure("project_root_invalid");
  return { root, directory };
}

function verifierPath(projectRoot, filename) {
  if (![CONNECTION_CHALLENGE, CONNECTION_RECEIPT, RECOVERY_CHALLENGE, RECOVERY_RECEIPT].includes(filename)) recoveryFailure("verifier_file_invalid");
  const { directory } = qualificationProjectDirectory(projectRoot);
  return join(directory, filename);
}

function recoveryChallengeFileValue(challenge) {
  return {
    version: challenge.version,
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    expectedCondition: challenge.expectedCondition,
    expectedLifecycle: challenge.expectedLifecycle,
    expectedSignatures: challenge.expectedSignatures,
  };
}

/** Creates one ephemeral verifier challenge at the panel's fixed, non-production test path. */
export async function issueRecoveryChallenge({ projectRoot = process.cwd(), condition, lifecycle, signatures, ttlMs = 120_000, now = new Date() } = {}) {
  if (condition !== "host_native_loopback" || lifecycle !== "recreated_panel"
    || !Array.isArray(signatures) || signatures.length !== 1 || signatures[0] !== "panel_recreated"
    || !Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 300_000 || Number.isNaN(Date.parse(now))) {
    recoveryFailure("challenge_request_invalid");
  }
  const nonce = randomBytes(24).toString("base64url");
  const challenge = Object.freeze({
    version: 1,
    nonce,
    expiresAt: new Date(new Date(now).getTime() + ttlMs).toISOString(),
    expectedCondition: condition,
    expectedLifecycle: lifecycle,
    expectedSignatures: Object.freeze([...signatures]),
    challengeDigest: `sha256:${createHash("sha256").update(JSON.stringify(nonce)).digest("hex")}`,
  });
  const path = verifierPath(projectRoot, RECOVERY_CHALLENGE);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(path, JSON.stringify(recoveryChallengeFileValue(challenge)), { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") recoveryFailure("challenge_exists");
    throw error;
  }
  return challenge;
}

/** The Phase 1 receipt still owns its original shape; this only creates its one-use challenge. */
export async function issueConnectionChallenge({ projectRoot = process.cwd(), ttlMs = 120_000, now = new Date() } = {}) {
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 300_000 || Number.isNaN(Date.parse(now))) recoveryFailure("connection_challenge_invalid");
  const value = Object.freeze({ version: 1, nonce: randomBytes(24).toString("base64url"), expiresAt: new Date(new Date(now).getTime() + ttlMs).toISOString(), expectedOrdinal: 1 });
  const path = verifierPath(projectRoot, CONNECTION_CHALLENGE);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(path, JSON.stringify(value), { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") recoveryFailure("connection_challenge_exists");
    throw error;
  }
  return value;
}

export async function consumeVerifierReceipt({ projectRoot = process.cwd(), kind } = {}) {
  const filename = kind === "connection" ? CONNECTION_RECEIPT : kind === "recovery" ? RECOVERY_RECEIPT : null;
  if (!filename) recoveryFailure("receipt_kind_invalid");
  const path = verifierPath(projectRoot, filename);
  let value;
  try { value = JSON.parse(await readFile(path, "utf8")); } catch { recoveryFailure("receipt_missing"); }
  try { await unlink(path); } catch { recoveryFailure("receipt_cleanup_failed"); }
  return value;
}

export async function waitForVerifierReceipt({ projectRoot = process.cwd(), kind, timeoutMs = 120_000, signal } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) recoveryFailure("receipt_timeout_invalid");
  const filename = kind === "connection" ? CONNECTION_RECEIPT : kind === "recovery" ? RECOVERY_RECEIPT : null;
  if (!filename) recoveryFailure("receipt_kind_invalid");
  const path = verifierPath(projectRoot, filename);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) recoveryFailure("receipt_cancelled");
    try { await stat(path); return consumeVerifierReceipt({ projectRoot, kind }); } catch (error) { if (error?.code !== "ENOENT") recoveryFailure("receipt_unreadable"); }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  recoveryFailure("receipt_timeout");
}

/** Removes only the fixed verifier artifacts created for this qualification; it never removes the project directory. */
export async function cleanupVerifierArtifacts({ projectRoot = process.cwd() } = {}) {
  const { directory } = qualificationProjectDirectory(projectRoot);
  for (const filename of [CONNECTION_CHALLENGE, CONNECTION_RECEIPT, RECOVERY_CHALLENGE, RECOVERY_RECEIPT]) {
    await unlink(join(directory, filename)).catch((error) => { if (error?.code !== "ENOENT") throw error; });
  }
  try {
    if ((await readdir(directory)).length === 0) await rmdir(directory);
  } catch (error) { if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error; }
  return true;
}

function securePath(value, name) {
  const resolved = resolve(value);
  if (!resolved.startsWith(FIXTURE_ROOT_PREFIX) || basename(resolved) === "." || basename(resolved) === "/") throw new Error(`qualification_${name}_unsafe`);
  return resolved;
}

export function validateCapturedOrigin(origins) {
  const values = origins ?? [];
  if (!Array.isArray(values) || values.length === 0) throw new Error("qualification_origin_missing");
  if (values.length !== 1) throw new Error("qualification_origin_unstable");
  const [origin] = values;
  if (typeof origin !== "string" || origin.length === 0 || origin === "null" || origin === "*" || /[\r\n]/.test(origin)) throw new Error("qualification_origin_unsafe");
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error("qualification_origin_invalid"); }
  if (!/^(https?|muxy-extension|muxy-ext):\/\//.test(origin) || !parsed.hostname || parsed.username || parsed.password || !["", "/"].includes(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error("qualification_origin_invalid");
  }
  return origin;
}

function requireOriginHandoffPath(value) {
  const path = securePath(value, "origin_handoff");
  if (basename(path) !== ORIGIN_HANDOFF_NAME || !path.includes(`/${ORIGIN_HANDOFF_PREFIX}`)) throw new Error("qualification_origin_handoff_unsafe");
  return path;
}

function allowlistedOriginHandoff(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("qualification_origin_handoff_invalid");
  const keys = Object.keys(payload).sort();
  if (keys.length !== 3 || keys.join(",") !== "captureId,capturedAt,origin") throw new Error("qualification_origin_handoff_invalid");
  if (typeof payload.captureId !== "string" || !/^[A-Za-z0-9_-]{16,}$/.test(payload.captureId) || typeof payload.capturedAt !== "string" || Number.isNaN(Date.parse(payload.capturedAt))) {
    throw new Error("qualification_origin_handoff_invalid");
  }
  return validateCapturedOrigin([payload.origin]);
}

async function createOriginHandoffDestination() {
  const directory = await mkdtemp(`${FIXTURE_ROOT_PREFIX}${ORIGIN_HANDOFF_PREFIX}`);
  const path = join(directory, ORIGIN_HANDOFF_NAME);
  await chmod(directory, 0o700);
  return Object.freeze({ path, directory });
}

async function writeOriginHandoff(origin, destination) {
  const { path, directory } = destination;
  requireOriginHandoffPath(path);
  const pendingPath = join(directory, ".captured-origin.pending");
  const payload = JSON.stringify({ origin: validateCapturedOrigin([origin]), capturedAt: new Date().toISOString(), captureId: randomBytes(16).toString("base64url") });
  const handle = await open(pendingPath, "wx", 0o600);
  try {
    await handle.writeFile(payload, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(pendingPath, path);
  await chmod(path, 0o600);
  return destination;
}

export async function consumeOriginHandoff({ path, configure } = {}) {
  const handoffPath = requireOriginHandoffPath(path);
  if (typeof configure !== "function") throw new Error("qualification_origin_handoff_configure_required");
  let origin;
  try {
    const mode = (await stat(handoffPath)).mode & 0o777;
    if (mode !== 0o600) throw new Error("qualification_origin_handoff_mode");
    origin = allowlistedOriginHandoff(JSON.parse(await readFile(handoffPath, "utf8")));
    await configure(origin);
  } catch (error) {
    if (/^ENOENT$/.test(error?.code ?? "")) throw new Error("qualification_origin_handoff_missing");
    throw error;
  } finally {
    await unlink(handoffPath).catch(() => {});
  }
  return Object.freeze({ consumed: true });
}

export async function createQualificationRuntime({ root, token = randomBytes(32).toString("base64url") } = {}) {
  const fixtureRoot = securePath(root, "runtime_root");
  const home = `${fixtureRoot}/home`;
  const workspace = `${fixtureRoot}/workspace`;
  const tokenFile = `${fixtureRoot}/panel-token.txt`;
  await Promise.all([mkdir(home, { recursive: true, mode: 0o700 }), mkdir(workspace, { recursive: true, mode: 0o700 })]);
  await writeFile(tokenFile, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  return {
    home, workspace, tokenFile,
    environment: Object.freeze({ HERMES_HOME: home, API_SERVER_KEY: token, HERMES_QUALIFICATION_WORKSPACE: workspace }),
  };
}

/** Verify one user-supplied temporary binary; discovery and fallback installs are forbidden. */
export async function verifyQualificationExecutable({
  executable,
  attestedRevision,
  sourceRoot = dirname(executable ?? ""),
  execFile: execute = execFile,
  readFile: read = readFile,
} = {}) {
  if (typeof executable !== "string" || !executable.startsWith(FIXTURE_ROOT_PREFIX) || !executable.endsWith("/hermes") || executable.includes("\n")) {
    throw new Error("qualification_executable_unsafe");
  }
  let stdout;
  try { ({ stdout } = await execute(executable, ["--version"], { timeout: 10_000 })); }
  catch { throw new Error("qualification_executable_unreadable"); }
  const output = String(stdout);
  let packageMetadata = "";
  let releaseMetadata = "";
  try {
    const verifiedSourceRoot = securePath(sourceRoot, "source_root");
    [packageMetadata, releaseMetadata] = await Promise.all([
      read(join(verifiedSourceRoot, "pyproject.toml"), "utf8"),
      read(join(verifiedSourceRoot, "hermes_cli", "__init__.py"), "utf8"),
    ]);
  } catch {
    throw new Error("qualification_executable_identity_mismatch");
  }
  if (!output.includes(`v${PINNED_HERMES_VERSION}`)
    || !output.includes(PINNED_HERMES_RELEASE)
    || !new RegExp(`version\\s*=\\s*[\"']${PINNED_HERMES_VERSION}[\"']`).test(packageMetadata)
    || !releaseMetadata.includes(`__version__ = \"${PINNED_HERMES_VERSION}\"`)
    || !releaseMetadata.includes(`__release_date__ = \"${PINNED_HERMES_RELEASE}\"`)
    || attestedRevision !== PINNED_HERMES_REVISION) {
    throw new Error("qualification_executable_identity_mismatch");
  }
  return Object.freeze({ version: PINNED_HERMES_VERSION, release: PINNED_HERMES_RELEASE, revision: PINNED_HERMES_REVISION });
}

/** Remove only a harness-owned temporary root after children have been stopped. */
export async function cleanupQualificationRuntime({ root } = {}) {
  const fixtureRoot = securePath(root, "runtime_root");
  if (!basename(fixtureRoot).startsWith("hermes-")) throw new Error("qualification_runtime_root_unsafe");
  await rm(fixtureRoot, { recursive: true, force: true });
  try { await stat(fixtureRoot); } catch (error) { if (error?.code === "ENOENT") return Object.freeze({ cleanup: "scrubbed_removed" }); throw error; }
  throw new Error("qualification_runtime_cleanup_failed");
}

export function recordFreshSession({ sessionOrdinal, panelSessionId, requiredStages, previous = null } = {}) {
  if (![1, 2].includes(sessionOrdinal) || typeof panelSessionId !== "string" || !panelSessionId) throw new Error("qualification_session_invalid");
  if (previous && (previous.panelSessionId === panelSessionId || sessionOrdinal !== previous.sessionOrdinal + 1)) throw new Error("qualification_fresh_panel_required");
  return Object.freeze({ sessionOrdinal, panelSessionId, freshPanelSession: true, requiredStages });
}

function listen(server, port = 0) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

export async function startOriginCaptureServer() {
  const destination = await createOriginHandoffDestination();
  let settleOrigin;
  let rejectOrigin;
  let settleClosed;
  let rejectClosed;
  let terminal = false;
  const sockets = new Set();
  const originResult = new Promise((resolveOrigin, reject) => { settleOrigin = resolveOrigin; rejectOrigin = reject; });
  originResult.catch(() => {});
  const closed = new Promise((resolveClosed, reject) => { settleClosed = resolveClosed; rejectClosed = reject; });
  const finish = async ({ origin, error } = {}) => {
    if (terminal) return;
    terminal = true;
    if (error) rejectOrigin(error);
    else {
      try { settleOrigin(await writeOriginHandoff(origin, destination)); }
      catch (handoffError) { rejectOrigin(handoffError); }
    }
    const closeTimeout = setTimeout(() => rejectClosed(new Error("qualification_origin_capture_stop_timeout")), 5_000);
    server.close((closeError) => {
      clearTimeout(closeTimeout);
      if (closeError) rejectClosed(new Error("qualification_origin_capture_stop_failed"));
      else settleClosed();
    });
    setImmediate(() => { for (const socket of sockets) socket.destroy(); });
  };
  const server = createServer((request, response) => {
    const originHeaders = [];
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      if (request.rawHeaders[index].toLowerCase() === "origin") originHeaders.push(request.rawHeaders[index + 1]);
    }
    const isExpectedPreflight = request.method === "OPTIONS" && request.url === ORIGIN_CAPTURE_PATH && request.headers["access-control-request-method"] === "GET";
    if (!isExpectedPreflight) {
      response.writeHead(400, { Connection: "close" }).end();
      void finish({ error: new Error("qualification_origin_reflected_or_unexpected_request") });
      return;
    }
    try {
      const origin = validateCapturedOrigin(originHeaders);
      response.writeHead(204, { Connection: "close" }).end();
      void finish({ origin });
    } catch (error) {
      response.writeHead(400, { Connection: "close" }).end();
      void finish({ error });
    }
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  let port;
  try { port = await listen(server); }
  catch (error) { await rm(destination.directory, { recursive: true, force: true }); throw error; }
  return {
    url: `http://127.0.0.1:${port}`,
    handoffPath: destination.path,
    waitForOrigin: () => originResult,
    closed,
    close: () => finish({ error: new Error("qualification_origin_capture_cancelled") }),
    cleanup: async () => {
      await finish({ error: new Error("qualification_origin_capture_cancelled") });
      await closed;
      await originResult.catch(() => null);
      await rm(destination.directory, { recursive: true, force: true });
    },
  };
}

export async function startDeterministicModelStub({ maxQualificationRequests = 3 } = {}) {
  let requestCount = 0;
  const isQualificationRequest = (body) => {
    let payload;
    try { payload = JSON.parse(body); } catch { return false; }
    if (payload?.model !== "hermes-agent" || payload?.stream !== true || !Array.isArray(payload?.messages)) return false;
    return payload.messages.some((message) => {
      if (message?.role !== "user") return false;
      if (message.content === "HERMES_STREAM_QUALIFICATION_V1") return true;
      return Array.isArray(message.content) && message.content.some((part) => part?.type === "text" && part?.text === "HERMES_STREAM_QUALIFICATION_V1");
    });
  };
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/v1/models") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"object":"list","data":[{"id":"hermes-agent","object":"model"}]}');
      return;
    }
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") { response.writeHead(404).end(); return; }
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      if (!isQualificationRequest(body) || requestCount >= maxQualificationRequests) { response.writeHead(400).end(); return; }
      requestCount += 1;
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      response.write('data: {"id":"chatcmpl-fixture","object":"chat.completion.chunk","created":0,"model":"hermes-agent","choices":[{"index":0,"delta":{"role":"assistant","content":"alpha"},"finish_reason":null}]}\n\n');
      setTimeout(() => {
        response.write('data: {"id":"chatcmpl-fixture","object":"chat.completion.chunk","created":0,"model":"hermes-agent","choices":[{"index":0,"delta":{"content":"beta"},"finish_reason":"stop"}]}\n\n');
        response.end("data: [DONE]\n\n");
      }, 250);
    });
  });
  const port = await listen(server);
  return { baseUrl: `http://127.0.0.1:${port}/v1`, requestCount: () => requestCount, close: () => close(server) };
}

export async function startHostGateway({
  runtime,
  origin,
  executable = process.env.HERMES_QUALIFICATION_EXECUTABLE,
  attestedRevision = process.env.HERMES_QUALIFICATION_REVISION,
  sourceRoot = process.env.HERMES_QUALIFICATION_SOURCE_ROOT,
  modelStub,
  logStderr = false,
}) {
  await verifyQualificationExecutable({ executable, attestedRevision, sourceRoot });
  const server = createServer();
  const port = await listen(server);
  await close(server);
  const config = ["model:", "  default: hermes-agent", "  provider: custom", `  base_url: ${modelStub.baseUrl}`, "  api_key: fixture-local-only", ""].join("\n");
  await writeFile(`${runtime.home}/config.yaml`, config, { encoding: "utf8", mode: 0o600 });
  const child = spawn(executable, ["gateway", "run", "--force"], {
    cwd: runtime.workspace,
    env: {
      PATH: process.env.PATH,
      ...runtime.environment,
      API_SERVER_ENABLED: "true",
      API_SERVER_HOST: "127.0.0.1",
      API_SERVER_PORT: String(port),
      API_SERVER_CORS_ORIGINS: origin,
      API_SERVER_MODEL_NAME: "hermes-agent",
    },
    stdio: ["ignore", "ignore", logStderr ? "inherit" : "ignore"],
  });
  let childFailed = false;
  const exited = new Promise((resolveExit) => {
    child.once("exit", (code, signal) => resolveExit({ code, signal }));
    child.once("error", () => { childFailed = true; resolveExit({ code: null, signal: null }); });
  });
  const url = `http://127.0.0.1:${port}`;
  const ready = async () => {
    const expiresAt = Date.now() + 20_000;
    while (Date.now() < expiresAt) {
      if (childFailed || child.exitCode !== null) throw new Error("qualification_gateway_exited");
      try {
        const response = await fetch(`${url}/v1/capabilities`, {
          headers: { Authorization: `Bearer ${runtime.environment.API_SERVER_KEY}` },
          signal: AbortSignal.timeout(1_000),
        });
        if (response.ok) return;
      } catch { /* bounded readiness retry */ }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
    throw new Error("qualification_gateway_not_ready");
  };
  const waitForExit = async (timeoutMs) => {
    const timedOut = Symbol("timed_out");
    let timer;
    const result = await Promise.race([
      exited,
      new Promise((resolveTimeout) => { timer = setTimeout(() => resolveTimeout(timedOut), timeoutMs); }),
    ]);
    clearTimeout(timer);
    return result === timedOut ? null : result;
  };
  const stop = async () => {
    if (child.exitCode === null) child.kill("SIGTERM");
    const graceful = await waitForExit(10_000);
    if (graceful) return graceful;
    if (child.exitCode === null) child.kill("SIGKILL");
    const forced = await waitForExit(5_000);
    if (!forced) throw new Error("qualification_gateway_stop_timeout");
    return forced;
  };
  try {
    await ready();
  } catch (error) {
    await stop().catch(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
    throw error;
  }
  return { url, stop, exited };
}

export async function startHostGatewayFromOriginHandoff({
  runtime,
  handoffPath,
  executable = process.env.HERMES_QUALIFICATION_EXECUTABLE,
  attestedRevision = process.env.HERMES_QUALIFICATION_REVISION,
  sourceRoot = process.env.HERMES_QUALIFICATION_SOURCE_ROOT,
  modelStub,
}) {
  let gateway;
  await consumeOriginHandoff({
    path: handoffPath,
    configure: async (origin) => { gateway = await startHostGateway({ runtime, origin, executable, attestedRevision, sourceRoot, modelStub }); },
  });
  return gateway;
}

export async function qualifyRealDeployment({ fixture = "host-native", runtimeRoot = process.env.QUALIFICATION_RUNTIME_ROOT } = {}) {
  if (fixture !== "host-native") throw new Error("qualification_fixture_unsupported");
  if (!runtimeRoot) throw new Error("qualification_runtime_root_required");
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  let capture;
  try { capture = await startOriginCaptureServer(); }
  catch (error) { await cleanupQualificationRuntime({ root: runtimeRoot }); throw error; }
  let cleaned = false;
  return {
    status: "awaiting_origin_capture",
    fixture,
    panelTokenFile: runtime.tokenFile,
    captureUrl: capture.url,
    requestContract: "fixed_harmless_chat_completion_stream",
    cleanup: async () => {
      if (cleaned) return Object.freeze({ cleanup: "scrubbed_removed" });
      cleaned = true;
      let captureError;
      try { await capture.cleanup(); } catch (error) { captureError = error; }
      const result = await cleanupQualificationRuntime({ root: runtimeRoot });
      if (captureError) throw captureError;
      return result;
    },
  };
}

async function verifyPortAbsent(url) {
  const parsed = new URL(url);
  const probe = createServer();
  try {
    await listen(probe, Number(parsed.port));
  } catch {
    throw new Error("qualification_cleanup_port_bound");
  } finally {
    await close(probe).catch(() => {});
  }
}

async function runReceiptBackedHostQualification(runtimeRoot, { origin: suppliedOrigin = null } = {}) {
  const versions = suppliedOrigin
    ? { hermesRelease: `v${PINNED_HERMES_RELEASE}`, hermesVersion: PINNED_HERMES_VERSION, hermesRevision: PINNED_HERMES_REVISION }
    : await resolveVersionTuple();
  const projectRoot = process.cwd();
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  let modelStub;
  let gateway;
  let connectionReceipt;
  let recoveryChallenge;
  let recoveryReceipt;
  let publicationError;
  const interrupted = new AbortController();
  const cancel = () => interrupted.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    let origin = suppliedOrigin ? validateCapturedOrigin([suppliedOrigin]) : null;
    if (!origin) {
      const capture = await startOriginCaptureServer();
      try {
        process.stdout.write(`${JSON.stringify({ status: "awaiting_origin_capture", fixture: "host-native", captureUrl: capture.url, panelTokenFile: runtime.tokenFile, versions })}\n`);
        const handoff = await capture.waitForOrigin();
        await capture.closed;
        await consumeOriginHandoff({ path: handoff.path, configure: async (capturedOrigin) => { origin = capturedOrigin; } });
      } finally {
        await capture.cleanup();
      }
    }
    modelStub = await startDeterministicModelStub();
    gateway = await startHostGateway({ runtime, origin, modelStub, attestedRevision: versions.hermesRevision, logStderr: process.env.HERMES_QUALIFICATION_DEBUG === "1" });
    await cleanupVerifierArtifacts({ projectRoot });
    await issueConnectionChallenge({ projectRoot });
    process.stdout.write(`${JSON.stringify({ status: "awaiting_native_initial_connection", fixture: "host-native", gatewayUrl: gateway.url, panelTokenFile: runtime.tokenFile, safeRequestContract: "two_delayed_deltas_no_tools" })}\n`);
    connectionReceipt = await waitForVerifierReceipt({ projectRoot, kind: "connection", signal: interrupted.signal });
    validateConnectionReceipt(connectionReceipt);
    await unlink(verifierPath(projectRoot, CONNECTION_CHALLENGE)).catch((error) => { if (error?.code !== "ENOENT") throw error; });
    recoveryChallenge = await issueRecoveryChallenge({ projectRoot, condition: "host_native_loopback", lifecycle: "recreated_panel", signatures: ["panel_recreated"] });
    process.stdout.write(`${JSON.stringify({ status: "awaiting_recreated_panel_status_recovery", fixture: "host-native", gatewayUrl: gateway.url, panelTokenFile: runtime.tokenFile, recoveryContract: "fresh_credentials_manual_run_id_status_only" })}\n`);
    recoveryReceipt = await waitForVerifierReceipt({ projectRoot, kind: "recovery", signal: interrupted.signal });
    validateHostRecoveryReceipt(recoveryReceipt, recoveryChallenge);
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
    const gatewayUrl = gateway?.url;
    const modelUrl = modelStub?.baseUrl;
    let gatewayStopped = false;
    let modelStopped = false;
    let portsFree = false;
    let runtimeRemoved = false;
    let verifierFilesRemoved = false;
    try { await gateway?.stop(); gatewayStopped = true; } catch { /* no positive publication */ }
    try { await modelStub?.close(); modelStopped = true; } catch { /* no positive publication */ }
    try {
      if (gatewayUrl) await verifyPortAbsent(gatewayUrl);
      if (modelUrl) await verifyPortAbsent(modelUrl);
      portsFree = true;
    } catch { /* no positive publication */ }
    try { await cleanupQualificationRuntime({ root: runtimeRoot }); runtimeRemoved = true; } catch { /* no positive publication */ }
    try { await cleanupVerifierArtifacts({ projectRoot }); verifierFilesRemoved = true; } catch { /* no positive publication */ }
    if (connectionReceipt && recoveryChallenge && recoveryReceipt && gatewayStopped && modelStopped && portsFree && runtimeRemoved && verifierFilesRemoved) {
      try {
        const cleanup = createQualificationCleanupReceipt({ challengeDigest: recoveryChallenge.challengeDigest, checks: { gatewayStopped, modelStopped, portsFree, runtimeRemoved, verifierFilesRemoved } });
        const bundle = buildHostRecoveryBundle({
          connectionReceipt,
          recoveryChallenge,
          recoveryReceipt,
          fixtureDigest: digestReceipt({ kind: "host_native_loopback", hermes: versions.hermesVersion, revision: versions.hermesRevision, request: "two_delayed_deltas_no_tools" }),
          cleanup,
        });
        await projectRecoveryObservation({ root: projectRoot, inputPath: join(projectRoot, "public/evidence/recovery-v1.json"), outputPath: join(projectRoot, "public/evidence/recovery-v1.json"), bundle });
        process.stdout.write(`${JSON.stringify({ status: "host_recovery_observed", fixture: "host-native", evidence: "projected_after_cleanup" })}\n`);
      } catch (error) { publicationError = error; }
    }
  }
  if (publicationError) throw publicationError;
}

async function runInteractiveHostQualification(runtimeRoot, { origin: suppliedOrigin = null } = {}) {
  const versions = suppliedOrigin
    ? {
        hermesRelease: `v${PINNED_HERMES_RELEASE}`,
        hermesVersion: PINNED_HERMES_VERSION,
        hermesRevision: PINNED_HERMES_REVISION,
      }
    : await resolveVersionTuple();
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  let modelStub;
  let gateway;
  try {
    let origin = suppliedOrigin ? validateCapturedOrigin([suppliedOrigin]) : null;
    if (!origin) {
      const capture = await startOriginCaptureServer();
      try {
        process.stdout.write(`${JSON.stringify({ status: "awaiting_origin_capture", fixture: "host-native", captureUrl: capture.url, panelTokenFile: runtime.tokenFile, versions })}\n`);
        const handoff = await capture.waitForOrigin();
        await capture.closed;
        await consumeOriginHandoff({ path: handoff.path, configure: async (capturedOrigin) => { origin = capturedOrigin; } });
      } finally {
        await capture.cleanup();
      }
    }
    modelStub = await startDeterministicModelStub();
    gateway = await startHostGateway({
      runtime,
      origin,
      modelStub,
      attestedRevision: versions.hermesRevision,
      logStderr: process.env.HERMES_QUALIFICATION_DEBUG === "1",
    });
    process.stdout.write(`${JSON.stringify({ status: "awaiting_two_fresh_panel_sessions", fixture: "host-native", gatewayUrl: gateway.url, panelTokenFile: runtime.tokenFile, safeRequestContract: "two_delayed_deltas_no_tools" })}\n`);
    await new Promise((resolveWait) => {
      process.once("SIGINT", resolveWait);
      process.once("SIGTERM", resolveWait);
    });
  } finally {
    await gateway?.stop();
    await modelStub?.close();
    await cleanupQualificationRuntime({ root: runtimeRoot });
  }
}

async function runOriginCaptureOnly() {
  const capture = await startOriginCaptureServer();
  process.stdout.write(`${JSON.stringify({ status: "awaiting_origin_capture", fixture: "host-native", captureUrl: capture.url, panelToken: "origin-capture-only", handoffPath: capture.handoffPath, requestContract: "capabilities_preflight_only" })}\n`);
  let captured = false;
  try {
    await capture.waitForOrigin();
    await capture.closed;
    captured = true;
    process.stdout.write(`${JSON.stringify({ status: "origin_captured", fixture: "host-native", handoffPath: capture.handoffPath })}\n`);
  } finally {
    if (!captured) await capture.cleanup();
    // The one-use handoff is deliberately retained for the explicit consume step.
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    if (process.argv[2] === "--capture-origin" && process.argv.length === 3) {
      await runOriginCaptureOnly();
    } else {
      const fixture = process.argv[3] && process.argv[2] === "--fixture" ? process.argv[3] : "";
      if (fixture !== "host-native") throw new Error("qualification_fixture_unsupported");
      const originIndex = process.argv.indexOf("--origin");
      const suppliedOrigin = originIndex >= 0 ? process.argv[originIndex + 1] : null;
      if (process.argv.includes("--receipt-backed")) await runReceiptBackedHostQualification(process.env.QUALIFICATION_RUNTIME_ROOT, { origin: suppliedOrigin });
      else await runInteractiveHostQualification(process.env.QUALIFICATION_RUNTIME_ROOT, { origin: suppliedOrigin });
    }
  } catch (error) {
    process.stderr.write(`${/^qualification_/.test(error?.message ?? "") ? error.message : "qualification_failed"}\n`);
    process.exitCode = 1;
  }
}
