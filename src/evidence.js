import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

export const SCHEMA_VERSION = 2;
export const LEGACY_SCHEMA_VERSION = 1;

const STAGE_NAMES = ["url", "request", "authentication", "origin", "capabilities", "stream"];
const STAGE_STATES = new Set(["passed", "failed", "not_verified"]);
const DEPLOYMENT_CONDITIONS = new Set([
  "host_native_loopback",
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
]);
const TRUST_CLASSES = new Set(["loopback_http", "trusted_https", "simulated"]);
const ORIGIN_VERDICTS = new Set(["exact_origin_passed", "origin_rejected", "not_verified"]);
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,159}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{7,159}$/;
const SAFE_REASON = /^[a-z][a-z0-9_]{0,79}$/;
const RECEIPT_DIGEST = /^[a-f0-9]{64}$/;
const RECEIPT_ORDINALS = new Set([1, 2]);
const VERIFIED_STAGE_NAMES = ["url", "relay", "authentication", "capabilities", "stream", "cleanup"];
const usedQualificationIds = new Set();

function invalid(field) {
  throw new Error(`evidence_invalid_${field}`);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function safeToken(value, field) {
  if (typeof value !== "string" || !SAFE_TOKEN.test(value)) invalid(field);
  return value;
}

function safeDigest(value, field) {
  if (typeof value !== "string" || !RECEIPT_DIGEST.test(value)) invalid(field);
  return value;
}

function exactKeys(value, keys, field) {
  if (!plainObject(value) || Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) invalid(field);
  return value;
}

function safeInteger(value, field, maximum = 86_400_000) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) invalid(field);
  return value;
}

function safeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) invalid("recordedAt");
  return value;
}

function sanitizeShape(value, depth = 0) {
  if (depth > 16) invalid("shape");
  if (value === null) return null;
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (Array.isArray(value)) return value.slice(0, 32).map((item) => sanitizeShape(item, depth + 1));
  if (!plainObject(value)) invalid("shape");
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) invalid("shape");
    output[key] = sanitizeShape(value[key], depth + 1);
  }
  return output;
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

export function hashSanitizedShape(shape) {
  return createHash("sha256").update(canonicalize(sanitizeShape(shape))).digest("hex");
}

function sanitizeStages(stages) {
  if (!plainObject(stages)) invalid("requiredStages");
  const output = {};
  for (const name of STAGE_NAMES) {
    if (!STAGE_STATES.has(stages[name])) invalid("requiredStages");
    output[name] = stages[name];
  }
  return output;
}

function sanitizeSseFrames(frames) {
  if (!Array.isArray(frames) || frames.length > 512) invalid("sseFrames");
  return frames.map((frame, index) => {
    if (!plainObject(frame)) invalid("sseFrames");
    const event = safeToken(frame.event ?? "message", "sseFrames");
    const idBehavior = typeof frame.idBehavior === "string"
      ? frame.idBehavior
      : frame.id === null || frame.id === undefined ? "absent" : "present";
    if (!new Set(["absent", "present", "changed"]).has(idBehavior)) invalid("sseFrames");
    return {
      event,
      idBehavior,
      order: safeInteger(frame.order ?? index + 1, "sseFrames", 10_000),
      elapsedMs: safeInteger(frame.elapsedMs ?? 0, "sseFrames"),
      dataBytes: safeInteger(frame.dataBytes, "sseFrames", 10_485_760),
      shapeHash: hashSanitizedShape(frame.shape ?? {}),
    };
  });
}

function safeReason(value, stages) {
  if (value === undefined || value === null) {
    return STAGE_NAMES.some((stage) => stages[stage] === "failed") ? "required_stage_failed" : "not_verified";
  }
  if (typeof value !== "string" || !SAFE_REASON.test(value)) invalid("reasonCode");
  return value;
}

