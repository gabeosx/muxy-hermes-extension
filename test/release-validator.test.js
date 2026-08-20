import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { productionImportGraph, scanReleaseSecrets, validateImportReachability } from "../scripts/validate-release.mjs";

test("production import graph contains only current Dashboard and Muxy modules", async () => {
  const graph = await productionImportGraph();
  assert.deepEqual(graph, [
    "src/board-main.js",
    "src/board/app.js",
    "src/curl-relay.js",
    "src/dashboard-agent.js",
    "src/dashboard-auth.js",
    "src/dashboard-gateway.js",
    "src/dashboard-operations.js",
    "src/kanban-client.js",
    "src/lib/dom.js",
    "src/lib/icons.js",
    "src/main.js",
    "src/muxy-tabs.js",
    "src/panel/app.js",
    "src/session-broker.js",
    "src/stop-confirmation.js",
  ]);
  assert.deepEqual(await validateImportReachability(), graph);
});

test("release secret scanner returns file names only and finds no credential material", async () => {
  const scanned = await scanReleaseSecrets();
  assert.ok(scanned.includes("README.md"));
  assert.ok(scanned.includes("OPEN_ISSUES.md"));
  assert.ok(scanned.includes("package.json"));
  assert.equal(scanned.some((file) => file.startsWith(".planning/")), false);
});

test("release validator owns clean-copy cleanup and never exposes command output", async () => {
  const source = await readFile(new URL("../scripts/validate-release.mjs", import.meta.url), "utf8");
  assert.match(source, /mkdtemp\(join\(tmpdir\(\), "hermes-agent-release-"\)\)/);
  assert.match(source, /rm\(temporaryRoot, \{ recursive: true, force: true \}\)/);
  assert.match(source, /copy_\$\{index\}_test_\$\{pass\}/);
  assert.match(source, /assert\.deepEqual\(second\.digests, first\.digests/);
  assert.match(source, /throw new Error\(`\$\{label\}_failed:\$\{exitCode\}\$\{signal\}`\)/);
});
