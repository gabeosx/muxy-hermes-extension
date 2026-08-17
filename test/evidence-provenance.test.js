import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildVerifiedEvidenceRecord,
  validateEvidenceRecord,
  writeEvidencePair,
} from "../src/evidence.js";

const DIGEST = (letter) => letter.repeat(64);

function receiptBundle(overrides = {}) {
  const qualificationId = overrides.qualificationId ?? "qualification-20260817-0001";
  const panelDigest = overrides.panelDigest ?? DIGEST("a");
  const relayDigest = overrides.relayDigest ?? DIGEST("b");
  const fixtureDigest = overrides.fixtureDigest ?? DIGEST("c");
  const challengeDigest = overrides.challengeDigest ?? DIGEST("d");
  const tuple = overrides.versionTuple ?? {
    muxyVersion: "1.2.3",
    hermesVersion: "0.17.0",
    hermesRevisionOrDigest: "sha256:fixture1234",
  };
  return {
    runId: overrides.runId ?? "run-20260817-000000-0001",
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
  })), /evidence_invalid_versionTuple/);
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
    const durable = `${await readFile(paths.jsonPath, "utf8")}\n${await readFile(paths.markdownPath, "utf8")}`;
    assert.match(durable, /verifier_receipt_bundle/);
    assert.equal(durable.includes("Bearer secret"), false);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
