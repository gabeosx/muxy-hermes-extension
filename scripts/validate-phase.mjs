import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { renderEvidenceMarkdown, validateEvidenceRecord } from "../src/evidence.js";
import { toSafeVerdict } from "../src/probe.js";
import { copyRedactedReport, evaluateStopGate, sanitizeEvidenceIndex } from "../src/stop-gate.js";
import { classifyVerdict } from "../src/verdict.js";
import { sanitizeRecoveryEvidence } from "../src/recovery-evidence.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const evidenceDir = join(root, "public", "evidence");
const canonicalConditions = ["host_native_loopback", "docker_published_loopback", "ssh_local_forward", "direct_remote_https", "remote_muxy_workspace"];
const simulatedConditions = new Set(canonicalConditions.slice(2));
const forbiddenSourcePatterns = [
  /muxy\.http\b/, /EventSource\b/, /muxy\.storage\b/, /muxy\.git\b/, /muxy\.execAsync\b/,
  /rejectUnauthorized\b/, /NODE_TLS_REJECT_UNAUTHORIZED\b/, /background\.js\b/,
];
const forbiddenPanelPatterns = [/workspace path/i, /certificate bypass/i, /auto.?approve/i, /install bridge|register.*agent|provider registration/i];
const indexRowKeys = new Set(["id", "verdict", "reasonCode", "latest", "latestPair", "lastVerifiedPair", "carriedForward", "history"]);
const indexEntryKeys = new Set(["runId", "recordedAt", "muxyVersion", "hermesVersion", "hermesRevisionOrDigest", "trustClass", "realPath", "simulation", "freshPanelSession", "sessionOrdinal", "requiredStages", "originVerdict", "capabilityShapeHash", "sseFrames", "verdict", "reasonCode", "reportJson", "reportMarkdown"]);

function rejectUnknownKeys(value, allowed, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  for (const key of Object.keys(value)) assert.ok(allowed.has(key), `${label} contains forbidden field: ${key}`);
}

