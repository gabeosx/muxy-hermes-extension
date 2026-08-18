import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { connect } from "node:net";
import { once } from "node:events";
import test from "node:test";

import {
  normaliseReleaseVersion,
  readInstalledMuxyVersion,
  resolveHermesRevision,
  resolveLatestStable,
} from "../scripts/resolve-versions.mjs";
import {
  FIXTURE_REQUEST,
  consumeOriginHandoff,
  cleanupQualificationRuntime,
  createQualificationRuntime,
  qualifyRealDeployment,
  recordFreshSession,
  startDeterministicModelStub,
  startOriginCaptureServer,
  validateCapturedOrigin,
  verifyQualificationExecutable,
} from "../scripts/qualify-real.mjs";

const muxyRelease = { tag_name: "v1.5.0", draft: false, prerelease: false, published_at: "2026-08-16T00:00:00Z" };

test("latest-release resolution rejects mutable and prerelease metadata without leaking raw responses", async () => {
  assert.equal(normaliseReleaseVersion("v1.5.0"), "1.5.0");
  assert.equal(normaliseReleaseVersion("1.5.0"), "1.5.0");
  await assert.rejects(
    resolveLatestStable({ repository: "muxy-app/muxy", fetchImpl: async () => new Response(JSON.stringify({ ...muxyRelease, prerelease: true }), { status: 200 }) }),
    /version_release_prerelease/,
  );
  const resolved = await resolveLatestStable({ repository: "muxy-app/muxy", fetchImpl: async () => new Response(JSON.stringify(muxyRelease), { status: 200 }) });
  assert.deepEqual(resolved, { tag: "v1.5.0", version: "1.5.0", publishedAt: "2026-08-16T00:00:00Z" });
});

test("Hermes falls back only to an unambiguous official annotated-tag peel when the commit API is unavailable", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/releases/latest")) return new Response(JSON.stringify({ tag_name: "v2026.8.16", name: "Hermes Agent v0.20.2", draft: false, prerelease: false, published_at: "2026-08-16T00:00:00Z" }), { status: 200 });
    return new Response("gateway timeout", { status: 504 });
  };
  const execFile = async () => ({ stdout: "bbc20510676c48c6bfa0ef5c2eeefbf676449456\trefs/tags/v2026.8.16\ndf4b65147d7ddd74dd449f9067aabbca5aef0ec7\trefs/tags/v2026.8.16^{}\n" });
  const resolved = await resolveHermesRevision({ fetchImpl, execFile });
  assert.equal(resolved.installedVersion, "0.20.2");
  assert.equal(resolved.revision, "df4b65147d7ddd74dd449f9067aabbca5aef0ec7");
});

test("installed Muxy identity requires its exact bundle identifier and safe version fields", async () => {
  const calls = [];
  const execFile = async (_command, args) => {
    calls.push(args.at(-1));
    const field = args[1];
    return { stdout: field === "CFBundleIdentifier" ? "com.muxy.app\n" : field === "CFBundleShortVersionString" ? "1.5.0\n" : "945\n" };
  };
  const installed = await readInstalledMuxyVersion({ appPath: "/Applications/Muxy.app", execFile });
  assert.deepEqual(installed, { bundleIdentifier: "com.muxy.app", shortVersion: "1.5.0", buildVersion: "945" });
  assert.equal(calls.length, 3);
  await assert.rejects(
    readInstalledMuxyVersion({ appPath: "/Applications/Muxy.app", execFile: async () => ({ stdout: "wrong.bundle\n" }) }),
    /version_muxy_bundle_identifier/,
  );
});

