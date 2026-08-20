---
phase: 01-verified-gateway-connectivity
plan: 07
subsystem: transport
tags: [muxy, curl, sse, lifecycle, diagnostics, security]
requires:
  - phase: 01-06
    provides: evidence-bound panel relay foundation and validation boundary
provides:
  - awaited panel-to-curl stream cancellation with journal scrub/removal
  - observed-only transport diagnostics and safe recovery copy
  - canonical Phase 1 MVP user-story goal
affects: [phase-01-verification, gateway-connectivity, panel-lifecycle]
actuals:
  tokens: 6378.75
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [single execAsync SSE owner, awaited idempotent teardown, observation-derived diagnostics]
key-files:
  created: [test/transport-lifecycle.test.js, test/transport-diagnostics.test.js]
  modified: [src/curl-relay.js, src/gateway-client.js, src/probe.js, src/panel/app.js, test/curl-relay.test.js, .planning/ROADMAP.md]
key-decisions:
  - "Keep short JSON probes on muxy.exec and make the single long-lived SSE stream the only execAsync owner."
  - "Classify diagnostics only from curl exit classes, HTTP status, parser outcome, journal limit, or cancellation."
  - "Treat cancelled streams as terminal partial observations, never as network recovery."
patterns-established:
  - "Panel close awaits the same idempotent release promise used by pagehide fallback."
  - "Journal bytes remain content-bearing and are scrubbed before fixed-root directory removal."
requirements-completed: [CONN-02, CONN-05, SEC-01, SEC-02]
coverage:
  - id: D1
    description: Awaited active-stream cancellation and journal cleanup across relay, client, probe, and panel ownership.
    requirement: CONN-02
    verification:
      - kind: integration
        ref: test/transport-lifecycle.test.js#teardown cancels the sole active stream, drains it, and scrubs its journal before release
        status: pass
    human_judgment: false
  - id: D2
    description: Secret-safe observed curl, HTTP, journal, parser, and cancellation diagnostics.
    requirement: CONN-05
    verification:
      - kind: integration
        ref: test/transport-diagnostics.test.js#safe verdicts derive network and journal diagnoses only from observed relay classes
        status: pass
      - kind: integration
        ref: test/transport-diagnostics.test.js#stream HTTP status wins over parser sequence and cancellation is not a network failure
        status: pass
    human_judgment: false
  - id: D3
    description: Canonical Phase 1 MVP role, capability, and outcome contract.
    verification:
      - kind: other
        ref: node /Users/gabe/.codex/gsd-core/bin/gsd-tools.cjs query user-story.validate --pick valid
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 07: Relay Lifecycle and Diagnostic Truthfulness Summary

**Awaited single-owner curl SSE teardown with scrubbed journal cleanup and observed-only Gateway diagnostics.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-17T19:15:01Z
- **Completed:** 2026-08-17T19:20:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Routed orderly panel release through an idempotent async probe/client/relay teardown that cancels the active `execAsync` SSE handle and awaits cleanup.
- Kept stream bytes in the journal while separately capturing HTTP status, then rendered DNS, TLS, refusal, timeout, authentication, protocol, journal-limit, streaming, and relay diagnostics without raw transport data.
- Replaced the Phase 1 goal with its exact validated MVP user story without altering requirements or scope.

## Task Commits

1. **Task 1: Carry one real close signal through panel, probe, client, exec cancellation, and journal cleanup** — `4779cf5` (feat)
2. **Task 2: Classify stream status and observed curl failures without guessing** — `4aed7e8` (feat)
3. **Task 3: Repair the Phase 1 MVP goal contract without changing scope** — `c7493e7` (docs)

## Files Created/Modified

- `src/curl-relay.js` — owns one cancellable stream handle, captures its status marker, drains reads, and scrubs the bounded journal.
- `src/gateway-client.js` and `src/probe.js` — await relay teardown and map only observed failure outcomes to safe verdicts.
- `src/panel/app.js` — waits for lifecycle release before clearing the in-memory bearer and displays recovery copy per normalized class.
- `test/transport-lifecycle.test.js` and `test/transport-diagnostics.test.js` — verify ownership cleanup and diagnostic truth tables.
- `.planning/ROADMAP.md` — contains the validated Phase 1 MVP goal.

## Decisions Made

- Short capability requests remain on `muxy.exec`; only the long-lived SSE relay uses `muxy.execAsync`.
- Cancellation completes as a terminal, non-network result after cleanup, so no reconnect or missed-transcript promise is implied.
- HTTP status is authoritative before SSE parser-sequence evaluation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The relay now has an awaited close boundary and testable, secret-safe failure semantics. Actual Muxy consent/audit behavior and native-panel lifecycle delivery remain human-verification concerns for the phase-level qualification workflow.

## Self-Check: PASSED

- Confirmed all task commits exist: `4779cf5`, `4aed7e8`, and `c7493e7`.
- Confirmed the lifecycle and diagnostics test files exist and the full focused suite passes.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
