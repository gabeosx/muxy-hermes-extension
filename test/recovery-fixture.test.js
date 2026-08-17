import assert from "node:assert/strict";
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
