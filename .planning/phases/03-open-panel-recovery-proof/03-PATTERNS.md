# Phase 03: Open-panel recovery proof gap closure - Pattern Map

**Mapped:** 2026-08-18  
**Files analyzed:** 10 likely created/modified files  
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/project-recovery-observation.mjs` (new) | utility | transform / file-I/O | `src/recovery-evidence.js` | data-flow match |
| `scripts/run-recovery-fixture.mjs` | service / fixture harness | event-driven / streaming | same file | exact |
| `scripts/qualify-real.mjs` | service / qualification harness | request-response / file-I/O | same file | exact |
| `scripts/qualify-simulations.mjs` | service / simulation harness | request-response / event-driven | same file | exact |
| `fixtures/simulations/recovery-scenarios.json` | config / fixture | transform | `fixtures/simulations/scenarios.json` | role match |
| `fixtures/simulations/docker-compose.yml` | config / fixture | streaming | same file | exact |
| `public/evidence/recovery-v1.json` | versioned evidence model | file-I/O / transform | `public/evidence/index.json` + same file | role match |
| `src/recovery-evidence.js` | model / sanitizer / renderer | transform | same file | exact |
| `test/recovery-evidence.test.js` | test | transform / file-I/O | same file | exact |
| `test/recovery-fixture.test.js`, `test/simulated-relay.test.js`, `test/run-controller.test.js` | tests | streaming / event-driven | same files | exact |

## Pattern Assignments

### `scripts/project-recovery-observation.mjs` (utility, allowlisted transform + atomic file I/O)

**Analog:** `src/recovery-evidence.js`, `scripts/validate-phase.mjs`

Keep Node-only read/write out of browser `src/` modules. Mirror `sanitizeRecoveryEvidence()`'s exact-key construction and require the completed structural document before publishing. The projection must accept a narrow receipt shape, never arbitrary fixture objects or diagnostics, and must preserve the three remote rows as forced `Unverified`.

**Exact-key / fail-closed model** — [`src/recovery-evidence.js:20`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:20):

```js
function invalid() { throw new Error("recovery_evidence_invalid"); }
function exact(value, keys) {
  if (!plainObject(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) invalid();
}
```

**Complete-publication predicate** — [`src/recovery-evidence.js:91`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:91):

```js
if (requireComplete) {
  for (const row of conditions.slice(0, 2)) {
    if (!row.actual || row.verdict !== "Observed" || !row.nativePanel || row.cleanup !== "scrubbed_removed") invalid();
  }
}
```

**Validation reads evidence from the canonical public location** — [`scripts/validate-phase.mjs:117`](/Users/gabe/muxy-hermes-extension/scripts/validate-phase.mjs:117):

```js
const recovery = JSON.parse(await readFile(join(evidenceDir, "recovery-v1.json"), "utf8"));
const safe = sanitizeRecoveryEvidence(recovery, { requireComplete: true });
```

**Use:** create a test-only projection helper that (1) reads the existing document, (2) maps one named host/Docker receipt through a literal allowlist into only its canonical row, (3) validates `requireComplete: true` only after both required receipts exist, then (4) atomically replaces the document. Reject receipt keys such as URL, bearer, raw headers/body, workspace/home/journal paths, prompt/output text, subprocess output, or free-form error text. Do not let this helper inspect topology, launch infrastructure, or enter the extension bundle.

---

### `scripts/run-recovery-fixture.mjs` (test-only proxy + Docker-observation producer, streaming)

**Analog:** [`scripts/run-recovery-fixture.mjs:3`](/Users/gabe/muxy-hermes-extension/scripts/run-recovery-fixture.mjs:3)

Retain the existing fixed loopback / fixed-route proxy and extend its `observation()` return with only structural booleans, bounded counts, and named signature codes. Feed that receipt to the projection helper after native fixture and cleanup assertions pass—never log it as a substitute for publication.

**Loopback and route guard** — [`scripts/run-recovery-fixture.mjs:3`](/Users/gabe/muxy-hermes-extension/scripts/run-recovery-fixture.mjs:3):

```js
if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
  throw new Error("recovery_proxy_upstream_unsafe");
}
```

**One-shot interruption / buffering signature** — [`scripts/run-recovery-fixture.mjs:86`](/Users/gabe/muxy-hermes-extension/scripts/run-recovery-fixture.mjs:86):

```js
const forwardAndCut = () => {
  if (bufferFirstEventsMs > 0) buffered = true;
  if (!outgoing.writableEnded) outgoing.write(chunk);
  interrupted = true;
  upstreamResponse.destroy();
  outgoing.end();
};
```

**Structural receipt interface** — [`scripts/run-recovery-fixture.mjs:120`](/Users/gabe/muxy-hermes-extension/scripts/run-recovery-fixture.mjs:120):

```js
return Object.freeze({
  url: `http://127.0.0.1:${port}`,
  observation: () => Object.freeze({ interrupted, forwardedSubscriptions, buffered }),
  close: () => closeServer(server, sockets, upstreamRequests, timers),
});
```

**Use:** add named codes for refusal/unreachable, interruption/restoration, buffering, and panel recreation; derive them from executed fixture controls and native-panel handoff only. The observed behavior should state e.g. `refused_or_unreachable`, `interrupted_then_restored`, `buffered_or_delayed`, and `fresh_credentials_and_status_only`, never `ssh_detected` or `proxy_detected`.

---

### `scripts/qualify-real.mjs` (host receipt producer, lifecycle / cleanup)

**Analog:** [`scripts/qualify-real.mjs:401`](/Users/gabe/muxy-hermes-extension/scripts/qualify-real.mjs:401)

Extend the existing interactive host lifecycle rather than adding a gateway launcher. Its `try/finally` is the boundary that must gate host receipt publication: a row cannot say cleanup passed until child shutdown and runtime cleanup complete.

**Pinned, bounded launch contract** — [`scripts/qualify-real.mjs:282`](/Users/gabe/muxy-hermes-extension/scripts/qualify-real.mjs:282):

```js
export async function startHostGateway({ runtime, origin, executable = process.env.HERMES_QUALIFICATION_EXECUTABLE, ... }) {
  await verifyQualificationExecutable({ executable, attestedRevision, sourceRoot });
  // loopback port, runtime-only configuration, bounded readiness follow
}
```

**Existing ownership-safe cleanup location** — [`scripts/qualify-real.mjs:425`](/Users/gabe/muxy-hermes-extension/scripts/qualify-real.mjs:425):

```js
try {
  modelStub = await startDeterministicModelStub();
  gateway = await startHostGateway({ runtime, origin, modelStub, ... });
  // Native Muxy handoff and structural observation collection
} finally {
  await gateway?.stop();
  await modelStub?.close();
  await cleanupQualificationRuntime({ root: runtimeRoot });
}
```

**Use:** collect only a strict host receipt after the two panel sessions are explicitly observed; call the projection helper only after `finally`-equivalent cleanup has reported `scrubbed_removed`. Preserve explicit executable pinning and never search, download, or manage an external Hermes runtime.

---

### `scripts/qualify-simulations.mjs` (executable analogue simulator, event-driven)

**Analog:** [`scripts/qualify-simulations.mjs:18`](/Users/gabe/muxy-hermes-extension/scripts/qualify-simulations.mjs:18)

Replace metadata-only records with executable local analogue cases using the existing scenario loader’s fixed IDs and policy. Simulations may exercise the same URL/token client contract but must publish only local behavioral facts and return forced-Unverified evidence.

**Strict scenario policy** — [`scripts/qualify-simulations.mjs:20`](/Users/gabe/muxy-hermes-extension/scripts/qualify-simulations.mjs:20):

```js
if (index > 0 && (scenario.realPath || !scenario.simulation || scenario.verdictPolicy !== "forced_unverified")) invalid();
```

**Unverified record construction** — [`scripts/qualify-simulations.mjs:48`](/Users/gabe/muxy-hermes-extension/scripts/qualify-simulations.mjs:48):

```js
if (!scenario?.simulation || scenario.realPath || scenario.verdictPolicy !== "forced_unverified") invalid();
return buildEvidenceRecord({
  deploymentCondition: scenario.id,
  trustClass: "simulated",
  realPath: false,
  simulation: true,
  // structural stages and redacted frame shapes only
});
```

**Use:** add a `runSimulationScenario`-style exported runner that drives:

- SSH-forward analogue: a loopback relay is interrupted then restored, using the ordinary URL/token client interface;
- TLS reverse-proxy analogue: a local TLS reverse proxy covers valid certificate/auth/CORS/unbuffered stream behavior and separately a failure signature, without certificate bypass;
- remote-workspace analogue: use a sentinel input to prove no workspace-path parameter/header/body field is sent, without invoking a remote workspace or claiming it was one.

Return a shape such as `{ scenarioId, requestOutcome, observerAttempts, reattached, buffering, workspacePathTransmitted: false, verdict: "Unverified" }`, with no raw URL/token/text. Do not change production transport or branch it by scenario.

---

### `fixtures/simulations/recovery-scenarios.json` and `fixtures/simulations/docker-compose.yml` (fixture config, streaming)

**Analogs:** [`fixtures/simulations/recovery-scenarios.json:1`](/Users/gabe/muxy-hermes-extension/fixtures/simulations/recovery-scenarios.json:1), [`fixtures/simulations/docker-compose.yml:1`](/Users/gabe/muxy-hermes-extension/fixtures/simulations/docker-compose.yml:1)

Use config as an allowlisted declarative input, not a source of a deployment claim. Keep Docker exposure loopback-only. If a reverse-proxy service is added, it must be fixture-only, pinned, and expose only a unique `127.0.0.1` port; do not grant product code Docker/TLS/process authority.

**Existing condition vocabulary** — [`fixtures/simulations/recovery-scenarios.json:3`](/Users/gabe/muxy-hermes-extension/fixtures/simulations/recovery-scenarios.json:3):

```json
{ "id": "gateway_refusal", "observedBehavior": "refused_or_unreachable", "forced_unverified": false }
{ "id": "ssh_local_forward", "observedBehavior": "local_interruption_analogue", "forced_unverified": true }
```

**Loopback-only Docker publication** — [`fixtures/simulations/docker-compose.yml:21`](/Users/gabe/muxy-hermes-extension/fixtures/simulations/docker-compose.yml:21):

```yaml
ports:
  - "127.0.0.1:${HERMES_SIM_PORT:-18642}:8642"