export function sanitizeObservation(observation) {
  if (!plainObject(observation)) invalid("observation");
  if (typeof observation.runId !== "string" || !SAFE_RUN_ID.test(observation.runId)) invalid("runId");
  const deploymentCondition = observation.deploymentCondition;
  const trustClass = observation.trustClass;
  if (!DEPLOYMENT_CONDITIONS.has(deploymentCondition)) invalid("deploymentCondition");
  if (!TRUST_CLASSES.has(trustClass)) invalid("trustClass");
  if (typeof observation.realPath !== "boolean" || typeof observation.simulation !== "boolean") invalid("pathClassification");
  const requiredStages = sanitizeStages(observation.requiredStages);
  if (typeof observation.freshPanelSession !== "boolean" || ![1, 2].includes(observation.sessionOrdinal)) invalid("session");
  if (!ORIGIN_VERDICTS.has(observation.originVerdict)) invalid("originVerdict");
  const capabilityShape = sanitizeShape(observation.capabilityShape ?? {});
  return Object.freeze({
    runId: observation.runId,
    recordedAt: safeDate(observation.recordedAt),
    deploymentCondition,
    trustClass,
    realPath: observation.realPath,
    simulation: observation.simulation,
    muxyVersion: safeToken(observation.muxyVersion, "muxyVersion"),
    hermesVersion: safeToken(observation.hermesVersion, "hermesVersion"),
    hermesRevisionOrDigest: safeToken(observation.hermesRevisionOrDigest, "hermesRevisionOrDigest"),
    requiredStages,
    freshPanelSession: observation.freshPanelSession,
    sessionOrdinal: observation.sessionOrdinal,
    originVerdict: observation.originVerdict,
    capabilityShapeHash: createHash("sha256").update(canonicalize(capabilityShape)).digest("hex"),
    sseFrames: sanitizeSseFrames(observation.sseFrames ?? []),
    reasonCode: safeReason(observation.reasonCode, requiredStages),
  });
}

export function buildEvidenceRecord(observation) {
  const safe = sanitizeObservation(observation);
  return Object.freeze({ schemaVersion: LEGACY_SCHEMA_VERSION, ...safe, verdict: "Unverified" });
}

function safeVersionTuple(tuple, field = "versionTuple") {
  exactKeys(tuple, ["muxyVersion", "hermesVersion", "hermesRevisionOrDigest"], field);
  return Object.freeze({
    muxyVersion: safeToken(tuple.muxyVersion, "muxyVersion"),
    hermesVersion: safeToken(tuple.hermesVersion, "hermesVersion"),
    hermesRevisionOrDigest: safeToken(tuple.hermesRevisionOrDigest, "hermesRevisionOrDigest"),
  });
}

function sameVersionTuple(left, right) {
  return left.muxyVersion === right.muxyVersion
    && left.hermesVersion === right.hermesVersion
    && left.hermesRevisionOrDigest === right.hermesRevisionOrDigest;
}

function verifiedStages() {
  return Object.freeze(Object.fromEntries(VERIFIED_STAGE_NAMES.map((stage) => [stage, "passed"])));
}

