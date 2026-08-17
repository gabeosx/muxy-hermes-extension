import assert from "node:assert/strict";
import test from "node:test";

import { CurlRelay } from "../src/curl-relay.js";
import { ConnectionProbe } from "../src/probe.js";

test("teardown cancels the sole active stream, drains it, and scrubs its journal before release", async () => {
  const operations = [];
  let settle;
  const relay = new CurlRelay({
    exec: async () => ({ stdout: "", exitCode: 0 }),
    execAsync: () => {
      const result = new Promise((resolve) => { settle = resolve; });
      return {
        id: "stream-1",
        result,
        cancel() {
          operations.push("cancel");
          settle({ stdout: "__MUXY_HERMES_STATUS__:000", exitCode: 0, cancelled: true });
        },
      };
    },
    files: {
      async read() { throw new Error("not written yet"); },
      async write(path, content) { operations.push(`write:${path}:${content}`); },
      async delete(paths) { operations.push(`delete:${paths[0]}`); },
    },
    events: { subscribe(_name, callback) { operations.push("subscribe"); return () => { operations.push("unsubscribe"); callback = null; }; } },
    randomId: () => "fixed-id",
  });

  const stream = relay.streamJournal({
    url: "http://127.0.0.1:8642/events",
    bearer: "sentinel-token",
    onChunk() {},
  });
  await Promise.resolve();
  await relay.cancelActiveStream();

  assert.deepEqual(await stream, {
    executionId: "stream-1",
    httpStatus: null,
    bytes: 0,
    cancelled: true,
    curlExitClass: "cancelled",
    journalOutcome: "scrubbed_removed",
  });
  assert.deepEqual(operations, [
    "subscribe",
    "cancel",
    "unsubscribe",
    "write:.muxy-hermes-runtime/fixed-id/stream.sse:",
    "delete:.muxy-hermes-runtime/fixed-id",
  ]);
});

test("a new probe waits for the previous abort and teardown to settle", async () => {
  const operations = [];
  let releaseTeardown;
  let releaseProbe;
  let calls = 0;
  const client = {
    async teardown() {
      operations.push("teardown");
      await new Promise((resolve) => { releaseTeardown = resolve; });
    },
    async probe() {
      operations.push("probe");
      calls += 1;
      if (calls === 1) await new Promise((resolve) => { releaseProbe = resolve; });
      return {
        url: { state: "passed" }, request: { state: "passed" }, relay: { state: "passed" },
        authentication: { state: "passed" }, capabilities: { state: "passed", names: [], version: null },
        stream: { state: "not_verified" },
      };
    },
  };
  const probe = new ConnectionProbe({ client });
  const first = probe.start({ url: "https://gateway.example", token: "first" });
  await Promise.resolve();
  const second = probe.start({ url: "https://gateway.example", token: "second" });
  assert.deepEqual(operations, ["probe", "teardown"]);
  releaseTeardown();
  releaseProbe();
  await Promise.all([first, second]);
  assert.deepEqual(operations, ["probe", "teardown", "probe"]);
});
