---
phase: 01-verified-gateway-connectivity
verified: 2026-08-17T18:13:05Z
status: gaps_found
score: 15/36 must-haves verified
behavior_unverified: 5
overrides_applied: 0
gaps:
  - truth: "The MVP phase has a valid user-story goal whose outcome can be verified through a user flow."
    status: failed
    reason: "The roadmap declares mode: mvp but its goal is not an 'As a ..., I want to ..., so that ...' user story; the mandated MVP verifier rejects it."
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "Phase 1 goal has no user role, capability, or outcome slot."
    missing:
      - "Reformat the Phase 1 MVP goal with /gsd mvp-phase 1 before claiming MVP user-flow verification."
  - truth: "Closing the panel terminates the bearer-backed curl stream and scrubs its journal before the panel releases ownership."
    status: failed
    reason: "Panel release aborts only local state; it never calls GatewayClient.teardown() or cancels the active muxy.exec stream."
    artifacts:
      - path: "src/panel/app.js"
        issue: "release() calls ConnectionProbe.abort() only."
      - path: "src/probe.js"
        issue: "abort() does not propagate to GatewayClient or CurlRelay."
      - path: "src/curl-relay.js"
        issue: "streamJournal awaits an uncancellable exec until completion or timeout."
    missing:
      - "Wire cancellable exec ownership through panel → probe → GatewayClient → CurlRelay and await scrub/remove on cancellation."
  - truth: "Only real, two-session relay observations can establish Supported evidence."
    status: failed
    reason: "The generic validation CLI accepts caller-authored JSON fields for realPath, stages, origin, session, and SSE metadata; the classifier accepts two such records as Supported. The curl relay does not emit the required origin stage."
    artifacts:
      - path: "scripts/run-validation.mjs"
        issue: "Reads arbitrary --input JSON and passes it to the evidence writer."
      - path: "src/verdict.js"
        issue: "successfulQualification requires exact-origin evidence that the curl path never observes."
    missing:
      - "Bind positive evidence to verifier-owned relay/session receipts and revise the stage contract for the approved curl architecture."
  - truth: "Host-native and Docker-published loopback can complete actual two-session qualification, while HTTPS/proxy simulation is exercised and remote simulations remain Unverified."
    status: failed
    reason: "qualify-real.mjs rejects every fixture other than host-native, never writes a qualification record, and no Docker runner starts/tears down Compose or drives two panel sessions. The compose file also has no HTTPS reverse-proxy fixture."
    artifacts:
      - path: "scripts/qualify-real.mjs"
        issue: "fixture must equal host-native and interactive mode only waits for a signal."
      - path: "scripts/qualify-simulations.mjs"
        issue: "Docker is declared realPath but buildSimulationRecord rejects non-simulated scenarios."
      - path: "fixtures/simulations/docker-compose.yml"
        issue: "Contains loopback HTTP gateway/model services, not an HTTPS/reverse-proxy simulation."
    missing:
      - "Implement a Docker lifecycle/qualification runner, evidence emission, and the required HTTPS/proxy simulation."
  - truth: "Diagnostics truthfully distinguish observed DNS, TLS, refusal, timeout, authentication, protocol, journal-limit, and streaming failures."
    status: failed
    reason: "Relay errors collapse generic curl request failure into gateway_unreachable, and an SSE 401/403/500 is parsed as an unproved streaming sequence because streamJournal captures no HTTP status."
    artifacts:
      - path: "src/gateway-client.js"
        issue: "relayFailureReason maps request failure to gateway_unreachable; #qualifyStream does not examine a response status."
      - path: "src/curl-relay.js"
        issue: "requestJson has a status marker, but streamJournal does not."
    missing:
      - "Capture stream HTTP status separately from journal content and map observed curl/network classes without inferring hidden causes."
