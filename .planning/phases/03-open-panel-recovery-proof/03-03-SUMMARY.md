---
phase: 03-open-panel-recovery-proof
plan: "03"
subsystem: recovery-evidence
tags: [muxy, hermes, recovery, provenance, evidence, security]
requires:
  - phase: 03-02
    provides: bounded open-panel recovery and the original five-row recovery evidence document
provides:
  - verifier-challenged, content-free panel recovery receipts
  - correlated receipt-bundle projection with atomic evidence replacement
  - strict signature/provenance schema and safe rendered behavior labels
affects: [03-04, 03-05, recovery-qualification, evidence-validation]
actuals:
  tokens: 15456
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: [one-use verifier receipts, digest-only correlated evidence projection, exact recovery evidence schema]
key-files:
  created: [src/recovery-receipt.js, scripts/project-recovery-observation.mjs, test/recovery-provenance.test.js]
  modified: [src/run-controller.js, src/panel/app.js, src/recovery-evidence.js, public/evidence/recovery-v1.json, test/recovery-evidence.test.js]
key-decisions:
  - "Recovery receipts are inert without a verifier-owned challenge and store only controlled enums and SHA-256 digests."
  - "Canonical recovery evidence is a receipt-ready Unverified template until later fixtures republish real rows through correlated cleanup receipts."
  - "Behavior signatures are rendered as safe labels without claiming a detected deployment topology."
patterns-established:
  - "Validate every evidence projection before and after atomic replacement; reject replayed bundles and unknown keys."
  - "Keep browser receipt handling separate from Node-only evidence projection I/O."
requirements-completed: [RECV-02, RECV-03, RECV-04, RECV-05, EVID-01]
coverage:
  - id: D1
    description: Verifier-challenged recovery receipt and correlated atomic bundle projection
    requirement: RECV-03
    verification:
      - kind: unit
        ref: test/recovery-provenance.test.js
        status: pass
    human_judgment: false
  - id: D2
    description: Safe signature/provenance schema and behavior-signature evidence rendering
    requirement: EVID-01
    verification:
      - kind: unit
        ref: test/recovery-evidence.test.js
        status: pass
      - kind: unit
        ref: test/ui-contract.test.js
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-08-18
status: complete
---

# Phase 03 Plan 03: Receipt-backed recovery evidence Summary

**One-use Muxy recovery receipts now project only correlated digest-backed recovery facts into safe, user-visible behavior signatures.**

## Accomplishments

- Added a fixed-path, verifier-challenge receipt writer that stores no bearer, URL, run ID, event/output content, headers, or filesystem paths.
- Added Node-only correlation, replay rejection, bounded locking, and same-directory atomic replacement for recovery evidence projection.
- Upgraded recovery evidence to a strict signature/provenance schema and renders readable interruption, restoration, buffering, refusal, and recreation labels without topology claims.

## Task Commits

1. **Task 1: Carry one challenged native recovery snapshot into a correlated safe receipt bundle**
   - `2a55c8f` — failing TDD coverage
   - `bc1e99f` — receipt writer, controller provenance, and projector
2. **Task 2: Publish and render receipt-backed recovery signatures through the exact evidence schema**
   - `bacb802` — failing TDD coverage
   - `cfbfd2c` — strict evidence schema, safe renderer, and receipt-ready template

## Verification

- `node --test test/recovery-provenance.test.js test/recovery-evidence.test.js test/ui-contract.test.js` — passed (15 tests)
- `npm run build` — passed
- `npm test` — passed (102 tests; rerun with loopback-fixture permission)
- `npm run validate` — intentionally fails with `recovery_evidence_invalid`: the canonical file is now an Unverified receipt-ready template. Plans 03-04 and 03-05 must republish real host/Docker rows through the new projector before the complete-document gate can pass.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Removed an invalid Node fs import from the new projector**
   - **Found during:** Task 1
   - **Fix:** Removed the unavailable `close` named import from `node:fs/promises`.
   - **Verification:** Recovery provenance tests and build passed.
   - **Committed in:** `bc1e99f`

2. **[Rule 1 - Bug] Made fixture receipt digests single-character SHA-256 fixtures**
   - **Found during:** Task 2
   - **Fix:** Corrected a test fixture that expanded a two-character seed beyond the exact 64-hex digest contract.
   - **Verification:** Recovery evidence tests passed.
   - **Committed in:** `cfbfd2c`

## Known Stubs

- `public/evidence/recovery-v1.json`: the host and Docker rows intentionally remain `Unverified` until Plans 03-04 and 03-05 generate real correlated receipts. This is the fail-closed publication state, not a support claim.

## Next Phase Readiness

Plans 03-04 and 03-05 can now use the receipt writer and projector to publish reproducible real/simulated observations. The full validation gate remains blocked until those receipts replace the canonical template rows.

## Self-Check: PASSED

- Required source, script, test, and evidence files exist.
- Task commits `2a55c8f`, `bc1e99f`, `bacb802`, and `cfbfd2c` exist.
