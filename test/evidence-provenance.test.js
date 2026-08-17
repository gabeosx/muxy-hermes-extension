import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  appendEvidenceIndex,
  buildEvidenceRecord,
  buildVerifiedEvidenceRecord,
  validateEvidenceRecord,
  writeEvidencePair,
} from "../src/evidence.js";

const DIGEST = (letter) => letter.repeat(64);
const execFile = promisify(execFileCallback);

function receiptBundle({
  qualificationId = "qualification-20260817-0001",
  panelDigest = DIGEST("a"),
  relayDigest = DIGEST("b"),
  fixtureDigest = DIGEST("c"),
  challengeDigest = DIGEST("d"),
  versionTuple: tuple = {
    muxyVersion: "1.2.3",
    hermesVersion: "0.17.0",
    hermesRevisionOrDigest: "sha256:fixture1234",
  },
  runId = "run-20260817-000000-0001",
  ...overrides
} = {}) {
  return {
    runId,
    recordedAt: "2026-08-17T12:00:00.000Z",
    deploymentCondition: "host_native_loopback",
    trustClass: "loopback_http",
    versionTuple: tuple,
    qualification: {
      version: 1, qualificationId, challengeDigest, expectedOrdinal: 1,
    },
    panel: {
      version: 1, qualificationId, challengeDigest, sessionOrdinal: 1, panelDigest,
      outcomes: { relay: "passed", authentication: "passed", capabilities: "passed", stream: "passed", cleanup: "passed" },
      digests: { execution: DIGEST("e"), timing: DIGEST("f"), frames: DIGEST("1"), cleanup: DIGEST("2") },
    },
    relay: {
      version: 1, qualificationId, challengeDigest, panelDigest, relayDigest,
      httpStatus: 200, incremental: true, terminal: true,
      frames: [
        { event: "chat.completion.chunk", idBehavior: "present", order: 1, elapsedMs: 5, dataBytes: 24, shape: { choices: [{}] } },
        { event: "chat.completion.chunk", idBehavior: "changed", order: 2, elapsedMs: 10, dataBytes: 24, shape: { choices: [{}] } },
      ],
    },
    fixture: {
      version: 1, qualificationId, challengeDigest, relayDigest, fixtureDigest,
      versionTuple: tuple,
    },
    cleanup: {
      version: 1, qualificationId, panelDigest, cleanupDigest: DIGEST("2"), outcome: "scrubbed_removed",
    },
    ...overrides,
  };
}

test("only one matching verifier receipt bundle creates a support-eligible schema-v2 record", () => {
  const record = buildVerifiedEvidenceRecord(receiptBundle());

  assert.equal(record.schemaVersion, 2);
  assert.equal(record.proofSource, "verifier_receipt_bundle");
  assert.equal(record.supportEligible, true);
  assert.deepEqual(record.requiredStages, {
    url: "passed", relay: "passed", authentication: "passed", capabilities: "passed", stream: "passed", cleanup: "passed",
  });
  assert.equal("originVerdict" in record, false);
  assert.equal(record.relayDigest, DIGEST("b"));
  assert.equal(record.fixtureDigest, DIGEST("c"));
  assert.equal(validateEvidenceRecord(record), true);
});

test("receipt mismatches, unsafe fields, and replays fail before positive evidence can be built", () => {
  assert.throws(() => buildVerifiedEvidenceRecord(receiptBundle({
    qualificationId: "qualification-20260817-mixed-panel",
    panel: { ...receiptBundle({ qualificationId: "qualification-20260817-mixed-panel" }).panel, sessionOrdinal: 2 },
  })), /evidence_invalid_receiptCorrelation/);
  assert.throws(() => buildVerifiedEvidenceRecord(receiptBundle({
    qualificationId: "qualification-20260817-mixed-version",
    fixture: { ...receiptBundle({ qualificationId: "qualification-20260817-mixed-version" }).fixture, versionTuple: { muxyVersion: "9.9.9", hermesVersion: "0.17.0", hermesRevisionOrDigest: "sha256:fixture1234" } },
  })), /evidence_invalid_receiptCorrelation/);
  assert.throws(() => buildVerifiedEvidenceRecord(receiptBundle({
    qualificationId: "qualification-20260817-unsafe",
    relay: { ...receiptBundle({ qualificationId: "qualification-20260817-unsafe" }).relay, rawBody: "Bearer secret" },
  })), /evidence_invalid_receipt/);

  const replay = receiptBundle({ qualificationId: "qualification-20260817-replay" });
  buildVerifiedEvidenceRecord(replay);
  assert.throws(() => buildVerifiedEvidenceRecord(replay), /evidence_invalid_qualificationReplay/);
});

