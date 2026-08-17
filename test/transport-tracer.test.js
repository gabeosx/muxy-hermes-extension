import assert from "node:assert/strict";
import test from "node:test";

import { GatewayClient, normalizeGatewayUrl } from "../src/gateway-client.js";
import { SseParser } from "../src/sse-parser.js";

test("normalizes only literal loopback HTTP and trusted HTTPS URLs", () => {
  assert.equal(normalizeGatewayUrl("http://127.0.0.1:8642"), "http://127.0.0.1:8642");
  assert.equal(normalizeGatewayUrl("https://gateway.example"), "https://gateway.example");
  for (const value of [
    "http://gateway.example",
    "http://localhost.evil.test",
    "ftp://127.0.0.1",
    "https://user:pass@gateway.example",
    "https://gateway.example/?token=secret",
    "https://gateway.example/#fragment",
  ]) {
    assert.throws(() => normalizeGatewayUrl(value));
  }
});

test("frames split SSE fields, delimiters, repeated data, comments, and incomplete terminal data", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push("id: one\nevent: chat.completion."), []);
  assert.deepEqual(parser.push("chunk\ndata: first\ndata: second\n: comment\n\n"), [
    { event: "chat.completion.chunk", id: "one", dataBytes: 12, done: false, hasDelta: false, terminal: false, toolShape: false },
  ]);
  assert.deepEqual(parser.push("data: [DO"), []);
  assert.deepEqual(parser.push("NE]\n\n"), [
    { event: "message", id: null, dataBytes: 6, done: true, hasDelta: false, terminal: false, toolShape: false },
  ]);
});

test("probe delegates bearer handling to the consented relay, normalizes capabilities, and verifies a streamed fixture sequence", async () => {
  const calls = [];
  const relay = {
    async requestJson(request) {
      calls.push({ type: "request", request });
      return { status: 200, body: { version: "v0.20.2", features: { chat_completions: true, run_stop: true }, secret: "discard" } };
    },
    async streamJournal(request) {
      calls.push({ type: "stream", request: { ...request, bearer: "redacted", onChunk: null } });
      request.onChunk('event: chat.completion.chunk\ndata: {"choices":[{"delta":{"content":"a"}}]}\n\n');
      request.onChunk('event: chat.completion.chunk\ndata: {"choices":[{"delta":{"content":"b"},"finish_reason":"stop"}]}\n\n');
      request.onChunk("data: [DONE]\n\n");
      return { bytes: 128 };
    },
  };

  const result = await new GatewayClient({ relay }).probe("http://127.0.0.1:8642", "sentinel-token");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].request.bearer, "sentinel-token");
  assert.equal(calls[1].request.bearer, "redacted");
  assert.deepEqual(result.capabilities.names, ["chat_completions", "run_stop"]);
  assert.equal(result.stream.state, "passed");
  assert.equal(result.stream.eventCount, 3);
  assert.equal(JSON.stringify(result).includes("sentinel-token"), false);
  assert.equal(JSON.stringify(result).includes("discard"), false);
});

test("probe serializes concurrent use and teardown invalidates the current request", async () => {
  let release;
  const stalled = new Promise((resolve) => { release = resolve; });
  const client = new GatewayClient({
    relay: { requestJson: async () => {
      await stalled;
      return { status: 200, body: { features: {} } };
    } },
  });
  const first = client.probe("http://127.0.0.1:8642", "sentinel-token");
  await assert.rejects(() => client.probe("http://127.0.0.1:8642", "sentinel-token"), /already in progress/);
  client.teardown();
  release();
  await first;
});

test("probe preparation completes stale relay cleanup before its first request", async () => {
  const order = [];
  const relay = {
    async cleanupStaleJournals() { order.push("cleanup"); },
    async requestJson() { order.push("request"); return { status: 200, body: { features: {} } }; },
  };
  const client = new GatewayClient({ relay });
  await client.probe("http://127.0.0.1:8642", "token");
  assert.deepEqual(order, ["cleanup", "request"]);
});
