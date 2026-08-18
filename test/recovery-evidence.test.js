import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadRecoveryEvidence, renderRecoveryEvidence, sanitizeRecoveryEvidence } from "../src/recovery-evidence.js";

const digest = (char) => `sha256:${char.repeat(64)}`;
const conditions = ["host_native_loopback", "docker_published_loopback", "ssh_local_forward", "direct_remote_https", "remote_muxy_workspace"];

function realProvenance(char) {
  return { proofSource: "recovery_receipt_bundle", challengeDigest: digest(char), panelDigest: digest("2"), fixtureDigest: digest("3"), cleanupDigest: digest("4"), bundleDigest: digest("5") };
}

function simulationProvenance(char) { return { proofSource: "simulation_receipt", bundleDigest: digest(char) }; }

function fixture(overrides = {}) {
  const row = (id, index) => ({
    id, scenario: index < 2 ? "native_fixture" : "local_behavior_simulation",
    observedBehavior: index === 0 ? "fresh_panel_status_recovered" : index === 1 ? "interrupted_status_reconciled" : "not_observed",
    requestOutcome: index === 0 ? "authenticated" : index === 1 ? "interrupted" : "not_run",
    observerAttempts: index === 1 ? 1 : 0, statusOutcome: index < 2 ? "terminal" : "not_run", reattached: index === 1,
    panelLifecycle: index === 0 ? "recreated" : index === 1 ? "open" : "not_run",
    eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable", cleanup: index < 2 ? "scrubbed_removed" : "not_run",
    actual: index < 2, pinnedRuntime: id === "host_native_loopback", nativePanel: index < 2, verdict: index < 2 ? "Observed" : "Unverified",
    signatures: index === 0
      ? ["panel_recreated"]
      : index === 1 ? ["observer_interrupted", "observer_restored", "buffered_or_delayed"]
        : index === 2 ? ["refused_or_unreachable"]
          : index === 3 ? ["certificate_validated", "authentication", "exact_origin_cors", "unbuffered_delivery"] : ["workspace_path_absent"],
    provenance: index < 2 ? realProvenance(String(index + 1)) : simulationProvenance(["6", "7", "8"][index - 2]),
  });
  return {
    schemaVersion: 2, fixtureId: "recovery-v1",
    versionTuple: { muxyVersion: "1.5.0+945", hermesVersion: "0.20.2", hermesRevisionOrDigest: digest("a") },
    capability: { names: ["run_events_sse", "run_status", "run_submission"], shapeHash: digest("b") },
    representativeEvents: [{ name: "message.delta", dataBytes: 5, shapeHash: digest("c") }, { name: "terminal", dataBytes: 4, shapeHash: digest("d") }],
    controlStatus: { controlOutcome: "not_exercised", statusOutcome: "terminal" }, conditions: conditions.map(row), ...overrides,
  };
}

test("recovery evidence permits only receipt-backed structural metadata and exactly five canonical conditions", () => {
  const safe = sanitizeRecoveryEvidence(fixture(), { requireComplete: true });
  assert.deepEqual(safe.conditions.map((row) => row.id), conditions);
  assert.equal(safe.conditions[0].provenance.proofSource, "recovery_receipt_bundle");
  assert.equal(safe.conditions[2].provenance.proofSource, "simulation_receipt");
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), bearer: "nope" }), /recovery_evidence_invalid/);
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), conditions: fixture().conditions.slice(0, 4) }), /recovery_evidence_invalid/);
  assert.throws(() => sanitizeRecoveryEvidence({ ...fixture(), representativeEvents: [{ name: "message.delta", dataBytes: 5, shapeHash: digest("e"), text: "raw event" }] }), /recovery_evidence_invalid/);
  const mutations = [
    (value) => { value.conditions[0].signatures.push("panel_recreated"); },
    (value) => { value.conditions[0].provenance.extra = "raw text"; },
    (value) => { value.conditions[0].provenance.proofSource = "fixture"; },
    (value) => { value.conditions[2].provenance.challengeDigest = digest("9"); },
    (value) => { value.conditions[1].provenance.cleanupDigest = "sha256:bad"; },
    (value) => { value.conditions[1].cleanup = "failed"; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(fixture()); mutate(value);
    assert.throws(() => sanitizeRecoveryEvidence(value, { requireComplete: true }), /recovery_evidence_invalid/);
  }
});

test("remote analogues reject positive/native claims and renderer visibly names behavior signatures without topology claims", () => {
  const unsafe = fixture(); unsafe.conditions[2].verdict = "Observed"; unsafe.conditions[2].actual = true;
  assert.throws(() => sanitizeRecoveryEvidence(unsafe, { requireComplete: true }), /recovery_evidence_invalid/);
  const nativeClaim = fixture(); nativeClaim.conditions[2].nativePanel = true;
  assert.throws(() => sanitizeRecoveryEvidence(nativeClaim, { requireComplete: true }), /recovery_evidence_invalid/);
  const safe = sanitizeRecoveryEvidence(fixture(), { requireComplete: true });
  const copy = renderRecoveryEvidence(safe).map((row) => row.details).join(" ");
  for (const signature of ["Refusal or unreachable", "Observer interrupted", "Observer restored", "Buffered or delayed", "Panel recreated"]) assert.match(copy, new RegExp(signature));
  assert.match(copy, /Event history is incomplete/);
  assert.doesNotMatch(copy, /ssh|proxy|container|topology|remote workspace/i);
});

test("loader accepts only the same-origin recovery fixture and rejects secret-bearing payloads", async () => {
  const loaded = await loadRecoveryEvidence({ fetchImpl: async (url) => {
    assert.equal(url, "/evidence/recovery-v1.json"); return new Response(JSON.stringify(fixture()), { status: 200 });
  } });
  assert.equal(loaded.fixtureId, "recovery-v1");
  await assert.rejects(loadRecoveryEvidence({ url: "/evidence/index.json", fetchImpl: async () => new Response("{}", { status: 200 }) }), /recovery_evidence_invalid/);
  await assert.rejects(loadRecoveryEvidence({ fetchImpl: async () => new Response(JSON.stringify({ ...fixture(), endpoint: "http://127.0.0.1" }), { status: 200 }) }), /recovery_evidence_invalid/);
});

test("committed recovery fixture stays an incomplete receipt-ready template with no content-bearing data", async () => {
  const parsed = JSON.parse(await readFile(new URL("../public/evidence/recovery-v1.json", import.meta.url), "utf8"));
  const safe = sanitizeRecoveryEvidence(parsed);
  assert.equal(safe.conditions.length, 5); assert.equal(safe.conditions[0].verdict, "Unverified"); assert.equal(safe.conditions[1].verdict, "Unverified");
  assert.match(JSON.stringify(safe), /incomplete|unavailable/);
});
