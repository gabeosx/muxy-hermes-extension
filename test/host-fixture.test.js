import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
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
  createQualificationRuntime,
  recordFreshSession,
  startOriginCaptureServer,
  validateCapturedOrigin,
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
