import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { buildEvidenceRecord } from "../src/evidence.js";

const SCENARIO_FILE = new URL("../fixtures/simulations/scenarios.json", import.meta.url);
const IDS = Object.freeze([
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
]);

function invalid() {
  throw new Error("simulation_contract_invalid");
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
