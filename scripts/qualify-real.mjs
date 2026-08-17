import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createServer } from "node:http";

export const FIXTURE_REQUEST = "{\"model\":\"hermes-agent\",\"messages\":[{\"role\":\"user\",\"content\":\"HERMES_STREAM_QUALIFICATION_V1\"}],\"stream\":true}";
const FIXTURE_ROOT_PREFIX = "/private/tmp/";

function securePath(value, name) {
  const resolved = resolve(value);
  if (!resolved.startsWith(FIXTURE_ROOT_PREFIX) || basename(resolved) === "." || basename(resolved) === "/") throw new Error(`qualification_${name}_unsafe`);
  return resolved;
}

export function validateCapturedOrigin(origins) {
  const values = [...new Set((origins ?? []).filter((value) => typeof value === "string" && value.length > 0))];
  if (values.length === 0) throw new Error("qualification_origin_missing");
  if (values.length !== 1) throw new Error("qualification_origin_unstable");
  const [origin] = values;
  if (origin === "null" || origin === "*" || /[\r\n]/.test(origin)) throw new Error("qualification_origin_unsafe");
  return origin;
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
  const origins = [];
  const server = createServer((request, response) => {
    if (request.headers.origin) origins.push(request.headers.origin);
    response.writeHead(204).end();
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    waitForOrigin: () => new Promise((resolveOrigin) => {
      const timer = setInterval(() => {
        if (origins.length > 0) { clearInterval(timer); resolveOrigin(validateCapturedOrigin(origins)); }
      }, 100);
    }),
    close: () => close(server),
  };
}

export async function startDeterministicModelStub() {
  let requestCount = 0;
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
      if (body !== FIXTURE_REQUEST || requestCount > 0) { response.writeHead(400).end(); return; }
      requestCount += 1;
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      response.write('data: {"choices":[{"delta":{"content":"alpha"},"finish_reason":null}]}\n\n');
      setTimeout(() => {
        response.write('data: {"choices":[{"delta":{"content":"beta"},"finish_reason":"stop"}]}\n\n');
        response.end("data: [DONE]\n\n");
      }, 250);
    });
  });
  const port = await listen(server);
  return { baseUrl: `http://127.0.0.1:${port}/v1`, requestCount: () => requestCount, close: () => close(server) };
}

export async function startHostGateway({ runtime, origin, executable = process.env.HERMES_QUALIFICATION_EXECUTABLE, modelStub }) {
  if (typeof executable !== "string" || !executable.startsWith(FIXTURE_ROOT_PREFIX) || !executable.endsWith("/hermes")) throw new Error("qualification_executable_unsafe");
  const server = createServer();
  const port = await listen(server);
  await close(server);
  const config = ["model:", "  default: hermes-agent", "  provider: custom", `  base_url: ${modelStub.baseUrl}`, "  api_key: fixture-local-only", ""].join("\n");
  await writeFile(`${runtime.home}/config.yaml`, config, { encoding: "utf8", mode: 0o600 });
  const child = spawn(executable, ["gateway", "run"], {
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
    stdio: ["ignore", "ignore", "ignore"],
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
  const runtime = await createQualificationRuntime({ root: runtimeRoot });
  const capture = await startOriginCaptureServer();
  process.stdout.write(`${JSON.stringify({ status: "awaiting_origin_capture", fixture: "host-native", captureUrl: capture.url, panelTokenFile: runtime.tokenFile })}\n`);
  const origin = await capture.waitForOrigin();
  await capture.close();
  const modelStub = await startDeterministicModelStub();
  let gateway;
  try {
    gateway = await startHostGateway({ runtime, origin, modelStub });
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixture = process.argv[3] && process.argv[2] === "--fixture" ? process.argv[3] : "";
  try {
    if (fixture !== "host-native") throw new Error("qualification_fixture_unsupported");
    await runInteractiveHostQualification(process.env.QUALIFICATION_RUNTIME_ROOT);
  } catch (error) {
    process.stderr.write(`${/^qualification_/.test(error?.message ?? "") ? error.message : "qualification_failed"}\n`);
    process.exitCode = 1;
  }
}
