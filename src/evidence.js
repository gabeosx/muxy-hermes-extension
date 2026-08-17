import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

export const SCHEMA_VERSION = 1;

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
  return Object.freeze({ schemaVersion: SCHEMA_VERSION, ...safe, verdict: "Unverified" });
}

export function renderEvidenceMarkdown(record) {
  validateEvidenceRecord(record);
  const stages = Object.entries(record.requiredStages).map(([stage, state]) => `| ${stage} | ${state} |`).join("\n");
  const frames = record.sseFrames.length === 0
    ? "No SSE frames recorded."
    : record.sseFrames.map((frame) => `- ${frame.order}: ${frame.event}; id ${frame.idBehavior}; ${frame.elapsedMs}ms; ${frame.dataBytes} bytes; ${frame.shapeHash}`).join("\n");
  return `# Gateway validation evidence\n\n- Run ID: ${record.runId}\n- Recorded at: ${record.recordedAt}\n- Deployment condition: ${record.deploymentCondition}\n- Trust class: ${record.trustClass}\n- Real path: ${record.realPath}\n- Simulation: ${record.simulation}\n- Muxy version: ${record.muxyVersion}\n- Hermes version: ${record.hermesVersion}\n- Hermes revision or digest: ${record.hermesRevisionOrDigest}\n- Session: ${record.sessionOrdinal} (${record.freshPanelSession ? "fresh" : "not fresh"})\n- Origin verdict: ${record.originVerdict}\n- Capability shape hash: ${record.capabilityShapeHash}\n- Verdict: ${record.verdict}\n- Reason: ${record.reasonCode}\n\n## Required stages\n\n| Stage | Outcome |\n| --- | --- |\n${stages}\n\n## SSE metadata\n\n${frames}\n`;
}

export function validateEvidenceRecord(record) {
  if (!plainObject(record) || record.schemaVersion !== SCHEMA_VERSION || !["Supported", "Unsupported", "Unverified"].includes(record.verdict)) invalid("record");
  sanitizeObservation(record);
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
    const history = Array.isArray(index.history) ? index.history.filter((entry) => entry?.runId !== record.runId) : [];
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
  if (!plainObject(index) || index.schemaVersion !== SCHEMA_VERSION) invalid("index");
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
