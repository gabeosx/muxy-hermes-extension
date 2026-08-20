---
phase: 03-open-panel-recovery-proof
plan: 01
subsystem: Hermes run recovery
tags: [sse, recovery, panel, security]
dependency_graph:
  requires: [phase-02-run-control]
  provides: [bounded-same-panel-recovery, status-only-recreated-panel-recovery]
  affects: [phase-03-evidence-validation]
tech_stack:
  added: []
  patterns: [generation-guarded-observer-loop, fixed-endpoint-status-reconciliation]
key_files:
  created: []
  modified: [src/run-client.js, src/run-controller.js, src/panel/app.js, src/styles/global.css, test/run-client.test.js, test/run-controller.test.js, test/ui-contract.test.js]
decisions:
  - "Same-panel SSE recovery makes exactly two reattach attempts, and reconciles Gateway status before each attempt."
  - "Panel recreation uses a fresh bearer plus a manually entered Run ID for status-only recovery; it never reconstructs prior activity or approval state."
metrics:
  duration: 24m
  completed: 2026-08-17
status: complete
actuals:
  tokens: 6710
  tasks: 2
  commits: 2
---

# Phase 03 Plan 01: Open-panel recovery core Summary

Bounded same-panel SSE recovery with authoritative status reconciliation, plus fresh-credential manual Run ID recovery after panel recreation.

## Completed Tasks

1. Added a fixed-run endpoint observer that creates a fresh event parser for every subscription, then implemented a generation-guarded controller loop with two reattach attempts, status-before-retry sequencing, unavailable-status handling, manual refresh, and status-only recovery.
2. Added native panel recovery states, selectable Run IDs, a manual recovery form, accessible live announcements, permanent replay-limit disclosure, and token-based styling.

## Verification

- `node --test test/run-client.test.js test/run-controller.test.js test/ui-contract.test.js` — passed (17 tests).
- `npm run build` — passed; `dist/package.json` was copied by the existing build step.
- `npm test && npm run validate` — passed (77 tests; Phase 1 transport/evidence and Phase 2 authority validation passed).

## Decisions Made

- Same-panel recovery is serialized and bounded to two reattach attempts after the initial observer; every observer settlement first asks the Gateway for authoritative run status.
- A failed status request publishes `status_unavailable` and `disconnected`; automatic observation stops and only manual status refresh remains.
- Recreated panels require a new connection token and manual Run ID. They recover current status/output only and explicitly do not claim event or approval replay.

## Deviations from Plan

None — plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED

- Recovery source, UI contract, and focused tests exist in the expected paths.
- Commits `439fcba` and `680bf1d` exist and contain the two completed tasks.
