---
phase: 01-verified-gateway-connectivity
plan: 06
subsystem: ui-validation
tags: [muxy, vite, evidence, security, validation]
requires:
  - phase: 01-04
    provides: real-path qualification evidence and relay fixture contracts
  - phase: 01-05
    provides: Docker and simulated deployment evidence records
provides:
  - Safe five-condition evidence matrix and redacted Muxy-change stop contract
  - Non-watch aggregate build, test, evidence, redaction, packaging, and authority validation
affects: [phase-01-verification, muxy-panel, evidence-contract]
actuals:
  tokens: 9292
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns:
    - Browser-safe evidence projection keeps Node-only evidence writers out of the panel bundle.
    - Aggregate validation reclassifies paired evidence reports and scans the constrained production authority surface.
key-files:
  created: [src/stop-gate.js, scripts/validate-phase.mjs, test/stop-gate.test.js, test/phase-boundary.test.js]
  modified: [src/panel/app.js, src/styles/global.css, public/evidence/index.json, package.json, test/ui-contract.test.js]
key-decisions:
  - "A reproducible fresh real-path origin or stream failure, or explicit change signal, activates a non-dismissible stop gate."
  - "SSH-forwarded, direct-HTTPS, and remote-workspace evidence is forced to Unverified at the panel projection boundary."
  - "The final validator uses deterministic file lists instead of a shell glob."
patterns-established:
  - "Safe UI assets: load only schema-bounded local evidence and render via text nodes."
  - "Scope stops: failure reporting and bridge contracts document needed work but declare implementationStatus: not_implemented."
requirements-completed: [CONN-05, DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06, SEC-01, SEC-02, SEC-04, SEC-05, EVID-01, EVID-02, EVID-03, EVID-04]
coverage:
  - id: D1
    description: Safe five-row deployment evidence matrix with simulated remote classes forced to Unverified.
    requirement: EVID-02
    verification:
      - kind: unit
        ref: test/stop-gate.test.js#the simulated remote classes remain Unverified even if a malformed index claims support
        status: pass
      - kind: other
        ref: npm run validate
        status: pass
    human_judgment: false
  - id: D2
    description: Non-dismissible Muxy-change stop contract with redacted report and no implementation action.
    requirement: EVID-04
    verification:
      - kind: unit
        ref: test/stop-gate.test.js#the stop gate activates only for reproducible real origin or stream failures
        status: pass
      - kind: unit
        ref: test/stop-gate.test.js#the bridge contract is a minimum redacted projection and declares no implementation
        status: pass
    human_judgment: false
  - id: D3
    description: Final panel evidence, focus, report-copy, and bridge-contract behavior in real Muxy.
    requirement: EVID-03
    verification:
      - kind: manual_procedural
        ref: .planning/phases/01-verified-gateway-connectivity/01-VALIDATION.md
        status: unknown
    human_judgment: true
    rationale: Muxy WebKit rendering, clipboard behavior, and focus movement require the actual host panel.
duration: 8m
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 06: Evidence Matrix and Scope Boundary Summary

**Safe five-row deployment evidence matrix with a fail-closed Muxy-change stop contract and one-command phase-boundary validation.**

## Performance

- **Duration:** 8m
- **Started:** 2026-08-17T17:52:27Z
- **Completed:** 2026-08-17T18:00:16Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Added browser-safe loading and rendering for the five canonical deployment evidence rows, with all simulated remote classes forcibly rendered `Unverified`.
- Added a non-dismissible, keyboard-focused stop alert with redacted report copying and a minimum bridge contract that explicitly says no implementation occurred.
- Added `npm run validate` to build, run all tests, validate dist/evidence pairs, exercise sentinel redaction, and enforce the locked authority boundary.

## Task Commits

1. **Task 1: Render the evidence matrix and fail closed at the Muxy-change boundary** — `0f11d93`, `8f2abc3`, `6bdf390` (TDD red/red/green)
2. **Task 2: Enforce the complete Phase 1 build, evidence, security, and scope boundary** — `7483f56` (feat)

## Files Created/Modified

- `src/stop-gate.js` — Browser-safe evidence validation, stop activation, redacted report, and minimum contract projections.
- `src/panel/app.js` — Local evidence index loading, live matrix UI, retry state, and stop-gate interactions.
- `scripts/validate-phase.mjs` — Aggregate non-watch phase validation.
- `test/stop-gate.test.js` and `test/phase-boundary.test.js` — Stop/simulation/authority regression coverage.
- `public/evidence/index.json` — Canonical empty five-row evidence matrix.

## Decisions Made

- Only two reproducible fresh real-path failures at the exact-origin or stream stage activate the transport stop; incomplete, unavailable, and simulated evidence stays unverified.
- The UI reads a static local build asset and projects only allowlisted fields, keeping the Node evidence module and raw records outside the browser bundle.
- Validation enumerates tests deterministically instead of relying on shell expansion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted stale TypeScript plan paths to the repository's JavaScript panel scaffold**
- **Found during:** Task 1
- **Fix:** Implemented the declared symbols in `src/stop-gate.js`, `src/panel/app.js`, and `src/styles/global.css`.
- **Verification:** `npm run build` and the task test suite passed.
- **Committed in:** `6bdf390`

**2. [Rule 1 - Bug] Replaced a child-process shell glob with a deterministic test-file list**
- **Found during:** Task 2
- **Issue:** Node rejected the shell-mediated test invocation in the aggregate validator.
- **Fix:** The validator now enumerates `test/*.js` before invoking Node's test runner.
- **Verification:** `npm run validate` passed.
- **Committed in:** `7483f56`

**Total deviations:** 2 auto-fixed (1 blocking compatibility issue, 1 validator bug).

## Known Stubs

None.

## Issues Encountered

- The sandbox cannot bind local fixture ports; the full aggregate gate was run with the scoped local-fixture permission and passed.

## User Setup Required

None - no external configuration was changed.

## Next Phase Readiness

- Automated validation passes and all five evidence rows are safely rendered.
- Real Muxy verification of the panel matrix, focus behavior, clipboard action, and bridge-contract action remains open in `.planning/WINDOWS.md` entry 3.

## Self-Check: PASSED

- Verified all declared implementation and test files exist.
- Verified all four task commits exist in Git history.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
