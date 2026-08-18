---
phase: 03-open-panel-recovery-proof
plan: 02
subsystem: Hermes recovery qualification
tags: [hermes, muxy, sse, docker, recovery, evidence]
requires:
  - phase: 03-open-panel-recovery-proof
    provides: bounded same-panel recovery and fresh-panel status-only recovery
provides:
  - strict content-free recovery evidence contract and native evidence renderer
  - pinned host-native Hermes qualification harness with owned-root cleanup
  - loopback-only disposable interruption proxy and Docker recovery proof
affects: [milestone-audit, gateway-productization]
actuals:
  tokens: 17421
  tasks: 3
  commits: 14
tech-stack:
  added: []
  patterns: [allowlisted-structural-evidence, owned-root-runtime-cleanup, status-authoritative-recovery]
key-files:
  created: [src/recovery-evidence.js, public/evidence/recovery-v1.json, scripts/run-recovery-fixture.mjs]
  modified: [src/panel/app.js, scripts/qualify-real.mjs, scripts/validate-phase.mjs, fixtures/host-native/fixture.json, fixtures/simulations/recovery-scenarios.json]
key-decisions:
  - "Native qualification records only bounded structural facts; tokens, URLs, prompts, output, headers, paths, and event text remain ephemeral."
  - "Status is authoritative after interruption; reattached events remain explicitly incomplete and approval history unavailable."
  - "Only host-native and Docker loopback rows are Observed; SSH, direct HTTPS, and remote-workspace analogues remain Unverified."
patterns-established:
  - "Real-path evidence must satisfy pinned-runtime/native-panel/cleanup predicates before aggregate validation passes."
  - "Disposable relays own and destroy both client sockets and upstream requests during shutdown."
requirements-completed: [RECV-04, RECV-05, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06, EVID-01]
coverage:
  - id: D1
    description: Strict same-origin recovery evidence is content-free, versioned, and rejected unless both native rows are complete.
    requirement: EVID-01
    verification:
      - kind: unit
        ref: test/recovery-evidence.test.js
        status: pass
      - kind: integration
        ref: npm run validate
        status: pass
    human_judgment: false
  - id: D2
    description: A pinned host-native Hermes instance streamed ordered activity through native Muxy, reached terminal status, and recovered status in a fresh panel.
    requirement: DEPL-02
    verification:
      - kind: manual_procedural
        ref: native Muxy host qualification on Hermes 0.20.2 / Muxy 1.5.0+945
        status: pass
      - kind: unit
        ref: test/host-fixture.test.js
        status: pass
    human_judgment: true
    rationale: Native WKWebView streaming and fresh-panel behavior require observation in Muxy.
  - id: D3
    description: A disposable Docker Gateway suffered a one-shot event interruption, opened a second subscription, and reconciled to authoritative terminal status with incomplete-history copy.
    requirement: DEPL-03
    verification:
      - kind: manual_procedural
        ref: native Muxy Docker published-loopback recovery fixture
        status: pass
      - kind: integration
        ref: test/recovery-fixture.test.js
        status: pass
    human_judgment: true
    rationale: The native Muxy retry and status presentation were observed against the disposable container.
  - id: D4
    description: Failure signatures and panel recreation are reported without topology detection; all three remote analogues remain Unverified.
    requirement: RECV-04
    verification:
      - kind: unit
        ref: test/simulated-relay.test.js and test/recovery-evidence.test.js
        status: pass
    human_judgment: false
  - id: D5
    description: Recovery UI warns that history can be missing or duplicated and that prior approval detail is unavailable.
    requirement: RECV-05
    verification:
      - kind: unit
        ref: test/ui-contract.test.js
        status: pass
    human_judgment: false
  - id: D6
    description: Disposable host, Docker, proxy, network, temporary roots, and ports were removed; proxy shutdown is regression-tested with an active stream.
    verification:
      - kind: integration
        ref: test/recovery-fixture.test.js#recovery proxy closes without waiting for an active streamed connection
        status: pass
      - kind: manual_procedural
        ref: host and Docker teardown checks
        status: pass
    human_judgment: false
duration: 14h 23m
completed: 2026-08-18
status: complete
superseded_for_current_evidence_by: [03-03, 03-04, 03-05, 03-06]
---

# Phase 03 Plan 02: Native recovery proof Summary

> Historical execution record: this plan completed its original proof, but the later 03-03 provenance hardening intentionally reset the canonical host/Docker rows to `Unverified`. Do not use this summary as evidence that the current receipt-backed gate passes. Current execution resumes at 03-04.

**Pinned host-native and disposable Docker Hermes runs now back a strict, redacted recovery record rendered inside Muxy.**

## Performance

