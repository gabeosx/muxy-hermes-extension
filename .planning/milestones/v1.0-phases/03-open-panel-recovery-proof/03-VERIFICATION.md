---
phase: 03-open-panel-recovery-proof
verified: 2026-08-19T01:34:08Z
status: passed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/10
  gaps_closed:
    - "The Phase 3 MVP goal is a valid User Story that can be verified under MVP mode."
    - "Inspectable evidence distinguishes loss, buffering, recreation, and refusal behavior without topology claims."
    - "Disposable native observations are projected through a safe receipt-to-evidence path."
    - "SSH forwarding, HTTPS/proxy, and remote-workspace analogues execute while remaining Unverified."
  gaps_remaining: []
  regressions: []
---

# Phase 3: Open-Panel Recovery Proof Verification Report

**Phase Goal:** As a Hermes user, I want to recover interrupted runs, so that I can trust status without assuming complete history.
**Verified:** 2026-08-19T01:34:08Z
**Status:** passed
**Re-verification:** Yes — after gap closure

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Open recovery | A reopened panel asks for fresh credentials and a manually supplied Run ID. | `src/panel/app.js:350-364` renders the recovery form and explicitly says it fetches current status only; UI-contract coverage verifies the fresh-credential/manual-ID contract. | ✓ VERIFIED |
| Recover status | Recovery clears prior live/approval detail, reconciles Gateway status, and does not attach a new event observer automatically. | `RunController.recover()` tears down the prior client and calls detached `reconcile()` at `src/run-controller.js:87-99`; recreated-panel controller coverage passes. | ✓ VERIFIED |
| Survive interruption | An open panel reconciles status before each of exactly two bounded observer retries; a non-transient status failure stops automatic recovery. | `src/run-controller.js:175-193`; the named boundary matrix passed all initial/first-retry/final-exhaustion cases. | ✓ VERIFIED |
| Inspect limits | The panel visibly says that status is authoritative while event history and approval detail are incomplete/unavailable. | `src/panel/app.js:367-374,498-510`; renderer contract test passed. | ✓ VERIFIED |
| Trust the outcome | Published evidence distinguishes the observed conditions without classifying topology, and simulation rows remain Unverified. | Receipt-backed host/Docker rows plus forced-Unverified simulation rows in `public/evidence/recovery-v1.json`; strict sanitizer and aggregate gate accept only that form. | ✓ VERIFIED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Same-panel interruption yields status-before-observer recovery with exactly two bounded reattach attempts and no lossless-replay claim. | ✓ VERIFIED | `#streamSettled()` performs reconciliation, delay, then a fresh observer (`src/run-controller.js:175-193`); bounded-retry coverage and aggregate suite passed. |
| 2 | A recreated panel accepts fresh credentials and a manual Run ID, then returns current status/final output without replaying earlier live or approval detail. | ✓ VERIFIED | Status-only `recover()` clears transient detail (`src/run-controller.js:87-99`); a fresh-panel native receipt is required before the host row can be projected (`scripts/qualify-real.mjs:644-678`). |
| 3 | Evidence visibly distinguishes refusal/unreachable, interruption/restoration, buffering/delay, and panel recreation without inferring topology. | ✓ VERIFIED | Canonical conditions contain all five structural signatures; `renderRecoveryEvidence()` maps only controlled signature labels to text (`src/recovery-evidence.js:123-131`). |
| 4 | Event-history limits are always disclosed; neither the recovery flow nor evidence promises lossless replay. | ✓ VERIFIED | Required copy appears in recovery state and evidence footer (`src/panel/app.js:360,367-374,509`). |
| 5 | Status failure at each interruption boundary stops automatic observation and leaves manual Refresh as the only recovery action. | ✓ VERIFIED | Focused test passed all three deterministic subtests: initial reconciliation, first reattach, and final exhaustion (`test/run-controller.test.js:226-288`). |
| 6 | Release/replacement invalidates delayed work, clears the bearer, publishes no stale state, and never overlaps relay ownership. | ✓ VERIFIED | Generation and bearer invalidation precede teardown (`src/run-controller.js:164-169`); all three pending-boundary/replacement subtests passed (`test/run-controller.test.js:290+`). |
| 7 | One safe versioned fixture contains the tested Muxy/Hermes tuple, capability shape, representative frames, control/status metadata, recovery observations, and cleanup provenance. | ✓ VERIFIED | `recovery-v1.json` has schema v2, Muxy `1.5.0+945`, Hermes `0.20.2`, safe capability/event/control fields, and five condition rows; strict schema rejects unapproved fields (`src/recovery-evidence.js:86-112`). |
| 8 | Host-native and Docker fixtures were observed through native Muxy panels and published only after receipt validation and cleanup. | ✓ VERIFIED | Current rows are `actual:true`, `nativePanel:true`, `Observed`, `recovery_receipt_bundle`, and `scrubbed_removed`; both qualifier paths project only after final cleanup predicates. |
| 9 | SSH-forward, direct-HTTPS, and remote-workspace analogues exercise the common client but cannot be presented as real deployment support. | ✓ VERIFIED | Simulation runner imports the real `RunClient`/`RunController`, projects simulation receipts, and sanitizer/aggregate predicate force `actual:false`, `nativePanel:false`, and `Unverified`. |
| 10 | Cleanup claims require owned-resource absence checks rather than narration. | ✓ VERIFIED | Docker cleanup receipt requires compose/proxy/ports/runtime/verifier-file/refusal checks (`scripts/run-recovery-fixture.mjs:83-106`); host/Docker evidence includes digest-only cleanup provenance. |

