import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadRecoveryEvidence, renderRecoveryEvidence, sanitizeRecoveryEvidence } from "../src/recovery-evidence.js";

const digest = (char) => `sha256:${char.repeat(64)}`;
const conditions = [
  "host_native_loopback",
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
];

function fixture(overrides = {}) {
  const row = (id, index) => ({
    id,
    scenario: index < 2 ? "native_fixture" : "local_behavior_simulation",
    observedBehavior: index === 0 ? "capabilities_and_stream" : index === 1 ? "interrupted_then_reconciled" : "not_observed",
    requestOutcome: index < 2 ? "authenticated" : "not_run",
    observerAttempts: index === 1 ? 3 : index === 0 ? 1 : 0,
    statusOutcome: index < 2 ? "terminal" : "not_run",
    reattached: index === 1,
    panelLifecycle: index === 1 ? "recreated" : "open",
    eventHistoryConfidence: "incomplete",
    approvalDetailConfidence: "unavailable",
    cleanup: index < 2 ? "scrubbed_removed" : "not_run",
    actual: index < 2,
    pinnedRuntime: id === "host_native_loopback",
    nativePanel: index < 2,
    verdict: index < 2 ? "Observed" : "Unverified",
  });
  return {
    schemaVersion: 1,
    fixtureId: "recovery-v1",
    versionTuple: { muxyVersion: "1.5.0+945", hermesVersion: "0.20.2", hermesRevisionOrDigest: digest("a") },
    capability: { names: ["run_events_sse", "run_status", "run_submission"], shapeHash: digest("b") },
    representativeEvents: [
      { name: "message.delta", dataBytes: 5, shapeHash: digest("c") },
      { name: "terminal", dataBytes: 4, shapeHash: digest("d") },
    ],
    controlStatus: { controlOutcome: "not_exercised", statusOutcome: "terminal" },
    conditions: conditions.map(row),
    ...overrides,
  };
}

test("recovery evidence allows only safe structural metadata and exactly five canonical conditions", () => {
  const safe = sanitizeRecoveryEvidence(fixture(), { requireComplete: true });
  assert.deepEqual(safe.conditions.map((row) => row.id), conditions);
  assert.equal(safe.conditions[0].pinnedRuntime, true);
  assert.equal(safe.conditions[1].reattached, true);
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), bearer: "nope" }), /recovery_evidence_invalid/);
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), conditions: fixture().conditions.slice(0, 4) }), /recovery_evidence_invalid/);
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), representativeEvents: [{ name: "message.delta", dataBytes: 5, shapeHash: digest("e"), text: "raw event" }] }), /recovery_evidence_invalid/);
});

test("remote analogues are always Unverified and renderer retains no-lossless-replay wording", () => {
  const unsafe = fixture();
  unsafe.conditions[2].verdict = "Observed";
  unsafe.conditions[2].actual = true;
  const safe = sanitizeRecoveryEvidence(unsafe, { requireComplete: true });
  assert.equal(safe.conditions[2].verdict, "Unverified");
  assert.equal(safe.conditions[2].actual, false);
  const rendered = renderRecoveryEvidence(safe);
  assert.match(rendered[1].details, /Event history is incomplete/);
  assert.match(rendered[2].details, /Unverified/);
});

test("loader accepts only the same-origin recovery fixture and rejects secret-bearing payloads", async () => {
  const loaded = await loadRecoveryEvidence({ fetchImpl: async (url) => {
    assert.equal(url, "/evidence/recovery-v1.json");
    return new Response(JSON.stringify(fixture()), { status: 200 });
  } });
  assert.equal(loaded.fixtureId, "recovery-v1");
  await assert.rejects(loadRecoveryEvidence({ url: "/evidence/index.json", fetchImpl: async () => new Response("{}", { status: 200 }) }), /recovery_evidence_invalid/);
  await assert.rejects(loadRecoveryEvidence({ fetchImpl: async () => new Response(JSON.stringify({ ...fixture(), endpoint: "http://127.0.0.1" }), { status: 200 }) }), /recovery_evidence_invalid/);
});

test("committed recovery fixture contains complete native observations and no content-bearing data", async () => {
  const parsed = JSON.parse(await readFile(new URL("../public/evidence/recovery-v1.json", import.meta.url), "utf8"));
  const safe = sanitizeRecoveryEvidence(parsed, { requireComplete: true });
  assert.equal(safe.conditions.length, 5);
  assert.equal(safe.conditions[0].verdict, "Observed");
  assert.equal(safe.conditions[0].panelLifecycle, "recreated");
  assert.equal(safe.conditions[1].verdict, "Observed");
  assert.equal(safe.conditions[1].reattached, true);
  assert.equal(safe.conditions[2].verdict, "Unverified");
  assert.match(JSON.stringify(safe), /incomplete|unavailable/);
});
