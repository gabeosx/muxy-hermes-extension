---
phase: 01-verified-gateway-connectivity
plan: 03
subsystem: validation-evidence
tags: [node-test, sha256, evidence, redaction, verdicts]
requires:
  - phase: 01-01
    provides: Safe probe observations and the JavaScript extension scaffold
provides:
  - Append-only, schema-versioned, redacted JSON/Markdown validation reports
  - Atomic five-condition evidence index and support-verdict classifier
affects: [01-04, 01-05, 01-06, validation-evidence]
actuals:
  tokens: 8805
  tasks: 2
  commits: 4
tech-stack:
  added: [Node built-in crypto, fs/promises, node:test]
  patterns: [allowlist evidence projection, canonical SHA-256 shape hashes, lock-protected index updates]
key-files:
  created: [src/evidence.js, src/verdict.js, scripts/run-validation.mjs, public/evidence/schema-v1.json, public/evidence/index.json, test/evidence.test.js, test/verdict.test.js]
  modified: []
key-decisions:
  - "Evidence accepts raw runner observations only ephemerally and persists an allowlisted projection with stable hashes."
  - "Only two fresh, exact-pair, real-path panel observations with exact origin and incremental SSE can produce Supported."
  - "No requirement ledger update was made: DEPL evidence is not complete until later real-fixture plans, and REQUIREMENTS.md was already user-modified."
patterns-established:
  - "Build Markdown and JSON reports from one validated evidence record to prevent presentation drift."
  - "Serialize index reads and writes under one lock so concurrent runners cannot lose history."
requirements-completed: []
coverage:
  - id: D1
    description: "Versioned evidence reports are allowlisted, redacted, paired, and atomically indexed."
    requirement: EVID-01
    verification:
      - kind: integration
        ref: "test/evidence.test.js#validation CLI writes classifier-backed reports without copying raw errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deployment verdicts require complete real-path evidence and preserve safe history across all five conditions."
    requirement: EVID-02
    verification:
      - kind: unit
        ref: "test/verdict.test.js#only two complete fresh real-path panel sessions on one pair can be Supported"
        status: pass
      - kind: unit
        ref: "test/verdict.test.js#a reproducible latest-pair required-stage failure overrides historical support"
        status: pass
    human_judgment: false
duration: 9min
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 03: Evidence and Verdict Engine Summary

**Append-only, SHA-256-sanitized Gateway validation evidence with a conservative five-condition support-verdict matrix.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-17T14:12:21Z
- **Completed:** 2026-08-17T14:21:02Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added a schema-v1 evidence boundary that derives safe JSON and Markdown reports from one allowlisted record, keeping raw endpoints, credentials, headers, paths, and streamed content ephemeral.
- Added paired report publication, lock-protected index updates, and a repository-owned validation command for successful, failed, and incomplete observations.
- Added a pure classifier and five-row index that reject simulations, partial probes, mixed version pairs, and missing incremental-SSE proof while retaining history and applying latest-pair failure precedence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert one ephemeral observation into paired redacted evidence** - `b95d928` (test), `eb32797` (feat)
2. **Task 2: Classify support from complete real-path evidence and preserve version history** - `ac05872` (test), `b1cf752` (feat)

## Files Created/Modified

- `src/evidence.js` - Allowlist projection, canonical hashing, record validation, paired publication, and index locking.
- `src/verdict.js` - Pure qualification classifier and history-preserving five-condition index projection.
- `scripts/run-validation.mjs` - Safe repository-owned ephemeral-observation to durable-evidence command.
- `public/evidence/schema-v1.json` - Machine-readable schema for durable evidence.
- `public/evidence/index.json` - Empty versioned index seed.
- `test/evidence.test.js` - Redaction, pairing, concurrency, and CLI tests.
- `test/verdict.test.js` - Exhaustive qualification and version-history truth-table tests.

## Decisions Made

- Used JavaScript `.js` modules rather than the stale `.ts` paths in the plan, matching the existing ESM scaffold.
- Treated the index as a lock-guarded derived view of complete report records so a concurrent runner cannot overwrite another runner’s history.
- Kept `Supported` fail-closed: only fresh panel sessions 1 and 2 for one resolved pair, with all stages, exact origin, and incremental SSE, can establish it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a pre-lock index read that could lose concurrent evidence history**
- **Found during:** Task 2 (classifier/index integration)
- **Issue:** The initial append helper read the index before acquiring the lock, allowing a concurrent writer to overwrite an entry.
- **Fix:** Moved read/merge/write into the same lock and made the CLI derive its index while holding that lock.
- **Files modified:** `src/evidence.js`, `scripts/run-validation.mjs`, `test/evidence.test.js`
- **Verification:** `node --test test/evidence.test.js test/verdict.test.js`
- **Committed in:** `b1cf752`

**2. [Rule 2 - Missing Critical] Added direct CLI redaction and concurrent-index coverage**
- **Found during:** Task 2 (classifier/index integration)
- **Issue:** The initial unit coverage exercised helpers but not the repository-owned command responsible for the durable boundary.
- **Fix:** Added two concurrent CLI runs plus an invalid raw-token input assertion that permits only a safe reason code in stderr.
- **Files modified:** `test/evidence.test.js`
- **Verification:** `npm run build && node --test test/evidence.test.js test/verdict.test.js`
- **Committed in:** `b1cf752`

**3. [Rule 2 - Plan Conformance] Adapted stale TypeScript artifact paths to the existing JavaScript scaffold**
- **Found during:** Task 1
- **Issue:** The plan names `.ts` files but the established source, test, and ESM package conventions are `.js`.
- **Fix:** Created equivalent `.js` artifacts without changing the requested evidence/verdict interfaces or behavior.
- **Files modified:** `src/evidence.js`, `src/verdict.js`, `test/evidence.test.js`, `test/verdict.test.js`
- **Verification:** `npm run build && node --test test/evidence.test.js test/verdict.test.js`
- **Committed in:** `eb32797`, `b1cf752`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing-critical/plan-conformance)
**Impact on plan:** All changes enforce the intended fail-closed evidence boundary; no panel, Muxy, Hermes, bridge, provider, or agent-registration behavior was added.

## Issues Encountered

- The plan referenced `01-COVERAGE.md`; the available phase artifact is `COVERAGE.md`. The validation contract was read from that existing file.
- `REQUIREMENTS.md`, `WINDOWS.md`, and `config.json` were already dirty and were intentionally left unstaged. Requirement progress is not advanced here because real fixture plans still own the cited deployment qualifications.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 01-04 and 01-05 can submit real and simulated fixture observations through `scripts/run-validation.mjs` without exposing sensitive transport data.
- Only actual Muxy controlled-fixture observations can change the currently empty matrix from `Unverified`; simulations remain fail-closed.

## Self-Check

PASSED - all seven plan-owned artifacts exist and all four Task 1/Task 2 TDD commits are present in Git history.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
