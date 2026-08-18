import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildEvidenceRecord } from "../src/evidence.js";
import { RunClient } from "../src/run-client.js";
import { RunController } from "../src/run-controller.js";
import { projectRecoveryObservation } from "./project-recovery-observation.mjs";

const SCENARIO_FILE = new URL("../fixtures/simulations/scenarios.json", import.meta.url);
const RECOVERY_SCENARIO_FILE = new URL("../fixtures/simulations/recovery-scenarios.json", import.meta.url);
const IDS = Object.freeze([
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
]);

function invalid() {
  throw new Error("simulation_contract_invalid");
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function waitFor(predicate, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() >= deadline) return reject(new Error("simulation_timeout"));
      setTimeout(check, 10);
    };
    check();
  });
}

function requestOptions(url, bearer, method, body, ca, extraHeaders = {}) {
  const parsed = new URL(url);
  const payload = body === null ? null : Buffer.from(JSON.stringify(body));
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${bearer}`,
  };
  if (payload) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(payload.length);
  }
  for (const [name, value] of Object.entries(extraHeaders)) {
    if (typeof name !== "string" || !/^[A-Za-z-]{1,64}$/.test(name) || typeof value !== "string" || value.length > 512) throw new Error("simulation_headers_invalid");
    headers[name] = value;
  }
  return {
    client: parsed.protocol === "https:" ? requestHttps : requestHttp,
    options: {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      method,
      path: `${parsed.pathname}${parsed.search}`,
      headers,
      // Supplying a trust root keeps ordinary certificate validation enabled.
      ...(ca ? { ca } : {}),
    },
    payload,
    route: parsed.pathname,
  };
}

/** Test-only Node relay for the existing RunClient contract. It records structure, never request values. */
export function createSimulationRelay({ ca, capture = [], onStreamChunk } = {}) {
  let activeRequest = null;
  const record = ({ method, route, headers, body }) => {
    capture.push(Object.freeze({
      method,
      route,
      headerNames: Object.keys(headers).map((name) => name.toLowerCase()).sort(),
      bodyBytes: body?.length ?? 0,
    }));
  };
  const dispatch = ({ url, bearer, method = "GET", body = null, headers = {}, onChunk, stream = false }) => new Promise((resolve, reject) => {
    let configuration;
    try { configuration = requestOptions(url, bearer, method, body, ca, headers); } catch { reject(new Error("simulation_request_invalid")); return; }
    record({ method, route: configuration.route, headers: configuration.options.headers, body: configuration.payload });
    const request = configuration.client(configuration.options, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > 256 * 1024) { request.destroy(new Error("simulation_response_too_large")); return; }
        if (stream) {
          onStreamChunk?.({ route: configuration.route, bytes: chunk.length });
          onChunk(chunk.toString("utf8"));
        }
        else chunks.push(chunk);
      });
      response.once("error", () => reject(new Error("simulation_response_failed")));
      response.once("end", () => {
        activeRequest = null;
        if (stream) resolve(Object.freeze({ httpStatus: response.statusCode ?? 0, bytes, headers: Object.freeze({ ...response.headers }) }));
        else {
          let parsed = null;
          try { parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null; } catch { reject(new Error("simulation_json_invalid")); return; }
          resolve(Object.freeze({ status: response.statusCode ?? 0, body: parsed, headers: Object.freeze({ ...response.headers }) }));
        }
      });
    });
    activeRequest = request;
    request.once("error", () => { activeRequest = null; reject(new Error("simulation_request_failed")); });
    if (configuration.payload) request.end(configuration.payload); else request.end();
  });
  return Object.freeze({
    requestJson: (request) => dispatch({ ...request, stream: false }),
    streamJournal: (request) => dispatch({ ...request, stream: true }),
    cancelActiveStream: async () => { activeRequest?.destroy(); },
  });
}

function startScriptedGateway({ bearer }) {
  const requests = [];
  let statusCalls = 0;
  let eventSubscriptions = 0;
  const server = createServer((incoming, outgoing) => {
    const requestUrl = new URL(incoming.url, "http://fixture.invalid");
    const route = requestUrl.pathname;
    requests.push(Object.freeze({ method: incoming.method, route, headerNames: Object.keys(incoming.headers).sort() }));
    if (incoming.headers.authorization !== `Bearer ${bearer}`) { outgoing.writeHead(401).end("{}"); return; }
    if (incoming.method === "POST" && route === "/v1/runs") {
      incoming.resume();
      incoming.once("end", () => { outgoing.writeHead(202, { "Content-Type": "application/json" }).end('{"run_id":"run_simulation_01"}'); });
      return;
    }
    if (incoming.method === "GET" && route === "/v1/runs/run_simulation_01") {
      statusCalls += 1;
      const status = statusCalls === 1 ? "running" : "completed";
      outgoing.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ run_id: "run_simulation_01", status, output: "" }));
      return;
    }
    if (incoming.method === "GET" && route === "/v1/runs/run_simulation_01/events") {
      eventSubscriptions += 1;
      outgoing.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      const frame = eventSubscriptions === 1
        ? '{"run_id":"run_simulation_01","event":"message.delta","delta":"alpha"}'
        : '{"run_id":"run_simulation_01","event":"run.completed"}';
      outgoing.end(`data: ${frame}\n\n`);
      return;
    }
    outgoing.writeHead(404).end("{}");
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve(Object.freeze({
        baseUrl: `http://127.0.0.1:${port}`,
        requests,
        observations: () => Object.freeze({ statusCalls, eventSubscriptions }),
        close: () => new Promise((resolveClose) => server.close(resolveClose)),
      }));
    });
  });
}

