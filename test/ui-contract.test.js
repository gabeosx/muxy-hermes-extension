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

test("the manifest exposes the compact panel and full board tab with least required permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.muxy.commands, [
    {
      id: "toggle-hermes-gateway",
      title: "Hermes: Toggle Gateway Panel",
      action: { kind: "togglePanel", panel: "hermes-gateway" },
    },
    {
      id: "open-hermes-project-board",
      title: "Hermes: Open Project Board",
      action: { kind: "openTab", tabType: "hermes-project-board" },
    },
  ]);
  assert.deepEqual(manifest.muxy.tabTypes, [{ id: "hermes-project-board", title: "Hermes Project Board", entry: "board/index.html" }]);
  assert.deepEqual(manifest.muxy.permissions, ["commands:exec", "files:read", "files:write", "panels:write", "tabs:write"]);
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
    "Recovery evidence",
    "loadRecoveryEvidence",
    "/evidence/recovery-v1.json",
    "Event history is incomplete and approval detail is unavailable",
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
  assert.match(css, /height:\s*100%;\s*min-height:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /gateway-run/);
  assert.match(css, /gateway-danger/);
  assert.doesNotMatch(css, /overflow-x:\s*(?:auto|scroll)/);
});

test("the panel leads with the board and keeps proof and recovery internals behind disclosures", async () => {
  const panel = await readFile(new URL("../src/panel/app.js", import.meta.url), "utf8");

  assert.match(panel, /Project board/);
  assert.match(panel, /Open board/);
  assert.match(panel, /hermes-project-board/);
  assert.match(panel, /singleton: true/);
  assert.match(panel, /Advanced diagnostics and validation evidence/);
  assert.match(panel, /Recover an existing run/);
  assert.match(panel, /Run recovery details/);
});

test("the panel requires fresh credentials and a manual run ID for truthful recovery", async () => {
  const [panel, css] = await Promise.all([
    readFile(new URL("../src/panel/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/global.css", import.meta.url), "utf8"),
  ]);

  for (const text of [
    "Recover a run",
    "Run ID",
    "Refresh status",
    "Gateway status could not be confirmed.",
    "Attempting to resume live updates",
    "Live events may be missing or duplicated",
    "Previous live activity and approval detail were not recovered.",
    "Enter a valid Run ID.",
    "aria-live",
    "this.runController.recover",
    "this.runController.refresh",
  ]) assert.match(panel, new RegExp(text.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));

  assert.match(panel, /this\.tokenValue = ""/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|muxy\.storage|background\.js|deployment selector|certificate bypass/i);
  assert.match(css, /gateway-recovery/);
  assert.match(css, /gateway-run-id/);
});
