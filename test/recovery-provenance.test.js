import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { RecoveryReceiptWriter } from "../src/recovery-receipt.js";
import { sanitizeRecoveryEvidence } from "../src/recovery-evidence.js";
import { buildRecoveryReceiptBundle, projectRecoveryObservation } from "../scripts/project-recovery-observation.mjs";

const ROOT = ".muxy-hermes-qualification/current";
const challengePath = `${ROOT}/recovery-challenge.json`;
const receiptPath = `${ROOT}/recovery-panel-session.json`;
const digest = (char) => `sha256:${char.repeat(64)}`;

function challenge(overrides = {}) {
  return {
    version: 1,
    nonce: "recovery-verifier-nonce-42",
    expiresAt: "2026-08-19T00:00:00.000Z",
    expectedCondition: "docker_published_loopback",
    expectedLifecycle: "same_panel",
    expectedSignatures: ["observer_interrupted", "observer_restored", "buffered_or_delayed"],
    ...overrides,
  };
}

function filesWithChallenge(value = challenge()) {
  const files = new Map([[challengePath, JSON.stringify(value)]]);
  const reads = [];
  return {
    files,
    reads,
    bridge: {
      async read(path) {
        reads.push(path);
        if (!files.has(path)) {
          throw new Error("The file could not be read because it is missing.");
        }
        const content = files.get(path);
        return { content, size: content.length };
      },
      async list(path) {
        return [...files.keys()]
          .filter((filePath) => filePath.startsWith(`${path}/`))
          .map((filePath) => ({ name: filePath.slice(path.length + 1), path: filePath, isDirectory: false, isIgnored: true }));
      },
      async write(path, content) { files.set(path, content); },
    },
  };
}

function safeSnapshot(overrides = {}) {
  return {
    recovery: {
      interruptionSeen: true,
      observerAttempts: 1,
      lifecycle: "same_panel",
      statusReconciled: true,
      statusClass: "terminal",
      ...overrides,
    },
  };
}

function evidenceTemplate() {
  const row = (id) => ({
    id,
    scenario: "local_behavior_simulation",
    observedBehavior: "not_observed",
    requestOutcome: "not_run",
    observerAttempts: 0,
    statusOutcome: "not_run",
    reattached: false,
    panelLifecycle: "not_run",
    eventHistoryConfidence: "unavailable",
    approvalDetailConfidence: "unavailable",
    cleanup: "not_run",
    actual: false,
    pinnedRuntime: false,
    nativePanel: false,
    verdict: "Unverified",
    signatures: [],
    provenance: { proofSource: "simulation_receipt", bundleDigest: digest("0") },
  });
  return {
    schemaVersion: 2,
    fixtureId: "recovery-v1",
    versionTuple: { muxyVersion: "1.5.0+945", hermesVersion: "0.20.2", hermesRevisionOrDigest: digest("a") },
    capability: { names: ["run_events_sse", "run_status", "run_submission"], shapeHash: digest("b") },
    representativeEvents: [
      { name: "message.delta", dataBytes: 5, shapeHash: digest("c") },
      { name: "terminal", dataBytes: 4, shapeHash: digest("d") },
    ],
    controlStatus: { controlOutcome: "not_exercised", statusOutcome: "terminal" },
    conditions: [
      row("host_native_loopback"), row("docker_published_loopback"), row("ssh_local_forward"), row("direct_remote_https"), row("remote_muxy_workspace"),
    ],
  };
}

function correlatedBundle(overrides = {}) {
  const challengeReceipt = challenge();
  const panel = {
    version: 1,
    challengeDigest: digest("1"),
    panelDigest: digest("2"),
    lifecycle: "same_panel",
    observerAttempts: 1,
    statusClass: "terminal",
    signatures: ["observer_interrupted", "observer_restored", "buffered_or_delayed"],
    outcomeDigests: { recovery: digest("3"), status: digest("4") },
  };
  return {
    challenge: { ...challengeReceipt, challengeDigest: digest("1") },
    panel,
    fixture: {
      version: 1,
      challengeDigest: digest("1"),
      condition: "docker_published_loopback",
      lifecycle: "same_panel",
      signatures: ["observer_interrupted", "observer_restored", "buffered_or_delayed"],
      fixtureDigest: digest("5"),
    },
    cleanup: { version: 1, challengeDigest: digest("1"), cleanup: "scrubbed_removed", cleanupDigest: digest("6") },
    ...overrides,
  };
}