function simulationBundle({ condition, signatures, observerAttempts, statusClass = "terminal" }) {
  const orderedSignatures = [...signatures].sort();
  const challengeDigest = digest({ condition, nonce: randomBytes(16).toString("base64url") });
  const lifecycle = "same_panel";
  const challenge = {
    version: 1,
    nonce: randomBytes(16).toString("base64url"),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    expectedCondition: condition,
    expectedLifecycle: lifecycle,
    expectedSignatures: orderedSignatures,
    challengeDigest,
  };
  return {
    challenge,
    panel: {
      version: 1, challengeDigest, panelDigest: digest({ condition, role: "simulation" }), lifecycle, observerAttempts, statusClass,
      signatures: orderedSignatures, outcomeDigests: { recovery: digest({ condition, stage: "recovery" }), status: digest({ condition, stage: "status" }) },
    },
    fixture: { version: 1, challengeDigest, condition, lifecycle, signatures: orderedSignatures, fixtureDigest: digest({ condition, fixture: "local_behavior" }) },
    cleanup: { version: 1, challengeDigest, cleanup: "scrubbed_removed", cleanupDigest: digest({ condition, cleanup: "removed" }) },
  };
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

function runSilent(command, args, environment = process.env) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { env: environment, stdio: ["ignore", "ignore", "ignore"] });
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => resolveResult(Object.freeze({ exitCode, signal })));
  });
}

