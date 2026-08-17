import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateStopGate, renderDeploymentMatrix, sanitizeEvidenceIndex } from "../src/stop-gate.js";

const root = new URL("../", import.meta.url);

test("the committed evidence index is a complete safe matrix with simulated remote classes unverified", async () => {
  const index = JSON.parse(await readFile(new URL("public/evidence/index.json", root), "utf8"));
  const safe = sanitizeEvidenceIndex(index);
  assert.equal(safe.conditions.length, 5);
  assert.deepEqual(renderDeploymentMatrix(safe).map((row) => row.verdict), [
    "Unverified", "Unverified", "Unverified", "Unverified", "Unverified",
  ]);
  assert.equal(evaluateStopGate({ evidenceIndex: safe }).active, false);
});

test("the aggregate validator is non-watch and Phase 2 controls remain inside the existing authority boundary", async () => {
  const [manifest, validator, panel] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/validate-phase.mjs", root), "utf8"),
    readFile(new URL("src/panel/app.js", root), "utf8"),
  ]);
  assert.match(manifest, /"validate"\s*:\s*"node scripts\/validate-phase\.mjs"/);
  assert.doesNotMatch(manifest, /"validate"[^\n]*(?:watch|--watch)/i);
  assert.match(validator, /validateEvidence/);
  assert.match(panel, /supportsCoreRun/);
  assert.match(panel, /RUN_FEATURES\.(?:approval|stop|steer)/);
  assert.doesNotMatch(panel, /install bridge|register.*agent|provider registration|certificate bypass|workspace path/i);
});