function bundleFor({ condition, lifecycle, signatures, observerAttempts = lifecycle === "same_panel" ? 1 : 0 }) {
  const nonce = `recovery-verifier-nonce-${condition}`.replaceAll("_", "-").padEnd(20, "x");
  const challengeDigest = digest(condition === "host_native_loopback" ? "a" : condition === "docker_published_loopback" ? "b" : condition === "ssh_local_forward" ? "c" : condition === "direct_remote_https" ? "d" : "e");
  return {
    challenge: { version: 1, nonce, expiresAt: "2026-08-19T00:00:00.000Z", expectedCondition: condition, expectedLifecycle: lifecycle, expectedSignatures: signatures, challengeDigest },
    panel: { version: 1, challengeDigest, panelDigest: digest("2"), lifecycle, observerAttempts, statusClass: "terminal", signatures, outcomeDigests: { recovery: digest("3"), status: digest("4") } },
    fixture: { version: 1, challengeDigest, condition, lifecycle, signatures, fixtureDigest: digest("5") },
    cleanup: { version: 1, challengeDigest, cleanup: "scrubbed_removed", cleanupDigest: digest("6") },
  };
}

test("recovery receipts remain inert without a valid verifier challenge and redact every raw snapshot field", async () => {
  const missing = filesWithChallenge();
  missing.files.delete(challengePath);
  const writer = new RecoveryReceiptWriter({ files: missing.bridge, now: () => "2026-08-18T00:00:00.000Z", panelInstanceId: "panel-a" });
  await writer.observe({ ...safeSnapshot(), runId: "run_abc12345", bearer: "secret", output: "assistant text" });
  assert.equal(missing.files.has(receiptPath), false);

  const { files, reads, bridge } = filesWithChallenge();
  const valid = new RecoveryReceiptWriter({ files: bridge, now: () => "2026-08-18T00:00:00.000Z", panelInstanceId: "panel-a" });
  await valid.observe({ ...safeSnapshot(), endpoint: "https://gateway.example", runId: "run_abc12345", output: "assistant text", headers: { authorization: "Bearer secret" } });
  const receipt = JSON.parse(files.get(receiptPath));
  assert.deepEqual(Object.keys(receipt).sort(), ["challengeDigest", "lifecycle", "observerAttempts", "outcomeDigests", "panelDigest", "signatures", "statusClass", "version"]);
  assert.equal(receipt.lifecycle, "same_panel");
  assert.equal(receipt.observerAttempts, 1);
  assert.deepEqual(receipt.signatures, ["buffered_or_delayed", "observer_interrupted", "observer_restored"]);
  assert.match(JSON.stringify(receipt), /^[\s\S]*$/);
  for (const forbidden of ["secret", "gateway.example", "run_abc12345", "assistant text", "authorization", "output", "header"]) {
    assert.equal(JSON.stringify(receipt).toLowerCase().includes(forbidden), false, forbidden);
  }
  assert.equal(reads.includes(receiptPath), false, "Muxy recovery collision checks use directory listing, not missing-file error parsing");
  await valid.observe(safeSnapshot());
  assert.equal(files.size, 2, "a one-use challenge cannot overwrite a receipt");
});