async function ensurePortFree(port) {
  const server = createServer();
  try {
    await new Promise((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolveListen);
    });
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

async function createTlsResources() {
  const root = await mkdtemp(join(tmpdir(), "muxy-hermes-tls-simulation-"));
  await chmod(root, 0o700);
  const certificateRoot = join(root, "certificates");
  const [gatewayPort, proxyPort] = await Promise.all([unusedLoopbackPort(), unusedLoopbackPort()]);
  if (gatewayPort === proxyPort) throw new Error("simulation_ports_not_unique");
  const token = randomBytes(24).toString("base64url");
  const suffix = randomBytes(10).toString("hex");
  return Object.freeze({
    root,
    certificateRoot,
    gatewayPort,
    proxyPort,
    token,
    projectName: `muxy-hermes-tls-${suffix}`,
    resourceDigest: digest({ suffix, gatewayPort, proxyPort }),
  });
}

async function createTlsCertificates(resources) {
  await mkdir(resources.certificateRoot, { mode: 0o700 });
  await writeFile(join(resources.root, "openssl.cnf"), "[v3_req]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n", { mode: 0o600 });
  const commands = [
    ["openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(resources.certificateRoot, "ca-key.pem"), "-out", join(resources.certificateRoot, "ca-cert.pem"), "-subj", "/CN=muxy-hermes-simulation-ca", "-days", "1"]],
    ["openssl", ["req", "-newkey", "rsa:2048", "-nodes", "-keyout", join(resources.certificateRoot, "server-key.pem"), "-out", join(resources.certificateRoot, "server.csr"), "-subj", "/CN=localhost"]],
    ["openssl", ["x509", "-req", "-in", join(resources.certificateRoot, "server.csr"), "-CA", join(resources.certificateRoot, "ca-cert.pem"), "-CAkey", join(resources.certificateRoot, "ca-key.pem"), "-CAcreateserial", "-out", join(resources.certificateRoot, "server-cert.pem"), "-days", "1", "-extfile", join(resources.root, "openssl.cnf"), "-extensions", "v3_req"]],
  ];
  for (const [command, args] of commands) {
    const result = await runSilent(command, args);
    if (result.exitCode !== 0 || result.signal) throw new Error("simulation_certificate_generation_failed");
  }
  return readFile(join(resources.certificateRoot, "ca-cert.pem"), "utf8");
}

async function waitForHttpsRelay({ relay, baseUrl }) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await relay.requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: "readiness-check" });
      if (response.status === 401 || response.status === 200) return;
    } catch { /* the TLS proxy is still starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error("simulation_https_proxy_timeout");
}

async function executeTlsStream({ baseUrl, bearer, ca }) {
  let firstChunkAt = null;
  const relay = createSimulationRelay({ ca, onStreamChunk: () => { firstChunkAt ??= Date.now(); } });
  const client = new RunClient({ relay });
  const startedAt = Date.now();
  const started = await client.start({ baseUrl, bearer, input: "HERMES_STREAM_QUALIFICATION_V1", onEvent: () => {} });
  await waitFor(() => firstChunkAt !== null, 12_000);
  await client.teardown();
  await started.stream.catch(() => {});
  return Object.freeze({ firstChunkMs: firstChunkAt - startedAt, runId: started.runId });
}

/**
 * Runs normal TLS validation against a task-owned Docker proxy. The proxy container receives
 * only fixed Gateway routes and the per-run certificate mount; no production source imports it.
 */
export async function runHttpsProxySimulation({ projectRoot, evidencePath, versions } = {}) {
  const configurations = await loadRecoveryScenarioConfigurations();
  const configuration = configurations.find((item) => item.id === "direct_remote_https");
  if (!configuration || configuration.fixture !== "isolated_docker_tls_proxy") invalid();
  const resources = await createTlsResources();
  const composeFile = new URL("../fixtures/simulations/docker-compose.yml", import.meta.url).pathname;
  const baseUrl = `https://127.0.0.1:${resources.proxyPort}`;
  const origin = "https://muxy.fixture.invalid";
  const environment = {
    ...process.env,
    HERMES_SIM_PORT: String(resources.gatewayPort),
    HERMES_TLS_PORT: String(resources.proxyPort),
    HERMES_SIM_HOME: join(resources.root, "gateway-home"),
    HERMES_SIM_TLS_DIR: resources.certificateRoot,
    HERMES_SIM_TOKEN: resources.token,
    TLS_PROXY_ORIGIN: origin,
    TLS_PROXY_MODE: "unbuffered",
  };
  let composeStarted = false;
  let cleanup = "not_run";
  let result = null;
  try {
    const ca = await createTlsCertificates(resources);
    const start = await runSilent("docker", ["compose", "-p", resources.projectName, "-f", composeFile, "up", "--detach", "--wait"], environment);
    if (start.exitCode !== 0 || start.signal) throw new Error("simulation_compose_start_failed");
    composeStarted = true;
    const trusted = createSimulationRelay({ ca });
    await waitForHttpsRelay({ relay: trusted, baseUrl });

    let certificateRefused = false;
    try { await createSimulationRelay().requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: resources.token }); } catch { certificateRefused = true; }
    if (!certificateRefused) throw new Error("simulation_certificate_refusal_missing");
    const verified = await trusted.requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: resources.token });
    const rejected = await trusted.requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: "wrong-bearer" });
    const allowed = await trusted.requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: resources.token, method: "OPTIONS", headers: { Origin: origin } });
    const denied = await trusted.requestJson({ url: `${baseUrl}/v1/capabilities`, bearer: resources.token, method: "OPTIONS", headers: { Origin: "https://not-the-fixture.invalid" } });
    if (verified.status !== 200 || rejected.status !== 401 || allowed.headers["access-control-allow-origin"] !== origin || denied.headers["access-control-allow-origin"]) throw new Error("simulation_https_contract_failed");

    // Warm the pinned Gateway before timing both proxy modes; cold model startup is not buffering.
    await executeTlsStream({ baseUrl, bearer: resources.token, ca });
    const unbuffered = await executeTlsStream({ baseUrl, bearer: resources.token, ca });
    environment.TLS_PROXY_MODE = "buffered";
    const recreate = await runSilent("docker", ["compose", "-p", resources.projectName, "-f", composeFile, "up", "--detach", "--force-recreate", "tls-proxy"], environment);
    if (recreate.exitCode !== 0 || recreate.signal) throw new Error("simulation_proxy_recreate_failed");
    await waitForHttpsRelay({ relay: trusted, baseUrl });
    const buffered = await executeTlsStream({ baseUrl, bearer: resources.token, ca });
    if (buffered.firstChunkMs < unbuffered.firstChunkMs + 220) throw new Error("simulation_buffering_contract_failed");

    const signatures = configuration.signatures;
    result = Object.freeze({
      certificateRefused,
      certificateValidated: true,
      authenticationRejected: true,
      authenticationAccepted: true,
      exactOriginCors: true,
      unbufferedFirstChunk: true,
      bufferedComparison: true,
      resourceDigest: resources.resourceDigest,
      resourcesDisjoint: true,
      verdict: "Unverified",
    });
  } finally {
    let composeRemoved = !composeStarted;
    try {
      if (composeStarted) {
        const stopped = await runSilent("docker", ["compose", "-p", resources.projectName, "-f", composeFile, "down", "--remove-orphans"], environment);
        composeRemoved = stopped.exitCode === 0 && !stopped.signal;
      }
      await Promise.all([ensurePortFree(resources.gatewayPort), ensurePortFree(resources.proxyPort)]);
      await rm(resources.root, { recursive: true, force: true });
      cleanup = composeRemoved ? "scrubbed_removed" : "not_run";
    } catch { cleanup = "not_run"; }
    if (cleanup === "scrubbed_removed" && typeof projectRoot === "string" && typeof evidencePath === "string") {
      const bundle = simulationBundle({ condition: "direct_remote_https", signatures: configuration.signatures, observerAttempts: 1 });
      await projectRecoveryObservation({ root: projectRoot, inputPath: evidencePath, outputPath: evidencePath, bundle });
    }
  }
  if (cleanup !== "scrubbed_removed" || !result) throw new Error("simulation_cleanup_unproved");
  return Object.freeze({ ...result, cleanup });
}

