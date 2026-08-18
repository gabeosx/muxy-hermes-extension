import { randomBytes } from "node:crypto";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, open, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { promisify } from "node:util";

import { resolveVersionTuple } from "./resolve-versions.mjs";

export const FIXTURE_REQUEST = "{\"model\":\"hermes-agent\",\"messages\":[{\"role\":\"user\",\"content\":\"HERMES_STREAM_QUALIFICATION_V1\"}],\"stream\":true}";
const FIXTURE_ROOT_PREFIX = "/private/tmp/";
const ORIGIN_HANDOFF_PREFIX = "hermes-origin-handoff-";
const ORIGIN_HANDOFF_NAME = "captured-origin.json";
const ORIGIN_CAPTURE_PATH = "/v1/capabilities";
const execFile = promisify(execFileCallback);
const PINNED_HERMES_VERSION = "0.20.2";
const PINNED_HERMES_RELEASE = "2026.8.16";
const PINNED_HERMES_REVISION = "df4b65147d7ddd74dd449f9067aabbca5aef0ec7";

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
  if (!/^(https?|muxy-extension):\/\//.test(origin) || !parsed.hostname || parsed.username || parsed.password || !["", "/"].includes(parsed.pathname) || parsed.search || parsed.hash) {
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
    const sourceRoot = dirname(executable);
    [packageMetadata, releaseMetadata] = await Promise.all([
      read(join(sourceRoot, "pyproject.toml"), "utf8"),
      read(join(sourceRoot, "hermes_cli", "__init__.py"), "utf8"),
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
  let terminal = false;
  const originResult = new Promise((resolveOrigin, reject) => { settleOrigin = resolveOrigin; rejectOrigin = reject; });
  originResult.catch(() => {});
  const closed = new Promise((resolveClosed) => { settleClosed = resolveClosed; });
  const finish = async ({ origin, error } = {}) => {
    if (terminal) return;
    terminal = true;
    if (error) rejectOrigin(error);
    else {
      try { settleOrigin(await writeOriginHandoff(origin, destination)); }
      catch (handoffError) { rejectOrigin(handoffError); }
    }
    server.close(() => settleClosed());
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
  const port = await listen(server);
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

export async function startDeterministicModelStub({ maxQualificationRequests = 2 } = {}) {
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
  modelStub,
  logStderr = false,
}) {
  await verifyQualificationExecutable({ executable, attestedRevision });
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
  const url = `http://127.0.0.1:${port}`;
  const ready = async () => {
    const expiresAt = Date.now() + 20_000;
    while (Date.now() < expiresAt) {
      if (child.exitCode !== null) throw new Error("qualification_gateway_exited");
      try {
        const response = await fetch(`${url}/v1/capabilities`, { headers: { Authorization: `Bearer ${runtime.environment.API_SERVER_KEY}` } });
        if (response.ok) return;
      } catch { /* bounded readiness retry */ }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
    throw new Error("qualification_gateway_not_ready");
  };
  const stop = () => { if (child.exitCode === null) child.kill("SIGTERM"); };
  await ready();
  return { url, stop };
}

export async function startHostGatewayFromOriginHandoff({ runtime, handoffPath, executable = process.env.HERMES_QUALIFICATION_EXECUTABLE, modelStub }) {
  let gateway;
  await consumeOriginHandoff({
    path: handoffPath,
    configure: async (origin) => { gateway = await startHostGateway({ runtime, origin, executable, modelStub }); },
  });
  return gateway;
}

export async function qualifyRealDeployment({ fixture = "host-native", runtimeRoot = process.env.QUALIFICATION_RUNTIME_ROOT } = {}) {
  if (fixture !== "host-native") throw new Error("qualification_fixture_unsupported");
  if (!runtimeRoot) throw new Error("qualification_runtime_root_required");
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  const capture = await startOriginCaptureServer();
  return {
    status: "awaiting_origin_capture",
    fixture,
    panelTokenFile: runtime.tokenFile,
    captureUrl: capture.url,
    requestContract: "fixed_harmless_chat_completion_stream",
    cleanup: "runner removes the runtime directory after the human result is recorded",
  };
}

async function runInteractiveHostQualification(runtimeRoot) {
  const versions = await resolveVersionTuple();
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  const capture = await startOriginCaptureServer();
  process.stdout.write(`${JSON.stringify({ status: "awaiting_origin_capture", fixture: "host-native", captureUrl: capture.url, panelTokenFile: runtime.tokenFile, versions })}\n`);
  const origin = await capture.waitForOrigin();
  await capture.close();
  const modelStub = await startDeterministicModelStub();
  let gateway;
  try {
    gateway = await startHostGateway({ runtime, origin, modelStub, attestedRevision: versions.hermesRevision });
    process.stdout.write(`${JSON.stringify({ status: "awaiting_two_fresh_panel_sessions", fixture: "host-native", gatewayUrl: gateway.url, panelTokenFile: runtime.tokenFile, safeRequestContract: "two_delayed_deltas_no_tools" })}\n`);
    await new Promise((resolveWait) => {
      process.once("SIGINT", resolveWait);
      process.once("SIGTERM", resolveWait);
    });
  } finally {
    gateway?.stop();
    await modelStub.close();
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
      await runInteractiveHostQualification(process.env.QUALIFICATION_RUNTIME_ROOT);
    }
  } catch (error) {
    process.stderr.write(`${/^qualification_/.test(error?.message ?? "") ? error.message : "qualification_failed"}\n`);
    process.exitCode = 1;
  }
}