behavior_unverified_items:
  - truth: "The actual Muxy panel completes the consented capability and incremental-stream flow."
    test: "Load the rebuilt dist directory in Muxy and run the isolated fixture with a disposable token."
    expected: "The panel shows observed relay/auth/capability/stream stages and no Phase 2 controls."
    why_human: "Unit tests use mocked Muxy bridge objects; no direct panel interaction is exercised by automated tests."
  - truth: "The built dist directory can be loaded unpacked in Muxy."
    test: "Load dist/ as an unpacked extension in the current Muxy app."
    expected: "Muxy accepts the manifest and opens the Hermes Gateway panel."
    why_human: "The build and manifest validator pass, but do not invoke Muxy's unpacked-extension validator."
  - truth: "The connection UI is usable in both themes, supported scales, keyboard-only navigation, and reduced-motion mode."
    test: "Exercise the form, results, matrix, focus states, narrow layout, and reduced-motion setting in Muxy."
    expected: "All text wraps, focus/hover is visible, and no nonessential animation runs."
    why_human: "Static DOM/style tests cannot observe the host WebView's rendered theme, scale, or focus behavior."
  - truth: "The actual Muxy curl grant/audit and journal lifecycle are secret-safe."
    test: "Authorize the displayed curl operation against a disposable fixture, inspect the Muxy audit, then close/reopen the panel."
    expected: "No bearer or content is shown; journal cleanup is complete after the cancellation gap is fixed."
    why_human: "The test bridge does not produce Muxy's real consent/audit records."
  - truth: "The evidence matrix and Muxy-change stop alert behave correctly in the native panel."
    test: "Load a safe failure record after the evidence-source gaps are fixed; inspect alert focus and copy/view actions."
    expected: "The alert is non-dismissible, keyboard focus moves to it, and copied/viewed output contains only allowlisted data."
    why_human: "Clipboard, host focus, and actual Muxy rendering are not observable in the unit suite."
---

# Phase 1: Verified Gateway Connectivity Verification Report

**Phase Goal:** Users can build, load, and safely prove an authenticated Hermes Gateway connection through one explicitly consented, deployment-neutral relay contract.
**Verified:** 2026-08-17T18:13:05Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## MVP Goal Contract

`user-story.validate` returned `valid: false`: the Phase 1 goal is not in the required MVP user-story form. Per the MVP verification guard, a user-flow verdict cannot be generated from it. This is a blocker independent of the code findings below; run `/gsd mvp-phase 1` to establish a valid story/outcome before re-verification.

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Story/outcome | A user role, capability, and observable outcome define the Phase 1 flow. | ROADMAP goal starts “Users can…”; the canonical validator reports all three slots missing. | ✗ FAILED |

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Build/load a panel; token-safe explicitly consented relay performs authenticated capability discovery. | ✗ FAILED | `npm run build` creates `dist/package.json` and relay passes bearer via stdin, but closing the panel leaves its bearer-backed stream uncancelled. |
| 2 | Same flow can complete real host/Docker proof; remote simulations are Unverified with no workspace path. | ✗ FAILED | The client is topology-neutral and remote scenarios are forced Unverified, but Docker has no executable qualification runner or real evidence path. |
| 3 | Observed safe verdicts distinguish all listed failure classes; non-loopback uses trusted HTTPS. | ✗ FAILED | URL policy correctly requires HTTPS outside literal loopback, but relay/SSE failure mapping does not distinguish DNS/TLS/refusal/auth/protocol accurately. |
| 4 | Inspect versioned direct-WebKit/relay evidence; only real paths establish Supported. | ✗ FAILED | The checked-in index has no observations; arbitrary JSON can be classified as Supported and curl cannot provide the required origin stage. |
| 5 | Extension uses only curl, journal, and panel authority; no topology/lifecycle/source/provider authority. | ✓ VERIFIED | Manifest declares `commands:exec`, `files:read`, `files:write`, `panels:write`, and `file.changed`; panel sources do not import Docker/SSH/Git/provider/lifecycle controls. |

**Roadmap score:** 1/5 truths verified.  
**Merged PLAN must-haves:** 15/36 verified; 5 present but behavior-unverified; 16 failed.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `dist/package.json`, `dist/panel/index.html` | Publish-valid Muxy output | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Build passed and output exists; unpacked Muxy loading was not exercised. |
| `src/panel/app.js`, `src/probe.js`, `src/gateway-client.js`, `src/curl-relay.js` | URL/token → consented relay → capability/SSE flow | ⚠️ HOLLOW | Code is substantive and wired, but release does not cancel the live relay. |
| `scripts/run-validation.mjs`, `src/evidence.js`, `src/verdict.js` | Trustworthy redacted evidence | ✗ FAILED | Writer is substantive and redacts fields, but trusts caller-controlled positive observations. |
| `scripts/qualify-real.mjs` | Real host and Docker qualification | ✗ FAILED | Host-only interactive scaffold; neither evidence emission nor Docker lifecycle exists. |
| `fixtures/simulations/docker-compose.yml` | Docker + HTTPS/proxy simulation | ✗ FAILED | Loopback HTTP compose fixture exists; required HTTPS/proxy simulation and runner are absent. |
| `src/stop-gate.js` | Current-pair reproducible-failure stop boundary | ⚠️ PARTIAL | UI wiring exists, but failure counting can use unrelated historical records. |