function sanitizeReceiptBundle(bundle) {
  exactKeys(bundle, ["runId", "recordedAt", "deploymentCondition", "trustClass", "versionTuple", "qualification", "panel", "relay", "fixture", "cleanup"], "receipt");
  if (typeof bundle.runId !== "string" || !SAFE_RUN_ID.test(bundle.runId)) invalid("runId");
  if (!DEPLOYMENT_CONDITIONS.has(bundle.deploymentCondition) || !TRUST_CLASSES.has(bundle.trustClass)) invalid("receipt");
  const versionTuple = safeVersionTuple(bundle.versionTuple);

  exactKeys(bundle.qualification, ["version", "qualificationId", "challengeDigest", "expectedOrdinal"], "receipt");
  const qualification = bundle.qualification;
  if (qualification.version !== 1 || !RECEIPT_ORDINALS.has(qualification.expectedOrdinal)) invalid("receipt");
  const qualificationId = safeToken(qualification.qualificationId, "qualificationId");
  const challengeDigest = safeDigest(qualification.challengeDigest, "receipt");

  exactKeys(bundle.panel, ["version", "qualificationId", "challengeDigest", "sessionOrdinal", "panelDigest", "outcomes", "digests"], "receipt");
  const panel = bundle.panel;
  exactKeys(panel.outcomes, ["relay", "authentication", "capabilities", "stream", "cleanup"], "receipt");
  exactKeys(panel.digests, ["execution", "timing", "frames", "cleanup"], "receipt");
  if (panel.version !== 1 || !RECEIPT_ORDINALS.has(panel.sessionOrdinal)
    || Object.values(panel.outcomes).some((outcome) => outcome !== "passed")) invalid("receipt");
  const panelDigest = safeDigest(panel.panelDigest, "receipt");
  for (const digest of Object.values(panel.digests)) safeDigest(digest, "receipt");

  exactKeys(bundle.relay, ["version", "qualificationId", "challengeDigest", "panelDigest", "relayDigest", "httpStatus", "incremental", "terminal", "frames"], "receipt");
  const relay = bundle.relay;
  if (relay.version !== 1 || relay.httpStatus < 200 || relay.httpStatus >= 300 || relay.incremental !== true || relay.terminal !== true) invalid("receipt");
  const relayDigest = safeDigest(relay.relayDigest, "receipt");
  const sseFrames = sanitizeSseFrames(relay.frames);
  if (sseFrames.length < 2 || sseFrames.some((frame, index) => frame.dataBytes === 0 || (index > 0 && (frame.order <= sseFrames[index - 1].order || frame.elapsedMs <= sseFrames[index - 1].elapsedMs)))) invalid("receipt");

  exactKeys(bundle.fixture, ["version", "qualificationId", "challengeDigest", "relayDigest", "fixtureDigest", "versionTuple"], "receipt");
  const fixture = bundle.fixture;
  if (fixture.version !== 1) invalid("receipt");
  const fixtureDigest = safeDigest(fixture.fixtureDigest, "receipt");
  const fixtureTuple = safeVersionTuple(fixture.versionTuple);

  exactKeys(bundle.cleanup, ["version", "qualificationId", "panelDigest", "cleanupDigest", "outcome"], "receipt");
  const cleanup = bundle.cleanup;
  if (cleanup.version !== 1 || cleanup.outcome !== "scrubbed_removed") invalid("receipt");
  const cleanupDigest = safeDigest(cleanup.cleanupDigest, "receipt");

  if (panel.qualificationId !== qualificationId || relay.qualificationId !== qualificationId || fixture.qualificationId !== qualificationId || cleanup.qualificationId !== qualificationId
    || panel.challengeDigest !== challengeDigest || relay.challengeDigest !== challengeDigest || fixture.challengeDigest !== challengeDigest
    || panel.sessionOrdinal !== qualification.expectedOrdinal || relay.panelDigest !== panelDigest || cleanup.panelDigest !== panelDigest
    || fixture.relayDigest !== relayDigest || panel.digests.cleanup !== cleanupDigest || !sameVersionTuple(versionTuple, fixtureTuple)) invalid("receiptCorrelation");

  return Object.freeze({
    runId: bundle.runId,
    recordedAt: safeDate(bundle.recordedAt),
    deploymentCondition: bundle.deploymentCondition,
    trustClass: bundle.trustClass,
    versionTuple,
    qualificationId,
    sessionOrdinal: panel.sessionOrdinal,
    panelDigest,
    relayDigest,
    fixtureDigest,
    challengeDigest,
    cleanupDigest,
    sseFrames,
  });
}

