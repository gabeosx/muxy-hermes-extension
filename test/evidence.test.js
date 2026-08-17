import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  appendEvidenceIndex,
  buildEvidenceRecord,
  hashSanitizedShape,
  renderEvidenceMarkdown,
  sanitizeObservation,
  writeEvidencePair,
} from "../src/evidence.js";

const execFile = promisify(execFileCallback);

const sentinels = [
  "https://gateway-secret.example/v1/chat?token=raw-token",
  "Bearer raw-token",
  "X-Secret-Header: raw-header",
  "/private/workspace/path",
  "prompt-raw-content",
  "assistant-raw-output",
  "tool-argument-raw",
  "tool-result-raw",
  "raw-response-body",
];

function observation(overrides = {}) {
  return {
    runId: "run-20260817-000000-0001",
    recordedAt: "2026-08-17T12:00:00.000Z",
    deploymentCondition: "host_native_loopback",
    trustClass: "loopback_http",
    realPath: true,
    simulation: false,
    muxyVersion: "1.2.3",
    hermesVersion: "0.17.0",
    hermesRevisionOrDigest: "sha256:abcd1234",
    requiredStages: {
      url: "passed",
      request: "passed",
      authentication: "passed",
      origin: "passed",
      capabilities: "passed",
      stream: "passed",
    },
    freshPanelSession: true,
    sessionOrdinal: 1,
    originVerdict: "exact_origin_passed",
    capabilityShape: { chat_completions: true, run_stop: true },
    sseFrames: [{ event: "chat.completion.chunk", id: "1", order: 1, elapsedMs: 250, dataBytes: 52, shape: { choices: [{ delta: { content: "string" } }] } }],
    ...overrides,
  };
}

test("sanitizes observations with an allowlist and stable canonical hashes", () => {
  const safe = sanitizeObservation({
    ...observation(),
    endpoint: sentinels[0],
    token: sentinels[1],
    headers: { authorization: sentinels[1], extra: sentinels[2] },
    workspacePath: sentinels[3],
    prompt: sentinels[4],
    output: sentinels[5],
    toolArguments: sentinels[6],
    toolResult: sentinels[7],
    responseBody: sentinels[8],
  });

  const serialised = JSON.stringify(safe);
  for (const sentinel of sentinels) assert.equal(serialised.includes(sentinel), false);
  assert.deepEqual(safe.sseFrames[0], {
    event: "chat.completion.chunk",
    idBehavior: "present",
    order: 1,
    elapsedMs: 250,
    dataBytes: 52,
    shapeHash: hashSanitizedShape({ choices: [{ delta: { content: "string" } }] }),
  });
  assert.equal(
    hashSanitizedShape({ b: [2, { z: true, a: null }], a: "x" }),
    hashSanitizedShape({ a: "x", b: [2, { a: null, z: true }] }),
  );
});

test("valid evidence produces schema-v1 JSON and Markdown from the same safe record", () => {
  const record = buildEvidenceRecord(observation());
  const markdown = renderEvidenceMarkdown(record);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.capabilityShapeHash.length, 64);
  assert.match(markdown, /# Gateway validation evidence/);
  assert.match(markdown, /host_native_loopback/);
  assert.equal(markdown.includes("content"), false);
  assert.throws(() => buildEvidenceRecord(observation({ muxyVersion: null })), /evidence_invalid_muxyVersion/);
  assert.throws(() => buildEvidenceRecord(observation({ requiredStages: { url: "passed" } })), /evidence_invalid_requiredStages/);
});

test("paired writes publish JSON and Markdown together without leaking input sentinels", async () => {
  const output = await mkdtemp(join(tmpdir(), "hermes-evidence-"));
  try {
    const record = buildEvidenceRecord({ ...observation(), endpoint: sentinels[0], responseBody: sentinels[8] });
    const paths = await writeEvidencePair({ outputDir: output, record });
    assert.equal(paths.runId, record.runId);
    assert.deepEqual((await readdir(join(output, "runs", record.runId))).sort(), ["report.json", "report.md"]);
    const durable = `${await readFile(paths.jsonPath, "utf8")}\n${await readFile(paths.markdownPath, "utf8")}`;
    for (const sentinel of sentinels) assert.equal(durable.includes(sentinel), false);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("concurrent writers retain every history entry in the atomic index", async () => {
  const output = await mkdtemp(join(tmpdir(), "hermes-evidence-"));
  try {
    const records = [1, 2, 3].map((number, index) => buildEvidenceRecord(observation({
      runId: `run-20260817-000000-000${number}`,
      sessionOrdinal: index % 2 + 1,
      recordedAt: `2026-08-17T12:00:0${number}.000Z`,
    })));
    await Promise.all(records.map((record) => appendEvidenceIndex({ outputDir: output, record })));
    const index = JSON.parse(await readFile(join(output, "index.json"), "utf8"));
    assert.deepEqual(index.history.map((entry) => entry.runId), records.map((record) => record.runId));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("validation CLI writes only support-ineligible reports without copying raw errors", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hermes-evidence-cli-"));
  const output = join(directory, "evidence");
  const invalidInput = join(directory, "invalid.json");
  try {
    await writeFile(invalidInput, JSON.stringify(observation({ muxyVersion: null, token: sentinels[1] })));
    await execFile(process.execPath, [
      "scripts/run-validation.mjs", "--mode", "failure", "--out", output,
      "--deployment", "host_native_loopback", "--trust", "loopback_http", "--muxy-version", "1.2.3",
      "--hermes-version", "0.17.0", "--hermes-revision", "sha256:abcd1234", "--category", "real_attempt",
      "--reason", "relay_failed", "--stage", "relay",
    ], { cwd: process.cwd() });
    const index = JSON.parse(await readFile(join(output, "index.json"), "utf8"));
    assert.equal(index.schemaVersion, 2);
    assert.equal(index.history.length, 1);
    await assert.rejects(
      execFile(process.execPath, ["scripts/run-validation.mjs", "--input", invalidInput, "--out", output], { cwd: process.cwd() }),
      (error) => error.stderr.trim() === "validation_invalid_arguments" && !error.stderr.includes(sentinels[1]),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