**Score:** 10/10 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/run-controller.js` | Bounded, status-authoritative recovery state machine | ✓ VERIFIED | Generation guards, status-before-observe ordering, exact two-delay budget, explicit disconnected/manual-refresh outcomes, and behavioral matrix. |
| `src/panel/app.js` | Recovery form, limitation copy, safe evidence UI | ✓ VERIFIED | Wires `recover()`, `refresh()`, receipt-writer snapshots, and same-origin evidence into rendered DOM. |
| `src/recovery-receipt.js` | One-use native-panel receipt writer | ✓ VERIFIED | Accepts only an exact verifier challenge and eligible terminal recovery snapshot; emits digests only. |
| `src/recovery-evidence.js` | Strict evidence sanitizer and renderer | ✓ VERIFIED | Exact schema and safe-label renderer are used by both panel loader and aggregate validator. |
| `scripts/project-recovery-observation.mjs` | Atomic allowlisted receipt projection | ✓ VERIFIED | Builds a correlated receipt bundle, validates the full document, and atomically replaces one canonical condition. |
| `scripts/qualify-real.mjs` / `scripts/run-recovery-fixture.mjs` | Host and Docker native qualification | ✓ VERIFIED | Require receipts and cleanup, then project canonical rows only after successful teardown. |
| `scripts/qualify-simulations.mjs` / TLS proxy fixture | Executable safe remote analogues | ✓ VERIFIED | Uses existing client/controller against test-only relays; browser graph remains free of Docker/TLS authority. |
| `public/evidence/recovery-v1.json` | Canonical inspectable five-condition evidence | ✓ VERIFIED | Two observed receipt-backed rows; three forced-Unverified simulation rows. |
| `scripts/validate-phase.mjs` | Fail-closed aggregate proof gate | ✓ VERIFIED | Requires provenance, signatures, cleanup, redaction, build/tests/dist, and Compose configuration. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- |
| `src/run-controller.js` | `src/run-client.js` | Status reconciliation → delay → fresh observer | ✓ WIRED | `#streamSettled()` calls `reconcile()` before `client.observe()`; focused behavioral test confirms ordering. |
| `src/panel/app.js` | `src/run-controller.js` | Manual recovery/Refresh handlers | ✓ WIRED | Form invokes controller recovery; recovery/status UI reflects snapshots. |
| `src/panel/app.js` | `src/recovery-receipt.js` | Snapshot offered to verifier-only writer | ✓ WIRED | Panel constructs `RecoveryReceiptWriter` with a unique panel ID and supplies snapshots; writer is challenge-gated. |
| Native qualifiers | `scripts/project-recovery-observation.mjs` | Validated receipt bundle → canonical row | ✓ WIRED | Both host and Docker qualifiers import and call the projector only after cleanup. |
| Projector | `public/evidence/recovery-v1.json` | Atomic validated replacement | ✓ WIRED | Projector sanitizes input and replacement before `rename()` (`scripts/project-recovery-observation.mjs:113-135`). |
| `src/panel/app.js` | `src/recovery-evidence.js` | Same-origin loader → safe rendered rows | ✓ WIRED | Loads only `/evidence/recovery-v1.json`, sanitizes it, and renders text nodes. |
| Simulation runner | `src/run-client.js` / `src/run-controller.js` | Executable analogue relay | ✓ WIRED | Direct imports in test-only runner; no production transport branch is added. |
| Aggregate validator | all `test/*.js` | Dynamic test enumeration | ✓ WIRED | It includes `test/simulated-relay.test.js`; a literal-pattern helper missed this dynamic link, but `npm test`/`npm run validate` verify it. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| Recovery evidence panel | `recoveryEvidenceState.rows` | Same-origin evidence fetch → sanitizer → renderer | Current canonical record projected from validated receipt bundles, not hardcoded panel props | ✓ FLOWING |
| Native evidence rows | condition replacement | Native challenge → panel receipt → fixture/cleanup receipts → atomic projector | Digest-only receipt-backed host and Docker observations | ✓ FLOWING |
| Remote analogue rows | condition replacement | Executed common-client/TLS simulation → simulation receipt → projector | Structural simulation observations; deliberately not real deployment qualification | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Interruption-boundary failures and release invalidation | `node --test --test-name-pattern='status failures at every interruption boundary|release invalidates pending recovery' test/run-controller.test.js` | 8/8 subtests passed | ✓ PASS |
| Current canonical record and forced-Unverified simulations | `node --test --test-name-pattern='committed recovery fixture carries observed host and Docker receipts' test/recovery-evidence.test.js` | 1/1 passed | ✓ PASS |
| Fail-closed provenance/signature/cleanup/redaction mutations and rendered limitation copy | `node --test --test-name-pattern='aggregate recovery proof fails closed|recovery evidence renderer permanently shows' test/phase-boundary.test.js test/ui-contract.test.js` | 2/2 passed | ✓ PASS |
| Native receipt freshness and stable receipt polling | focused host/provenance/fixture tests | Fresh second-panel and stable-write checks passed | ✓ PASS |
| Executable SSH/HTTPS/workspace analogues | `test/simulated-relay.test.js` via final aggregate suite | Immediately preceding `npm test` (132/132) and `npm run validate` passed. This verifier's isolated rerun was blocked from binding `127.0.0.1` by sandbox `EPERM`, not by an assertion failure. | ✓ PASS (aggregate evidence) |
| Aggregate release gate | `npm run build && npm test && npm run validate && docker compose -f fixtures/simulations/docker-compose.yml config --quiet` | Passed immediately before verification: build, 132/132 tests, strict validation, and Compose configuration | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no Phase 3 `scripts/*/tests/probe-*.sh` probe is declared or present.

