---
phase: 01-verified-gateway-connectivity
plan: 09
subsystem: evidence-validation
tags: [node, evidence, provenance, sse, cli-security]
requires:
  - phase: 01-08
    provides: verifier challenges plus redacted panel and relay receipts
provides:
  - Schema-v2 evidence records derived only from correlated verifier receipt bundles
  - A safe, support-ineligible failure/incomplete CLI publication adapter
  - Schema-v1 read compatibility without relay-era eligibility
affects: [01-10, verdict-classification, qualification-runners]
actuals:
  tokens: 8613
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: [strict receipt allowlists, append-only evidence handoff, ineligible failure adapter]
key-files:
  created: [public/evidence/schema-v2.json, test/evidence-provenance.test.js]
  modified: [src/evidence.js, scripts/run-validation.mjs, test/evidence.test.js]
key-decisions:
  - "Only buildVerifiedEvidenceRecord may create a schema-v2 support-eligible record."
  - "The generic CLI accepts only fixed failure/incomplete metadata and always emits supportEligible false."
  - "Schema-v1 artifacts remain readable historical evidence but expose no support eligibility marker."
patterns-established:
  - "Positive evidence requires strict, correlated receipt shapes with exact version, ordinal, digest, stream, and cleanup checks."
  - "Durable evidence output uses paired report files and an append-only locked index."
requirements-completed: [DEPL-01, DEPL-02, DEPL-03, SEC-01, SEC-02, EVID-01, EVID-02, EVID-03]
coverage:
  - id: D1
    description: Correlated verifier receipt bundles create the sole support-eligible schema-v2 evidence shape.
    requirement: EVID-02
    verification:
      - kind: unit
        ref: test/evidence-provenance.test.js#only one matching verifier receipt bundle creates a support-eligible schema-v2 record
        status: pass
      - kind: unit
        ref: test/evidence-provenance.test.js#receipt mismatches, unsafe fields, and replays fail before positive evidence can be built
        status: pass
    human_judgment: false
  - id: D2
    description: Generic validation publication is constrained to redacted, support-ineligible failure and incomplete records.
    requirement: SEC-02
    verification:
      - kind: integration
        ref: test/evidence-provenance.test.js#validation CLI rejects caller-authored positive claims and only publishes hard-coded ineligible attempts
        status: pass
      - kind: integration
        ref: test/evidence.test.js#validation CLI writes only support-ineligible reports without copying raw errors
        status: pass
    human_judgment: false
duration: 7m 42s
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 09: Verifier-Owned Evidence Summary

**Schema-v2 relay evidence now requires a correlated verifier receipt bundle, while the generic CLI can publish only redacted, support-ineligible attempts.**

## Performance

- **Duration:** 7m 42s
- **Started:** 2026-08-17T19:39:55Z
- **Completed:** 2026-08-17T19:47:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added receipt correlation, replay prevention, exact version/ordinal/digest validation, safe relay-frame projection, paired report writes, and append-only index handoff for schema-v2 evidence.
- Kept schema-v1 records readable as historical evidence without a relay support-eligibility marker.
- Replaced the caller-authored JSON CLI with an allowlisted failure/incomplete adapter that cannot choose a proof source, receipt, positive stage map, freshness, or stream metadata.

## Task Commits

1. **Task 1: Publish one correlated verifier receipt bundle as paired schema-versioned evidence** - `8dd0275` (test), `55bc00b` (feat)
2. **Task 2: Close the generic validation CLI's caller-authored positive path** - `205ba7a` (test), `0d61370` (feat)

## Files Created/Modified

- `src/evidence.js` - Verified/unverified builders, strict receipt validation, history compatibility, and append-only handoff.
- `public/evidence/schema-v2.json` - Machine-readable relay-stage evidence contract without a browser-origin success predicate.
- `scripts/run-validation.mjs` - Failure/incomplete-only CLI adapter.
- `test/evidence-provenance.test.js` - Correlation, replay, safe publication, historical compatibility, and CLI-bypass coverage.
- `test/evidence.test.js` - Updated legacy CLI coverage for the intentionally removed arbitrary-observation interface.

## Decisions Made

- Support eligibility is a fixed property of the verified builder; it is never caller input.
- Relay success is established through 2xx incremental terminal frames and scrubbed cleanup, not a browser-origin stage.
- Failure records retain paired publication and redaction but are structurally ineligible for support classification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated obsolete CLI coverage for the removed forgeable interface**
- **Found during:** Task 2
- **Issue:** `test/evidence.test.js` expected the old `--input` interface to turn caller-authored positive observations into classifier-backed reports.
- **Fix:** Replaced that assertion with failure-adapter and redaction checks.
- **Files modified:** `test/evidence.test.js`
- **Verification:** `npm run build && node --test test/evidence-provenance.test.js test/evidence.test.js test/qualification-receipt.test.js`
- **Committed in:** `0d61370`

**Total deviations:** 1 auto-fixed (1 blocking compatibility test update).
**Impact on plan:** Required to verify the secure replacement contract; no production scope expansion.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 10 can consume `buildVerifiedEvidenceRecord` as the sole positive-evidence handoff and treat `buildUnverifiedEvidenceRecord` output as permanently support-ineligible.

## Self-Check: PASSED

- Confirmed schema-v2, evidence source, CLI adapter, and provenance tests exist.
- Confirmed task commits `8dd0275`, `55bc00b`, `205ba7a`, and `0d61370` exist.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