- **Duration:** 14h 23m elapsed
- **Started:** 2026-08-17T17:26:02-04:00
- **Completed:** 2026-08-18T07:49:23-04:00
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Published a five-condition recovery evidence document whose native host and Docker rows are Observed and whose SSH, HTTPS, and remote-workspace analogues are forcibly Unverified.
- Proved ordered `alpha`/`beta` streaming and terminal status against a pinned host-native Hermes 0.20.2 runtime through native Muxy, then recovered authoritative status from a fresh panel with fresh credentials and a manual Run ID.
- Proved a real disposable Docker event interruption, second observer subscription, bounded recovery warning, and terminal status reconciliation while truthfully retaining an incomplete event history.
- Removed all task-owned processes, containers, network, ports, and runtime roots; fixed the recovery proxy so active streams cannot block shutdown.

## Task Commits

1. **Strict safe recovery evidence:** `9a5e0ff`, `0f4554c`
2. **Pinned host-native qualification:** `e39a394`, `0f07ca7`, `9d4f503`, `c81e891`, `26fc14d`
3. **Disposable Docker interruption and validation:** `490847a`, `c464636`, `c76e414`, `12070bf`, `cf5ce62`
4. **Independent-review remediation:** `b3a9a2e`, `424d7fb`

## Files Created/Modified

- `src/recovery-evidence.js` — exact-key schema, sanitizer, loader, and safe renderer.
- `public/evidence/recovery-v1.json` — inspectable native and analogue recovery matrix.
- `scripts/qualify-real.mjs` — pinned host identity, isolated runtime, deterministic model, and cleanup harness.
- `scripts/run-recovery-fixture.mjs` — loopback-only one-shot stream interruption proxy with bounded shutdown.
- `scripts/validate-phase.mjs` — aggregate gate now requires complete native recovery evidence.
- `test/host-fixture.test.js`, `test/recovery-fixture.test.js`, `test/recovery-evidence.test.js` — identity, lifecycle, cleanup, redaction, and truthfulness coverage.

## Decisions Made

- A re-subscription is recorded as transport reattachment, not lossless replay. The Docker run therefore records two observer attempts and `eventHistoryConfidence: incomplete` even though the Gateway ultimately reported Completed.
- Fresh-panel recovery was proven on the host-native fixture. The Docker row remains `panelLifecycle: open` because the Mac locked before that redundant Docker-specific GUI subcase could be repeated.
- Remote analogue simulations are useful for exercising failure behavior but cannot establish deployment support.

## Deviations from Plan

### Auto-fixed Issues

**1. Real Hermes release metadata differed from the original harness assumption**

- The qualifier now verifies the actual CLI version, source package identity, and separately attested pinned revision.
- Verified by `test/host-fixture.test.js` and the real pinned runtime.

**2. Direct qualification and deterministic request bounds were incomplete**

- Added direct origin mode, awaited shutdown, an explicit source root, and exactly three deterministic model requests needed by the native flow.
- Verified by focused tests plus the successful host run.

**3. The interruption proxy did not know a newly submitted run ID**

- It now learns the bounded run ID from the 202 response before targeting the fixed events route.
- Verified by `test/recovery-fixture.test.js` and the disposable Docker run.

**4. Active streamed sockets could block proxy shutdown**

- Shutdown now destroys owned upstream requests and client sockets before awaiting server close.
- Verified by a dedicated active-stream regression test.

**5. Native qualification lifecycle paths were not uniformly fail-safe**

- Consumed captured origins before Gateway launch, bounded readiness requests and child termination, returned an idempotent cleanup handle, and made origin-capture shutdown own idle sockets.
- Verified by the host lifecycle suite, including a real idle TCP client while removing the bearer-bearing runtime.

**6. Aggregate evidence and UI validation needed stricter failure behavior**

- Required coherent host/Docker completion predicates and added safe inline feedback for invalid manual Run IDs.
- Verified by negative evidence cases and the UI contract suite.

**Total deviations:** 6 auto-fixed correctness issues; no production authority or topology-specific behavior was added.

## Issues Encountered

- macOS locked after the Docker interruption/reconciliation proof. Docker-specific close/reopen was not repeated; the same fresh-panel status-only recovery contract was already observed against the host-native fixture. The evidence preserves this distinction (`recreated` for host, `open` for Docker) for verifier review.

## User Setup Required

None. All qualification credentials and runtimes were disposable; a product user still supplies their own Hermes Gateway URL and bearer token.

## Verification

- Focused Phase 3 suites: 29/29 passed.
- `npm run build`: passed.
- `npm run validate`: passed with complete native recovery evidence required.
- `docker compose -f fixtures/simulations/docker-compose.yml config --quiet`: passed.
- `git diff --check`: passed.

## Next Phase Readiness

- Phase 3 is ready for goal-backward verification.
- The next product milestone can build per-project board mappings, board management, richer task cards, Gateway health, and scheduled-job controls on the now-proven remote Gateway contract.

---
*Phase: 03-open-panel-recovery-proof*
*Completed: 2026-08-18*
