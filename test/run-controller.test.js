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

async function flushAsyncWork() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
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

test("status failures at every interruption boundary stop automatic recovery and leave Refresh status-only", async (t) => {
  const cases = [
    { name: "initial reconciliation", failedStatus: 1, expected: ["start", "status"] },
    { name: "first reattach reconciliation", failedStatus: 2, expected: ["start", "status", "observe", "status"] },
    { name: "final exhaustion reconciliation", failedStatus: 3, expected: ["start", "status", "observe", "status", "observe", "status"] },
  ];

  for (const scenario of cases) await t.test(scenario.name, async () => {
    const initial = deferred();
    const firstObserver = deferred();
    const finalObserver = deferred();
    const calls = [];
    let statusCalls = 0;
    const client = {
      async start() { calls.push("start"); return { runId: "run_abc12345", stream: initial.promise }; },
      observe() {
        calls.push("observe");
        return calls.filter((call) => call === "observe").length === 1 ? firstObserver.promise : finalObserver.promise;
      },
      async status() {
        calls.push("status");
        statusCalls += 1;
        if (statusCalls === scenario.failedStatus) throw new Error("status unavailable");
        return { runId: "run_abc12345", status: "running", output: "" };
      },
      async teardown() {},
    };
    const controller = new RunController({
      baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client,
      recoveryDelays: [0, 0], sleep: async () => {},
    });

    await controller.start("work");
    initial.resolve({});
    await flushAsyncWork();
    if (scenario.failedStatus > 1) {
      firstObserver.resolve({});
      await flushAsyncWork();
    }
    if (scenario.failedStatus > 2) {
      finalObserver.resolve({});
      await flushAsyncWork();
    }

    assert.deepEqual(calls, scenario.expected);
    assert.deepEqual([
      controller.snapshot.status,
      controller.snapshot.streamState,
      controller.snapshot.manualRefresh,
      controller.snapshot.recovery.statusClass,
    ], ["status_unavailable", "disconnected", true, "unavailable"]);
    const beforeStaleSettlement = [...calls];
    initial.resolve({}); firstObserver.resolve({}); finalObserver.resolve({});
    await flushAsyncWork();
    assert.deepEqual(calls, beforeStaleSettlement, "no observer follows the rejected authoritative status");

    await controller.refresh();
    assert.equal(controller.snapshot.status, "running");
    assert.equal(controller.snapshot.streamState, "disconnected");
    assert.equal(controller.snapshot.manualRefresh, true);
    assert.equal(calls.filter((call) => call === "observe").length, scenario.failedStatus - 1, "manual Refresh never restarts SSE");
  });
});

test("release invalidates pending recovery work and serializes replacement relay ownership", async (t) => {
  const cases = ["backoff", "status", "observer"];

  for (const timing of cases) await t.test(`release during pending ${timing}`, async () => {
    const initial = deferred();
    const pendingStatus = deferred();
    const pendingSleep = deferred();
    const pendingObserver = deferred();
    const teardown = deferred();
    const calls = [];
    let owners = 0;
    let maximumOwners = 0;
    let teardownCalls = 0;
    let oldSnapshotUpdates = 0;
    const oldClient = {
      async start() {
        calls.push("old:start");
        owners += 1;
        maximumOwners = Math.max(maximumOwners, owners);
        return { runId: "run_abc12345", stream: initial.promise };
      },
      status() {
        calls.push("old:status");
        return timing === "status" ? pendingStatus.promise : Promise.resolve({ runId: "run_abc12345", status: "running", output: "" });
      },
      observe() { calls.push("old:observe"); return pendingObserver.promise; },
      async teardown() {
        calls.push("old:teardown");
        teardownCalls += 1;
        await teardown.promise;
        owners -= 1;
      },
    };
    const oldController = new RunController({
      baseUrl: "http://127.0.0.1:8642", bearer: "old-secret", capabilities: core, client: oldClient,
      recoveryDelays: [0, 0], sleep: () => {
        calls.push("old:sleep");
        return timing === "backoff" ? pendingSleep.promise : Promise.resolve();
      },
    });
    oldController.subscribe(() => { oldSnapshotUpdates += 1; });
    await oldController.start("old work");
    initial.resolve({});
    await flushAsyncWork();
    assert.ok(calls.includes(timing === "observer" ? "old:observe" : timing === "status" ? "old:status" : "old:sleep"));

    const updatesBeforeRelease = oldSnapshotUpdates;
    const replacementClient = {
      async start() {
        calls.push("replacement:start");
        owners += 1;
        maximumOwners = Math.max(maximumOwners, owners);
        return { runId: "run_def67890", stream: new Promise(() => {}) };
      },
      async teardown() { owners -= 1; },
    };
    const replacement = new RunController({ baseUrl: "http://127.0.0.1:8642", bearer: "fresh-secret", capabilities: core, client: replacementClient });
    const replace = (async () => {
      await oldController.release();
      await replacement.start("replacement work");
    })();

    await flushAsyncWork();
    assert.equal(teardownCalls, 1);
    assert.equal(calls.includes("replacement:start"), false, "replacement waits for old teardown");
    if (timing === "backoff") pendingSleep.resolve();
    if (timing === "status") pendingStatus.resolve({ runId: "run_abc12345", status: "completed", output: "stale" });
    if (timing === "observer") pendingObserver.resolve({});
    await flushAsyncWork();
    assert.equal(oldSnapshotUpdates, updatesBeforeRelease, "released listeners receive no stale state");

    teardown.resolve();
    await replace;
    assert.equal(teardownCalls, 1);
    assert.equal(maximumOwners, 1, "old and replacement controllers never own a relay concurrently");
    assert.equal(owners, 1, "only the replacement controller owns a relay after handoff");
  });
});
