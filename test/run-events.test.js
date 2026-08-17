import assert from "node:assert/strict";
import test from "node:test";

import { MAX_RUN_FRAME_CHARS, RunEventParser, normalizeRunEvent } from "../src/run-events.js";

test("run event parser incrementally projects only recognized events for its run", () => {
  const parser = new RunEventParser("run_abc12345");
  assert.deepEqual(parser.push('data: {"event":"message.delta","run_id":"run_abc12345","delta":"hel'), []);
  assert.deepEqual(parser.push('lo"}\n\ndata: {"event":"tool.started","run_id":"run_abc12345","tool":"terminal","preview":"pwd"}\n\n'), [
    { type: "message.delta", delta: "hello" },
    { type: "tool.started", tool: "terminal", preview: "pwd" },
  ]);

  assert.deepEqual(parser.push('data: {"event":"run.completed","run_id":"other"}\n\n'), []);
  assert.deepEqual(parser.push('data: {"event":"unknown","run_id":"run_abc12345","secret":"discard"}\n\n'), []);
  assert.deepEqual(parser.push('data: not-json\n\n'), []);
});

test("approval projection accepts only Gateway-provided documented choices", () => {
  assert.deepEqual(normalizeRunEvent({
    event: "approval.request",
    run_id: "run_abc12345",
    command: "git status",
    choices: ["once", "session", "always", "deny", "permit_everything", "once"],
  }, "run_abc12345"), {
    type: "approval.request",
    command: "git status",
    choices: ["once", "session", "always", "deny"],
  });
  assert.equal(normalizeRunEvent({ event: "approval.request", choices: ["unknown"] }, "run_abc12345"), null);
});

test("run event parser fails closed on oversized unterminated frames", () => {
  const parser = new RunEventParser("run_abc12345");
  assert.throws(() => parser.push("x".repeat(MAX_RUN_FRAME_CHARS + 1)), /run_event_too_large/);
});
