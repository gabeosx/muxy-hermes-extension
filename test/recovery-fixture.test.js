import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";

import { startRecoveryProxy } from "../scripts/run-recovery-fixture.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

test("recovery proxy stays loopback and interrupts only the first fixed event stream after a chunk", async () => {
  const upstream = createServer((request, response) => {
    if (request.url === "/v1/runs/run_fixture/events") {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write("event: message.delta\ndata: {}\n\n");
      response.end("event: terminal\ndata: {}\n\n");
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
  });
  const upstreamPort = await listen(upstream);
  const proxy = await startRecoveryProxy({ upstream: `http://127.0.0.1:${upstreamPort}`, runId: "run_fixture" });
  try {
    const first = await fetch(`${proxy.url}/v1/runs/run_fixture/events`);
    assert.equal((await first.text()).includes("terminal"), false);
    const second = await fetch(`${proxy.url}/v1/runs/run_fixture/events`);
    assert.match(await second.text(), /terminal/);
    assert.deepEqual(proxy.observation(), { interrupted: true, forwardedSubscriptions: 2, buffered: false });
  } finally {
    await proxy.close();
    await new Promise((resolve) => upstream.close(resolve));
  }
});

test("recovery proxy rejects non-loopback upstreams and non-fixed routes", async () => {
  await assert.rejects(startRecoveryProxy({ upstream: "https://gateway.example", runId: "run_fixture" }), /recovery_proxy_upstream_unsafe/);
});

test("recovery proxy learns the run ID from the bounded submission response", async () => {
  const upstream = createServer((request, response) => {
    if (request.method === "POST" && request.url === "/v1/runs") {
      request.resume();
      request.on("end", () => response.writeHead(202, { "Content-Type": "application/json" }).end('{"run_id":"run_learned"}'));
      return;
    }
    if (request.url === "/v1/runs/run_learned/events") {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write("event: message.delta\ndata: {}\n\n");
      response.end("event: terminal\ndata: {}\n\n");
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
  });
  const upstreamPort = await listen(upstream);
  const proxy = await startRecoveryProxy({ upstream: `http://127.0.0.1:${upstreamPort}` });
  try {
    const submitted = await fetch(`${proxy.url}/v1/runs`, { method: "POST", body: "{}" });
    assert.equal(submitted.status, 202);
    assert.deepEqual(await submitted.json(), { run_id: "run_learned" });
    const first = await fetch(`${proxy.url}/v1/runs/run_learned/events`);
    assert.equal((await first.text()).includes("terminal"), false);
    assert.deepEqual(proxy.observation(), { interrupted: true, forwardedSubscriptions: 1, buffered: false });
  } finally {
    await proxy.close();
    await new Promise((resolve) => upstream.close(resolve));
  }
});

test("recovery proxy closes without waiting for an active streamed connection", async () => {
  const upstream = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write("event: keepalive\ndata: {}\n\n");
  });
  const upstreamPort = await listen(upstream);
  const proxy = await startRecoveryProxy({ upstream: `http://127.0.0.1:${upstreamPort}`, runId: "run_fixture" });
  const response = await fetch(`${proxy.url}/v1/capabilities`);
  assert.equal(response.status, 200);
  await Promise.race([
    proxy.close(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("recovery_proxy_close_timeout")), 1_000)),
  ]);
  await new Promise((resolve) => upstream.close(resolve));
});

test("recovery scenario records observed behavior, not inferred topology, and keeps remote analogues unverified", async () => {
  const scenarios = JSON.parse(await readFile(new URL("../fixtures/simulations/recovery-scenarios.json", import.meta.url), "utf8"));
  assert.deepEqual(scenarios.conditions.map((row) => row.id), [
    "gateway_refusal", "interrupted_restored_stream", "proxy_buffering", "panel_recreation", "ssh_local_forward", "direct_remote_https", "remote_muxy_workspace",
  ]);
  for (const row of scenarios.conditions.slice(-3)) assert.equal(row.forced_unverified, true);
  assert.equal(JSON.stringify(scenarios).toLowerCase().includes("workspacepath"), false);
});
