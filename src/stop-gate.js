const CONDITIONS = Object.freeze([
  "host_native_loopback",
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
]);

const VERDICTS = new Set(["Supported", "Unsupported", "Unverified"]);
const STAGES = new Set(["passed", "failed", "not_verified"]);
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,159}$/;
const SAFE_REASON = /^[a-z][a-z0-9_]{0,79}$/;

function defaultRow(id) {
  return Object.freeze({
    id,
    verdict: "Unverified",
    reasonCode: "no_complete_evidence",
    latest: null,
    latestPair: null,
    lastVerifiedPair: null,
    carriedForward: false,
    history: Object.freeze([]),
  });
}

function safePair(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { muxyVersion, hermesVersion, hermesRevisionOrDigest } = value;
  if (![muxyVersion, hermesVersion, hermesRevisionOrDigest].every((part) => typeof part === "string" && SAFE_TOKEN.test(part))) return null;
  return Object.freeze({ muxyVersion, hermesVersion, hermesRevisionOrDigest });
}

function safeStages(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output = {};
  for (const stage of ["url", "request", "authentication", "origin", "capabilities", "stream"]) {
    if (!STAGES.has(value[stage])) return null;
    output[stage] = value[stage];
  }
  return Object.freeze(output);
}

function safeHistoryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const pair = safePair(value);
  const requiredStages = safeStages(value.requiredStages);
  if (!pair || !requiredStages || typeof value.realPath !== "boolean" || typeof value.simulation !== "boolean"
    || typeof value.freshPanelSession !== "boolean" || ![1, 2].includes(value.sessionOrdinal)
    || !["exact_origin_passed", "origin_rejected", "not_verified"].includes(value.originVerdict)
    || typeof value.reasonCode !== "string" || !SAFE_REASON.test(value.reasonCode)) return null;
  return Object.freeze({
    ...pair,
    realPath: value.realPath,
    simulation: value.simulation,
    freshPanelSession: value.freshPanelSession,
    sessionOrdinal: value.sessionOrdinal,
    originVerdict: value.originVerdict,
    requiredStages,
    reasonCode: value.reasonCode,
    recordedAt: typeof value.recordedAt === "string" && !Number.isNaN(Date.parse(value.recordedAt)) ? value.recordedAt : null,
  });
}

function safeRow(value, id) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.id !== id || !VERDICTS.has(value.verdict)
    || typeof value.reasonCode !== "string" || !SAFE_REASON.test(value.reasonCode)) return null;
  const history = Array.isArray(value.history) ? value.history.map(safeHistoryEntry) : [];
  if (history.some((entry) => entry === null)) return null;
  const simulatedOnly = ["ssh_local_forward", "direct_remote_https", "remote_muxy_workspace"].includes(id);
  return Object.freeze({
    id,
    verdict: simulatedOnly ? "Unverified" : value.verdict,
    reasonCode: simulatedOnly ? "simulated_path_unverified" : value.reasonCode,
    latest: safeHistoryEntry(value.latest),
    latestPair: safePair(value.latestPair),
    lastVerifiedPair: safePair(value.lastVerifiedPair),
    carriedForward: value.carriedForward === true,
    history: Object.freeze(history),
  });
}

export function sanitizeEvidenceIndex(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== 1 || !Array.isArray(value.conditions)) {
    throw new Error("evidence_index_invalid");
  }
  const byId = new Map(value.conditions.map((row) => [row?.id, row]));
  if (byId.size !== CONDITIONS.length || CONDITIONS.some((id) => !byId.has(id))) throw new Error("evidence_index_invalid");
  return Object.freeze({
    schemaVersion: 1,
    conditions: Object.freeze(CONDITIONS.map((id) => safeRow(byId.get(id), id) ?? (() => { throw new Error("evidence_index_invalid"); })())),
  });
}

