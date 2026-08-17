import assert from "node:assert/strict";
import test from "node:test";

import { RunController } from "../src/run-controller.js";

const core = ["run_submission", "run_status", "run_events_sse"];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("controller streams bounded activity, requires exact approval choices, and reconciles terminal status", async () => {
  const stream = deferred();
  let onEvent;
  const calls = [];
  const client = {
    async start(options) { onEvent = options.onEvent; return { runId: "run_abc12345", stream: stream.promise }; },
    async approve(request) { calls.push(["approve", request.choice]); },
    async steer(request) { calls.push(["steer", request.input]); },
    async stop() { calls.push(["stop"]); },
    async status() { calls.push(["status"]); return { runId: "run_abc12345", status: "completed", output: "server output" }; },
    async teardown() {},
  };
  const controller = new RunController({
    baseUrl: "http://127.0.0.1:8642",
    bearer: "secret",
    capabilities: [...core, "run_approval_response", "run_stop", "run_steer"],
    client,
  });

  await controller.start("do the thing");
  onEvent({ type: "message.delta", delta: "hello" });
  onEvent({ type: "tool.started", tool: "terminal", preview: "pwd" });
  onEvent({ type: "approval.request", command: "git status", choices: ["once", "deny"] });
  assert.equal(controller.snapshot.status, "waiting_for_approval");
  assert.equal(controller.snapshot.assistant, "hello");
  assert.equal(controller.snapshot.activity.at(-1).label, "Approval required");

  await assert.rejects(() => controller.approve("always"), /approval_not_available/);
  await controller.approve("once");
  assert.deepEqual(calls.slice(0, 2), [["approve", "once"], ["status"]]);

  stream.resolve({ httpStatus: 200 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(controller.snapshot.status, "completed");
  assert.equal(controller.snapshot.assistant, "hello");
});

test("stop stays nonterminal until authoritative status becomes terminal", async () => {
  const stream = deferred();
  let status = "running";
  const client = {
    async start() { return { runId: "run_abc12345", stream: stream.promise }; },
    async stop() {},
    async status() { return { runId: "run_abc12345", status, output: "" }; },
    async teardown() {},
  };
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: [...core, "run_stop"], client });
  await controller.start("work");
  await controller.stop();
  assert.equal(controller.snapshot.status, "stopping");
  status = "cancelled";
  stream.resolve({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(controller.snapshot.status, "cancelled");
});

test("unadvertised controls fail closed", async () => {
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client: {} });
  await assert.rejects(() => controller.stop(), /stop_not_available/);
  await assert.rejects(() => controller.steer("go"), /steer_not_available/);

  const unsupported = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: ["run_submission"], client: {} });
  await assert.rejects(() => unsupported.start("go"), /run_not_supported/);
});
