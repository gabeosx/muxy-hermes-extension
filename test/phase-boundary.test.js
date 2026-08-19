import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { assertCompleteRecoveryEvidence } from "../scripts/validate-phase.mjs";
import { evaluateStopGate, renderDeploymentMatrix, sanitizeEvidenceIndex } from "../src/stop-gate.js";

const root = new URL("../", import.meta.url);
const digest = (character) => `sha256:${character.repeat(64)}`;

function completeRecoveryFixture() {
  const provenance = (character) => ({
    proofSource: "recovery_receipt_bundle",
    challengeDigest: digest(character), panelDigest: digest("b"), fixtureDigest: digest("c"), cleanupDigest: digest("d"), bundleDigest: digest("e"),
  });
  return {
    schemaVersion: 2,
    fixtureId: "recovery-v1",
    versionTuple: { muxyVersion: "1.5.0+945", hermesVersion: "0.20.2", hermesRevisionOrDigest: digest("a") },
    capability: { names: ["run_events_sse", "run_status", "run_submission"], shapeHash: digest("a") },
    representativeEvents: [{ name: "message.delta", dataBytes: 5, shapeHash: digest("b") }, { name: "terminal", dataBytes: 4, shapeHash: digest("c") }],
    controlStatus: { controlOutcome: "not_exercised", statusOutcome: "terminal" },
    conditions: [
      {
        id: "host_native_loopback", scenario: "native_fixture", observedBehavior: "fresh_panel_status_recovered", requestOutcome: "authenticated", observerAttempts: 0,
        statusOutcome: "terminal", reattached: false, panelLifecycle: "recreated", eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable",
        cleanup: "scrubbed_removed", actual: true, pinnedRuntime: true, nativePanel: true, verdict: "Observed", signatures: ["panel_recreated"], provenance: provenance("1"),
      },
      {
        id: "docker_published_loopback", scenario: "native_fixture", observedBehavior: "interrupted_status_reconciled", requestOutcome: "interrupted", observerAttempts: 1,
        statusOutcome: "terminal", reattached: true, panelLifecycle: "open", eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable",
        cleanup: "scrubbed_removed", actual: true, pinnedRuntime: false, nativePanel: true, verdict: "Observed", signatures: ["buffered_or_delayed", "observer_interrupted", "observer_restored"], provenance: provenance("2"),
      },
      {
        id: "ssh_local_forward", scenario: "local_behavior_simulation", observedBehavior: "interrupted_status_reconciled", requestOutcome: "refused", observerAttempts: 1,
        statusOutcome: "terminal", reattached: true, panelLifecycle: "open", eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable",
        cleanup: "scrubbed_removed", actual: false, pinnedRuntime: false, nativePanel: false, verdict: "Unverified", signatures: ["observer_interrupted", "observer_restored", "refused_or_unreachable"], provenance: { proofSource: "simulation_receipt", bundleDigest: digest("3") },
      },
      {
        id: "direct_remote_https", scenario: "local_behavior_simulation", observedBehavior: "interrupted_status_reconciled", requestOutcome: "interrupted", observerAttempts: 1,
        statusOutcome: "terminal", reattached: false, panelLifecycle: "open", eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable",
        cleanup: "scrubbed_removed", actual: false, pinnedRuntime: false, nativePanel: false, verdict: "Unverified", signatures: ["authentication", "buffered_or_delayed", "certificate_validated", "exact_origin_cors", "unbuffered_delivery"], provenance: { proofSource: "simulation_receipt", bundleDigest: digest("4") },
      },
      {
        id: "remote_muxy_workspace", scenario: "local_behavior_simulation", observedBehavior: "interrupted_status_reconciled", requestOutcome: "interrupted", observerAttempts: 1,
        statusOutcome: "terminal", reattached: false, panelLifecycle: "open", eventHistoryConfidence: "incomplete", approvalDetailConfidence: "unavailable",
        cleanup: "scrubbed_removed", actual: false, pinnedRuntime: false, nativePanel: false, verdict: "Unverified", signatures: ["workspace_path_absent"], provenance: { proofSource: "simulation_receipt", bundleDigest: digest("5") },
      },
    ],
  };
}

test("the committed evidence index is a complete safe matrix with simulated remote classes unverified", async () => {
  const index = JSON.parse(await readFile(new URL("public/evidence/index.json", root), "utf8"));
  const safe = sanitizeEvidenceIndex(index);
  assert.equal(safe.conditions.length, 5);
  assert.deepEqual(renderDeploymentMatrix(safe).map((row) => row.verdict), [
    "Unverified", "Unverified", "Unverified", "Unverified", "Unverified",
  ]);
  assert.equal(evaluateStopGate({ evidenceIndex: safe }).active, false);
});