function signaturesFor(scenarioId) {
  if (scenarioId === "ssh_local_forward") return ["refused_or_unreachable", "observer_interrupted", "observer_restored"];
  if (scenarioId === "remote_muxy_workspace") return ["workspace_path_absent"];
  if (scenarioId === "direct_remote_https") return ["certificate_validated", "authentication", "exact_origin_cors", "unbuffered_delivery", "buffered_or_delayed"];
  invalid();
}

/**
 * Executes a local behavioral analogue through RunClient and RunController. It cannot select
 * a production topology: the scenario ID only selects predeclared fixture assertions.
 */
export async function runRecoverySimulation({ scenarioId, projectRoot, evidencePath, versions, workspaceContext = "", attemptedActual, attemptedNativePanel, attemptedVerdict } = {}) {
  const scenarios = await loadSimulationScenarios();
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const configurations = await loadRecoveryScenarioConfigurations();
  const configuration = configurations.find((item) => item.id === scenarioId);
  if (!scenario || !scenario.simulation || scenario.realPath || !["ssh_local_forward", "remote_muxy_workspace"].includes(scenarioId)) invalid();
  if (!configuration || configuration.fixture !== "common_run_client_controller" || configuration.signatures.join("\0") !== signaturesFor(scenarioId).sort().join("\0")) invalid();
  if (typeof projectRoot !== "string" || typeof evidencePath !== "string") invalid();
  // These caller values are deliberately ignored; the receipt projector forces the simulation verdict.
  void attemptedActual; void attemptedNativePanel; void attemptedVerdict;
  const bearer = randomBytes(24).toString("base64url");
  const capture = [];
  let refusalExercised = scenarioId !== "ssh_local_forward";
  if (scenarioId === "ssh_local_forward") {
    const refusedPort = await unusedLoopbackPort();
    try { await createSimulationRelay().requestJson({ url: `http://127.0.0.1:${refusedPort}/v1/capabilities`, bearer }); } catch { refusalExercised = true; }
  }
  const gateway = await startScriptedGateway({ bearer });
  let cleanup = "not_run";
  try {
    const relay = createSimulationRelay({ capture });
    const controller = new RunController({
      baseUrl: gateway.baseUrl,
      bearer,
      capabilities: ["run_submission", "run_status", "run_events_sse"],
      client: new RunClient({ relay }),
      recoveryDelays: [1, 1],
      sleep: async () => {},
    });
    await controller.start("simulation fixture request");
    await waitFor(() => controller.snapshot.status === "completed" && controller.snapshot.recovery.observerAttempts >= 1);
    const observations = gateway.observations();
    const allCapture = JSON.stringify({ capture, requests: gateway.requests });
    const workspacePathTransmitted = typeof workspaceContext === "string" && workspaceContext.length > 0 && allCapture.includes(workspaceContext);
    if (workspacePathTransmitted || !refusalExercised || observations.eventSubscriptions < 2) throw new Error("simulation_contract_invalid");
    const observerIndexes = capture.flatMap((entry, index) => entry.route.endsWith("/events") ? [index] : []);
    const secondObserverIndex = observerIndexes[1] ?? -1;
    const statusIndex = capture.findIndex((entry) => entry.route === "/v1/runs/run_simulation_01");
    if (statusIndex < 0 || secondObserverIndex < 0 || statusIndex > secondObserverIndex) throw new Error("simulation_recovery_order_invalid");
    await controller.release();
    cleanup = "scrubbed_removed";
    const bundle = simulationBundle({ condition: scenarioId, signatures: signaturesFor(scenarioId), observerAttempts: scenarioId === "ssh_local_forward" ? 1 : 1 });
    await projectRecoveryObservation({ root: projectRoot, inputPath: evidencePath, outputPath: evidencePath, bundle });
    return Object.freeze({
      scenarioId, requestOutcome: "interrupted", statusOutcome: "terminal", observerAttempts: 1,
      reattached: scenarioId === "ssh_local_forward", safeSignatures: Object.freeze(signaturesFor(scenarioId).sort()),
      workspacePathTransmitted, cleanup, verdict: "Unverified", statusBeforeObserver: true,
    });
  } finally {
    await gateway.close();
  }
}

