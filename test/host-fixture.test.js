import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  normaliseReleaseVersion,
  readInstalledMuxyVersion,
  resolveLatestStable,
} from "../scripts/resolve-versions.mjs";
import {
  FIXTURE_REQUEST,
  createQualificationRuntime,
  recordFreshSession,
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

test("captured origins must be stable exact non-null values and two sessions must be freshly distinct", () => {
  assert.equal(validateCapturedOrigin(["muxy-extension://panel", "muxy-extension://panel"]), "muxy-extension://panel");
  for (const origins of [["null"], ["*"], ["one", "two"], []]) {
    assert.throws(() => validateCapturedOrigin(origins), /qualification_origin_/);
  }
  const first = recordFreshSession({ sessionOrdinal: 1, panelSessionId: "panel-a", requiredStages: "passed" });
  const second = recordFreshSession({ sessionOrdinal: 2, panelSessionId: "panel-b", requiredStages: "passed", previous: first });
  assert.equal(first.freshPanelSession, true);
  assert.equal(second.freshPanelSession, true);
  assert.throws(() => recordFreshSession({ sessionOrdinal: 2, panelSessionId: "panel-a", requiredStages: "passed", previous: first }), /qualification_fresh_panel_required/);
});
