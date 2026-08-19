const QUALIFICATION_ROOT = ".muxy-hermes-qualification/current";
const CHALLENGE_PATH = `${QUALIFICATION_ROOT}/recovery-challenge.json`;
const RECEIPT_PATH = `${QUALIFICATION_ROOT}/recovery-panel-session.json`;
const CONDITIONS = new Set(["host_native_loopback", "docker_published_loopback"]);
const LIFECYCLES = new Set(["same_panel", "recreated_panel"]);
const STATUS_CLASSES = new Set(["terminal"]);
const SIGNATURES = new Set(["refused_or_unreachable", "observer_interrupted", "observer_restored", "buffered_or_delayed", "panel_recreated"]);
const CHALLENGE_KEYS = ["expectedCondition", "expectedLifecycle", "expectedSignatures", "expiresAt", "nonce", "version"];

function exact(value, keys) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function signatures(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) return null;
  const safe = [...new Set(value)].sort();
  return safe.length === value.length && safe.every((item) => typeof item === "string" && SIGNATURES.has(item)) ? safe : null;
}

function parseChallenge(content, now) {
  let value;
  try { value = JSON.parse(content); } catch { return null; }
  if (!exact(value, CHALLENGE_KEYS) || value.version !== 1 || !/^[A-Za-z0-9_-]{16,256}$/.test(value.nonce)) return null;
  if (!CONDITIONS.has(value.expectedCondition) || !LIFECYCLES.has(value.expectedLifecycle)) return null;
  const safeSignatures = signatures(value.expectedSignatures);
  if (!safeSignatures || typeof value.expiresAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt)) return null;
  const expiry = Date.parse(value.expiresAt);
  const current = Date.parse(now);
  if (!Number.isFinite(expiry) || !Number.isFinite(current) || expiry <= current) return null;
  return Object.freeze({ ...value, expectedSignatures: Object.freeze(safeSignatures) });
}

async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const result = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function eligible(snapshot, challenge) {
  const recovery = snapshot?.recovery;
  if (!recovery || typeof recovery !== "object" || recovery.lifecycle !== challenge.expectedLifecycle) return null;
  if (recovery.interruptionSeen !== true || recovery.statusReconciled !== true || !STATUS_CLASSES.has(recovery.statusClass)) return null;
  if (!Number.isInteger(recovery.observerAttempts) || recovery.observerAttempts < 0 || recovery.observerAttempts > 2) return null;
  const expected = challenge.expectedSignatures;
  if (challenge.expectedLifecycle === "same_panel" && (recovery.observerAttempts < 1 || !expected.includes("observer_interrupted") || !expected.includes("observer_restored"))) return null;
  if (challenge.expectedLifecycle === "recreated_panel" && (!expected.includes("panel_recreated") || recovery.observerAttempts !== 0)) return null;
  return Object.freeze({
    lifecycle: recovery.lifecycle,
    observerAttempts: recovery.observerAttempts,
    statusClass: recovery.statusClass,
    signatures: expected,
  });
}

/** Verifier-only panel receipt writer. It is inert unless the verifier placed an exact live challenge. */
export class RecoveryReceiptWriter {
  #files;
  #now;
  #panelInstanceId;
  #used = false;

  constructor({ files = globalThis.window?.muxy?.files ?? null, now = () => new Date().toISOString(), panelInstanceId = () => globalThis.crypto.randomUUID() } = {}) {
    this.#files = files;
    this.#now = now;
    this.#panelInstanceId = typeof panelInstanceId === "function" ? panelInstanceId() : panelInstanceId;
  }

  async observe(snapshot) {
    if (this.#used || !this.#files?.read || !this.#files?.list || !this.#files?.write || typeof this.#panelInstanceId !== "string" || this.#panelInstanceId.length < 1) return false;
    let source;
    try { source = await this.#files.read(CHALLENGE_PATH); } catch { return false; }
    const challenge = parseChallenge(source?.content, this.#now());
    if (!challenge) return false;
    const safe = eligible(snapshot, challenge);
    if (!safe) return false;
    let entries;
    try { entries = await this.#files.list(QUALIFICATION_ROOT); } catch { return false; }
    if (!Array.isArray(entries) || entries.some((entry) => entry?.path === RECEIPT_PATH)) return false;
    const challengeDigest = await digest(challenge.nonce);
    const panelDigest = await digest(this.#panelInstanceId);
    const receipt = Object.freeze({
      version: 1,
      challengeDigest,
      panelDigest,
      lifecycle: safe.lifecycle,
      observerAttempts: safe.observerAttempts,
      statusClass: safe.statusClass,
      signatures: safe.signatures,
      outcomeDigests: Object.freeze({
        recovery: await digest({ lifecycle: safe.lifecycle, observerAttempts: safe.observerAttempts, signatures: safe.signatures }),
        status: await digest({ statusClass: safe.statusClass, reconciled: true }),
      }),
    });
    try {
      await this.#files.write(RECEIPT_PATH, JSON.stringify(receipt));
      this.#used = true;
      return true;
    } catch {
      return false;
    }
  }
}
