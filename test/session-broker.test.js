import assert from "node:assert/strict";
import test from "node:test";

import { PersistentSessionBroker, SessionBrokerClient } from "../src/session-broker.js";

function gateway() {
  return {
    url: "https://gateway.example",
    bearer: "gateway-token",
    result: {
      status: "success", endpoint: "https://gateway.example", endpointTrustClass: "https",
      url: { state: "passed" }, relayOutcome: { state: "passed" }, authenticationOutcome: { state: "passed" },
      capabilityOutcome: { state: "passed" }, streamOutcome: { state: "passed" },
      capabilityNames: ["run_events_sse", "run_status", "run_submission"], capabilityVersion: "v1", streamEventCount: 2,
    },
  };
}

function dashboard() {
  return {
    baseUrl: "https://hermes.example",
    board: "default",
    auth: {
      version: 1,
      providers: [{ name: "basic", displayName: "Password", supportsPassword: true }],
      identity: { userId: "user-1", email: "user@example.com", displayName: "Muxy User", organizationId: "org-1", provider: "basic", expiresAt: 4_102_444_800 },
      cookies: [["hermes_session_at", "access-one"], ["hermes_session_rt", "refresh-one"], ["hermes_session_provider", "basic"]],
    },
  };
}

function extensionStorage() {
  const values = new Map();
  return {
    get(key) { return values.get(key) ?? null; },
    set(key, value) { values.set(key, structuredClone(value)); },
    delete(key) { values.delete(key); },
  };
}

test("webviews persist gateway and Dashboard sessions directly in extension-scoped storage", async () => {
  const storage = extensionStorage();
  let sequence = 0;
  const client = new SessionBrokerClient({ storage, randomId: () => `request-${++sequence}` });

  await client.saveGateway(gateway());
  await client.saveDashboard(dashboard());
  const restoredGateway = await client.readGateway();
  const restoredDashboard = await client.readDashboard();

  assert.equal(restoredGateway.bearer, "gateway-token");
  assert.equal(restoredGateway.result.status, "success");
  assert.equal(restoredDashboard.auth.cookies[0][1], "access-one");
  restoredGateway.result.capabilityNames.push("changed-by-panel");
  assert.equal((await client.readGateway()).result.capabilityNames.includes("changed-by-panel"), false, "the broker must not share mutable references");

  const restartedClient = new SessionBrokerClient({ storage, randomId: () => `restart-${++sequence}` });
  assert.equal((await restartedClient.readGateway()).bearer, "gateway-token", "the connection must survive a Muxy restart");
  assert.equal((await restartedClient.readDashboard()).auth.identity.userId, "user-1", "the Dashboard sign-in must survive a Muxy restart");

  await restartedClient.clearGateway();
  await restartedClient.clearDashboard();
  assert.equal(await restartedClient.readGateway(), null);
  assert.equal(await restartedClient.readDashboard(), null);
});

test("the broker rejects malformed credentials and never accepts a failed connection as restorable", async () => {
  const broker = new PersistentSessionBroker({ storage: extensionStorage() });
  const rejected = await broker.handle({ requestId: "one", action: "gateway.save", data: { ...gateway(), bearer: "not valid\n" } });
  assert.equal(rejected.ok, false);
  const failed = gateway();
  failed.result.status = "failure";
  assert.equal((await broker.handle({ requestId: "two", action: "gateway.save", data: failed })).ok, false);
  assert.equal((await broker.handle({ requestId: "three", action: "gateway.read" })).data, null);
});
