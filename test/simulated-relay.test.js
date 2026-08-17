import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { classifyVerdict } from "../src/verdict.js";
import { buildSimulationRecord, loadSimulationScenarios } from "../scripts/qualify-simulations.mjs";

const versions = Object.freeze({
  muxyVersion: "1.5.0+945",
  hermesVersion: "0.20.2",
  hermesRevisionOrDigest: "sha256:f8f548d87d16634d1ad9e3777280f3f577ba2358703f04e18e74007ffd3621bf",
});

test("simulation matrix keeps Docker real and every remote analogue forced Unverified", async () => {
  const scenarios = await loadSimulationScenarios();
  assert.deepEqual(scenarios.map((scenario) => scenario.id), [
    "docker_published_loopback",
    "ssh_local_forward",
    "direct_remote_https",
    "remote_muxy_workspace",
  ]);
  assert.deepEqual(scenarios[0], {
    id: "docker_published_loopback",
    realPath: true,
    simulation: false,
    verdictPolicy: "two_fresh_real_sessions",
    faultCases: ["refused", "mid_stream_interrupted", "restored"],
  });
  for (const scenario of scenarios.slice(1)) {
    assert.equal(scenario.realPath, false);
    assert.equal(scenario.simulation, true);
    assert.equal(scenario.verdictPolicy, "forced_unverified");
  }
});

test("passing simulated observations remain Unverified and discard workspace sentinels", async () => {
  const scenarios = await loadSimulationScenarios();
  const sentinel = "workspace-sentinel-5e3c0bf9b1";
  for (const [index, scenario] of scenarios.slice(1).entries()) {
    const record = buildSimulationRecord({
      scenario,
      versions,
      sessionOrdinal: index % 2 + 1,
      recordedAt: `2026-08-17T17:3${index}:00.000Z`,
      ignoredWorkspacePath: `/private/tmp/${sentinel}`,
    });
    assert.equal(JSON.stringify(record).includes(sentinel), false);
    assert.equal(classifyVerdict({ records: [record] }).verdict, "Unverified");
    assert.equal(record.realPath, false);
    assert.equal(record.simulation, true);
  }
});

test("Compose publishes only loopback and pins the resolved latest Hermes image digest", async () => {
  const compose = await readFile(new URL("../fixtures/simulations/docker-compose.yml", import.meta.url), "utf8");
  assert.match(compose, /nousresearch\/hermes-agent:v2026\.8\.16@sha256:f8f548d87d16634d1ad9e3777280f3f577ba2358703f04e18e74007ffd3621bf/);
  assert.match(compose, /127\.0\.0\.1:\$\{HERMES_SIM_PORT/);
  assert.doesNotMatch(compose, /network_mode:\s*host|privileged:\s*true|--insecure|-k\b|0\.0\.0\.0:\$\{HERMES_SIM_PORT/);
});
