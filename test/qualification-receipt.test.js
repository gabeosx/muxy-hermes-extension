import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionProbe } from "../src/probe.js";

const ROOT = ".muxy-hermes-qualification/current";
const challenge = {
  version: 1,
  nonce: "verifier-nonce-42",
  expiresAt: "2026-08-18T00:00:00.000Z",
  expectedOrdinal: 1,
};

function filesWithChallenge(value = challenge) {
  const files = new Map([[`${ROOT}/challenge.json`, JSON.stringify(value)]]);
  return {
    files,
    bridge: {
      async read(path) {
        if (!files.has(path)) {
          const error = new Error("ENOENT");
          error.code = "ENOENT";
          throw error;
        }
        const content = files.get(path);
        return { content, size: content.length };
      },
      async write(path, content) { files.set(path, content); },
    },
  };
}

function passedResult(overrides = {}) {
  return {
    url: { state: "passed" }, request: { state: "passed" }, relay: { state: "passed" },
    authentication: { state: "passed" }, capabilities: { state: "passed", names: ["chat_completions"], version: "fixture-v1" },
    stream: { state: "passed", firstChunkMs: 11, eventCount: 3, terminal: true, toolShape: false },
    receiptObservation: {
      executionId: "raw-exec-identity",
      httpStatus: 200,
      bytes: 128,
      cancelled: false,
      curlExitClass: "success",
      journalOutcome: "scrubbed_removed",
      firstChunkMs: 11,
      eventCount: 3,
      terminal: true,
      toolShape: false,
    },
    ...overrides,
  };
}

function clientFor(result) {
  return { async probe() { return result; }, async prepare() {}, async teardown() {} };
}

test("a valid verifier challenge yields exactly one redacted receipt after a terminal cleaned relay session", async () => {
  const { files, bridge } = filesWithChallenge();
  const probe = new ConnectionProbe({
    client: clientFor(passedResult()), files: bridge, randomId: () => "panel-instance-42",
    now: () => "2026-08-17T23:00:00.000Z",
  });

  await probe.start({ url: "https://gateway.example", token: "bearer-secret-value" });
  const receipt = JSON.parse(files.get(`${ROOT}/panel-session.json`));
  assert.deepEqual(Object.keys(receipt).sort(), ["challengeDigest", "createdAt", "outcomes", "panelDigest", "sessionOrdinal", "version"]);
  assert.equal(receipt.version, 1);
  assert.equal(receipt.sessionOrdinal, 1);
  assert.equal(receipt.outcomes.relay, "passed");
  assert.equal(receipt.outcomes.authentication, "passed");
  assert.equal(receipt.outcomes.capabilities, "passed");
  assert.equal(receipt.outcomes.stream, "passed");
  assert.equal(receipt.outcomes.cleanup, "passed");
  for (const digest of [receipt.challengeDigest, receipt.panelDigest, ...Object.values(receipt.outcomes.digests)]) {
    assert.match(digest, /^[a-f0-9]{64}$/);
  }
  const serialized = JSON.stringify(receipt);
  for (const forbidden of [
    "bearer-secret-value", "gateway.example", "raw-exec-identity", "stream.sse", "HERMES_STREAM_QUALIFICATION_V1",
    "workspace", "origin", "cors", "docker", "ssh", "Authorization", "prompt", "output", "tool",
  ]) assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);

  await probe.start({ url: "https://gateway.example", token: "bearer-secret-value" });
  assert.equal(files.size, 2, "a single panel may not emit a second receipt");
});

test("expired, malformed, mismatched, incomplete, and colliding challenge sessions fail closed", async () => {
  const cases = [
    [{ ...challenge, expiresAt: "2026-08-17T22:59:59.000Z" }, passedResult()],
    [{ ...challenge, unexpected: true }, passedResult()],
    [{ ...challenge, expectedOrdinal: 2 }, passedResult()],
    [challenge, passedResult({ stream: { state: "not_verified", reason: "cancelled" }, receiptObservation: { ...passedResult().receiptObservation, cancelled: true, curlExitClass: "cancelled" } })],
    [challenge, passedResult({ stream: { state: "failed", reason: "protocol" }, receiptObservation: { ...passedResult().receiptObservation, httpStatus: 500 } })],
    [challenge, passedResult({ stream: { state: "not_verified", reason: "qualification_sequence_unproved" }, receiptObservation: { ...passedResult().receiptObservation, terminal: false } })],
    [challenge, passedResult({ receiptObservation: { ...passedResult().receiptObservation, journalOutcome: "cleanup_failed" } })],
  ];
  for (const [challengeValue, result] of cases) {
    const { files, bridge } = filesWithChallenge(challengeValue);
    const probe = new ConnectionProbe({ client: clientFor(result), files: bridge, randomId: () => "panel", now: () => "2026-08-17T23:00:00.000Z" });
    await probe.start({ url: "https://gateway.example", token: "secret" });
    assert.equal(files.has(`${ROOT}/panel-session.json`), false);
  }

  const { files, bridge } = filesWithChallenge();
  files.set(`${ROOT}/panel-session.json`, "verifier-owned receipt");
  const probe = new ConnectionProbe({ client: clientFor(passedResult()), files: bridge, now: () => "2026-08-17T23:00:00.000Z" });
  await probe.start({ url: "https://gateway.example", token: "secret" });
  assert.equal(files.get(`${ROOT}/panel-session.json`), "verifier-owned receipt");
});
