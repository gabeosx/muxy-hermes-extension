import assert from "node:assert/strict";
import test from "node:test";

import { RUN_FEATURES, RunClient, supportsCoreRun } from "../src/run-client.js";

test("run client submits once, starts the authenticated event stream, and validates status", async () => {
  const requests = [];
  const streams = [];
  const relay = {
    async requestJson(request) {
      requests.push(request);
      if (request.method === "POST") return { status: 202, body: { run_id: "run_abc12345", status: "started" } };
      return { status: 200, body: { run_id: "run_abc12345", status: "completed", output: "done", raw: "discard" } };
    },
    async streamJournal(request) {
      streams.push(request);
      request.onChunk('data: {"event":"message.delta","run_id":"run_abc12345","delta":"hi"}\n\n');
      return { httpStatus: 200 };
    },
  };
  const client = new RunClient({ relay });
  const events = [];
  const started = await client.start({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", input: "hello", onEvent: (event) => events.push(event) });

  assert.equal(started.runId, "run_abc12345");
  await started.stream;
  assert.deepEqual(events, [{ type: "message.delta", delta: "hi" }]);
  assert.equal(requests[0].url, "http://127.0.0.1:8642/v1/runs");
  assert.deepEqual(requests[0].body, { input: "hello" });
  assert.equal(streams[0].url, "http://127.0.0.1:8642/v1/runs/run_abc12345/events");
  assert.equal(requests[0].bearer, "secret");
  assert.equal(streams[0].bearer, "secret");

  const status = await client.status({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", runId: started.runId });
  assert.deepEqual(status, { runId: "run_abc12345", status: "completed", output: "done" });
  assert.equal(JSON.stringify(status).includes("discard"), false);
});

test("run client uses fixed action endpoints and rejects arbitrary approval choices", async () => {
  const requests = [];
  const relay = { async requestJson(request) { requests.push(request); return { status: 200, body: { status: "running" } }; } };
  const client = new RunClient({ relay });
  const base = { baseUrl: "https://gateway.example", bearer: "secret", runId: "run_abc12345" };

  await client.approve({ ...base, choice: "once" });
  await client.steer({ ...base, input: "focus on tests" });
  await client.stop(base);
  assert.deepEqual(requests.map((request) => [request.url, request.body]), [
    ["https://gateway.example/v1/runs/run_abc12345/approval", { choice: "once" }],
    ["https://gateway.example/v1/runs/run_abc12345/steer", { input: "focus on tests" }],
    ["https://gateway.example/v1/runs/run_abc12345/stop", {}],
  ]);
  await assert.rejects(() => client.approve({ ...base, choice: "yes" }), /invalid_approval_choice/);
  await assert.rejects(() => client.stop({ ...base, runId: "../escape" }), /invalid_run_id/);
});

test("core run support requires all three advertised transport capabilities", () => {
  assert.equal(supportsCoreRun([RUN_FEATURES.submit, RUN_FEATURES.status, RUN_FEATURES.events]), true);
  assert.equal(supportsCoreRun([RUN_FEATURES.submit, RUN_FEATURES.status]), false);
});
