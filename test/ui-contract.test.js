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

test("the manifest exposes only the Hermes panel toggle command and its empirically required permission", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.deepEqual(manifest.muxy.commands, [{
    id: "toggle-hermes-gateway",
    title: "Hermes: Toggle Gateway Panel",
    action: { kind: "togglePanel", panel: "hermes-gateway" },
  }]);
  // Real Muxy invocation closed the command palette but did not open the panel until
  // panels:write was declared; keep the least-privilege exception structurally exact.
  assert.deepEqual(manifest.muxy.permissions, ["panels:write"]);
  for (const forbiddenSurface of ["background", "topbarItems", "statusbarItems", "scripts"]) {
    assert.equal(Object.hasOwn(manifest.muxy, forbiddenSurface), false, `manifest must not declare ${forbiddenSurface}`);
  }
});

test("the panel keeps capability and evidence output read-only and uses contract copy", async () => {
  const panel = await readFile(new URL("../src/panel/app.js", import.meta.url), "utf8");

  for (const text of [
    "No capabilities advertised",
    "This Gateway did not advertise any controls for this client.",
    "Run controls appear in Phase 2.",
    "Validation evidence",
    "No versioned fixture result has been recorded for this deployment condition.",
    "Muxy change required",
    "Phase 1 is paused. No Muxy change has been made.",
  ]) assert.match(panel, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.doesNotMatch(panel, /Start run|Stop run|Steer|Approve|terminal|workspace path/i);
  assert.match(panel, /type: "password", autocomplete: "off"/);
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
  assert.doesNotMatch(css, /overflow-x:\s*(?:auto|scroll)/);
});
