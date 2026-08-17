import assert from "node:assert/strict";
import test from "node:test";

import { buildEvidenceRecord } from "../src/evidence.js";
import { DEPLOYMENT_CONDITIONS, classifyVerdict, updateEvidenceIndex } from "../src/verdict.js";

function observation(overrides = {}) {
  return {
    runId: "run-20260817-000000-0001",
    recordedAt: "2026-08-17T12:00:00.000Z",
    deploymentCondition: "host_native_loopback",
    trustClass: "loopback_http",
    realPath: true,
    simulation: false,
    muxyVersion: "1.2.3",
    hermesVersion: "0.17.0",
    hermesRevisionOrDigest: "sha256:abcd1234",
    requiredStages: { url: "passed", request: "passed", authentication: "passed", origin: "passed", capabilities: "passed", stream: "passed" },
    freshPanelSession: true,
    sessionOrdinal: 1,
    originVerdict: "exact_origin_passed",
    capabilityShape: { chat_completions: true },
    sseFrames: [
      { event: "chat.completion.chunk", id: "one", order: 1, elapsedMs: 250, dataBytes: 24, shape: { choices: [{ delta: { content: "first" } }] } },
      { event: "chat.completion.chunk", id: "two", order: 2, elapsedMs: 500, dataBytes: 24, shape: { choices: [{ delta: { content: "second" } }] } },
    ],
    ...overrides,
  };
}

function record(number, overrides = {}) {
  return buildEvidenceRecord(observation({
    runId: `run-20260817-000000-000${number}`,
    recordedAt: `2026-08-17T12:00:0${number}.000Z`,
    ...overrides,
  }));
}

const pair = { muxyVersion: "1.2.3", hermesVersion: "0.17.0", hermesRevisionOrDigest: "sha256:abcd1234" };

test("only two complete fresh real-path panel sessions on one pair can be Supported", () => {
  const supported = classifyVerdict({ records: [record(1, { sessionOrdinal: 1 }), record(2, { sessionOrdinal: 2 })], latestStablePair: pair });
  assert.equal(supported.verdict, "Supported");
  assert.equal(supported.reasonCode, "two_fresh_real_sessions_passed");

  for (const records of [
    [record(1)],
    [record(1), record(2, { sessionOrdinal: 1 })],
    [record(1), record(2, { sessionOrdinal: 2, simulation: true, realPath: false, trustClass: "simulated" })],
    [record(1), record(2, { sessionOrdinal: 2, muxyVersion: "1.2.4" })],
    [record(1), record(2, { sessionOrdinal: 2, requiredStages: { url: "passed", request: "passed", authentication: "passed", origin: "not_verified", capabilities: "passed", stream: "passed" }, originVerdict: "not_verified" })],
  ]) {
    assert.equal(classifyVerdict({ records, latestStablePair: pair }).verdict, "Unverified");
  }
});

test("a reproducible latest-pair required-stage failure overrides historical support", () => {
  const records = [
    record(1, { sessionOrdinal: 1 }),
    record(2, { sessionOrdinal: 2 }),
    record(3, { sessionOrdinal: 1, muxyVersion: "1.2.4", requiredStages: { url: "passed", request: "failed", authentication: "not_verified", origin: "not_verified", capabilities: "not_verified", stream: "not_verified" }, originVerdict: "not_verified", reasonCode: "request_failed" }),
    record(4, { sessionOrdinal: 2, muxyVersion: "1.2.4", requiredStages: { url: "passed", request: "failed", authentication: "not_verified", origin: "not_verified", capabilities: "not_verified", stream: "not_verified" }, originVerdict: "not_verified", reasonCode: "request_failed" }),
  ];
  const result = classifyVerdict({ records, latestStablePair: { ...pair, muxyVersion: "1.2.4" } });
  assert.equal(result.verdict, "Unsupported");
  assert.equal(result.reasonCode, "latest_pair_reproducible_failure");
  assert.equal(result.lastVerifiedPair.muxyVersion, "1.2.3");
});

test("a newly resolved pair without a regression carries forward the last Supported verdict", () => {
  const result = classifyVerdict({
    records: [record(1), record(2, { sessionOrdinal: 2 })],
    latestStablePair: { ...pair, muxyVersion: "1.2.4" },
  });
  assert.deepEqual(result, {
    verdict: "Supported",
    reasonCode: "carried_forward_supported",
    latestPair: { ...pair, muxyVersion: "1.2.4" },
    lastVerifiedPair: pair,
    carriedForward: true,
  });
});

test("the index always exposes five safe rows and preserves deterministic history", () => {
  const index = updateEvidenceIndex({ records: [
    record(2, { sessionOrdinal: 2 }),
    record(1),
    record(3, { deploymentCondition: "ssh_local_forward", trustClass: "simulated", realPath: false, simulation: true }),
    record(4, { deploymentCondition: "ssh_local_forward", trustClass: "simulated", realPath: false, simulation: true, sessionOrdinal: 2 }),
  ] });
  assert.deepEqual(index.conditions.map((row) => row.id), DEPLOYMENT_CONDITIONS);
  assert.equal(index.conditions.find((row) => row.id === "host_native_loopback").verdict, "Supported");
  assert.equal(index.conditions.find((row) => row.id === "ssh_local_forward").verdict, "Unverified");
  assert.equal(index.conditions.find((row) => row.id === "direct_remote_https").latest, null);
  assert.deepEqual(index.history.map((entry) => entry.runId), [
    "run-20260817-000000-0001", "run-20260817-000000-0002", "run-20260817-000000-0003", "run-20260817-000000-0004",
  ]);
  assert.equal(JSON.stringify(index).includes("content"), false);
});