export async function loadEvidenceIndex({ fetchImpl = globalThis.fetch, url = "/evidence/index.json" } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("evidence_index_unavailable");
  let response;
  if (url !== "/evidence/index.json") throw new Error("evidence_index_invalid");
  try { response = await fetchImpl(url, { credentials: "same-origin" }); } catch { throw new Error("evidence_index_unavailable"); }
  if (!response?.ok) throw new Error("evidence_index_unavailable");
  try { return sanitizeEvidenceIndex(await response.json()); } catch { throw new Error("evidence_index_invalid"); }
}

function reproducibleFailure(row, stage) {
  const failures = row.history.filter((entry) => entry.realPath && !entry.simulation && entry.freshPanelSession
    && (stage === "origin" ? entry.requiredStages.origin === "failed" || entry.originVerdict === "origin_rejected" : entry.requiredStages.stream === "failed"));
  return failures.length >= 2;
}

export function evaluateStopGate({ evidenceIndex, requiresMuxyChange = false } = {}) {
  if (requiresMuxyChange === true) return Object.freeze({ active: true, triggerCode: "requires_muxy_change", failedRealClass: null, failedStage: null, requiresMuxyChange: true });
  let safeIndex;
  try { safeIndex = sanitizeEvidenceIndex(evidenceIndex); } catch { return Object.freeze({ active: false, triggerCode: "none", failedRealClass: null, failedStage: null, requiresMuxyChange: false }); }
  for (const row of safeIndex.conditions) {
    if (reproducibleFailure(row, "origin")) return Object.freeze({ active: true, triggerCode: "real_exact_origin_failure", failedRealClass: row.id, failedStage: "origin", requiresMuxyChange: false });
    if (reproducibleFailure(row, "stream")) return Object.freeze({ active: true, triggerCode: "real_incremental_stream_failure", failedRealClass: row.id, failedStage: "stream", requiresMuxyChange: false });
  }
  return Object.freeze({ active: false, triggerCode: "none", failedRealClass: null, failedStage: null, requiresMuxyChange: false });
}

export function buildBridgeContract(stopGate) {
  if (!stopGate?.active) throw new Error("bridge_contract_requires_stop_gate");
  return Object.freeze({
    targetRequestClass: "authenticated capability discovery and incremental SSE",
    streamAbortContract: "Deliver ordered chunks while open; abort promptly when the panel closes or cancels.",
    consentResponsibilities: "Obtain explicit per-destination user consent before dispatching a request.",
    ssrfPrivateHostResponsibilities: "Apply explicit private-host and SSRF policy before connecting.",
    tlsResponsibilities: "Require normally trusted TLS for non-loopback destinations; no bypass.",
    tokenRedactionResponsibilities: "Keep bearer material out of URLs, argv, logs, files, diagnostics, and audit output.",
    corsResponsibilities: "Preserve exact-origin authorization semantics and reject wildcard, null, and reflection policies.",
    safeObservedFailure: stopGate.triggerCode,
    acceptanceTest: "A controlled two-session qualification proves exact-origin authorization and first incremental chunk delivery before completion.",
    implementationStatus: "not_implemented",
  });
}

export function copyRedactedReport(stopGate) {
  if (!stopGate?.active) throw new Error("failure_report_requires_stop_gate");
  return [
    "# Hermes Gateway Phase 1 transport stop report",
    "",
    "Phase 1 is paused. No Muxy change has been made.",
    `- Trigger: ${stopGate.triggerCode}`,
    `- Real qualification class: ${stopGate.failedRealClass ?? "not recorded"}`,
    `- Failed required stage: ${stopGate.failedStage ?? "not recorded"}`,
    "- Scope: no bridge, sidecar, provider registration, or source change was implemented.",
  ].join("\n");
}

export function renderDeploymentMatrix(index) {
  const safe = sanitizeEvidenceIndex(index);
  return safe.conditions.map((row) => Object.freeze({
    id: row.id,
    verdict: row.verdict,
    reasonCode: row.reasonCode,
    version: row.latestPair?.muxyVersion ?? row.lastVerifiedPair?.muxyVersion ?? "Not recorded",
    details: row.carriedForward ? "Previous qualified version remains supported until an observed regression." : row.reasonCode.replaceAll("_", " "),
  }));
}

export const EVIDENCE_CONDITIONS = CONDITIONS;