test("the aggregate validator is non-watch and agent controls remain inside the existing authority boundary", async () => {
  const [manifest, validator, panel, gateway, agent, projector, simulations, compose] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/validate-phase.mjs", root), "utf8"),
    readFile(new URL("src/panel/app.js", root), "utf8"),
    readFile(new URL("src/dashboard-gateway.js", root), "utf8"),
    readFile(new URL("src/dashboard-agent.js", root), "utf8"),
    readFile(new URL("scripts/project-recovery-observation.mjs", root), "utf8"),
    readFile(new URL("scripts/qualify-simulations.mjs", root), "utf8"),
    readFile(new URL("fixtures/simulations/docker-compose.yml", root), "utf8"),
  ]);
  assert.match(manifest, /"validate"\s*:\s*"node scripts\/validate-phase\.mjs"/);
  assert.doesNotMatch(manifest, /"validate"[^\n]*(?:watch|--watch)/i);
  assert.match(validator, /validateEvidence/);
  assert.match(validator, /assertCompleteRecoveryEvidence/);
  assert.match(validator, /docker", \["compose"/);
  assert.match(panel, /DashboardGatewayClient/);
  assert.match(gateway, /requestWebSocketTicket/);
  assert.match(agent, /(?:approval\.respond|session\.interrupt|session\.steer)/);
  assert.doesNotMatch(panel, /install bridge|register.*agent|provider registration|certificate bypass|workspace path/i);
  assert.doesNotMatch(panel, /project-recovery-observation|qualify-simulations|docker compose|openssl|certificateRoot/i);
  assert.doesNotMatch(projector, /from\s+["'][^"']*src\/panel|from\s+["'][^"']*src\/main/i);
  assert.match(simulations, /\bca\b/);
  assert.doesNotMatch(simulations, /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|--insecure|\s-k\b/i);
  assert.match(compose, /127\.0\.0\.1:\$\{HERMES_(?:SIM|TLS)_PORT/);
  assert.doesNotMatch(compose, /privileged:\s*true|network_mode:\s*host|0\.0\.0\.0:/i);
});

test("the board auth boundary has no pasted token or Gateway-key confusion and persists only through extension-scoped storage", async () => {
  const [board, auth, kanban, relay, broker, manifest] = await Promise.all([
    readFile(new URL("src/board/app.js", root), "utf8"),
    readFile(new URL("src/dashboard-auth.js", root), "utf8"),
    readFile(new URL("src/kanban-client.js", root), "utf8"),
    readFile(new URL("src/curl-relay.js", root), "utf8"),
    readFile(new URL("src/session-broker.js", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  const production = `${board}\n${auth}\n${kanban}`;
  assert.doesNotMatch(production, /dashboard session token|paste.*token|API_SERVER_KEY|localStorage|sessionStorage|muxy\.storage/i);
  assert.match(auth, /\/api\/auth\/providers/);
  assert.match(auth, /\/auth\/password-login/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/auth\/logout/);
  assert.match(relay, /buildSessionConfig/);
  assert.match(broker, /globalThis\.muxy\?\.storage/);
  assert.doesNotMatch(broker, /localStorage|sessionStorage/i);
  assert.doesNotMatch(manifest, /"background"\s*:/);
  assert.match(manifest, /"storage:read"/);
  assert.match(manifest, /"storage:write"/);
});

test("aggregate recovery proof fails closed for provenance, signatures, cleanup, native, simulation, and redaction mutations", () => {
  assert.doesNotThrow(() => assertCompleteRecoveryEvidence(completeRecoveryFixture()));
  const mutations = [
    ["missing provenance", (value) => { delete value.conditions[0].provenance.cleanupDigest; }],
    ["missing rendered signature", (value) => { value.conditions[1].signatures = ["observer_interrupted", "observer_restored"]; }],
    ["missing cleanup receipt", (value) => { value.conditions[1].cleanup = "failed"; }],
    ["missing native predicate", (value) => { value.conditions[0].nativePanel = false; }],
    ["positive simulation claim", (value) => { value.conditions[2].actual = true; value.conditions[2].verdict = "Observed"; }],
    ["unsafe raw endpoint", (value) => { value.endpoint = "https://unsafe.example"; }],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(completeRecoveryFixture());
    mutate(candidate);
    assert.throws(() => assertCompleteRecoveryEvidence(candidate), undefined, name);
  }
});