test("host fixture creates a permission-restricted empty home/workspace and no durable bearer", async () => {
  const root = await mkdtemp("/private/tmp/hermes-host-fixture-test-");
  try {
    const runtime = await createQualificationRuntime({ root, token: "test-only-secret" });
    assert.equal(await stat(runtime.home).then((value) => value.mode & 0o777), 0o700);
    assert.equal(await stat(runtime.workspace).then((value) => value.mode & 0o777), 0o700);
    assert.equal(await stat(runtime.tokenFile).then((value) => value.mode & 0o777), 0o600);
    assert.match(FIXTURE_REQUEST, /^\{"model":"hermes-agent","messages":\[\{"role":"user","content":"HERMES_STREAM_QUALIFICATION_V1"\}\],"stream":true\}$/);
    assert.equal(runtime.environment.API_SERVER_KEY, "test-only-secret");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("qualification setup returns an idempotent cleanup handle for its listener and bearer-bearing runtime", async () => {
  const root = await mkdtemp("/private/tmp/hermes-host-lifecycle-test-");
  const lifecycle = await qualifyRealDeployment({ runtimeRoot: root });
  assert.equal(typeof lifecycle.cleanup, "function");
  assert.equal(await stat(lifecycle.panelTokenFile).then((value) => value.mode & 0o777), 0o600);
  const captureUrl = new URL(lifecycle.captureUrl);
  const idleClient = connect(Number(captureUrl.port), captureUrl.hostname);
  idleClient.on("error", () => {});
  await once(idleClient, "connect");
  assert.deepEqual(await Promise.race([
    lifecycle.cleanup(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("qualification_cleanup_timeout")), 1_000)),
  ]), { cleanup: "scrubbed_removed" });
  assert.equal(idleClient.destroyed, true);
  assert.deepEqual(await lifecycle.cleanup(), { cleanup: "scrubbed_removed" });
  await assert.rejects(stat(root));
});

test("host qualification accepts only the explicit pinned temporary executable and scrubs its owned runtime", async () => {
  const executable = "/private/tmp/hermes-qualification-v2026.8.16/hermes";
  const verified = await verifyQualificationExecutable({
    executable,
    attestedRevision: "df4b65147d7ddd74dd449f9067aabbca5aef0ec7",
    execFile: async (command, args) => {
      assert.equal(command, executable);
      assert.deepEqual(args, ["--version"]);
      return { stdout: "Hermes Agent v0.20.2 (2026.8.16)\n" };
    },
    readFile: async (path) => path.endsWith("pyproject.toml")
      ? '[project]\nversion = "0.20.2"\n'
      : '__version__ = "0.20.2"\n__release_date__ = "2026.8.16"\n',
  });
  assert.deepEqual(verified, { version: "0.20.2", release: "2026.8.16", revision: "df4b65147d7ddd74dd449f9067aabbca5aef0ec7" });
  await assert.rejects(verifyQualificationExecutable({ executable: "/Applications/hermes", execFile: async () => ({ stdout: "" }) }), /qualification_executable_unsafe/);
  await assert.rejects(verifyQualificationExecutable({
    executable,
    attestedRevision: "bbc20510676c48c6bfa0ef5c2eeefbf676449456",
    execFile: async () => ({ stdout: "Hermes Agent v0.20.2 (2026.8.16)\n" }),
    readFile: async () => 'version = "0.20.2"\n__release_date__ = "2026.8.16"\n',
  }), /qualification_executable_identity_mismatch/);

  const root = await mkdtemp("/private/tmp/hermes-host-fixture-cleanup-");
  await cleanupQualificationRuntime({ root });
  await assert.rejects(stat(root));
});

test("deterministic model fixture permits Hermes metadata while rejecting title probes and replay", async () => {
  const stub = await startDeterministicModelStub();
  const endpoint = `${stub.baseUrl}/chat/completions`;
  const post = (body) => fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    const titleProbe = await post({
      model: "hermes-agent",
      messages: [{ role: "user", content: "Create a title" }],
      stream: false,
    });
    assert.equal(titleProbe.status, 400);

    const qualifiedBody = {
      model: "hermes-agent",
      messages: [
        { role: "system", content: "Hermes runtime metadata" },
        { role: "user", content: "HERMES_STREAM_QUALIFICATION_V1" },
      ],
      stream: true,
      tools: [{ type: "function", function: { name: "fixture_tool", parameters: { type: "object" } } }],
    };
    const qualified = await post(qualifiedBody);
    assert.equal(qualified.status, 200);
    assert.match(await qualified.text(), /alpha[\s\S]*beta[\s\S]*\[DONE\]/);
    assert.equal(stub.requestCount(), 1);

    const runRequest = await post(qualifiedBody);
    assert.equal(runRequest.status, 200);
    assert.match(await runRequest.text(), /alpha[\s\S]*beta[\s\S]*\[DONE\]/);
    assert.equal(stub.requestCount(), 2);

    const freshPanelProbe = await post(qualifiedBody);
    assert.equal(freshPanelProbe.status, 200);
    assert.match(await freshPanelProbe.text(), /alpha[\s\S]*beta[\s\S]*\[DONE\]/);
    assert.equal(stub.requestCount(), 3);

    const replay = await post(qualifiedBody);
    assert.equal(replay.status, 400);
  } finally {
    await stub.close();
  }
});

