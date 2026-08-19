import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionProbe, toSafeVerdict } from "../src/probe.js";

const passedResult = {
  url: { state: "passed" },
  request: { state: "passed" },
  relay: { state: "passed" },
  authentication: { state: "passed" },
  capabilities: { state: "passed", names: ["run_stop"], version: "fixture-v1" },
  stream: { state: "passed", eventCount: 3 },
};

test("safe verdicts distinguish observed authentication failures from relay rejection", () => {
  const authentication = toSafeVerdict({
    ...passedResult,
    authentication: { state: "failed" },
    capabilities: { state: "not_verified", names: [], version: null },
    stream: { state: "not_verified" },
  }, { endpoint: "https://gateway.example", startedAt: "2026-08-17T00:00:00.000Z", finishedAt: "2026-08-17T00:00:01.000Z" });
  assert.equal(authentication.failureClass, "authentication");
  assert.equal(authentication.relayOutcome.state, "passed");

  const rejected = toSafeVerdict({
    url: { state: "passed" }, request: { state: "failed", reason: "relay_request_rejected" }, relay: { state: "failed" },
    authentication: { state: "not_verified" },
    capabilities: { state: "not_verified", names: [], version: null }, stream: { state: "not_verified" },
  }, { endpoint: "https://gateway.example", startedAt: "2026-08-17T00:00:00.000Z", finishedAt: "2026-08-17T00:00:01.000Z" });
  assert.equal(rejected.failureClass, "relay");
  assert.equal(JSON.stringify(rejected).includes("relay_request_rejected"), false);

  for (const [reason, failureClass] of [
    ["gateway_unreachable", "gateway_unreachable"],
    ["gateway_timeout", "gateway_timeout"],
  ]) {
    const networkFailure = toSafeVerdict({
      url: { state: "passed" }, request: { state: "failed", reason }, relay: { state: "failed", reason },
      authentication: { state: "not_verified" },
      capabilities: { state: "not_verified", names: [], version: null }, stream: { state: "not_verified" },
    }, { endpoint: "https://gateway.example", startedAt: "2026-08-17T00:00:00.000Z", finishedAt: "2026-08-17T00:00:01.000Z" });
    assert.equal(networkFailure.failureClass, failureClass);
    assert.equal(JSON.stringify(networkFailure).includes(reason), true);
  }
});

test("retest keeps an immutable Previous result and ignores a stale aborted completion", async () => {
  let firstResolve;
  const first = new Promise((resolve) => { firstResolve = resolve; });
  const calls = [];
  const client = {
    probe(url, token, { signal }) {
      calls.push({ url, token, signal });
      if (calls.length === 1) return Promise.resolve(passedResult);
      return calls.length === 2 ? first : Promise.resolve(passedResult);
    },
  };
  const probe = new ConnectionProbe({ client, now: () => "2026-08-17T00:00:00.000Z" });
  const snapshots = [];
  probe.subscribe((snapshot) => snapshots.push(snapshot));

  const initial = await probe.start({ url: "https://gateway.example", token: "never-render-me" });
  assert.equal(initial.status, "success");
  const oldResult = probe.snapshot;
  const retest = probe.start({ url: "https://gateway.example", token: "old-secret" });
  assert.equal(probe.snapshot.status, "testing");
  assert.equal(probe.snapshot.previousResult.status, "success");
  assert.equal(Object.isFrozen(probe.snapshot.previousResult), true);
  const replacement = probe.start({ url: "https://gateway.example", token: "new-secret" });
  assert.equal(calls[1].signal.aborted, true);

  firstResolve({ ...passedResult, stream: { state: "not_verified" } });
  await retest;
  const result = await replacement;
  assert.equal(result.status, "success");
  assert.equal(probe.snapshot.previousResult, null);
  assert.equal(JSON.stringify(snapshots).includes("never-render-me"), false);
  assert.equal(JSON.stringify(oldResult).includes("new-secret"), false);
});

test("a saved connection is restored only after a lightweight authentication check", async () => {
  const calls = [];
  const client = {
    async verify(url, token) {
      calls.push({ url, token });
      return {
        ...passedResult,
        capabilities: { state: "passed", names: ["run_status", "run_submission"], version: "fixture-v2" },
        stream: { state: "not_verified", reason: "saved_connection_check" },
      };
    },
  };
  const prior = toSafeVerdict(passedResult, {
    endpoint: "https://gateway.example",
    startedAt: "2026-08-17T00:00:00.000Z",
    finishedAt: "2026-08-17T00:00:01.000Z",
  });
  const probe = new ConnectionProbe({ client, now: () => "2026-08-17T00:05:00.000Z" });

  const restored = await probe.restore({ url: "https://gateway.example", token: "saved-secret", previousResult: prior });

  assert.deepEqual(calls, [{ url: "https://gateway.example", token: "saved-secret" }]);
  assert.equal(restored.status, "success");
  assert.equal(restored.authenticationOutcome.state, "passed");
  assert.equal(restored.streamOutcome.state, "passed", "the lightweight check retains the previously qualified stream result");
  assert.deepEqual(restored.capabilityNames, ["run_status", "run_submission"]);
  assert.equal(JSON.stringify(probe.snapshot).includes("saved-secret"), false);
});