test("recovery receipts fail closed for expired, malformed, mismatched, and ineligible snapshots", async () => {
  const cases = [
    challenge({ expiresAt: "2026-08-17T23:59:59.000Z" }),
    { ...challenge(), extra: true },
    challenge({ expectedLifecycle: "recreated_panel" }),
  ];
  for (const value of cases) {
    const { files, bridge } = filesWithChallenge(value);
    const writer = new RecoveryReceiptWriter({ files: bridge, now: () => "2026-08-18T00:00:00.000Z", panelInstanceId: "panel-a" });
    await writer.observe(safeSnapshot());
    assert.equal(files.has(receiptPath), false);
  }
  const { files, bridge } = filesWithChallenge();
  const writer = new RecoveryReceiptWriter({ files: bridge, now: () => "2026-08-18T00:00:00.000Z", panelInstanceId: "panel-a" });
  await writer.observe(safeSnapshot({ statusReconciled: false }));
  assert.equal(files.has(receiptPath), false);
  await writer.observe(safeSnapshot({ statusClass: "active" }));
  assert.equal(files.has(receiptPath), false, "qualification receipts wait for authoritative terminal status");
});

test("a correlated recovery receipt bundle projects only one safe row and rejects uncorrelated or caller-authored claims", async () => {
  const directory = await mkdtemp(join(tmpdir(), "muxy-recovery-provenance-"));
  const input = join(directory, "recovery-template.json");
  const output = join(directory, "recovery-evidence.json");
  await writeFile(input, JSON.stringify(evidenceTemplate()));
  const bundle = buildRecoveryReceiptBundle(correlatedBundle());
  assert.match(bundle.bundleDigest, /^sha256:[a-f0-9]{64}$/);
  await projectRecoveryObservation({ root: directory, inputPath: input, outputPath: output, bundle: correlatedBundle() });
  const projected = JSON.parse(await readFile(output, "utf8"));
  assert.equal(projected.conditions[1].verdict, "Observed");
  assert.equal(projected.conditions[1].actual, true);
  assert.equal(projected.conditions[1].provenance.proofSource, "recovery_receipt_bundle");
  assert.equal(projected.conditions[0].verdict, "Unverified");
  for (const mutate of [
    (value) => { value.fixture.challengeDigest = digest("9"); },
    (value) => { value.fixture.signatures = ["observer_interrupted"]; },
    (value) => { value.cleanup.cleanup = "failed"; },
    (value) => { value.fixture.verdict = "Observed"; },
    (value) => { value.panel.output = "raw output"; },
  ]) {
    const candidate = correlatedBundle();
    mutate(candidate);
    assert.throws(() => buildRecoveryReceiptBundle(candidate), /recovery_observation_invalid/);
  }
});

test("a receipt-ready template becomes complete only through isolated host, Docker, and simulation projections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "muxy-recovery-complete-"));
  const evidence = join(directory, "recovery-evidence.json");
  await writeFile(evidence, JSON.stringify(evidenceTemplate()));
  const cases = [
    bundleFor({ condition: "host_native_loopback", lifecycle: "recreated_panel", signatures: ["panel_recreated"] }),
    bundleFor({ condition: "docker_published_loopback", lifecycle: "same_panel", signatures: ["observer_interrupted", "observer_restored", "buffered_or_delayed", "refused_or_unreachable"] }),
    bundleFor({ condition: "ssh_local_forward", lifecycle: "same_panel", signatures: ["refused_or_unreachable"] }),
    bundleFor({ condition: "direct_remote_https", lifecycle: "same_panel", signatures: ["certificate_validated", "authentication", "exact_origin_cors", "unbuffered_delivery"] }),
    bundleFor({ condition: "remote_muxy_workspace", lifecycle: "same_panel", signatures: ["workspace_path_absent"] }),
  ];
  for (const bundle of cases) await projectRecoveryObservation({ root: directory, inputPath: evidence, outputPath: evidence, bundle });
  const complete = sanitizeRecoveryEvidence(JSON.parse(await readFile(evidence, "utf8")), { requireComplete: true });
  assert.equal(complete.conditions[0].verdict, "Observed");
  assert.equal(complete.conditions[1].verdict, "Observed");
  assert.equal(complete.conditions[1].requestOutcome, "interrupted");
  assert.ok(complete.conditions[1].signatures.includes("refused_or_unreachable"));
  for (const row of complete.conditions.slice(2)) assert.equal(row.verdict, "Unverified");
  await assert.rejects(projectRecoveryObservation({ root: directory, inputPath: evidence, outputPath: evidence, bundle: cases[1] }), /recovery_observation_invalid/);
});
