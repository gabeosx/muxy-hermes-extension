---
phase: 01-verified-gateway-connectivity
plan: 08
subsystem: transport-security
tags: [muxy, curl, relay, qualification, receipt, sha-256]
requires:
  - phase: 01-07
    provides: awaited curl relay completion, journal cleanup, and observed transport outcomes
provides:
  - reconciled relay-first contracts for downstream validation
  - one-use opaque verifier challenge receipts after a terminal cleaned relay session
  - digest-only qualification provenance with no credential, endpoint, journal, or content disclosure
affects: [phase-01-validation, qualification-verdicts, panel-lifecycle]
actuals:
  tokens: 14103.5
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: [exact challenge allowlist, per-panel random identity, fixed verifier-owned receipt path, digest-only transport provenance]
key-files:
  created: [test/qualification-receipt.test.js]
  modified: [.planning/phases/01-verified-gateway-connectivity/01-UI-SPEC.md, .planning/phases/01-verified-gateway-connectivity/01-VALIDATION.md, .planning/phases/01-verified-gateway-connectivity/COVERAGE.md, test/contract-reconciliation.test.js, src/gateway-client.js, src/probe.js, src/panel/app.js]
key-decisions:
  - "Receipt generation is opt-in through a verifier-owned fixed challenge file and otherwise leaves production panel sessions without a receipt."
  - "Receipt correlation uses SHA-256 digests of relay observations, never raw execution, endpoint, journal, secret, or stream content."
  - "Only a 2xx authenticated terminal stream with awaited successful cleanup is support-eligible."
patterns-established:
  - "Internal relay observations can cross the client/probe boundary only to construct an allowlisted digest projection."
  - "Challenge parsing rejects every field outside its exact versioned schema before writing verifier evidence."
requirements-completed: [CONN-02, CONN-04, CONN-05, DEPL-01, SEC-01, SEC-02, EVID-01, EVID-02, EVID-03]
coverage:
  - id: D1
    description: Relay-first UI, validation, and API coverage contracts with CORS and direct-WebKit restricted to simulation or historical-negative evidence.
    requirement: CONN-02
    verification:
      - kind: integration
        ref: test/contract-reconciliation.test.js
        status: pass
    human_judgment: false
  - id: D2
    description: One-use verifier-bound panel receipt projected only after authenticated incremental streaming and journal cleanup.
    requirement: EVID-01
    verification:
      - kind: integration
        ref: test/qualification-receipt.test.js#a valid verifier challenge yields exactly one redacted receipt after a terminal cleaned relay session
        status: pass
      - kind: integration
        ref: npm run build && node --test test/qualification-receipt.test.js test/transport-lifecycle.test.js test/transport-diagnostics.test.js test/contract-reconciliation.test.js
        status: pass
    human_judgment: false
duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 08: Relay Contract Reconciliation and Safe Receipt Summary

**Relay-first validation contracts and one-use digest-only panel receipts that prove only a terminal cleaned qualification session.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-17T19:32:49Z
- **Completed:** 2026-08-17T19:36:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Reconciled the UI, validation, and API-coverage contracts around the consented curl relay while retaining direct WebKit only as historical negative evidence and CORS only as simulation evidence.
- Added an exact, expiring, one-use verifier challenge that binds a random panel identity and session ordinal before a fixed-root receipt may be written.
- Reduced completed relay observations to SHA-256 digests and allowlisted passed outcomes only after terminal streaming and journal cleanup settle.

## Task Commits

1. **Task 1: Reconcile every authoritative Phase 1 contract to the locked relay architecture** — `c6f8f30` (test), `1713202` (feat)
2. **Task 2: Carry one opaque verifier challenge through the actual relay into a safe panel-session receipt** — `2f8da06` (test), `a9afcf2` (feat)

## Files Created/Modified

- `.planning/phases/01-verified-gateway-connectivity/01-UI-SPEC.md`, `01-VALIDATION.md`, and `COVERAGE.md` — define the approved relay-first positive path and current JavaScript validation map.
- `test/contract-reconciliation.test.js` — keeps every authoritative contract aligned with that path.
- `src/gateway-client.js` — retains in-memory relay completion observations for the receipt projection boundary.
- `src/probe.js` — validates exact verifier challenges and writes the digest-only receipt after safe completion.
- `src/panel/app.js` — supplies only the panel's Muxy files bridge to the receipt path.
- `test/qualification-receipt.test.js` — covers successful, replayed, expired, malformed, mismatched, incomplete, cancelled, failed-status, parser, cleanup, and collision paths.

## Decisions Made

- Receipt creation is absent without a valid verifier-provided challenge; production panel flow cannot choose a fixture condition or invent a receipt.
- A receipt includes only fixed metadata, passed stage outcomes, and SHA-256 digests; it cannot disclose bearer material, endpoint identity, topology, raw transport data, workspace path, journal content, browser-origin claims, or errors.
- A non-2xx result, cancellation, parser-sequence failure, incomplete cleanup, malformed challenge, replay, ordinal mismatch, or receipt collision fails closed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 09-15 can consume the reconciled stage vocabulary and safe receipt objects without interpreting raw relay or browser-origin observations. Real Muxy consent/audit behavior remains a phase-level human verification concern.

## Self-Check: PASSED

- Confirmed all eight contract, receipt, source, panel, and test artifacts exist.
- Confirmed Task 1 and Task 2 commits exist: `c6f8f30`, `1713202`, `2f8da06`, and `a9afcf2`.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