export async function loadSimulationScenarios() {
  let document;
  try { document = JSON.parse(await readFile(SCENARIO_FILE, "utf8")); } catch { invalid(); }
  if (document?.schemaVersion !== 1 || document?.clientContract !== "url_token_consent_relay" || !Array.isArray(document?.scenarios)) invalid();
  const scenarios = document.scenarios.map((scenario, index) => {
    if (scenario?.id !== IDS[index]
      || typeof scenario.realPath !== "boolean"
      || typeof scenario.simulation !== "boolean"
      || !["two_fresh_real_sessions", "forced_unverified"].includes(scenario.verdictPolicy)
      || !Array.isArray(scenario.faultCases)
      || scenario.faultCases.some((item) => typeof item !== "string" || !/^[a-z][a-z0-9_]{2,79}$/.test(item))) invalid();
    if (index === 0 && (!scenario.realPath || scenario.simulation || scenario.verdictPolicy !== "two_fresh_real_sessions")) invalid();
    if (index > 0 && (scenario.realPath || !scenario.simulation || scenario.verdictPolicy !== "forced_unverified")) invalid();
    return Object.freeze({
      id: scenario.id,
      realPath: scenario.realPath,
      simulation: scenario.simulation,
      verdictPolicy: scenario.verdictPolicy,
      faultCases: Object.freeze([...scenario.faultCases]),
    });
  });
  if (scenarios.length !== IDS.length) invalid();
  return Object.freeze(scenarios);
}