### Requirement Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| RECV-01 | 03-01, 03-06 | Bounded open-panel reconnect with backoff | ✓ SATISFIED | Two-attempt controller flow and deterministic boundary matrix. |
| RECV-02 | 03-01, 03-06 | Reconciled status after interruption | ✓ SATISFIED | Status-before-observer implementation; every status-failure boundary is covered fail-closed. |
| RECV-03 | 03-01, 03-04 | Close/reopen token re-entry and recovery | ✓ SATISFIED | Fresh-token/manual-ID UI and host native fresh-panel receipt/projection. |
| RECV-04 | 03-02, 03-05 | Distinguishable loss/buffering/recreation behavior without topology claims | ✓ SATISFIED | Renderer labels all required structural signatures; simulations are never topology-positive. |
| RECV-05 | 03-01, 03-06 | Permanent no-lossless-replay warning | ✓ SATISFIED | Recovery/evidence copy, sanitization, and UI regression. |
| DEPL-02 | 03-02, 03-04 | Host-native loopback proof | ✓ SATISFIED | Receipt-backed observed host row: pinned runtime, native panel, recreated lifecycle, terminal status, cleanup. |
| DEPL-03 | 03-02, 03-04 | Docker published-port proof plus fault behavior | ✓ SATISFIED | Receipt-backed observed Docker row: interruption, restored observer, terminal status, refusal/buffering signatures, cleanup. |
| DEPL-04 | 03-05 | Executed SSH-forward analogue, still Unverified | ✓ SATISFIED | Common-client interruption/restoration/refusal simulation receipt, forced-Unverified projection. |
| DEPL-05 | 03-05 | Executed HTTPS/proxy analogue, still Unverified | ✓ SATISFIED | CA validation, authentication, exact CORS, unbuffered/buffered behavior, isolation/cleanup assertions. |
| DEPL-06 | 03-05 | Executed remote-workspace analogue, still Unverified | ✓ SATISFIED | Common-client workspace-sentinel absence test and forced-Unverified row. |
| EVID-01 | 03-02–03-06 | Inspectable versioned safe fixture | ✓ SATISFIED | Schema v2 includes safe version/capability/event/control/recovery fields and receipt/cleanup provenance; aggregate gate rejects incomplete/unsafe variants. |

### Prohibition Checks

| Prohibition | Status | Evidence |
| --- | --- | --- |
| No deployment selector, topology inference, workspace-path coupling, or topology-specific production transport branch | ✓ VERIFIED | Production/panel boundary assertions reject these patterns; simulations remain outside the browser graph. |
| No bearer, URL, run ID, headers, raw event/output/error text, subprocess output, journal/workspace/filesystem path in durable evidence | ✓ VERIFIED | Exact sanitizer, digest-only receipts, high-entropy sentinel scan across evidence/dist, and aggregate validation. |
| No simulated observation presented as real qualification or positive support | ✓ VERIFIED | Sanitizer and aggregate predicate require every remote analogue to be `actual:false`, `nativePanel:false`, and `Unverified`; mutation test covers escalation. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- |
| — | — | No unreferenced `TBD`, `FIXME`, or `XXX` markers in Phase 3 source, fixture, evidence, or test artifacts | ℹ️ Info | No debt-marker blocker found. |
| — | — | Isolated sandbox cannot bind loopback sockets for Docker/TLS integration spot checks | ℹ️ Info | Environmental constraint only; it does not alter the successful immediately preceding external aggregate gate. |

### Gaps Summary

None. The prior evidence, wiring, behavioral-coverage, and MVP-format gaps are closed. The canonical record is safe and receipt-backed, native fixture claims are tied to explicit panel/cleanup predicates, and remote analogues remain intentionally Unverified.

_Verified: 2026-08-19T01:34:08Z_
_Verifier: the agent (gsd-verifier)_
