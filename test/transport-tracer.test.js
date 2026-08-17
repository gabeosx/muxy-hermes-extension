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

test("probe sends the bearer only in Authorization, normalizes capabilities, and verifies a streamed fixture sequence", async () => {
  const requests = [];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: chat.completion.chunk\ndata: {"choices":[{"delta":{"content":"a"}}]}\n\n'));
      setTimeout(() => {
        controller.enqueue(encoder.encode('event: chat.completion.chunk\ndata: {"choices":[{"delta":{"content":"b"},"finish_reason":"stop"}]}\n\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }, 5);
    },
  });
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/v1/capabilities")) {
      return new Response(JSON.stringify({ version: "v0.20.2", features: { chat_completions: true, run_stop: true }, secret: "discard" }), { status: 200 });
    }
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
  };

  const result = await new GatewayClient({ fetchImpl }).probe("http://127.0.0.1:8642", "sentinel-token");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers.Authorization, "Bearer sentinel-token");
  assert.equal(requests[0].options.headers.Accept, "application/json");
  assert.equal(requests[1].options.headers.Accept, "text/event-stream");
  assert.deepEqual(result.capabilities.names, ["chat_completions", "run_stop"]);
  assert.equal(result.stream.state, "passed");
  assert.equal(result.stream.eventCount, 3);
  assert.equal(JSON.stringify(result).includes("sentinel-token"), false);
  assert.equal(JSON.stringify(result).includes("discard"), false);
});

test("probe serializes concurrent use and teardown aborts the current request", async () => {
  let release;
  const stalled = new Promise((resolve) => { release = resolve; });
  const client = new GatewayClient({
    fetchImpl: async () => {
      await stalled;
      return new Response(JSON.stringify({ features: {} }), { status: 200 });
    },
  });
  const first = client.probe("http://127.0.0.1:8642", "sentinel-token");
  await assert.rejects(() => client.probe("http://127.0.0.1:8642", "sentinel-token"), /already in progress/);
  client.teardown();
  release();
  await first;
});
