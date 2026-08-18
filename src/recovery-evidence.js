const CONDITIONS = Object.freeze(["host_native_loopback", "docker_published_loopback", "ssh_local_forward", "direct_remote_https", "remote_muxy_workspace"]);
const REMOTE_ANALOGUES = new Set(CONDITIONS.slice(2));
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,79}$/;
const TOKEN = /^[a-z][a-z0-9_]{0,47}$/;
const EVENT_NAMES = new Set(["message.delta", "tool", "reasoning", "approval", "terminal"]);
const REQUEST_OUTCOMES = new Set(["authenticated", "refused", "unreachable", "interrupted", "not_run"]);
const STATUS_OUTCOMES = new Set(["terminal", "active", "unavailable", "not_run"]);
const PANEL_LIFECYCLES = new Set(["open", "recreated", "not_run"]);
const CONFIDENCE = new Set(["incomplete", "unavailable"]);
const CLEANUP = new Set(["scrubbed_removed", "not_run", "failed"]);
const VERDICTS = new Set(["Observed", "Unverified"]);
const SIGNATURES = new Set(["refused_or_unreachable", "observer_interrupted", "observer_restored", "buffered_or_delayed", "panel_recreated", "certificate_validated", "authentication", "exact_origin_cors", "unbuffered_delivery", "workspace_path_absent"]);
const SIGNATURE_COPY = Object.freeze({
  refused_or_unreachable: "Refusal or unreachable",
  observer_interrupted: "Observer interrupted",
  observer_restored: "Observer restored",
  buffered_or_delayed: "Buffered or delayed",
  panel_recreated: "Panel recreated",
  certificate_validated: "Certificate validated",
  authentication: "Authentication",
  exact_origin_cors: "Exact-origin CORS",
  unbuffered_delivery: "Unbuffered delivery",
  workspace_path_absent: "Workspace path absent",
});