The declared TypeScript artifacts (`src/*.ts`, `test/*.test.ts`, `fixtures/docker-compose.yml`) do not exist. JavaScript counterparts are present in several cases, but no override documents the deviation and the different Docker path/runner contract is not fulfilled.

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Panel | ConnectionProbe → GatewayClient | Form submit | ✓ WIRED | `src/panel/app.js:153` calls `probe.start`; `src/probe.js:140` calls `client.probe`. |
| GatewayClient | CurlRelay/SSE parser | Capability request and journal chunks | ✓ WIRED | `src/gateway-client.js:88-108,160-180` calls relay and feeds `SseParser`. |
| Panel close | Active relay | Abort/teardown/scrub | ✗ NOT_WIRED | `app.release()` → `probe.abort()` never reaches `GatewayClient.teardown()` or a cancellable exec handle. |
| Qualification runner | Evidence writer/index | Observed records only | ✗ NOT_WIRED | `qualify-real.mjs` has no call to `run-validation`/`writeEvidencePair`; the generic CLI accepts arbitrary input. |
| Docker compose fixture | Qualification runner | up/health/two panels/down | ✗ NOT_WIRED | `qualify-real.mjs:265` rejects Docker and has no compose call. |
| Public evidence index | Matrix/stop-gate UI | Sanitized local read | ✓ WIRED, ⚠️ STATIC | Panel loads `/evidence/index.json`, but the committed index contains only five empty Unverified rows. |
| `package.json` | manifest copy | build script | ✓ WIRED | `npm run build` completed Vite output then copied `package.json` into `dist/`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| Panel connection result | `snapshot` | URL/token form → probe → relay | Relay responses/journal chunks, but no cancellation path | ⚠️ HOLLOW |
| Evidence matrix | `evidenceState.rows` | `/evidence/index.json` | Static empty index only; no real qualification reports | ⚠️ STATIC |
| Evidence reports | `observation` | arbitrary `--input` file | Caller can supply claimed real/session/origin/SSE facts | ✗ DISCONNECTED FROM REAL PROOF |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Production build and manifest copy | `npm run build` | Vite built 12 modules; `dist/package.json` present | ✓ PASS |
| Workspace unit suite | `node --test test/*.test.js` | 42 pass; 4 host-fixture tests blocked by sandbox loopback policy | ? ENVIRONMENT-LIMITED |
| Host-fixture runtime checks | `node --test test/host-fixture.test.js` (scoped local-port permission) | 9/9 pass | ✓ PASS |

