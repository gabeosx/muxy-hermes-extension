import { createHash } from "node:crypto";
import { open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const CONDITIONS = new Set(["host_native_loopback", "docker_published_loopback", "ssh_local_forward", "direct_remote_https", "remote_muxy_workspace"]);
const REAL_CONDITIONS = new Set(["host_native_loopback", "docker_published_loopback"]);
const LIFECYCLES = new Set(["same_panel", "recreated_panel"]);
const STATUSES = new Set(["active", "terminal"]);
const SIGNATURES = new Set(["refused_or_unreachable", "observer_interrupted", "observer_restored", "buffered_or_delayed", "panel_recreated", "certificate_validated", "authentication", "exact_origin_cors", "unbuffered_delivery", "workspace_path_absent"]);

function invalid() { throw new Error("recovery_observation_invalid"); }
function plain(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function exact(value, keys) { if (!plain(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) invalid(); }
function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function safeDigest(value) { if (typeof value !== "string" || !DIGEST.test(value)) invalid(); return value; }
function safeSignatures(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) invalid();
  const output = [...new Set(value)].sort();
  if (output.length !== value.length || !output.every((item) => typeof item === "string" && SIGNATURES.has(item))) invalid();
  return output;
}
function inside(root, value) {
  const absolute = resolve(value);
  const fromRoot = relative(root, absolute);
  if (fromRoot.startsWith("..") || fromRoot === "" || fromRoot === "." || /^\.\.(?:[\\/]|$)/.test(fromRoot)) invalid();
  return absolute;
}

function safeChallenge(value) {
  exact(value, ["challengeDigest", "expectedCondition", "expectedLifecycle", "expectedSignatures", "expiresAt", "nonce", "version"]);
  if (value.version !== 1 || typeof value.nonce !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(value.nonce) || typeof value.expiresAt !== "string") invalid();
  safeDigest(value.challengeDigest);
  if (!CONDITIONS.has(value.expectedCondition) || !LIFECYCLES.has(value.expectedLifecycle)) invalid();
  return { ...value, expectedSignatures: safeSignatures(value.expectedSignatures) };
}
function safePanel(value) {
  exact(value, ["challengeDigest", "lifecycle", "observerAttempts", "outcomeDigests", "panelDigest", "signatures", "statusClass", "version"]);
  if (value.version !== 1 || !LIFECYCLES.has(value.lifecycle) || !STATUSES.has(value.statusClass) || !Number.isInteger(value.observerAttempts) || value.observerAttempts < 0 || value.observerAttempts > 2) invalid();
  exact(value.outcomeDigests, ["recovery", "status"]);
  safeDigest(value.challengeDigest); safeDigest(value.panelDigest); safeDigest(value.outcomeDigests.recovery); safeDigest(value.outcomeDigests.status);
  return { ...value, signatures: safeSignatures(value.signatures) };
}
function safeFixture(value) {
  exact(value, ["challengeDigest", "condition", "fixtureDigest", "lifecycle", "signatures", "version"]);
  if (value.version !== 1 || !CONDITIONS.has(value.condition) || !LIFECYCLES.has(value.lifecycle)) invalid();
  safeDigest(value.challengeDigest); safeDigest(value.fixtureDigest);
  return { ...value, signatures: safeSignatures(value.signatures) };
}
function safeCleanup(value) {
  exact(value, ["challengeDigest", "cleanup", "cleanupDigest", "version"]);
  if (value.version !== 1 || value.cleanup !== "scrubbed_removed") invalid();
  safeDigest(value.challengeDigest); safeDigest(value.cleanupDigest);
  return value;
}

/** Validates exact verifier-owned receipts and produces a digest-only bundle. */
export function buildRecoveryReceiptBundle(value) {
  exact(value, ["challenge", "cleanup", "fixture", "panel"]);
  const challenge = safeChallenge(value.challenge);
  const panel = safePanel(value.panel);
  const fixture = safeFixture(value.fixture);
  const cleanup = safeCleanup(value.cleanup);
  if (new Set([challenge.challengeDigest, panel.challengeDigest, fixture.challengeDigest, cleanup.challengeDigest]).size !== 1) invalid();
  if (challenge.expectedCondition !== fixture.condition || challenge.expectedLifecycle !== panel.lifecycle || fixture.lifecycle !== panel.lifecycle) invalid();
  const expected = challenge.expectedSignatures.join("\0");
  if (panel.signatures.join("\0") !== expected || fixture.signatures.join("\0") !== expected) invalid();
  if (panel.lifecycle === "same_panel" && (panel.observerAttempts < 1 || !panel.signatures.includes("observer_interrupted") || !panel.signatures.includes("observer_restored"))) invalid();
  if (panel.lifecycle === "recreated_panel" && (panel.observerAttempts !== 0 || !panel.signatures.includes("panel_recreated"))) invalid();
  return Object.freeze({ condition: fixture.condition, lifecycle: panel.lifecycle, statusClass: panel.statusClass, observerAttempts: panel.observerAttempts, signatures: Object.freeze(panel.signatures), challengeDigest: challenge.challengeDigest, panelDigest: panel.panelDigest, fixtureDigest: fixture.fixtureDigest, cleanupDigest: cleanup.cleanupDigest, bundleDigest: digest({ challenge, panel, fixture, cleanup }) });
}

function replacement(row, bundle) {
  const real = REAL_CONDITIONS.has(bundle.condition);
  const terminal = bundle.statusClass === "terminal";
  return {
    ...row,
    scenario: real ? "native_fixture" : "local_behavior_simulation",
    observedBehavior: bundle.lifecycle === "recreated_panel" ? "fresh_panel_status_recovered" : "interrupted_status_reconciled",
    requestOutcome: bundle.signatures.includes("refused_or_unreachable") ? "refused" : bundle.lifecycle === "same_panel" ? "interrupted" : "authenticated",
    observerAttempts: bundle.observerAttempts,
    statusOutcome: terminal ? "terminal" : "active",
    reattached: bundle.signatures.includes("observer_restored"),
    panelLifecycle: bundle.lifecycle === "recreated_panel" ? "recreated" : "open",
    eventHistoryConfidence: "incomplete",
    approvalDetailConfidence: "unavailable",
    cleanup: "scrubbed_removed",
    actual: real,
    pinnedRuntime: bundle.condition === "host_native_loopback",
    nativePanel: real,
    verdict: real ? "Observed" : "Unverified",
    signatures: bundle.signatures,
    provenance: real
      ? { proofSource: "recovery_receipt_bundle", challengeDigest: bundle.challengeDigest, panelDigest: bundle.panelDigest, fixtureDigest: bundle.fixtureDigest, cleanupDigest: bundle.cleanupDigest, bundleDigest: bundle.bundleDigest }
      : { proofSource: "simulation_receipt", bundleDigest: bundle.bundleDigest },
  };
}

async function withLock(path, operation) {
  let handle;
  try { handle = await open(path, "wx", 0o600); } catch { throw new Error("recovery_observation_locked"); }
  try { return await operation(); } finally { await handle.close().catch(() => {}); await rm(path, { force: true }).catch(() => {}); }
}

/** Projects one verified receipt bundle into a caller-owned evidence file through an atomic replace. */
export async function projectRecoveryObservation({ root, inputPath, outputPath, bundle }) {
  if (typeof root !== "string" || !root) invalid();
  const safeRoot = resolve(root);
  const input = inside(safeRoot, inputPath);
  const output = inside(safeRoot, outputPath);
  if (dirname(input) !== dirname(output)) invalid();
  const safeBundle = buildRecoveryReceiptBundle(bundle);
  const lockPath = `${output}.lock`;
  return withLock(lockPath, async () => {
    let document;
    try { document = JSON.parse(await readFile(input, "utf8")); } catch { invalid(); }
    if (!Array.isArray(document?.conditions) || document.conditions.length !== 5) invalid();
    const index = document.conditions.findIndex((row) => row?.id === safeBundle.condition);
    if (index < 0) invalid();
    const conditions = [...document.conditions];
    conditions[index] = replacement(conditions[index], safeBundle);
    const projected = { ...document, conditions };
    const temporary = `${output}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(projected, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await rename(temporary, output);
    return Object.freeze({ bundleDigest: safeBundle.bundleDigest, outputPath: output });
  });
}