/** Build the only record shape that can carry support eligibility. */
export function buildVerifiedEvidenceRecord(verifierReceipt) {
  const safe = sanitizeReceiptBundle(verifierReceipt);
  if (usedQualificationIds.has(safe.qualificationId)) invalid("qualificationReplay");
  usedQualificationIds.add(safe.qualificationId);
  const { versionTuple, ...receipt } = safe;
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    proofSource: "verifier_receipt_bundle",
    supportEligible: true,
    ...receipt,
    ...versionTuple,
    requiredStages: verifiedStages(),
    capabilityShapeHash: hashSanitizedShape({ relay: "verified" }),
    verdict: "Unverified",
    reasonCode: "verification_complete",
  });
}

/** Build safe, explicitly ineligible history for failures and incomplete attempts. */
export function buildUnverifiedEvidenceRecord(input) {
  exactKeys(input, ["runId", "recordedAt", "deploymentCondition", "trustClass", "versionTuple", "attemptCategory", "reasonCode", "failedStage"], "unverifiedInput");
  if (!["simulation", "real_attempt", "incomplete", "failure"].includes(input.attemptCategory)) invalid("unverifiedInput");
  if (!DEPLOYMENT_CONDITIONS.has(input.deploymentCondition) || !TRUST_CLASSES.has(input.trustClass)) invalid("unverifiedInput");
  const tuple = safeVersionTuple(input.versionTuple);
  if (typeof input.runId !== "string" || !SAFE_RUN_ID.test(input.runId)) invalid("runId");
  const stages = Object.fromEntries(VERIFIED_STAGE_NAMES.map((stage) => [stage, "not_verified"]));
  if (input.failedStage !== null) {
    if (!VERIFIED_STAGE_NAMES.includes(input.failedStage)) invalid("unverifiedInput");
    stages[input.failedStage] = "failed";
  }
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    proofSource: "unverified_failure_adapter",
    supportEligible: false,
    runId: input.runId,
    recordedAt: safeDate(input.recordedAt),
    deploymentCondition: input.deploymentCondition,
    trustClass: input.trustClass,
    ...tuple,
    attemptCategory: input.attemptCategory,
    requiredStages: Object.freeze(stages),
    sseFrames: Object.freeze([]),
    verdict: "Unverified",
    reasonCode: safeReason(input.reasonCode, stages),
  });
}

export function renderEvidenceMarkdown(record) {
  validateEvidenceRecord(record);
  if (record.schemaVersion === LEGACY_SCHEMA_VERSION) return renderLegacyEvidenceMarkdown(record);
  const stages = Object.entries(record.requiredStages).map(([stage, state]) => `| ${stage} | ${state} |`).join("\n");
  const frames = record.sseFrames.length === 0
    ? "No SSE frames recorded."
    : record.sseFrames.map((frame) => `- ${frame.order}: ${frame.event}; id ${frame.idBehavior}; ${frame.elapsedMs}ms; ${frame.dataBytes} bytes; ${frame.shapeHash}`).join("\n");
  return `# Gateway validation evidence\n\n- Run ID: ${record.runId}\n- Recorded at: ${record.recordedAt}\n- Deployment condition: ${record.deploymentCondition}\n- Trust class: ${record.trustClass}\n- Proof source: ${record.proofSource}\n- Support eligible: ${record.supportEligible}\n- Muxy version: ${record.muxyVersion}\n- Hermes version: ${record.hermesVersion}\n- Hermes revision or digest: ${record.hermesRevisionOrDigest}\n- Session: ${record.sessionOrdinal ?? "not applicable"}\n- Verdict: ${record.verdict}\n- Reason: ${record.reasonCode}\n\n## Required stages\n\n| Stage | Outcome |\n| --- | --- |\n${stages}\n\n## SSE metadata\n\n${frames}\n`;
}