/** Loads the only permitted simulation labels; callers cannot supply topology behavior at runtime. */
export async function loadRecoveryScenarioConfigurations() {
  let document;
  try { document = JSON.parse(await readFile(RECOVERY_SCENARIO_FILE, "utf8")); } catch { invalid(); }
  if (document?.schemaVersion !== 1 || !Array.isArray(document.conditions) || document.conditions.length !== 7) invalid();
  const expected = new Map([
    ["ssh_local_forward", { fixture: "common_run_client_controller", signatures: ["observer_interrupted", "observer_restored", "refused_or_unreachable"] }],
    ["direct_remote_https", { fixture: "isolated_docker_tls_proxy", signatures: ["authentication", "buffered_or_delayed", "certificate_validated", "exact_origin_cors", "unbuffered_delivery"] }],
    ["remote_muxy_workspace", { fixture: "common_run_client_controller", signatures: ["workspace_path_absent"] }],
  ]);
  const configured = new Map(document.conditions.filter((condition) => expected.has(condition?.id)).map((condition) => [condition.id, condition]));
  if (configured.size !== expected.size) invalid();
  for (const [id, requirement] of expected) {
    const condition = configured.get(id);
    if (!condition || condition.forced_unverified !== true || condition.fixture !== requirement.fixture || !Array.isArray(condition.expectedSignatures)) invalid();
    const signatures = [...condition.expectedSignatures].sort();
    if (signatures.join("\0") !== requirement.signatures.join("\0")) invalid();
  }
  return Object.freeze([...expected.keys()].map((id) => Object.freeze({ id, ...expected.get(id) })));
}

function safeRunId(scenario, sessionOrdinal, recordedAt) {
  const timestamp = recordedAt.replace(/[^0-9]/g, "").slice(0, 14);
  return `sim-${scenario.id.replaceAll("_", "-")}-${sessionOrdinal}-${timestamp}`;
}

export function buildSimulationRecord({ scenario, versions, sessionOrdinal, recordedAt }) {
  if (!scenario?.simulation || scenario.realPath || scenario.verdictPolicy !== "forced_unverified") invalid();
  return buildEvidenceRecord({
    runId: safeRunId(scenario, sessionOrdinal, recordedAt),
    recordedAt,
    deploymentCondition: scenario.id,
    trustClass: "simulated",
    realPath: false,
    simulation: true,
    muxyVersion: versions?.muxyVersion,
    hermesVersion: versions?.hermesVersion,
    hermesRevisionOrDigest: versions?.hermesRevisionOrDigest,
    requiredStages: {
      url: "passed",
      request: "passed",
      authentication: "passed",
      origin: "not_verified",
      capabilities: "passed",
      stream: "passed",
    },
    freshPanelSession: true,
    sessionOrdinal,
    originVerdict: "not_verified",
    capabilityShape: { chat_completions: true, streaming: true },
    sseFrames: [
      { event: "chat.completion.chunk", order: 1, elapsedMs: 10, dataBytes: 16, shape: { choices: [{ delta: { content: "redacted" } }] } },
      { event: "chat.completion.chunk", order: 2, elapsedMs: 20, dataBytes: 16, shape: { choices: [{ delta: { content: "redacted" } }] } },
    ],
    reasonCode: "simulated_path_unverified",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const scenarios = await loadSimulationScenarios();
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    conditions: scenarios.map(({ id, realPath, simulation, verdictPolicy, faultCases }) => ({ id, realPath, simulation, verdictPolicy, faultCases })),
  }, null, 2)}\n`);
}