The passing tests do not exercise actual Muxy consent/audit, a real Docker qualification runner, panel-close stream cancellation, or evidence provenance; they do not disprove the gaps above.

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
| --- | --- | --- | --- |
| EXT-01 | 01 | NEEDS HUMAN | Build works; unpacked Muxy load is unexercised. |
| EXT-02 | 01 | ✓ SATISFIED | Build copies manifest and validator passes. |
| CONN-01 | 01 | NEEDS HUMAN | Form is wired; actual panel flow remains unobserved. |
| CONN-02 | 01, 02, 04, 05 | ✗ BLOCKED | No safe panel-close cancellation and no verifier-owned proof output. |
| CONN-03 | 01, 02 | ✓ SATISFIED | Capability normalization/rendering is read-only and unknown capabilities do not enable controls. |
| CONN-04 | 01 | ✓ SATISFIED | `normalizeGatewayUrl` permits HTTP only for literal loopback. |
| CONN-05 | 02, 04, 05, 06 | ✗ BLOCKED | SSE status and granular observed curl diagnostics are missing. |
| DEPL-01 | 01, 03, 06 | ✓ SATISFIED | No deployment selector/branch exists in panel client. |
| DEPL-02 | 03–06 | ✗ BLOCKED | Host runner cannot generate/bind evidence from completed panel sessions. |
| DEPL-03 | 03–06 | ✗ BLOCKED | Docker runner, refusal/interruption exercise, and evidence emission are absent. |
| DEPL-04 | 03, 05, 06 | ✓ SATISFIED | SSH simulation is hard-forced `Unverified`; workspace path is discarded. |
| DEPL-05 | 03, 05, 06 | ✗ BLOCKED | No HTTPS/reverse-proxy simulation exists. |
| DEPL-06 | 03, 05, 06 | ✓ SATISFIED | Remote-workspace scenario remains simulated/Unverified and excludes path input. |
| SEC-01 | 01, 02, 05, 06 | ✗ BLOCKED | Panel closure does not terminate the bearer-backed relay. |
| SEC-02 | 01, 02, 04, 05, 06 | NEEDS HUMAN | stdin-only argv construction and disclosure are code-tested; actual Muxy grant/audit needs inspection. |
| SEC-04 | 01, 04, 05, 06 | ✓ SATISFIED | Production surface contains no Docker/SSH/Gateway lifecycle/provider authority. |
| SEC-05 | 01, 02, 06 | ✓ SATISFIED | Manifest is limited to exec, journal read/write, panel, and file-change event authority. |
| EVID-01 | 03–06 | ✗ BLOCKED | Redaction/schema code exists, but no trustworthy generated fixture reports are committed. |
| EVID-02 | 03–06 | ✗ BLOCKED | Matrix is present, but its Supported classification is forgeable. |
| EVID-03 | 06 | ✗ BLOCKED | No versioned direct-WebKit negative-result artifact is available; relay failure taxonomy is incomplete. |
| EVID-04 | 06 | NEEDS HUMAN | No source change is present and a stop UI exists, but current stop logic is not restricted to the latest pair. |

All 21 Phase 1 requirement IDs appear in one or more PLAN frontmatter blocks; none are orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/panel/app.js` | 64 | Abort does not own/cancel underlying relay | 🛑 BLOCKER | Panel-close secret/lifecycle boundary is false. |
| `scripts/run-validation.mjs` | 31 | Arbitrary JSON assertion becomes evidence | 🛑 BLOCKER | `Supported` can be manufactured. |
| `src/verdict.js` | 52 | Requires origin stage curl cannot produce | 🛑 BLOCKER | Real relay path cannot legitimately reach `Supported`. |
| `scripts/qualify-real.mjs` | 265, 322 | Host-only fixture guard | 🛑 BLOCKER | Docker requirement cannot execute. |
| `src/curl-relay.js` | 120–169 | Stream response has no HTTP-status capture | ⚠️ WARNING | Auth/server failure is misreported as streaming failure. |
| `src/stop-gate.js` | 104–106 | Counts any historical pair/session failures | ⚠️ WARNING | Can stop current work on stale/duplicate evidence. |

No unreferenced `TBD`, `FIXME`, or `XXX` markers were found in the Phase 1 implementation files.

### Human Verification Required After Gap Closure

1. **Actual panel connection**

   **Test:** Reload `dist/` in current Muxy and use the isolated host fixture.
   **Expected:** Consent, capability discovery, incremental journal updates, and secret-safe rendered/audit output match the repaired evidence record.
   **Why human:** Muxy consent, audit logging, and WebView transport are host behavior.

2. **Docker two-session qualification**

   **Test:** Run the repaired Docker fixture runner, complete two fresh panels, then exercise refusal and controlled interruption.
   **Expected:** Only records derived by the runner may change Docker from Unverified; cleanup always runs.
   **Why human:** This requires the real Muxy app and Docker runtime.

3. **Native UI and stop boundary**

   **Test:** Check themes, scales, keyboard focus, reduced motion, and a current-pair stop record in Muxy.
   **Expected:** Native rendering is legible and the stop alert is correctly focused/non-dismissible with redacted actions only.
   **Why human:** Visual, clipboard, and host-focus behavior cannot be established with static tests.

## Gaps Summary

Phase 1 is **not achieved**. The extension builds and much of the client/relay/redaction surface is substantive, but the proof contract fails at its essential boundaries: active bearer-backed work survives panel close; real evidence is not provenance-bound; curl cannot fulfill the retained browser-origin criterion; and Docker/HTTPS fixture qualification is not executable. These are Phase 1 delivery gaps, not work intentionally deferred to Phases 2 or 3.

---

_Verified: 2026-08-17T18:13:05Z_  
_Verifier: the agent (gsd-verifier)_
