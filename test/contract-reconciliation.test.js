import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const phaseDirectory = new URL("../.planning/phases/01-verified-gateway-connectivity/", import.meta.url);

async function readContract(name) {
  return readFile(new URL(name, phaseDirectory), "utf8");
}

test("authoritative contracts describe the consented curl relay as the sole positive transport path", async () => {
  const [ui, validation, coverage] = await Promise.all([
    readContract("01-UI-SPEC.md"),
    readContract("01-VALIDATION.md"),
    readContract("COVERAGE.md"),
  ]);

  for (const contract of [ui, validation, coverage]) {
    assert.match(contract, /consented (?:argv-form )?curl relay/i);
    assert.match(contract, /direct[- ]WebKit.*historical negative|historical negative.*direct[- ]WebKit/is);
    assert.match(contract, /CORS.*simulation-only|simulation-only.*CORS/is);
    assert.match(contract, /CORS(?: and Origin)?[^.\n]{0,120}simulation-only|simulation-only[^.\n]{0,120}CORS/i);
    assert.doesNotMatch(contract, /exact[- ]origin access|actual panel origin.*qualif|Explicit browser CORS\s*\|\s*INTEGRATE/i);
  }
});

test("validation maps Plans 07 through 15 to current JavaScript suites and relay-native checks", async () => {
  const validation = await readContract("01-VALIDATION.md");
  for (let plan = 7; plan <= 15; plan += 1) {
    assert.match(validation, new RegExp(`01-${String(plan).padStart(2, "0")}`));
  }
  assert.match(validation, /node --test[^\n]*\.test\.js/);
  assert.match(validation, /waves?\s*(?:5|6|7|8|9|10|11)|\|\s*(?:5|6|7|8|9|10|11)\s*\|/i);
  assert.match(validation, /relay consent/i);
  assert.match(validation, /safe audit summary/i);
  assert.match(validation, /two fresh (?:panel )?receipts/i);
  assert.match(validation, /cancellation/i);
  assert.match(validation, /cleanup/i);
  assert.doesNotMatch(validation, /\.test\.ts|src\/.*\.ts/i);
  assert.doesNotMatch(validation, /01-0[1-6][^\n]*(?:pending|to do|planned)/i);
});

test("coverage keeps curl capabilities and the harmless stream integrated while preserving Phase 2 and remote boundaries", async () => {
  const coverage = await readContract("COVERAGE.md");
  assert.match(coverage, /capabilities/i);
  assert.match(coverage, /isolated harmless authenticated stream/i);
  assert.match(coverage, /one argv(?:-form)? curl execution/i);
  assert.match(coverage, /bounded (?:workspace )?journal/i);
  assert.match(coverage, /Phase 2.*(?:opt-out|out of scope)|(?:opt-out|out of scope).*Phase 2/i);
  assert.match(coverage, /SSH.*Unverified|Unverified.*SSH/is);
  assert.match(coverage, /direct remote HTTPS.*Unverified|Unverified.*direct remote HTTPS/is);
  assert.match(coverage, /remote workspace.*Unverified|Unverified.*remote workspace/is);
});
