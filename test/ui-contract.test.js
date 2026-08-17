import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeCapabilities } from "../src/capabilities.js";

test("capability normalization keeps only safe documented metadata and names", () => {
  const normalized = normalizeCapabilities({
    version: "fixture-v1",
    features: {
      run_stop: true,
      run_start: true,
      unsafe_object: { enabled: true },
      disabled_feature: false,
      "not valid": true,
    },
    secret: "must-not-survive",
  });

  assert.deepEqual(normalized, {
    state: "partial",
    version: "fixture-v1",
    names: ["run_start", "run_stop"],
  });
  assert.equal(JSON.stringify(normalized).includes("must-not-survive"), false);
  assert.deepEqual(normalizeCapabilities({ version: "fixture-v1", features: {} }), {
    state: "empty",
    version: "fixture-v1",
    names: [],
  });
  assert.deepEqual(normalizeCapabilities(null), { state: "unavailable", version: null, names: [] });
});

test("the manifest exposes the panel plus only the approved relay and journal permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.muxy.commands, [{
    id: "toggle-hermes-gateway",
    title: "Hermes: Toggle Gateway Panel",
    action: { kind: "togglePanel", panel: "hermes-gateway" },
  }]);
  assert.deepEqual(manifest.muxy.permissions, ["commands:exec", "files:read", "files:write", "panels:write"]);
  assert.deepEqual(manifest.muxy.events, ["file.changed"]);
  for (const forbiddenSurface of ["background", "topbarItems", "statusbarItems", "scripts"]) {
    assert.equal(Object.hasOwn(manifest.muxy, forbiddenSurface), false, `manifest must not declare ${forbiddenSurface}`);
  }
});

test("the panel keeps capability and evidence output safe while deriving run availability from advertised names", async () => {
  const panel = await readFile(new URL("../src/panel/app.js", import.meta.url), "utf8");

  for (const text of [
    "No capabilities advertised",
    "This Gateway did not advertise any controls for this client.",
    "Controls below are derived only from this advertised capability set.",
    "Validation evidence",
    "No versioned fixture result has been recorded for this deployment condition.",
    "Muxy will ask before running curl and before scrubbing a temporary journal in this worktree.",
    "A remembered curl grant covers that executable, not only this Gateway.",
    "Gateway unreachable",
    "Gateway timed out",
  ]) assert.match(panel, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.doesNotMatch(panel, /exact-origin access|confirm its exact Muxy origin/i);
  assert.match(panel, /Cleaning previous relay journal/);
  assert.match(panel, /this\.probe\.prepare\(\)/);

  for (const contract of [
    "supportsCoreRun(result.capabilityNames)",
    "RUN_FEATURES.submit",
    "RUN_FEATURES.status",
    "RUN_FEATURES.events",
    "RUN_FEATURES.approval",
    "RUN_FEATURES.steer",
    "RUN_FEATURES.stop",
    "Start run",
    "Request stop",
    "Gateway status is authoritative",
  ]) assert.match(panel, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(panel, /workspace path|certificate bypass|auto.?approve/i);
  assert.match(panel, /type: "password", autocomplete: "off"/);
  assert.match(panel, /this\.tokenValue = ""/);
  assert.match(panel, /this\.disconnectRun\(\)/);
});

test("the panel preserves the five-row evidence boundary alongside capability-gated run controls", async () => {
  const panel = await readFile(new URL("../src/panel/app.js", import.meta.url), "utf8");

  for (const text of [
    "loadEvidenceIndex",
    "renderDeploymentMatrix",
    "/evidence/index.json",
    "Copy failure report",
    "View bridge contract",
    "Copying report…",
    "Loading bridge contract…",
    "Could not copy the failure report.",
    "Could not load the bridge contract.",
  ]) assert.match(panel, new RegExp(text.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")));

  assert.doesNotMatch(panel, /install bridge|register.*agent|provider registration|certificate bypass/i);
  assert.match(panel, /run\.pendingApproval\.choices\.map/);
  assert.match(panel, /this\.runController\.has\(RUN_FEATURES\.approval\)/);
});

test("native styles wrap content, preserve visible interaction state, and honor reduced motion", async () => {
  const css = await readFile(new URL("../src/styles/global.css", import.meta.url), "utf8");

  assert.match(css, /var\(--muxy-background\)/);
  assert.match(css, /var\(--muxy-accent\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /var\(--muxy-hover\)/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /gateway-run/);
  assert.match(css, /gateway-danger/);
  assert.doesNotMatch(css, /overflow-x:\s*(?:auto|scroll)/);
});