```

---

### `src/recovery-evidence.js` and `public/evidence/recovery-v1.json` (evidence model + same-origin renderer, transform)

**Analog:** [`src/recovery-evidence.js:40`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:40)

The schema has a hard exact-key gate and renderer deliberately emits safe text from sanitized tokens. Extend its controlled vocabularies and exact row data only as necessary for published refusal/buffering/recreation signatures; do not relax to free-form notes.

**Row whitelist and remote nonpositive policy** — [`src/recovery-evidence.js:40`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:40):

```js
exact(row, ["id", "scenario", "observedBehavior", "requestOutcome", "observerAttempts", "statusOutcome", "reattached", "panelLifecycle", "eventHistoryConfidence", "approvalDetailConfidence", "cleanup", "actual", "pinnedRuntime", "nativePanel", "verdict"]);
if (REMOTE_ANALOGUES.has(row.id)) { actual = false; verdict = "Unverified"; }
```

**Safe same-origin loader** — [`src/recovery-evidence.js:111`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:111):

```js
if (url !== "/evidence/recovery-v1.json" || typeof fetchImpl !== "function") invalid();
response = await fetchImpl(url, { credentials: "same-origin" });
```

**Renderer wording boundary** — [`src/recovery-evidence.js:119`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:119):

```js
details: row.verdict === "Unverified"
  ? "Unverified: simulated or incomplete observation does not establish deployment support."
  : `Observed ${row.observedBehavior.replaceAll("_", " ")}. Event history is incomplete; status is authoritative and approval detail is unavailable.`
