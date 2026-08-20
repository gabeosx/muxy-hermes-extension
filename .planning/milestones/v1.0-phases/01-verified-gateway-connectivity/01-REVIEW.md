---
phase: 01-verified-gateway-connectivity
reviewed: 2026-08-17T18:07:59Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - RESEARCH.md
  - fixtures/simulations/docker-compose.yml
  - fixtures/simulations/model-stub.py
  - fixtures/simulations/scenarios.json
  - package.json
  - panel/index.html
  - public/evidence/index.json
  - public/evidence/schema-v1.json
  - scripts/qualify-real.mjs
  - scripts/qualify-simulations.mjs
  - scripts/run-validation.mjs
  - scripts/validate-dist.mjs
  - scripts/validate-phase.mjs
  - src/capabilities.js
  - src/curl-relay.js
  - src/evidence.js
  - src/gateway-client.js
  - src/panel/app.js
  - src/probe.js
  - src/sse-parser.js
  - src/stop-gate.js
  - src/styles/global.css
  - src/verdict.js
  - test/curl-relay.test.js
  - test/evidence.test.js
  - test/phase-boundary.test.js
  - test/probe-state.test.js
  - test/simulated-relay.test.js
  - test/stop-gate.test.js
  - test/transport-tracer.test.js
  - test/ui-contract.test.js
  - test/verdict.test.js
findings:
  critical: 4
  warning: 2
  info: 0
  total: 6
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-17T18:07:59Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The panel, relay, qualification tooling, evidence pipeline, and validation suite were reviewed. The unit suite passes, but it validates mocked relay responses and manually supplied observations rather than the required real-panel proof. The implementation can leave a bearer-backed curl process running after the panel closes, accepts fabricated evidence as `Supported`, cannot derive the legacy origin requirement from its new curl path, and supplies no executable Docker qualification flow.

## Critical Issues

### CR-01 [BLOCKER]: Closing the panel does not cancel the bearer-backed curl request

**File:** `src/panel/app.js:64`
**Issue:** `release()` only aborts the local `AbortController` and clears the input. `ConnectionProbe.abort()` does not tell `GatewayClient` to stop its active relay operation (`src/probe.js:105`), and `CurlRelay.streamJournal()` awaits an uncancellable `muxy.exec` through to its normal cleanup (`src/curl-relay.js:160`). A panel close therefore leaves the curl process, its in-process bearer value, and potentially the journal active until the request's 60-second timeout or remote completion. This violates the panel-close ownership and orderly scrub requirement.
**Fix:** Use a cancellable execution handle for the long-lived stream, retain it in `CurlRelay`, and propagate cancellation through `ConnectionProbe.abort()` → `GatewayClient.teardown()` → relay cancellation. Await journal scrub/remove after cancellation before considering the panel released. Keep the token reference scoped to the active request and clear it in the cancellation path as well.

### CR-02 [BLOCKER]: The evidence CLI can manufacture a `Supported` deployment result from arbitrary JSON

**File:** `scripts/run-validation.mjs:31`
**Issue:** The CLI accepts any caller-controlled JSON file, turns its booleans and fabricated SSE metadata into an evidence record, and feeds it to the classifier. Two hand-authored records with `realPath: true`, all stages passed, and session ordinals 1/2 become `Supported` (`src/verdict.js:83`). No record is bound to a real Muxy panel session, relay invocation, fixture, or immutable capture. This defeats the phase's central rule that only two actual panel sessions can establish support; the existing evidence test demonstrates the same forged-input route (`test/evidence.test.js:143`).
**Fix:** Remove the generic arbitrary-observation entry point for positive evidence. Have the controlled qualification runner produce the record from its own observed relay/session data, include an independently verified session/fixture attestation, and reject caller-provided `realPath`, stage outcomes, and SSE timing for a positive verdict. If panel interaction must remain human-mediated, require a verifier-owned one-time challenge/session receipt rather than accepting a JSON assertion.

### CR-03 [BLOCKER]: The curl runtime can never satisfy the origin prerequisite used for `Supported`

**File:** `src/gateway-client.js:98`
**Issue:** The runtime probe returns URL, relay, authentication, capabilities, and stream outcomes, but never an origin outcome. That is expected for the approved curl relay: curl sends neither a browser `Origin` nor CORS preflight. However, `successfulQualification()` still requires `originVerdict === "exact_origin_passed"` and every `requiredStages` entry—including `origin`—to be passed (`src/verdict.js:47`). Consequently no observation generated from this panel path can be classified as `Supported`; a positive result requires manually fabricating the missing origin fields through the arbitrary CLI in CR-02.
**Fix:** Version and migrate the evidence contract for the approved relay architecture. Record the direct-WebKit CORS experiment as a distinct negative/stop artifact, then define the relay's actual required stages (including consent and journal lifecycle) and derive them from the relay. Do not retain an unattainable browser-origin prerequisite in the relay support classifier.

### CR-04 [BLOCKER]: Docker is labelled a real validation class but has no qualification runner

**File:** `scripts/qualify-real.mjs:264`
**Issue:** The only executable real fixture explicitly rejects every fixture except `host-native`. The simulation loader correctly identifies Docker as `realPath: true` (`scripts/qualify-simulations.mjs:29`), but its record builder rejects it because it only permits simulated scenarios (`scripts/qualify-simulations.mjs:49`). Nothing in the supplied scripts starts or tears down the Compose fixture, drives two panel sessions through its loopback port, or emits Docker evidence. The repository can therefore not perform the promised real Docker qualification.
**Fix:** Add a Docker-specific runner that invokes the pinned Compose fixture, waits for health, exposes its loopback URL/token to the two fresh panel sessions, captures relay-derived results, and always performs `compose down` in `finally`. Until that exists and is exercised, force the Docker row to remain `Unverified` rather than treating it as a real-capable condition.

## Warnings

### WR-01 [WARNING]: HTTP failure from the SSE endpoint is misreported as a streaming proof failure

**File:** `src/curl-relay.js:160`
**Issue:** `streamJournal()` does not capture the SSE response status and curl normally exits zero for HTTP 401/403/500. The error body is written to the journal, parsed as no usable deltas, and reported as `qualification_sequence_unproved` (`src/gateway-client.js:181`). For example, a stream-specific authorization denial is shown as a generic streaming failure rather than authentication failure, which makes remediation and resulting evidence inaccurate.
**Fix:** Emit and parse a terminal HTTP-status marker for stream requests (without placing it in the journal), return that status from `streamJournal()`, and classify 401/403 as authentication failure and other non-2xx statuses as a request/capability failure before attempting SSE qualification.

### WR-02 [WARNING]: The stop gate can halt current work because of unrelated historical failures

**File:** `src/stop-gate.js:104`
**Issue:** `reproducibleFailure()` counts any two failures in a row's entire history. It does not require the latest version pair, distinct session ordinals, or the pair that the evidence index identifies as current. Two failures from an old release—or duplicate records for one session—therefore activate the irreversible-looking "Muxy change required" stop even if the current pair has passed.
**Fix:** Restrict stop-gate failure evaluation to the index's latest stable pair and require two distinct fresh session ordinals (and unique run IDs). Reuse the same version/session grouping logic as `classifyVerdict()` so the stop gate and the evidence verdict cannot disagree.

---

_Reviewed: 2026-08-17T18:07:59Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