function renderLegacyEvidenceMarkdown(record) {
  const stages = Object.entries(record.requiredStages).map(([stage, state]) => `| ${stage} | ${state} |`).join("\n");
  const frames = record.sseFrames.length === 0 ? "No SSE frames recorded." : record.sseFrames.map((frame) => `- ${frame.order}: ${frame.event}; id ${frame.idBehavior}; ${frame.elapsedMs}ms; ${frame.dataBytes} bytes; ${frame.shapeHash}`).join("\n");
  return `# Gateway validation evidence\n\n- Run ID: ${record.runId}\n- Recorded at: ${record.recordedAt}\n- Deployment condition: ${record.deploymentCondition}\n- Trust class: ${record.trustClass}\n- Real path: ${record.realPath}\n- Simulation: ${record.simulation}\n- Muxy version: ${record.muxyVersion}\n- Hermes version: ${record.hermesVersion}\n- Hermes revision or digest: ${record.hermesRevisionOrDigest}\n- Session: ${record.sessionOrdinal} (${record.freshPanelSession ? "fresh" : "not fresh"})\n- Origin verdict: ${record.originVerdict}\n- Capability shape hash: ${record.capabilityShapeHash}\n- Verdict: ${record.verdict}\n- Reason: ${record.reasonCode}\n\n## Required stages\n\n| Stage | Outcome |\n| --- | --- |\n${stages}\n\n## SSE metadata\n\n${frames}\n`;
}

export function validateEvidenceRecord(record) {
  if (!plainObject(record) || !["Supported", "Unsupported", "Unverified"].includes(record.verdict)) invalid("record");
  if (record.schemaVersion === LEGACY_SCHEMA_VERSION) {
    sanitizeObservation(record);
    return true;
  }
  if (record.schemaVersion !== SCHEMA_VERSION || !["verifier_receipt_bundle", "unverified_failure_adapter"].includes(record.proofSource) || typeof record.supportEligible !== "boolean") invalid("record");
  const verifiedKeys = ["schemaVersion", "proofSource", "supportEligible", "runId", "recordedAt", "deploymentCondition", "trustClass", "qualificationId", "sessionOrdinal", "panelDigest", "relayDigest", "fixtureDigest", "challengeDigest", "cleanupDigest", "sseFrames", "muxyVersion", "hermesVersion", "hermesRevisionOrDigest", "requiredStages", "capabilityShapeHash", "verdict", "reasonCode"];
  const unverifiedKeys = ["schemaVersion", "proofSource", "supportEligible", "runId", "recordedAt", "deploymentCondition", "trustClass", "muxyVersion", "hermesVersion", "hermesRevisionOrDigest", "attemptCategory", "requiredStages", "sseFrames", "verdict", "reasonCode"];
  exactKeys(record, record.proofSource === "verifier_receipt_bundle" ? verifiedKeys : unverifiedKeys, "record");
  if (record.proofSource === "verifier_receipt_bundle" && record.supportEligible !== true) invalid("record");
  if (record.proofSource === "unverified_failure_adapter" && record.supportEligible !== false) invalid("record");
  if (typeof record.runId !== "string" || !SAFE_RUN_ID.test(record.runId) || !DEPLOYMENT_CONDITIONS.has(record.deploymentCondition) || !TRUST_CLASSES.has(record.trustClass)) invalid("record");
  safeDate(record.recordedAt);
  safeVersionTuple({ muxyVersion: record.muxyVersion, hermesVersion: record.hermesVersion, hermesRevisionOrDigest: record.hermesRevisionOrDigest });
  if (!plainObject(record.requiredStages) || Object.keys(record.requiredStages).length !== VERIFIED_STAGE_NAMES.length || VERIFIED_STAGE_NAMES.some((stage) => !STAGE_STATES.has(record.requiredStages[stage]))) invalid("record");
  sanitizeSseFrames(record.sseFrames);
  return true;
}