test("captured origins must be stable, syntactically exact non-null values and two sessions must be freshly distinct", () => {
  assert.equal(validateCapturedOrigin(["muxy-extension://panel"]), "muxy-extension://panel");
  for (const origins of [["muxy-extension://panel", "muxy-extension://panel"], ["null"], ["*"], ["one", "two"], [], ["https://gateway.example/path"], ["https://user:pass@gateway.example"], ["javascript://unsafe"]]) {
    assert.throws(() => validateCapturedOrigin(origins), /qualification_origin_/);
  }
  const first = recordFreshSession({ sessionOrdinal: 1, panelSessionId: "panel-a", requiredStages: "passed" });
  const second = recordFreshSession({ sessionOrdinal: 2, panelSessionId: "panel-b", requiredStages: "passed", previous: first });
  assert.equal(first.freshPanelSession, true);
  assert.equal(second.freshPanelSession, true);
  assert.throws(() => recordFreshSession({ sessionOrdinal: 2, panelSessionId: "panel-a", requiredStages: "passed", previous: first }), /qualification_fresh_panel_required/);
});

test("origin capture survives listener exit in a 0600 allowlisted one-use handoff", async () => {
  const capture = await startOriginCaptureServer();
  try {
    const response = await fetch(`${capture.url}/v1/capabilities`, {
      method: "OPTIONS",
      headers: {
        Origin: "muxy-extension://panel",
        "Access-Control-Request-Method": "GET",
        "X-Not-For-Handoff": "test-only-secret",
      },
    });
    assert.equal(response.status, 204);
    const handoff = await capture.waitForOrigin();
    await capture.closed;
    assert.equal(await stat(handoff.path).then((value) => value.mode & 0o777), 0o600);
    const stored = JSON.parse(await readFile(handoff.path, "utf8"));
    assert.deepEqual(Object.keys(stored).sort(), ["captureId", "capturedAt", "origin"]);
    assert.equal(stored.origin, "muxy-extension://panel");
    assert.equal(JSON.stringify(stored).includes("test-only-secret"), false);
  } finally {
    await capture.cleanup();
  }
});

test("capture rejects invalid, multiple, null, wildcard, and reflected-input requests without a handoff or retry", async () => {
  const cases = [
    { origin: "null", method: "OPTIONS", path: "/v1/capabilities", requestMethod: "GET" },
    { origin: "*", method: "OPTIONS", path: "/v1/capabilities", requestMethod: "GET" },
    { origin: "https://gateway.example/path", method: "OPTIONS", path: "/v1/capabilities", requestMethod: "GET" },
    { origin: "muxy-extension://panel", method: "GET", path: "/v1/capabilities", requestMethod: "GET" },
    { origin: "muxy-extension://panel", method: "OPTIONS", path: "/origin?origin=muxy-extension://panel", requestMethod: "GET" },
  ];
  for (const scenario of cases) {
    const capture = await startOriginCaptureServer();
    const waiting = capture.waitForOrigin();
    try {
      const response = await fetch(`${capture.url}${scenario.path}`, {
        method: scenario.method,
        headers: { Origin: scenario.origin, "Access-Control-Request-Method": scenario.requestMethod },
      });
      assert.equal(response.status, 400);
      await assert.rejects(waiting, /qualification_origin_/);
    } finally {
      await capture.cleanup();
    }
  }
});

test("captured origin is consumed once and deleted immediately after the exact-origin configuration", async () => {
  const capture = await startOriginCaptureServer();
  try {
    await fetch(`${capture.url}/v1/capabilities`, {
      method: "OPTIONS",
      headers: { Origin: "muxy-extension://panel", "Access-Control-Request-Method": "GET" },
    });
    const handoff = await capture.waitForOrigin();
    await capture.closed;
    const configured = [];
    await consumeOriginHandoff({ path: handoff.path, configure: async (origin) => configured.push(origin) });
    assert.deepEqual(configured, ["muxy-extension://panel"]);
    await assert.rejects(stat(handoff.path));
    await assert.rejects(consumeOriginHandoff({ path: handoff.path, configure: async () => {} }), /qualification_origin_handoff_/);
  } finally {
    await capture.cleanup();
  }
});