```

**Use:** the published document must be the projected product of fixture receipts, contain a distinct observed row/signature for Docker refusal/unreachable and buffering, and keep `scenario` separate from `observedBehavior`. Do not include any endpoint, origin, headers, path, raw SSE data, bearer, prompt/output, approval choice, or topology assertion.

---

### `test/recovery-evidence.test.js` (projection/linkage + safe evidence regression)

**Analog:** [`test/recovery-evidence.test.js:49`](/Users/gabe/muxy-hermes-extension/test/recovery-evidence.test.js:49)

Use direct unit tests with a complete safe fixture and mutation-table negatives. Add temp-file tests for the projection helper: allowlisted host/Docker receipts update only their rows; a secret/path/free-form extra key rejects; publication cannot claim complete before both real rows and cleanup are present; linked public evidence validates after projection.

```js
const invalidCompleteRows = [
  (value) => { value.conditions[0].requestOutcome = "not_run"; },
  (value) => { value.conditions[1].reattached = false; },
];
for (const mutate of invalidCompleteRows) {
  const value = structuredClone(fixture());
  mutate(value);
  assert.throws(() => sanitizeRecoveryEvidence(value, { requireComplete: true }), /recovery_evidence_invalid/);
}
```

---

### `test/recovery-fixture.test.js` and `test/simulated-relay.test.js` (real proxy and executable analogue tests, streaming)

**Analogs:** [`test/recovery-fixture.test.js:15`](/Users/gabe/muxy-hermes-extension/test/recovery-fixture.test.js:15), [`test/simulated-relay.test.js:36`](/Users/gabe/muxy-hermes-extension/test/simulated-relay.test.js:36)

Follow the repository’s local `node:http` server pattern, always close all owned servers in `finally`, and assert observation counters rather than raw stream content. Convert the current remote policy-only test into execution tests that invoke the simulator for each named analogue and assert its forced-Unverified outcome/no workspace-path transmission.

```js
try {
  const first = await fetch(`${proxy.url}/v1/runs/run_fixture/events`);
  const second = await fetch(`${proxy.url}/v1/runs/run_fixture/events`);
  assert.deepEqual(proxy.observation(), { interrupted: true, forwardedSubscriptions: 2, buffered: false });
} finally {
  await proxy.close();
  await new Promise((resolve) => upstream.close(resolve));
}
```

---

### `test/run-controller.test.js` (retry-boundary and release/generation regression, event-driven)

**Analog:** [`test/run-controller.test.js:95`](/Users/gabe/muxy-hermes-extension/test/run-controller.test.js:95)

Use the existing deferred-promise client and injectable sleep. Add three cases in the same file: status failure after initial observer, after first reattach, and after second reattach; each must assert no subsequent `observe`. Add release during injected sleep, resolve the stale delay/stream/status afterward, and assert no extra observer or publish; assert teardown exactly once and no action depends on the cleared bearer.

```js
const initial = deferred();
const firstRetry = deferred();
const delays = [];
const controller = new RunController({
  baseUrl: "http://127.0.0.1:8642", bearer: "secret", capabilities: core, client,
  recoveryDelays: [11, 22], sleep: async (delay) => { delays.push(delay); },
});
```

The controller’s guards are the implementation contract to exercise, not rewrite — [`src/run-controller.js:154`](/Users/gabe/muxy-hermes-extension/src/run-controller.js:154):

```js
async release() {
  this.#generation += 1;
  this.#bearer = null;
  this.#listeners.clear();
  await this.#client.teardown();
}
// After every awaited retry boundary:
if (generation !== this.#generation) return;
```

## Shared Patterns

### Authority boundary

**Source:** [`scripts/validate-phase.mjs:89`](/Users/gabe/muxy-hermes-extension/scripts/validate-phase.mjs:89)  
**Apply to:** all new fixture/projection/simulation files and tests

```js
const forbiddenSourcePatterns = [
  /muxy\.http\b/, /EventSource\b/, /muxy\.storage\b/, /muxy\.git\b/, /muxy\.execAsync\b/,
  /rejectUnauthorized\b/, /NODE_TLS_REJECT_UNAUTHORIZED\b/, /background\.js\b/,
];
```

Fixture-only code may use Node built-ins and Docker test configuration; production code must not gain Docker, SSH, TLS-bypass, background, storage, workspace-path, or topology-detection authority.

### Lifecycle cleanup

**Source:** [`scripts/run-recovery-fixture.mjs:17`](/Users/gabe/muxy-hermes-extension/scripts/run-recovery-fixture.mjs:17)  
**Apply to:** every local proxy / TLS analogue / temporary fixture

```js
for (const timer of timers) clearTimeout(timer);
for (const request of upstreamRequests) request.destroy();
for (const socket of sockets) socket.destroy();
```

Test each cleanup path with an active connection; do not write a `cleanup: "scrubbed_removed"` receipt until all owned ports/processes/files are checked absent.

### Forced-Unverified simulated deployments

**Source:** [`src/recovery-evidence.js:53`](/Users/gabe/muxy-hermes-extension/src/recovery-evidence.js:53)  
**Apply to:** SSH-forward, HTTPS/proxy, remote-workspace analogue records

```js
if (REMOTE_ANALOGUES.has(row.id)) { actual = false; verdict = "Unverified"; }
```

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|---|---|---|---|
| A local TLS reverse-proxy analogue implementation | test-only fixture service | streaming | No existing TLS server/proxy implementation. Copy the lifecycle/loopback ownership pattern from `run-recovery-fixture.mjs`; add no certificate bypass. |

## Metadata

**Analog search scope:** `src/`, `scripts/`, `fixtures/simulations/`, `public/evidence/`, `test/`  
**Files scanned:** 20  
**Pattern extraction date:** 2026-08-18
