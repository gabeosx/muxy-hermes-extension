---
phase: 03-open-panel-recovery-proof
plan: 04
subsystem: recovery-qualification
tags: [muxy, hermes, docker, native-panel, recovery, receipts]
requires:
  - phase: 03-open-panel-recovery-proof
    provides: Receipt-backed recovery evidence projector and fail-closed provenance schema from Plan 03-03
provides:
  - Fresh pinned host-native recovery proof from two distinct native Muxy panel instances
  - Fresh Docker recovery proof from one native panel across interruption and observer restoration
  - Post-cleanup canonical evidence projection for the host and Docker deployment rows
affects: [03-06-aggregate-gate, phase-03-verification, recovery-evidence]
actuals:
  tokens: 12600
  tasks: 2
  commits: 8
tech-stack:
  added: []
  patterns: [challenge-bound native receipts, stable file-write consumption, cleanup-before-publication]
key-files:
  created: []
  modified:
    - scripts/qualify-real.mjs
    - scripts/run-recovery-fixture.mjs
    - scripts/project-recovery-observation.mjs
    - src/probe.js
    - src/recovery-receipt.js
    - src/run-controller.js
    - public/evidence/recovery-v1.json
key-decisions:
  - "Treat Muxy's file-list result as the authoritative collision check because missing-file read errors are not guaranteed to expose ENOENT."
  - "Emit recovery receipts only after terminal status and consume them only after two identical valid reads, preventing active-status and partial-write races."
  - "Give an interrupted observer one bounded retry only for the exact transient relay_request_failed handoff before failing closed to manual Refresh."
patterns-established:
  - "Native proof publication requires correlated challenge, panel, fixture, and cleanup digests; raw endpoints, tokens, run IDs, output, and paths never enter public evidence."
  - "A qualifier owns and removes every process, container, socket, port, verifier file, and runtime root before invoking the evidence projector."
requirements-completed: [RECV-03, RECV-04, RECV-05, DEPL-02, DEPL-03, EVID-01]
coverage:
  - id: D1
    description: "Pinned host-native Hermes recovery is proven through a fresh connection panel and a distinct recreated status-only panel."
    requirement: DEPL-02
    verification:
      - kind: manual_procedural
        ref: "native Muxy host qualification: Hermes 0.20.2 / 2026.8.16 at df4b65147d7ddd74dd449f9067aabbca5aef0ec7"
        status: pass
      - kind: integration
        ref: "test/host-fixture.test.js and test/recovery-provenance.test.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "Docker-published Hermes recovery is proven in one native panel across a cut stream, bounded restoration, terminal reconciliation, and refused endpoint."
    requirement: DEPL-03
    verification:
      - kind: manual_procedural
        ref: "native Muxy Docker qualification: same-panel interrupted/restored receipt"
        status: pass
      - kind: integration
        ref: "test/recovery-fixture.test.js and test/recovery-evidence.test.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "Host and Docker evidence is projected only after owned resources and verifier artifacts are absent."
    requirement: EVID-01
    verification:
      - kind: integration
        ref: "npm test (132/132) and npm run validate"
        status: pass
    human_judgment: false
duration: 5h 10m
completed: 2026-08-18
status: complete
---

# Phase 03 Plan 04: Native Host and Docker Recovery Qualification Summary

**Fresh native Muxy receipts now prove recreated-panel host recovery and same-panel Docker interruption/restoration, with both canonical rows published only after verified teardown.**

## Performance

- **Duration:** 5h 10m
- **Completed:** 2026-08-18
- **Tasks:** 2/2
- **Files modified:** 11

## Accomplishments

- Qualified pinned Hermes `0.20.2` / `2026.8.16`, revision `df4b65147d7ddd74dd449f9067aabbca5aef0ec7`, from the exact native origin `muxy-ext://muxy-hermes-extension`.
- Proved host-native recovery with two distinct actual Muxy panel identities: the recreated panel performed status-only recovery, reached terminal status, and did not reconstruct prior activity or approval detail.
- Proved Docker recovery in one actual Muxy panel: the first observer was interrupted, observation was restored, terminal status was reconciled, and a separately exercised unused port produced the safe `refused_or_unreachable` signature.
- Projected both rows as `Observed` with digest-only provenance after containers, processes, sockets, ports, runtime roots, verifier files, and journals were confirmed removed.
- Preserved truthful limitations: history confidence remains incomplete, status is authoritative, and the proof makes no lossless-replay or topology-detection claim.

## Task Commits

1. **Task 1: Host-native stream and recreated-panel recovery proof**
   - `e44a107` — receipt-backed host recovery qualifier
   - `cfcd6eb` — shared native panel receipt identity
   - `f58a553` — observed Muxy extension origin support
   - `cc7482a` — fixed verifier artifact reset
   - `2acfd55` — native receipt and transient relay-handoff reliability