function within(base, candidate) {
  const fromBase = relative(base, candidate);
  return fromBase !== "" && !fromBase.startsWith("..") && !isAbsolute(fromBase);
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function validateEvidence() {
  const indexPath = join(evidenceDir, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const safeIndex = sanitizeEvidenceIndex(index);
  assert.deepEqual(safeIndex.conditions.map((row) => row.id), canonicalConditions, "index must contain the five canonical conditions in order");
  const recordsByCondition = new Map(canonicalConditions.map((id) => [id, []]));

  for (const row of index.conditions) {
    rejectUnknownKeys(row, indexRowKeys, `index row ${row.id}`);
    assert.ok(Array.isArray(row.history), `index row ${row.id} history must be an array`);
    if (simulatedConditions.has(row.id)) assert.equal(row.verdict, "Unverified", `${row.id} simulation cannot be Supported or Unsupported`);
    for (const entry of row.history) {
      rejectUnknownKeys(entry, indexEntryKeys, `index entry ${row.id}`);
      assert.equal(entry.deploymentCondition, undefined, "index entries must not duplicate untrusted deployment fields");
      for (const field of ["reportJson", "reportMarkdown"]) {
        assert.equal(typeof entry[field], "string", `${row.id} evidence pair requires ${field}`);
        assert.ok(!entry[field].startsWith("/") && !entry[field].includes(".."), `${row.id} ${field} must stay within evidence`);
      }
      const reportJson = resolve(evidenceDir, entry.reportJson);
      const reportMarkdown = resolve(evidenceDir, entry.reportMarkdown);
      assert.ok(within(evidenceDir, reportJson) && within(evidenceDir, reportMarkdown), "report pair path escapes evidence");
      const record = JSON.parse(await readFile(reportJson, "utf8"));
      validateEvidenceRecord(record);
      assert.equal(record.deploymentCondition, row.id, "report condition must match index row");
      assert.equal(await readFile(reportMarkdown, "utf8"), renderEvidenceMarkdown(record), "report Markdown must be the safe projection of its JSON record");
      recordsByCondition.get(row.id).push(record);
    }
  }

  for (const row of index.conditions) {
    const records = recordsByCondition.get(row.id);
    const classified = classifyVerdict({ records, latestStablePair: row.latestPair });
    assert.equal(row.verdict, classified.verdict, `${row.id} index verdict must be classifier-backed`);
    assert.equal(row.reasonCode, classified.reasonCode, `${row.id} index reason must be classifier-backed`);
  }

  const stopGate = evaluateStopGate({ evidenceIndex: index });
  assert.equal(stopGate.active, false, "real qualification stop gate is active; do not expand Phase 1");
  return index;
}

async function validateBoundary() {
  const productionSources = [
    join(root, "src", "main.js"),
    join(root, "src", "panel", "app.js"),
    join(root, "src", "gateway-client.js"),
    join(root, "src", "probe.js"),
    join(root, "src", "curl-relay.js"),
    join(root, "src", "sse-parser.js"),
    join(root, "src", "capabilities.js"),
    join(root, "src", "stop-gate.js"),
    join(root, "src", "run-events.js"),
    join(root, "src", "run-client.js"),
    join(root, "src", "run-controller.js"),
    join(root, "src", "recovery-evidence.js"),
    join(root, "src", "kanban-client.js"),
    join(root, "src", "board", "app.js"),
  ];
  for (const file of productionSources) {
    const source = await readFile(file, "utf8");
    for (const pattern of forbiddenSourcePatterns) assert.doesNotMatch(source, pattern, `${relative(root, file)} exceeds the extension authority boundary`);
  }
  const panel = await readFile(join(root, "src", "panel", "app.js"), "utf8");
  for (const pattern of forbiddenPanelPatterns) assert.doesNotMatch(panel, pattern, "panel renders an out-of-scope authority");
  for (const requiredGate of ["supportsCoreRun", "RUN_FEATURES.approval", "RUN_FEATURES.stop", "RUN_FEATURES.steer"]) {
    assert.match(panel, new RegExp(requiredGate.replace(".", "\\.")), `panel is missing advertised capability gate ${requiredGate}`);
  }
}

const REQUIRED_RENDERED_SIGNATURES = Object.freeze([
  "refused_or_unreachable", "observer_interrupted", "observer_restored", "buffered_or_delayed", "panel_recreated",
]);
const REQUIRED_SIMULATION_SIGNATURES = Object.freeze({
  ssh_local_forward: ["refused_or_unreachable", "observer_interrupted", "observer_restored"],
  direct_remote_https: ["authentication", "buffered_or_delayed", "certificate_validated", "exact_origin_cors", "unbuffered_delivery"],
  remote_muxy_workspace: ["workspace_path_absent"],
});

/** The one fail-closed proof predicate shared by the CLI and mutation tests. */
export function assertCompleteRecoveryEvidence(recovery) {
  const safe = sanitizeRecoveryEvidence(recovery, { requireComplete: true });
  assert.deepEqual(safe.conditions.map((row) => row.id), canonicalConditions, "recovery evidence must retain canonical conditions");
  const [host, docker, ...simulations] = safe.conditions;
  assert.deepEqual(host.provenance.proofSource, "recovery_receipt_bundle", "host proof must use a verifier receipt bundle");
  assert.equal(host.nativePanel, true, "host proof must be a native panel observation");
  assert.equal(host.cleanup, "scrubbed_removed", "host proof requires a post-cleanup receipt");
  assert.equal(host.pinnedRuntime, true, "host proof must pin the tested runtime");
  assert.deepEqual(host.panelLifecycle, "recreated", "host proof requires fresh-panel recovery");
  assert.ok(host.signatures.includes("panel_recreated"), "host proof requires the panel recreation signature");

  assert.deepEqual(docker.provenance.proofSource, "recovery_receipt_bundle", "Docker proof must use a verifier receipt bundle");
  assert.equal(docker.nativePanel, true, "Docker proof must be a native panel observation");
  assert.equal(docker.cleanup, "scrubbed_removed", "Docker proof requires a post-cleanup receipt");
  assert.equal(docker.requestOutcome, "interrupted", "Docker proof must exercise an interruption");
  assert.equal(docker.statusOutcome, "terminal", "Docker proof must reconcile terminal status");
  assert.equal(docker.reattached, true, "Docker proof must restore its observer");
  for (const signature of ["observer_interrupted", "observer_restored", "buffered_or_delayed"]) assert.ok(docker.signatures.includes(signature), `Docker proof lacks ${signature}`);

  for (const row of simulations) {
    assert.equal(row.actual, false, "simulated recovery row cannot claim a real deployment");
    assert.equal(row.nativePanel, false, "simulated recovery row cannot claim a native panel");
    assert.equal(row.verdict, "Unverified", "simulated recovery row cannot be positive");
    assert.equal(row.provenance.proofSource, "simulation_receipt", "simulated recovery row needs an executed simulation receipt");
    for (const signature of REQUIRED_SIMULATION_SIGNATURES[row.id]) assert.ok(row.signatures.includes(signature), `${row.id} lacks ${signature}`);
  }
  const renderedSignatures = new Set(safe.conditions.flatMap((row) => row.signatures));
  for (const signature of REQUIRED_RENDERED_SIGNATURES) assert.ok(renderedSignatures.has(signature), `evidence lacks rendered ${signature} signature`);
  const durable = JSON.stringify(safe);
  for (const forbidden of ["bearer", "endpoint", "workspacepath", "journal", "approval command", "raw error"]) assert.equal(durable.toLowerCase().includes(forbidden), false, "recovery evidence contains content-bearing data");
  return safe;
}

export async function validateRecoveryEvidence({ path = join(evidenceDir, "recovery-v1.json") } = {}) {
  return assertCompleteRecoveryEvidence(JSON.parse(await readFile(path, "utf8")));
}

async function validateSentinel(index) {
  const sentinel = `PHASE1_SECRET_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const safeProbe = toSafeVerdict({
    url: { state: "passed" }, relay: { state: "failed", reason: "relay_request_rejected", rawError: sentinel },
    request: { state: "failed", rawError: sentinel }, authentication: { state: "not_verified" },
    capabilities: { state: "not_verified" }, stream: { state: "not_verified", rawFrame: sentinel },
  }, { endpoint: "https://gateway.example", startedAt: "2026-08-17T00:00:00.000Z", finishedAt: "2026-08-17T00:00:01.000Z" });
  const report = copyRedactedReport(evaluateStopGate({ evidenceIndex: index, requiresMuxyChange: true }));
  const checked = [JSON.stringify(safeProbe), report, JSON.stringify(index), await readFile(join(evidenceDir, "recovery-v1.json"), "utf8")];
  for (const file of await filesUnder(join(root, "dist"))) checked.push(await readFile(file, "utf8"));
  for (const value of checked) assert.equal(value.includes(sentinel), false, "high-entropy secret sentinel reached a durable or rendered artifact");
  for (const forbidden of [
    "PHASE3_BEARER_SENTINEL", "PHASE3_ENDPOINT_SENTINEL", "PHASE3_RUN_ID_SENTINEL", "PHASE3_EVENT_OUTPUT_SENTINEL",
    "PHASE3_WORKSPACE_PATH_SENTINEL", "PHASE3_CERTIFICATE_PRIVATE_KEY_SENTINEL", "PHASE3_TEMP_ROOT_SENTINEL", "PHASE3_SUBPROCESS_SENTINEL",
  ]) for (const value of checked) assert.equal(value.includes(forbidden), false, "unsafe recovery sentinel reached public evidence or dist");
}

async function main() {
  await run(npm, ["run", "build"], { cwd: root });
  const testFiles = (await readdir(join(root, "test"))).filter((name) => name.endsWith(".js")).sort().map((name) => join("test", name));
  await run(process.execPath, ["--test", ...testFiles], { cwd: root });
  await run("docker", ["compose", "-f", join(root, "fixtures", "simulations", "docker-compose.yml"), "config", "--quiet"], { cwd: root });
  await run(process.execPath, ["scripts/validate-dist.mjs"], { cwd: root });
  const index = await validateEvidence();
  await validateBoundary();
  await validateRecoveryEvidence();
  await validateSentinel(index);
  process.stdout.write("Phase 3 recovery proof validation passed.\n");
}

if (process.argv[1]?.endsWith("scripts/validate-phase.mjs")) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error?.message ?? "phase_validation_failed"}\n`);
    process.exitCode = 1;
  }
}
