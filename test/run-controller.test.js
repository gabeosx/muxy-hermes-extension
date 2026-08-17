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

test("a rejected stop reconciles out of the transient stopping state", async () => {
  const stream = deferred();
  const client = {
    async start() { return { runId: "run_abc12345", stream: stream.promise }; },
    async stop() { throw new Error("rejected"); },
    async status() { return { runId: "run_abc12345", status: "running", output: "" }; },
    async teardown() {},
  };
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: [...core, "run_stop"], client });
  await controller.start("work");
  await controller.stop();
  assert.equal(controller.snapshot.status, "running");
  assert.equal(controller.snapshot.error, "The Gateway did not accept that run control.");
});

test("unadvertised controls fail closed", async () => {
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client: {} });
  await assert.rejects(() => controller.stop(), /stop_not_available/);
  await assert.rejects(() => controller.steer("go"), /steer_not_available/);

  const unsupported = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: ["run_submission"], client: {} });
  await assert.rejects(() => unsupported.start("go"), /run_not_supported/);
});

test("an interrupted same-panel observer reconciles before exactly two bounded reattach attempts", async () => {
  const initial = deferred();
  const firstRetry = deferred();
  const secondRetry = deferred();
  const observed = [];
  const delays = [];
  const client = {
    async start(options) { observed.push(["start", options]); return { runId: "run_abc12345", stream: initial.promise }; },
    async observe(options) {
      observed.push(["observe", options]);
      return observed.filter(([kind]) => kind === "observe").length === 1 ? firstRetry.promise : secondRetry.promise;
    },
    async status() { observed.push(["status"]); return { runId: "run_abc12345", status: "running", output: "" }; },
    async teardown() {},
  };
  const controller = new RunController({
    baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client,
    recoveryDelays: [11, 22], sleep: async (delay) => { delays.push(delay); },
  });

  await controller.start("work");
  initial.resolve({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(observed.map(([kind]) => kind), ["start", "status", "observe"]);
  assert.deepEqual(delays, [11]);
  assert.equal(controller.snapshot.streamState, "reconnecting");
  assert.equal(controller.snapshot.reconnectAttempt, 1);
  assert.match(controller.snapshot.recoveryNotice, /may be missing or duplicated/i);

  firstRetry.resolve({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(observed.map(([kind]) => kind), ["start", "status", "observe", "status", "observe"]);
  assert.deepEqual(delays, [11, 22]);
  assert.equal(controller.snapshot.reconnectAttempt, 2);

  secondRetry.resolve({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(observed.map(([kind]) => kind), ["start", "status", "observe", "status", "observe", "status"]);
  assert.equal(controller.snapshot.streamState, "disconnected");
  assert.equal(controller.snapshot.status, "running");
  assert.equal(controller.snapshot.manualRefresh, true);
});

test("an unavailable status immediately ends automatic recovery and manual refresh remains status-only", async () => {
  const stream = deferred();
  let statusCalls = 0;
  const client = {
    async start() { return { runId: "run_abc12345", stream: stream.promise }; },
    async observe() { throw new Error("must not observe after unavailable status"); },
    async status() {
      statusCalls += 1;
      if (statusCalls === 1) throw new Error("gateway unavailable");
      return { runId: "run_abc12345", status: "completed", output: "authoritative" };
    },
    async teardown() {},
  };
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client, sleep: async () => {} });

  await controller.start("work");
  stream.resolve({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(controller.snapshot.status, "status_unavailable");
  assert.equal(controller.snapshot.streamState, "disconnected");
  assert.equal(controller.snapshot.manualRefresh, true);
  assert.equal(controller.snapshot.runId, "run_abc12345");

  await controller.refresh();
  assert.equal(controller.snapshot.status, "completed");
  assert.equal(controller.snapshot.assistant, "authoritative");
  assert.equal(controller.snapshot.streamState, "disconnected");
  assert.equal(statusCalls, 2);
});

test("recreated-panel recover is status-only and clears untrusted live detail", async () => {
  const calls = [];
  const client = {
    async status(request) { calls.push(["status", request.runId]); return { runId: request.runId, status: "completed", output: "final output" }; },
    async observe() { calls.push(["observe"]); },
    async teardown() {},
  };
  const controller = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "fresh", capabilities: core, client });

  await controller.recover("run_abc12345");
  assert.deepEqual(calls, [["status", "run_abc12345"]]);
  assert.equal(controller.snapshot.status, "completed");
  assert.equal(controller.snapshot.assistant, "final output");
  assert.deepEqual(controller.snapshot.activity, []);
  assert.equal(controller.snapshot.pendingApproval, null);
  assert.equal(controller.snapshot.streamState, "detached");
  assert.match(controller.snapshot.recoveryNotice, /not recovered/i);
});