2. **Task 2: Docker interruption, restoration, and unreachable-port proof**
   - `6506196` — Docker evidence receipt gate
   - `e2b0f5b` — disposable native Docker qualifier
   - `a17f403` — stable Docker qualification and canonical proof projection

## Files Created/Modified

- `scripts/qualify-real.mjs` — pinned host lifecycle, two-panel challenge sequence, and cleanup-gated projection.
- `scripts/run-recovery-fixture.mjs` — isolated Docker Gateway/model fixture, one-shot proxy interruption, stable receipt polling, safe structural diagnostics, and unconditional cleanup.
- `scripts/project-recovery-observation.mjs` — interruption-first request-outcome projection when refusal is also present.
- `src/probe.js` — Muxy-compatible receipt collision check and fixed redacted receipt schema.
- `src/recovery-receipt.js` — terminal-only, challenge-bound recovery receipt emission.
- `src/run-controller.js` — one bounded retry for the exact transient relay handoff seen during native recovery.
- `public/evidence/recovery-v1.json` — receipt-backed `Observed` host and Docker rows; all remote analogues remain `Unverified`.

## Decisions Made

- Used directory listing, rather than parsing platform-specific missing-file errors, to enforce one-shot receipt collision safety.
- Required two identical valid reads before consuming a verifier receipt because Muxy's write can be visible before the complete JSON payload is stable.
- Kept Docker's combined interruption and refusal evidence truthful by giving `observer_interrupted` precedence for `requestOutcome`, while retaining refusal as an independent signature.
- Limited the production recovery retry to one 250 ms attempt for the exact `relay_request_failed` handoff; every other status failure remains fail-closed and status-only manual Refresh remains the exit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] Muxy missing-file errors did not expose the expected ENOENT shape**

- **Found during:** Native receipt capture
- **Issue:** Reading a nonexistent verifier receipt failed with a platform message that the collision detector could not safely classify.
- **Fix:** Switched collision detection to an exact directory listing and removed receipt self-reads.
- **Verification:** Qualification and recovery provenance tests use the observed Muxy error form and prove no receipt overwrite.
- **Committed in:** `2acfd55`

**2. [Rule 1 - Correctness] Recovery receipts could be consumed at active status or during a partial file write**

- **Found during:** Docker native qualification
- **Issue:** The one-use challenge could be consumed before terminal status, and the harness could observe an incomplete JSON write.
- **Fix:** Restricted receipts to terminal status and required two stable valid reads before unlinking the verifier file.
- **Verification:** Terminal eligibility and partial-write regression tests pass.
- **Committed in:** `2acfd55`, `a17f403`

**3. [Rule 1 - Correctness] Native relay handoff produced one transient status transport failure**

- **Found during:** Same-panel Docker observer restoration
- **Issue:** The immediate status request could race relay journal teardown even though the Gateway remained healthy.
- **Fix:** Added one exact-error bounded retry before normal fail-closed handling.
- **Verification:** Dedicated controller regression and the final native Docker receipt both pass.
- **Committed in:** `2acfd55`

**4. [Rule 2 - Evidence completeness] Refusal signature masked Docker's primary interrupted request outcome**

- **Found during:** Strict canonical evidence validation
- **Issue:** A row containing both interruption and refusal projected `requestOutcome: refused`, failing the required interruption predicate.
- **Fix:** Made interruption the primary request outcome and retained refusal as a structural signature.
- **Verification:** Provenance projection regression and strict evidence validation pass.
- **Committed in:** `a17f403`

---

**Total deviations:** 4 auto-fixed (3 correctness, 1 evidence completeness)
**Impact on plan:** The fixes make native receipt capture deterministic and fail-closed without adding product authority, topology branching, or durable background ownership.

## Issues Encountered

- The native host and Docker flows required an unlocked macOS session because the proof depends on actual Muxy panel lifecycle and user-visible recovery state.
- Disposable loopback tests require permission to bind local ports; the same focused tests pass when run with that fixture authority.

## Verification

- Focused Plan 03-04 gate: **47/47 tests passed**.
- Full repository suite: **132/132 tests passed**.
- `npm run build`: passed; `dist/package.json` copied and validated.
- `npm run validate`: passed with `Phase 3 recovery proof validation passed.`
- Docker Compose configuration: passed.
- Cleanup: no qualification container, verifier file, owned process, or allocated port remained.

## User Setup Required

None - qualification used disposable local fixtures and an existing pinned Hermes runtime.

## Next Phase Readiness

- Plan 03-06 can now exercise the aggregate fail-closed gate against current native host/Docker receipts and executable remote analogues.
- Phase 3 is ready for goal-backward verification after the aggregate gate summary is written.

---
*Phase: 03-open-panel-recovery-proof*
*Completed: 2026-08-18*