test("verified reports publish JSON and Markdown as an atomic pair without raw receipt data", async () => {
  const output = await mkdtemp(join(tmpdir(), "hermes-provenance-"));
  try {
    const record = buildVerifiedEvidenceRecord(receiptBundle({ qualificationId: "qualification-20260817-paired", runId: "run-20260817-000000-0002" }));
    const paths = await writeEvidencePair({ outputDir: output, record });
    const index = await appendEvidenceIndex({ outputDir: output, record });
    const durable = `${await readFile(paths.jsonPath, "utf8")}\n${await readFile(paths.markdownPath, "utf8")}`;
    assert.match(durable, /verifier_receipt_bundle/);
    assert.equal(durable.includes("Bearer secret"), false);
    assert.deepEqual(index.history.map((entry) => entry.runId), [record.runId]);
    await assert.rejects(() => appendEvidenceIndex({ outputDir: output, record }), /evidence_run_already_indexed/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("schema-v1 evidence remains readable history but has no relay support eligibility", () => {
  const historical = buildEvidenceRecord({
    runId: "run-20260817-000000-0003", recordedAt: "2026-08-17T12:00:00.000Z",
    deploymentCondition: "host_native_loopback", trustClass: "loopback_http", realPath: true, simulation: false,
    muxyVersion: "1.2.3", hermesVersion: "0.17.0", hermesRevisionOrDigest: "sha256:fixture1234",
    requiredStages: { url: "passed", request: "passed", authentication: "passed", origin: "passed", capabilities: "passed", stream: "passed" },
    freshPanelSession: true, sessionOrdinal: 1, originVerdict: "exact_origin_passed", capabilityShape: {}, sseFrames: [],
  });
  assert.equal(validateEvidenceRecord(historical), true);
  assert.equal("supportEligible" in historical, false);
});

test("validation CLI rejects caller-authored positive claims and only publishes hard-coded ineligible attempts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hermes-cli-boundary-"));
  const output = join(directory, "evidence");
  const input = join(directory, "forged.json");
  try {
    await writeFile(input, JSON.stringify({
      realPath: true, proofSource: "verifier_receipt_bundle", requiredStages: { stream: "passed" }, token: "Bearer secret",
    }));
    await assert.rejects(
      execFile(process.execPath, ["scripts/run-validation.mjs", "--input", input, "--out", output], { cwd: process.cwd() }),
      (error) => error.stderr.trim() === "validation_invalid_arguments" && !error.stderr.includes("Bearer secret"),
    );
    await assert.rejects(
      execFile(process.execPath, ["scripts/run-validation.mjs", "--mode", "failure", "--out", output, "--proof-source", "verifier_receipt_bundle"], { cwd: process.cwd() }),
      (error) => error.stderr.trim() === "validation_invalid_arguments",
    );

    await execFile(process.execPath, [
      "scripts/run-validation.mjs", "--mode", "failure", "--out", output,
      "--deployment", "host_native_loopback", "--trust", "loopback_http", "--muxy-version", "1.2.3",
      "--hermes-version", "0.17.0", "--hermes-revision", "sha256:fixture1234", "--category", "real_attempt",
      "--reason", "relay_failed", "--stage", "relay",
    ], { cwd: process.cwd() });
    const [runId] = await readdir(join(output, "runs"));
    const record = JSON.parse(await readFile(join(output, "runs", runId, "report.json"), "utf8"));
    assert.equal(record.proofSource, "unverified_failure_adapter");
    assert.equal(record.supportEligible, false);
    assert.equal(record.requiredStages.relay, "failed");
    assert.equal(JSON.stringify(record).includes("Bearer secret"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