async function withIndexLock(outputDir, action) {
  const lockPath = join(outputDir, ".index.lock");
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      const lock = await open(lockPath, "wx");
      try {
        return await action();
      } finally {
        await lock.close();
        await rm(lockPath, { force: true });
      }
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        if (Date.now() - (await stat(lockPath)).mtimeMs > 60_000) await rm(lockPath, { force: true });
      } catch { /* A competing writer released it. */ }
      if (Date.now() >= deadline) throw new Error("evidence_index_lock_timeout");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

function summaryForIndex(record, outputDir) {
  return {
    runId: record.runId,
    recordedAt: record.recordedAt,
    deploymentCondition: record.deploymentCondition,
    trustClass: record.trustClass,
    muxyVersion: record.muxyVersion,
    hermesVersion: record.hermesVersion,
    hermesRevisionOrDigest: record.hermesRevisionOrDigest,
    verdict: record.verdict,
    reasonCode: record.reasonCode,
    reportJson: relative(outputDir, join(outputDir, "runs", record.runId, "report.json")),
    reportMarkdown: relative(outputDir, join(outputDir, "runs", record.runId, "report.md")),
  };
}

export async function appendEvidenceIndex({ outputDir, record }) {
  return withIndexLock(outputDir, async () => {
    const index = await readEvidenceIndex(outputDir);
    const history = Array.isArray(index.history) ? [...index.history] : [];
    if (history.some((entry) => entry?.runId === record.runId)) throw new Error("evidence_run_already_indexed");
    history.push(summaryForIndex(record, outputDir));
    history.sort((left, right) => `${left.recordedAt}:${left.runId}`.localeCompare(`${right.recordedAt}:${right.runId}`));
    return writeEvidenceIndexUnlocked({ outputDir, index: { schemaVersion: SCHEMA_VERSION, history } });
  });
}

async function readEvidenceIndex(outputDir) {
  const indexPath = join(outputDir, "index.json");
  try {
    return JSON.parse(await readFile(indexPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { schemaVersion: SCHEMA_VERSION, history: [] };
    throw new Error("evidence_index_invalid");
  }
}

export async function writeEvidenceIndex({ outputDir, index }) {
  return withIndexLock(outputDir, () => writeEvidenceIndexUnlocked({ outputDir, index }));
}

export async function updateEvidenceIndexAtomically({ outputDir, update }) {
  if (typeof update !== "function") invalid("indexUpdater");
  return withIndexLock(outputDir, async () => writeEvidenceIndexUnlocked({ outputDir, index: await update() }));
}

async function writeEvidenceIndexUnlocked({ outputDir, index }) {
  if (!plainObject(index) || ![LEGACY_SCHEMA_VERSION, SCHEMA_VERSION].includes(index.schemaVersion)) invalid("index");
  const indexPath = join(outputDir, "index.json");
  const temporaryPath = join(outputDir, `.index-${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, indexPath);
  return index;
}

export async function writeEvidencePair({ outputDir, record }) {
  validateEvidenceRecord(record);
  const runsDir = join(outputDir, "runs");
  const finalDir = join(runsDir, record.runId);
  const temporaryDir = join(runsDir, `.${record.runId}-${randomUUID()}.tmp`);
  await mkdir(runsDir, { recursive: true });
  try {
    await mkdir(temporaryDir, { recursive: false });
    const jsonPath = join(temporaryDir, "report.json");
    const markdownPath = join(temporaryDir, "report.md");
    await Promise.all([
      writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 }),
      writeFile(markdownPath, renderEvidenceMarkdown(record), { mode: 0o600 }),
    ]);
    await rename(temporaryDir, finalDir);
    return { runId: record.runId, jsonPath: join(finalDir, "report.json"), markdownPath: join(finalDir, "report.md") };
  } catch (error) {
    await rm(temporaryDir, { recursive: true, force: true });
    if (error?.code === "EEXIST") throw new Error("evidence_run_already_exists");
    throw error;
  }
}

export function createRunId(now = new Date()) {
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `run-${timestamp}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
