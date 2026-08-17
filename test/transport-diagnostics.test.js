import assert from "node:assert/strict";
import test from "node:test";

import { GatewayClient } from "../src/gateway-client.js";
import { toSafeVerdict } from "../src/probe.js";

const context = { endpoint: "https://gateway.example", startedAt: "2026-08-17T00:00:00.000Z", finishedAt: "2026-08-17T00:00:01.000Z" };

function failedRelay(reason) {
  return {
    url: { state: "passed" }, request: { state: "failed", reason }, relay: { state: "failed", reason },
    authentication: { state: "not_verified" }, capabilities: { state: "not_verified", names: [], version: null },
    stream: { state: "not_verified" },
  };
}

test("safe verdicts derive network and journal diagnoses only from observed relay classes", () => {
  for (const [reason, failureClass] of [
    ["gateway_dns", "gateway_dns"],
    ["gateway_tls", "gateway_tls"],
    ["gateway_refused", "gateway_refused"],
    ["gateway_timeout", "gateway_timeout"],
    ["journal_limit", "journal_limit"],
  ]) {
    const verdict = toSafeVerdict(failedRelay(reason), context);
    assert.equal(verdict.failureClass, failureClass);
    assert.equal(JSON.stringify(verdict).includes("raw response body"), false);
  }
});

test("stream HTTP status wins over parser sequence and cancellation is not a network failure", async () => {
  const relay = {
    async cleanupStaleJournals() {},
    async requestJson() { return { status: 200, body: { features: { chat_completions: true } } }; },
    async streamJournal() { return { executionId: "stream-1", httpStatus: 401, bytes: 0, cancelled: false, curlExitClass: "success", journalOutcome: "scrubbed_removed" }; },
  };
  const authentication = await new GatewayClient({ relay }).probe("https://gateway.example", "token");
  assert.equal(authentication.authentication.state, "failed");
  assert.equal(authentication.stream.reason, "authentication");

  const cancelled = toSafeVerdict({
    url: { state: "passed" }, request: { state: "passed" }, relay: { state: "passed" }, authentication: { state: "passed" },
    capabilities: { state: "passed", names: [], version: null }, stream: { state: "not_verified", reason: "cancelled" },
  }, context);
  assert.equal(cancelled.status, "partial");
  assert.equal(cancelled.failureClass, null);
});