function invalid() { throw new Error("recovery_evidence_invalid"); }
function plainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function exact(value, keys) { if (!plainObject(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) invalid(); }
function safeString(value, expression = TOKEN) { if (typeof value !== "string" || !expression.test(value)) invalid(); return value; }
function safeBoolean(value) { if (typeof value !== "boolean") invalid(); return value; }
function safeDigest(value) { return safeString(value, DIGEST); }

function sanitizeTuple(tuple) {
  exact(tuple, ["muxyVersion", "hermesVersion", "hermesRevisionOrDigest"]);
  return Object.freeze({ muxyVersion: safeString(tuple.muxyVersion, VERSION), hermesVersion: safeString(tuple.hermesVersion, VERSION), hermesRevisionOrDigest: safeDigest(tuple.hermesRevisionOrDigest) });
}

function sanitizeSignatures(value) {
  if (!Array.isArray(value) || value.length > 10) invalid();
  const output = [...value].sort();
  if (new Set(output).size !== output.length || !output.every((signature) => SIGNATURES.has(signature))) invalid();
  return Object.freeze(output);
}

function sanitizeProvenance(value, { real }) {
  if (!plainObject(value)) invalid();
  if (real) {
    exact(value, ["proofSource", "challengeDigest", "panelDigest", "fixtureDigest", "cleanupDigest", "bundleDigest"]);
    if (value.proofSource !== "recovery_receipt_bundle") invalid();
    return Object.freeze({ proofSource: value.proofSource, challengeDigest: safeDigest(value.challengeDigest), panelDigest: safeDigest(value.panelDigest), fixtureDigest: safeDigest(value.fixtureDigest), cleanupDigest: safeDigest(value.cleanupDigest), bundleDigest: safeDigest(value.bundleDigest) });
  }
  exact(value, ["proofSource", "bundleDigest"]);
  if (value.proofSource !== "simulation_receipt") invalid();
  return Object.freeze({ proofSource: value.proofSource, bundleDigest: safeDigest(value.bundleDigest) });
}

function sanitizeRow(row, index) {
  exact(row, ["id", "scenario", "observedBehavior", "requestOutcome", "observerAttempts", "statusOutcome", "reattached", "panelLifecycle", "eventHistoryConfidence", "approvalDetailConfidence", "cleanup", "actual", "pinnedRuntime", "nativePanel", "verdict", "signatures", "provenance"]);
  if (row.id !== CONDITIONS[index] || !Number.isInteger(row.observerAttempts) || row.observerAttempts < 0 || row.observerAttempts > 2) invalid();
  const requestOutcome = safeString(row.requestOutcome);
  const statusOutcome = safeString(row.statusOutcome);
  const panelLifecycle = safeString(row.panelLifecycle);
  const cleanup = safeString(row.cleanup);
  if (!REQUEST_OUTCOMES.has(requestOutcome) || !STATUS_OUTCOMES.has(statusOutcome) || !PANEL_LIFECYCLES.has(panelLifecycle) || !CLEANUP.has(cleanup)) invalid();
  if (!CONFIDENCE.has(safeString(row.eventHistoryConfidence)) || !CONFIDENCE.has(safeString(row.approvalDetailConfidence))) invalid();
  if (row.reattached && row.observerAttempts < 1) invalid();
  let actual = safeBoolean(row.actual);
  let verdict = safeString(row.verdict, /^(Observed|Unverified)$/);
  if (!VERDICTS.has(verdict)) invalid();
  if (REMOTE_ANALOGUES.has(row.id)) { actual = false; verdict = "Unverified"; }
  const real = actual && verdict === "Observed";
  if (real && (!row.nativePanel || cleanup !== "scrubbed_removed")) invalid();
  if (!real && (actual || verdict !== "Unverified")) invalid();
  const provenance = sanitizeProvenance(row.provenance, { real });
  if (REMOTE_ANALOGUES.has(row.id) && provenance.proofSource !== "simulation_receipt") invalid();
  return Object.freeze({
    id: row.id, scenario: safeString(row.scenario), observedBehavior: safeString(row.observedBehavior), requestOutcome,
    observerAttempts: row.observerAttempts, statusOutcome, reattached: safeBoolean(row.reattached), panelLifecycle,
    eventHistoryConfidence: row.eventHistoryConfidence, approvalDetailConfidence: row.approvalDetailConfidence, cleanup, actual,
    pinnedRuntime: safeBoolean(row.pinnedRuntime), nativePanel: safeBoolean(row.nativePanel), verdict,
    signatures: sanitizeSignatures(row.signatures), provenance,
  });
}

export function sanitizeRecoveryEvidence(value, { requireComplete = false } = {}) {
  exact(value, ["schemaVersion", "fixtureId", "versionTuple", "capability", "representativeEvents", "controlStatus", "conditions"]);
  if (value.schemaVersion !== 2 || value.fixtureId !== "recovery-v1") invalid();
  exact(value.capability, ["names", "shapeHash"]);
  if (!Array.isArray(value.capability.names) || value.capability.names.length < 1 || value.capability.names.length > 16) invalid();
  const names = [...value.capability.names].map((name) => safeString(name)).sort();
  if (new Set(names).size !== names.length) invalid();
  if (!Array.isArray(value.representativeEvents) || value.representativeEvents.length < 2 || value.representativeEvents.length > 8) invalid();
  const events = value.representativeEvents.map((event) => {
    exact(event, ["name", "dataBytes", "shapeHash"]);
    if (!EVENT_NAMES.has(event.name) || !Number.isInteger(event.dataBytes) || event.dataBytes < 1 || event.dataBytes > 65536) invalid();
    return Object.freeze({ name: event.name, dataBytes: event.dataBytes, shapeHash: safeDigest(event.shapeHash) });
  });
  exact(value.controlStatus, ["controlOutcome", "statusOutcome"]);
  if (!new Set(["not_exercised", "accepted", "rejected"]).has(safeString(value.controlStatus.controlOutcome)) || !STATUS_OUTCOMES.has(safeString(value.controlStatus.statusOutcome))) invalid();
  if (!Array.isArray(value.conditions) || value.conditions.length !== CONDITIONS.length) invalid();
  const conditions = value.conditions.map(sanitizeRow);
  if (requireComplete) {
    for (const row of conditions.slice(0, 2)) {
      if (!row.actual || row.verdict !== "Observed" || !row.nativePanel || row.cleanup !== "scrubbed_removed" || row.provenance.proofSource !== "recovery_receipt_bundle") invalid();
    }
    const host = conditions[0];
    if (!host.pinnedRuntime || host.requestOutcome !== "authenticated" || host.statusOutcome !== "terminal" || host.panelLifecycle !== "recreated" || !host.signatures.includes("panel_recreated")) invalid();
    const docker = conditions[1];
    if (docker.requestOutcome !== "interrupted" || docker.observerAttempts < 1 || !docker.reattached || docker.statusOutcome !== "terminal" || !docker.signatures.includes("observer_interrupted") || !docker.signatures.includes("observer_restored")) invalid();
  }
  return Object.freeze({ schemaVersion: 2, fixtureId: "recovery-v1", versionTuple: sanitizeTuple(value.versionTuple), capability: Object.freeze({ names: Object.freeze(names), shapeHash: safeDigest(value.capability.shapeHash) }), representativeEvents: Object.freeze(events), controlStatus: Object.freeze({ controlOutcome: value.controlStatus.controlOutcome, statusOutcome: value.controlStatus.statusOutcome }), conditions: Object.freeze(conditions) });
}

export async function loadRecoveryEvidence({ fetchImpl = globalThis.fetch, url = "/evidence/recovery-v1.json" } = {}) {
  if (url !== "/evidence/recovery-v1.json" || typeof fetchImpl !== "function") invalid();
  let response;
  try { response = await fetchImpl(url, { credentials: "same-origin" }); } catch { throw new Error("recovery_evidence_unavailable"); }
  if (!response?.ok) throw new Error("recovery_evidence_unavailable");
  try { return sanitizeRecoveryEvidence(await response.json()); } catch (error) { if (error?.message === "recovery_evidence_invalid") throw error; throw new Error("recovery_evidence_invalid"); }
}

export function renderRecoveryEvidence(evidence) {
  const safe = sanitizeRecoveryEvidence(evidence);
  return Object.freeze(safe.conditions.map((row) => {
    const labels = row.signatures.map((signature) => SIGNATURE_COPY[signature]).join("; ");
    const signatureCopy = labels ? `Observed behavior signatures: ${labels}. ` : "";
    return Object.freeze({ id: row.id, verdict: row.verdict, details: row.verdict === "Unverified"
      ? `${signatureCopy}Unverified: local behavior evidence does not establish deployment support. Event history is incomplete and approval detail is unavailable.`
      : `${signatureCopy}Event history is incomplete; status is authoritative and approval detail is unavailable.`, observerAttempts: row.observerAttempts });
  }));
}

export const RECOVERY_CONDITIONS = CONDITIONS;
