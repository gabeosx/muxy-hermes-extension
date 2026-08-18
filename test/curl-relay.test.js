import assert from "node:assert/strict";
import test from "node:test";

import { CurlRelay, MAX_JOURNAL_BYTES, buildBearerConfig, buildSessionConfig } from "../src/curl-relay.js";

test("bearer config keeps credentials in stdin and rejects line injection", () => {
  assert.equal(buildBearerConfig("abc-123._~+/="), 'header = "Authorization: Bearer abc-123._~+/="\n');
  for (const token of ["", "line\nbreak", "line\rbreak", 'quote"break', "slash\\break", "\0"]) {
    assert.throws(() => buildBearerConfig(token), /bearer token/i);
  }
});

test("requestJson uses argv-form curl, never puts the bearer in argv, and parses the terminal status marker", async () => {
  const calls = [];
  const relay = new CurlRelay({
    exec: async (argv, options) => {
      calls.push({ argv, options });
      return {
        stdout: '{"version":"v0.20.2","features":{"runs":true}}\n__MUXY_HERMES_STATUS__:200',
        stderr: "",
        exitCode: 0,
        timedOut: false,
        truncated: false,
      };
    },
    files: null,
    events: null,
  });

  const response = await relay.requestJson({
    url: "http://127.0.0.1:8642/v1/capabilities",
    bearer: "sentinel-token",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { version: "v0.20.2", features: { runs: true } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].argv[0], "/usr/bin/curl");
  assert.equal(calls[0].argv.includes("--config"), true);
  assert.equal(calls[0].argv.includes("-"), true);
  assert.equal(JSON.stringify(calls[0].argv).includes("sentinel-token"), false);
  assert.equal(calls[0].options.stdin.includes("sentinel-token"), true);
  assert.equal(Object.hasOwn(calls[0].options, "env"), false);
});

test("session config keeps cookies and credential bodies in stdin and rejects header injection", () => {
  const config = buildSessionConfig({
    cookie: "hermes_session_at=access.jwt; hermes_session_rt=refresh-token",
    body: { provider: "basic", username: "admin", password: "line\nquote\"slash\\" },
  });
  assert.match(config, /Cookie: hermes_session_at=access\.jwt; hermes_session_rt=refresh-token/);
  assert.match(config, /data-binary = /);
  assert.doesNotMatch(config, /\nheader = "X-Evil/);
  for (const cookie of ["bad\nheader=x", "bad\rcookie=x", 'bad"=x', "missing-value", "a=x;injected=y"]) {
    assert.throws(() => buildSessionConfig({ cookie }), /session cookie/i);
  }
});

test("requestSessionJson returns allowlisted Hermes cookies and scrubs response artifacts", async () => {
  const calls = [];
  const operations = [];
  const files = new Map();
  const relay = new CurlRelay({
    exec: async (argv, options) => {
      calls.push({ argv, options });
      const headerPath = argv[argv.indexOf("--dump-header") + 1];
      const bodyPath = argv[argv.indexOf("--output") + 1];
      files.set(headerPath, [
        "HTTP/1.1 200 OK",
        "Set-Cookie: hermes_session_at=access.jwt; HttpOnly; SameSite=Lax",
        "Set-Cookie: hermes_session_rt=refresh-token; HttpOnly; SameSite=Lax",
        "Set-Cookie: unrelated=ignored; HttpOnly",
        "",
        "",
      ].join("\r\n"));
      files.set(bodyPath, JSON.stringify({ ok: true }));
      return { stdout: "\n__MUXY_HERMES_STATUS__:200", stderr: "", exitCode: 0, timedOut: false, truncated: false };
    },
    files: {
      async read(path) {
        const content = files.get(path);
        if (content === undefined) throw new Error("missing");
        return { path, content, size: new TextEncoder().encode(content).byteLength };
      },
      async write(path, content) { operations.push({ type: "write", path, content }); files.set(path, content); },
      async delete(paths) { operations.push({ type: "delete", paths }); for (const path of [...files.keys()]) if (paths.some((root) => path.startsWith(root))) files.delete(path); },
    },
    randomId: () => "session-fixed-id",
  });

  const response = await relay.requestSessionJson({
    url: "https://hermes.example/auth/password-login",
    method: "POST",
    body: { provider: "basic", username: "admin", password: "sentinel-password" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(response.setCookies, [
    { name: "hermes_session_at", value: "access.jwt", expired: false },
    { name: "hermes_session_rt", value: "refresh-token", expired: false },
  ]);
  assert.equal(JSON.stringify(calls[0].argv).includes("sentinel-password"), false);
  assert.equal(calls[0].options.stdin.includes("sentinel-password"), true);
  assert.equal(operations.filter((entry) => entry.type === "write" && entry.content === "").length, 2);
  assert.equal(operations.at(-1).type, "delete");
});

test("requestSessionJson scrubs artifacts when curl or response parsing fails", async () => {
  const operations = [];
  const relay = new CurlRelay({
    exec: async () => ({ stdout: "", stderr: "failed", exitCode: 7, timedOut: false, truncated: false }),
    files: {
      async read() { throw new Error("missing"); },
      async write(path, content) { operations.push({ type: "write", path, content }); },
      async delete(paths) { operations.push({ type: "delete", paths }); },
    },
    randomId: () => "session-failed-id",
  });
  await assert.rejects(relay.requestSessionJson({ url: "https://hermes.example/api/auth/me" }), /relay_protocol_error|relay_request_failed/);
  assert.equal(operations.filter((entry) => entry.type === "write" && entry.content === "").length, 2);
  assert.equal(operations.at(-1).type, "delete");
});

test("streamJournal consumes file.changed through muxy.files without exec polling, then scrubs before removal", async () => {
  const subscriptions = new Map();
  const operations = [];
  let journal = "";
  let finishExec;
  const execDone = new Promise((resolve) => { finishExec = resolve; });
  const relay = new CurlRelay({
    exec: async () => ({ stdout: "", exitCode: 0 }),
    execAsync: (argv, options) => {
      operations.push({ type: "exec", argv, options });
      return { id: "stream-1", result: execDone, cancel() {} };
    },
    files: {
      async read(path) {
        operations.push({ type: "read", path });
        if (!journal) throw new Error("not written yet");
        return { path, content: journal, size: new TextEncoder().encode(journal).byteLength };
      },
      async write(path, content) {
        operations.push({ type: "write", path, content });
        journal = content;
      },
      async delete(paths) { operations.push({ type: "delete", paths }); },
    },
    events: {
      subscribe(name, handler) {
        subscriptions.set(name, handler);
        return () => subscriptions.delete(name);
      },
    },
    randomId: () => "fixed-id",
  });
  const chunks = [];
  const running = relay.streamJournal({
    url: "http://127.0.0.1:8642/v1/runs/run-1/events",
    bearer: "sentinel-token",
    onChunk: (chunk) => chunks.push(chunk),
  });

  journal = "event: message\ndata: one\n\n";
  subscriptions.get("file.changed")({ path: ".muxy-hermes-runtime/fixed-id/stream.sse" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  journal += "event: message\ndata: two\n\n";
  subscriptions.get("file.changed")({ path: ".muxy-hermes-runtime/fixed-id/stream.sse" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  finishExec({ stdout: "\n__MUXY_HERMES_STATUS__:200", stderr: "", exitCode: 0, timedOut: false, truncated: false });

  const result = await running;
  assert.deepEqual(chunks, ["event: message\ndata: one\n\n", "event: message\ndata: two\n\n"]);
  assert.equal(result.bytes > 0, true);
  assert.equal(operations.filter((entry) => entry.type === "exec").length, 1);
  assert.equal(operations.find((entry) => entry.type === "exec").options.stdin.includes("sentinel-token"), true);
  assert.equal(JSON.stringify(operations.find((entry) => entry.type === "exec").argv).includes("sentinel-token"), false);
  const writeIndex = operations.findIndex((entry) => entry.type === "write" && entry.content === "");
  const deleteIndex = operations.findIndex((entry) => entry.type === "delete");
  assert.equal(writeIndex >= 0 && deleteIndex > writeIndex, true);
});

test("streamJournal falls back to the Promise-based webview exec bridge", async () => {
  const subscriptions = new Map();
  const operations = [];
  let journal = "";
  let finishExec;
  const relay = new CurlRelay({
    exec: (argv, options) => {
      operations.push({ type: "exec", argv, options });
      return new Promise((resolve) => { finishExec = resolve; });
    },
    files: {
      async read(path) {
        if (!journal) throw new Error("not written yet");
        return { path, content: journal, size: new TextEncoder().encode(journal).byteLength };
      },
      async write(path, content) { operations.push({ type: "write", path, content }); journal = content; },
      async delete(paths) { operations.push({ type: "delete", paths }); },
    },
    events: {
      subscribe(name, handler) { subscriptions.set(name, handler); return () => subscriptions.delete(name); },
    },
    randomId: () => "webview-id",
  });

  const chunks = [];
  const running = relay.streamJournal({
    url: "http://127.0.0.1:8642/v1/chat/completions",
    bearer: "sentinel-token",
    onChunk: (chunk) => chunks.push(chunk),
  });
  journal = "data: one\n\n";
  subscriptions.get("file.changed")({ path: ".muxy-hermes-runtime/webview-id/stream.sse" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  finishExec({ stdout: "\n__MUXY_HERMES_STATUS__:200", stderr: "", exitCode: 0, timedOut: false, truncated: false });

  const result = await running;
  assert.deepEqual(chunks, ["data: one\n\n"]);
  assert.equal(result.executionId, null);
  assert.equal(result.httpStatus, 200);
  assert.equal(operations.filter((entry) => entry.type === "exec").length, 1);
  assert.equal(operations.find((entry) => entry.type === "exec").options.stdin.includes("sentinel-token"), true);
});

test("streamJournal fails closed when the journal exceeds the Muxy read ceiling", async () => {
  let handler;
  let finishExec;
  const relay = new CurlRelay({
    exec: async () => ({ stdout: "", exitCode: 0 }),
    execAsync: () => ({ id: "stream-2", result: new Promise((resolve) => { finishExec = resolve; }), cancel() {} }),
    files: {
      async read(path) { return { path, content: "x", size: MAX_JOURNAL_BYTES + 1 }; },
      async write() {},
      async delete() {},
    },
    events: { subscribe(_name, callback) { handler = callback; return () => {}; } },
    randomId: () => "too-large",
  });
  const running = relay.streamJournal({ url: "http://127.0.0.1:8642/events", bearer: "token", onChunk() {} });
  handler({ path: ".muxy-hermes-runtime/too-large/stream.sse" });
  finishExec({ stdout: "\n__MUXY_HERMES_STATUS__:200", stderr: "", exitCode: 0, timedOut: false, truncated: false });
  await assert.rejects(running, /journal_limit_exceeded/);
});

test("stale cleanup is fixed-root and scrubs each journal before deleting its run directory", async () => {
  const operations = [];
  const relay = new CurlRelay({
    exec: async () => ({}),
    files: {
      async list(path) {
        operations.push({ type: "list", path });
        if (path === ".muxy-hermes-runtime") {
          return [{ name: "deadbeef", path: ".muxy-hermes-runtime/deadbeef", isDirectory: true, isIgnored: true }];
        }
        return [{ name: "stream.sse", path: `${path}/stream.sse`, isDirectory: false, isIgnored: true }];
      },
      async write(path, content) { operations.push({ type: "write", path, content }); },
      async delete(paths) { operations.push({ type: "delete", paths }); },
    },
    events: null,
  });

  assert.deepEqual(await relay.cleanupStaleJournals(), { cleaned: 1 });
  assert.deepEqual(operations.map((entry) => entry.type), ["list", "list", "write", "delete"]);
  assert.equal(operations[2].path, ".muxy-hermes-runtime/deadbeef/stream.sse");
  assert.equal(operations[2].content, "");
  assert.deepEqual(operations[3].paths, [".muxy-hermes-runtime/deadbeef"]);
});

test("stale cleanup treats a missing root as empty and refuses unexpected entries without deleting", async () => {
  const missing = new CurlRelay({
    exec: async () => ({}),
    files: { async list() { const error = new Error("ENOENT: No such file"); error.code = "ENOENT"; throw error; } },
    events: null,
  });
  assert.deepEqual(await missing.cleanupStaleJournals(), { cleaned: 0 });

  const muxyMissing = new CurlRelay({
    exec: async () => ({}),
    files: { async list() { throw new Error("“.muxy-hermes-runtime” no longer exists"); } },
    events: null,
  });
  assert.deepEqual(await muxyMissing.cleanupStaleJournals(), { cleaned: 0 });

  let deleted = false;
  const unsafe = new CurlRelay({
    exec: async () => ({}),
    files: {
      async list(path) {
        if (path === ".muxy-hermes-runtime") return [{ name: "notes.txt", path: ".muxy-hermes-runtime/notes.txt", isDirectory: false }];
        return [];
      },
      async write() {},
      async delete() { deleted = true; },
    },
    events: null,
  });
  await assert.rejects(unsafe.cleanupStaleJournals(), /journal_cleanup_unexpected_entry/);
  assert.equal(deleted, false);
});
