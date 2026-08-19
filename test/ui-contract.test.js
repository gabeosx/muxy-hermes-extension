import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeCapabilities } from "../src/capabilities.js";
import { renderRecoveryEvidence, sanitizeRecoveryEvidence } from "../src/recovery-evidence.js";

const root = new URL("../", import.meta.url);

test("capability normalization keeps only safe documented metadata and names", () => {
  const normalized = normalizeCapabilities({
    version: "fixture-v1",
    features: { run_stop: true, run_start: true, unsafe_object: { enabled: true }, disabled_feature: false, "not valid": true },
    secret: "must-not-survive",
  });
  assert.deepEqual(normalized, { state: "partial", version: "fixture-v1", names: ["run_start", "run_stop"] });
  assert.equal(JSON.stringify(normalized).includes("must-not-survive"), false);
  assert.deepEqual(normalizeCapabilities({ version: "fixture-v1", features: {} }), { state: "empty", version: "fixture-v1", names: [] });
  assert.deepEqual(normalizeCapabilities(null), { state: "unavailable", version: null, names: [] });
});

test("the manifest exposes the agent panel and board with least required permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.deepEqual(manifest.muxy.commands, [
    { id: "toggle-hermes-gateway", title: "Hermes: Toggle Agent Panel", action: { kind: "togglePanel", panel: "hermes-gateway" } },
    { id: "open-hermes-project-board", title: "Hermes: Open Project Board", action: { kind: "openTab", tabType: "hermes-project-board" } },
  ]);
  assert.deepEqual(manifest.muxy.tabTypes, [{ id: "hermes-project-board", title: "Hermes Project Board", entry: "board/index.html" }]);
  assert.deepEqual(manifest.muxy.permissions, ["commands:exec", "panels:write", "storage:read", "storage:write", "tabs:write"]);
  assert.equal(Object.hasOwn(manifest.muxy, "background"), false);
  assert.equal(Object.hasOwn(manifest.muxy, "events"), false);
  for (const forbiddenSurface of ["topbarItems", "statusbarItems", "scripts"]) {
    assert.equal(Object.hasOwn(manifest.muxy, forbiddenSurface), false, `manifest must not declare ${forbiddenSurface}`);
  }
});

test("the panel presents one user-facing Dashboard sign-in and restores it", async () => {
  const [panel, auth, gateway, broker] = await Promise.all([
    readFile(new URL("src/panel/app.js", root), "utf8"),
    readFile(new URL("src/dashboard-auth.js", root), "utf8"),
    readFile(new URL("src/dashboard-gateway.js", root), "utf8"),
    readFile(new URL("src/session-broker.js", root), "utf8"),
  ]);

  for (const copy of [
    "Connect to Hermes",
    "Enter the address you use to open Hermes.",
    "Sign in once to use Hermes and your project boards.",
    "You’ll stay signed in on this Mac until you log out.",
    "Connected",
    "Connecting…",
    "Reconnecting…",
    "Offline — retrying",
    "Signed out",
    "Trying to reconnect automatically. No action is needed.",
  ]) assert.ok(panel.includes(copy), `panel is missing copy: ${copy}`);

  assert.match(panel, /type: "password",\s*autocomplete: "current-password"/);
  assert.match(panel, /autocomplete: "username"/);
  assert.match(panel, /DashboardAuthSession/);
  assert.match(panel, /DashboardGatewayClient/);
  assert.match(panel, /restoreSavedSession/);
  assert.match(panel, /verifyPrimarySession/);
  assert.match(panel, /SESSION_CHECK_INTERVAL_MS/);
  assert.match(panel, /clearCredentials/);
  assert.match(auth, /requestWebSocketTicket/);
  assert.match(gateway, /authSession\.requestWebSocketTicket\(\)/);
  assert.match(broker, /session\.dashboard\.v1/);
  assert.doesNotMatch(broker, /gateway\.save|readGateway|saveGateway|localStorage|sessionStorage/);

  for (const internalCopy of [
    /API_SERVER_KEY/i,
    /bearer token/i,
    /dashboard session token/i,
    /paste.*token/i,
    /temporary journal/i,
    /filesystem path/i,
    /board mapping is explicit/i,
    /JSON-RPC/i,
  ]) assert.doesNotMatch(panel, internalCopy);
});

test("a fresh short-lived ticket is internal to each connection and reconnect", async () => {
  const [auth, gateway, broker] = await Promise.all([
    readFile(new URL("src/dashboard-auth.js", root), "utf8"),
    readFile(new URL("src/dashboard-gateway.js", root), "utf8"),
    readFile(new URL("src/session-broker.js", root), "utf8"),
  ]);
  assert.match(auth, /POST/);
  assert.match(auth, /\/api\/auth\/ws-ticket/);
  assert.match(gateway, /#open/);
  assert.match(gateway, /requestWebSocketTicket\(\)/);
  assert.match(gateway, /\/api\/ws/);
  assert.match(gateway, /#scheduleReconnect/);
  assert.doesNotMatch(broker, /ws-ticket|ttlSeconds|passwordValue|current-password/);
});

test("the agent exposes run controls without auto-approval", async () => {
  const [panel, gateway, agent] = await Promise.all([
    readFile(new URL("src/panel/app.js", root), "utf8"),
    readFile(new URL("src/dashboard-gateway.js", root), "utf8"),
    readFile(new URL("src/dashboard-agent.js", root), "utf8"),
  ]);
  const production = `${gateway}\n${agent}`;
  for (const method of ["session.create", "prompt.submit", "approval.respond", "session.steer", "session.interrupt"]) {
    assert.match(production, new RegExp(method.replace(".", "\\.")));
  }
  for (const copy of ["Start request", "Approval required", "Allow once", "Allow for session", "Always allow", "Deny", "Send guidance", "Stop"]) {
    assert.match(panel, new RegExp(copy));
  }
  assert.doesNotMatch(production, /auto.?approve/i);
});

test("native styles use Muxy tokens, visible interaction states, scale variables, and reduced motion", async () => {
  const css = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(css, /var\(--muxy-background\)/);
  assert.match(css, /var\(--muxy-accent\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /var\(--muxy-hover\)/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /gateway-reconnect-icon/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /overflow-x:\s*(?:auto|scroll)/);
});

test("the signed-in panel opens the project board without another sign-in", async () => {
  const panel = await readFile(new URL("src/panel/app.js", root), "utf8");
  assert.match(panel, /Open board/);
  assert.match(panel, /hermes-project-board/);
  assert.match(panel, /singleton: true/);
  assert.match(panel, /persistDashboardSession/);
});

test("recovery evidence renderer permanently shows every safe interruption signature and its history limit", async () => {
  const recovery = JSON.parse(await readFile(new URL("public/evidence/recovery-v1.json", root), "utf8"));
  const details = renderRecoveryEvidence(sanitizeRecoveryEvidence(recovery)).map((row) => row.details).join(" ");
  for (const signature of ["Refusal or unreachable", "Observer interrupted", "Observer restored", "Buffered or delayed", "Panel recreated"]) {
    assert.match(details, new RegExp(signature));
  }
  assert.match(details, /status is authoritative/i);
  assert.match(details, /Event history is incomplete and approval detail is unavailable/i);
});
