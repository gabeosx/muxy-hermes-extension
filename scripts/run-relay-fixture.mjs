import { mkdtemp, rm } from "node:fs/promises";

import {
  createQualificationRuntime,
  startDeterministicModelStub,
  startHostGateway,
} from "./qualify-real.mjs";

const executable = process.env.HERMES_QUALIFICATION_EXECUTABLE;
if (!executable) throw new Error("qualification_executable_required");

const runtimeRoot = await mkdtemp("/private/tmp/hermes-relay-fixture-");
const runtime = await createQualificationRuntime({ root: runtimeRoot, token: "relay-fixture-only" });
const modelStub = await startDeterministicModelStub();
let gateway;

async function cleanup() {
  gateway?.stop();
  await modelStub.close().catch(() => {});
  await rm(runtimeRoot, { recursive: true, force: true });
}

try {
  // Curl owns the browser-crossing request, so Hermes CORS remains disabled.
  gateway = await startHostGateway({ runtime, origin: "", executable, modelStub });
  process.stdout.write(`${JSON.stringify({
    status: "relay_fixture_ready",
    gatewayUrl: gateway.url,
    panelToken: "relay-fixture-only",
    requestContract: "two_delayed_deltas_no_tools",
  })}\n`);
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
} finally {
  await cleanup();
}
