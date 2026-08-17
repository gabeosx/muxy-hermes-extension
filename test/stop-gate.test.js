import assert from "node:assert/strict";
import test from "node:test";

import { buildBridgeContract, evaluateStopGate } from "../src/stop-gate.js";

const safeFailure = (overrides = {}) => ({
  runId: "run-20260817-000000-0001",
  recordedAt: "2026-08-17T12:00:00.000Z",
  muxyVersion: "1.2.3",
  hermesVersion: "0.17.0",
  hermesRevisionOrDigest: "sha256:abcd1234",
  realPath: true,
  simulation: false,
  freshPanelSession: true,
  sessionOrdinal: 1,
  originVerdict: "origin_rejected",
  requiredStages: { url: "passed", request: "passed", authentication: "passed", origin: "failed", capabilities: "not_verified", stream: "not_verified" },
  reasonCode: "exact_origin_rejected",
  ...overrides,
});

const index = (rows) => ({ schemaVersion: 1, conditions: rows });

test("the stop gate activates only for reproducible real origin or stream failures", () => {
  const failed = index([{ id: "host_native_loopback", history: [safeFailure(), safeFailure({ runId: "run-20260817-000000-0002", sessionOrdinal: 2, recordedAt: "2026-08-17T12:00:01.000Z" })] }]);
  assert.deepEqual(evaluateStopGate({ evidenceIndex: failed }), {
    active: true,
    triggerCode: "real_exact_origin_failure",
    failedRealClass: "host_native_loopback",
    failedStage: "origin",
    requiresMuxyChange: false,
  });

  const partial = index([{ id: "host_native_loopback", history: [safeFailure()] }]);
  assert.equal(evaluateStopGate({ evidenceIndex: partial }).active, false);

  const simulated = index([{ id: "ssh_local_forward", history: [safeFailure({ realPath: false, simulation: true }), safeFailure({ runId: "sim-20260817-000000-0002", realPath: false, simulation: true, sessionOrdinal: 2 })] }]);
  assert.equal(evaluateStopGate({ evidenceIndex: simulated }).active, false);

  const unrelated = index([{ id: "host_native_loopback", history: [safeFailure({ requiredStages: { url: "passed", request: "failed", authentication: "not_verified", origin: "not_verified", capabilities: "not_verified", stream: "not_verified" }, originVerdict: "not_verified", reasonCode: "gateway_unreachable" }), safeFailure({ runId: "run-20260817-000000-0002", sessionOrdinal: 2, requiredStages: { url: "passed", request: "failed", authentication: "not_verified", origin: "not_verified", capabilities: "not_verified", stream: "not_verified" }, originVerdict: "not_verified", reasonCode: "gateway_unreachable" })] }]);
  assert.equal(evaluateStopGate({ evidenceIndex: unrelated }).active, false);
});

test("the explicit upstream-change signal fails closed without transport detail", () => {
  assert.deepEqual(evaluateStopGate({ evidenceIndex: index([]), requiresMuxyChange: true }), {
    active: true,
    triggerCode: "requires_muxy_change",
    failedRealClass: null,
    failedStage: null,
    requiresMuxyChange: true,
  });
});

test("the bridge contract is a minimum redacted projection and declares no implementation", () => {
  const contract = buildBridgeContract(evaluateStopGate({ evidenceIndex: index([]), requiresMuxyChange: true }));
  assert.deepEqual(Object.keys(contract).sort(), [
    "acceptanceTest",
    "consentResponsibilities",
    "corsResponsibilities",
    "implementationStatus",
    "safeObservedFailure",
    "ssrfPrivateHostResponsibilities",
    "streamAbortContract",
    "targetRequestClass",
    "tlsResponsibilities",
    "tokenRedactionResponsibilities",
  ]);
  assert.equal(contract.implementationStatus, "not_implemented");
  assert.match(contract.acceptanceTest, /incremental/i);
  const serialized = JSON.stringify(contract);
  for (const forbidden of ["https://gateway.example", "muxy-extension://", "Bearer ", "authorization", "workspace", "raw body", "frame content"]) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, `${forbidden} must not be copied into the contract`);
  }
});
