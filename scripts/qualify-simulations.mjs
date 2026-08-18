import { createHash, randomBytes } from "node:crypto";
import { createServer, request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { readFile } from "node:fs/promises";
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

function requestOptions(url, bearer, method, body, ca) {
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
export function createSimulationRelay({ ca, capture = [] } = {}) {
  let activeRequest = null;
  const record = ({ method, route, headers, body }) => {
    capture.push(Object.freeze({
      method,
      route,
      headerNames: Object.keys(headers).map((name) => name.toLowerCase()).sort(),
      bodyBytes: body?.length ?? 0,
    }));
  };
  const dispatch = ({ url, bearer, method = "GET", body = null, onChunk, stream = false }) => new Promise((resolve, reject) => {
    let configuration;
    try { configuration = requestOptions(url, bearer, method, body, ca); } catch { reject(new Error("simulation_request_invalid")); return; }
    record({ method, route: configuration.route, headers: configuration.options.headers, body: configuration.payload });
    const request = configuration.client(configuration.options, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > 256 * 1024) { request.destroy(new Error("simulation_response_too_large")); return; }
        if (stream) onChunk(chunk.toString("utf8"));
        else chunks.push(chunk);
      });
      response.once("error", () => reject(new Error("simulation_response_failed")));
      response.once("end", () => {
        activeRequest = null;
        if (stream) resolve(Object.freeze({ httpStatus: response.statusCode ?? 0, bytes }));
        else {
          let parsed = null;
          try { parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null; } catch { reject(new Error("simulation_json_invalid")); return; }
          resolve(Object.freeze({ status: response.statusCode ?? 0, body: parsed }));
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

function signaturesFor(scenarioId) {
  if (scenarioId === "ssh_local_forward") return ["observer_interrupted", "observer_restored"];
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
    if (workspacePathTransmitted || observations.eventSubscriptions < 2) throw new Error("simulation_contract_invalid");
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
    ["ssh_local_forward", { fixture: "common_run_client_controller", signatures: ["observer_interrupted", "observer_restored"] }],
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
