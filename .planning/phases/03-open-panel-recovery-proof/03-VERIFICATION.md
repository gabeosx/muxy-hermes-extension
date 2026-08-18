---
phase: 03-open-panel-recovery-proof
verified: 2026-08-18T12:11:16Z
status: gaps_found
score: 4/10 must-haves verified
behavior_unverified: 5
overrides_applied: 0
gaps:
  - truth: "The Phase 3 MVP goal is a valid User Story that can be verified under MVP mode."
    status: failed
    reason: "ROADMAP.md declares mode: mvp, but gsd-tools user-story.validate returned false for the phase goal. The MVP verification contract therefore cannot issue a valid user-flow verdict."
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "Phase goal is descriptive rather than `As a ..., I want to ..., so that ...`."
    missing:
      - "Set a valid Phase 3 User Story through /gsd mvp-phase 3 before re-verification."
  - truth: "User can inspect validation evidence that distinguishes tunnel loss, Gateway loss, proxy buffering, and panel recreation by observed behavior without topology claims."
    status: failed
    reason: "The rendered recovery document has only host fresh-panel and Docker interruption rows; it names neither refusal/unreachable nor buffering. The named scenario file is used only by a unit test and is not loaded or rendered by the panel."
    artifacts:
      - path: "public/evidence/recovery-v1.json"
        issue: "Contains `fresh_panel_status_recovered`, `interrupted_status_reconciled`, and three `not_observed` rows, but no refusal/unreachable or buffering observation."
      - path: "fixtures/simulations/recovery-scenarios.json"
        issue: "Scenario labels have no production/evidence-renderer consumer."
      - path: "src/panel/app.js"
        issue: "Loads only /evidence/recovery-v1.json and renders its five rows."
    missing:
      - "Record and render safe observed-behavior signatures for refusal/unreachable, interruption/restoration, buffering, and panel recreation without assigning topology."
      - "Ensure the Docker evidence documents the required unreachable-port condition as well as the interrupted stream."
  - truth: "Recovery evidence is evidence-backed: disposable proxy and host qualification observations are projected into the inspected versioned document through an allowlisted writer."
    status: failed
    reason: "Neither qualification script references or writes public/evidence/recovery-v1.json. The proxy only returns an in-memory observation and prints it on shutdown; the qualifier writes only transient runtime/origin files. The public record is static and has no code-level provenance link."
    artifacts:
      - path: "scripts/run-recovery-fixture.mjs"
        issue: "No recovery-v1.json writer or safe projection exists."
      - path: "scripts/qualify-real.mjs"
        issue: "No recovery-v1.json writer or safe projection exists."
      - path: "public/evidence/recovery-v1.json"
        issue: "Static claimed observations are not produced by either fixture path."
    missing:
      - "Implement one allowlisted projection/receipt path from host and Docker observations to the versioned evidence document and add a linkage regression test."
  - truth: "Simulated SSH forwarding, direct HTTPS/proxy, and remote-workspace conditions exercise the stated client behaviors while remaining Unverified."
    status: failed
    reason: "The simulation files are metadata only. No SSH-loss/restoration fixture, HTTPS/reverse-proxy certificate/auth/CORS/unbuffered-stream fixture, or remote-workspace transport simulation exists; test/simulated-relay.test.js only asserts labels and forced-Unverified policy."
    artifacts:
      - path: "fixtures/simulations/scenarios.json"
        issue: "Declares faultCases but does not execute them."
      - path: "fixtures/simulations/docker-compose.yml"
        issue: "Contains only model-stub and HTTP Gateway services; no SSH-forward or TLS/reverse-proxy service."
      - path: "test/simulated-relay.test.js"
        issue: "Builds an in-memory evidence record and checks policy, not client behavior under the named conditions."
    missing:
      - "Add executable, safe simulated scenarios for DEPL-04 through DEPL-06 and assert the common URL/token client behavior, no workspace-path transmission, and forced-Unverified verdicts."
behavior_unverified_items:
  - truth: "User can close and reopen the panel, re-enter a token and Run ID, and recover current status/final output without prior activity or approval replay."
    test: "In native Muxy, close the panel during a harmless active run, reopen it, re-enter the URL/token and displayed Run ID, and select Recover status."
    expected: "Current status/final output is shown; prior activity and approval detail remain absent; no event observer starts automatically."
    why_human: "The controller unit test exercises status-only recovery, but does not operate a recreated native panel."
  - truth: "A failed status request at every interruption boundary halts automatic observation and leaves only manual Refresh."
    test: "Induce a status GET failure after the initial stream, first reattach, and final reattach."
    expected: "Each case shows status_unavailable/disconnected, starts no later observer, and makes no terminal or reconciliation claim."
    why_human: "The only targeted test covers the initial interruption boundary; no regression exercises either reattach boundary."
  - truth: "Release or replacement invalidates delayed retries/results, clears the bearer, and prevents a second concurrent relay stream."
    test: "Trigger a pending retry delay, then close/recreate or replace the controller before it completes."
    expected: "No stale state is published, no replacement observer starts, and the bearer is cleared after teardown."
    why_human: "No Phase 3 controller test exercises release/generation invalidation."
  - truth: "Host-native and Docker rows describe facts actually observed through the final native Muxy panel."
    test: "Review the retained native-test receipt or rerun both disposable fixtures through the final built panel."
    expected: "Host records fresh-panel status-only recovery; Docker records same-panel interruption, second subscription, bounded warning, terminal reconciliation, and panelLifecycle: open unless Docker recreation is actually repeated."
    why_human: "Static fixture rows and unit tests validate shape, not that the claimed native interactions occurred."
  - truth: "Every task-owned fixture, proxy, container, network, temporary home, journal, and port was absent before cleanup was reported."
    test: "Inspect or rerun host and Docker teardown with an owned-resource manifest and post-cleanup absence checks."
    expected: "All created resources are scrubbed/removed and their ports are free before a cleanup-passed record is published."
    why_human: "Proxy and runtime cleanup code is tested, but the public record has no provenance link to the claimed real teardown."
---

# Phase 3: Open-Panel Recovery Proof Verification Report

**Phase Goal:** Users receive a truthful, evidence-backed account of interrupted runs while the panel is open or recreated.
**Verified:** 2026-08-18T12:11:16Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## MVP Mode Guard

Phase 3 is declared `mode: mvp`, but `gsd-tools query user-story.validate` returned `false` for the roadmap goal. Per MVP verification rules, a User Flow Coverage verdict cannot be issued until the goal is converted to a valid User Story. The technical audit below is supplied to make the concrete implementation and evidence gaps actionable.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Same-panel interruption provides bounded reattach attempts, authoritative status, and replay limits. | ✓ VERIFIED | `RunController.#streamSettled()` reconciles before each retry; a named controller test passed with exactly two retries and status-before-observe ordering. |
| 2 | Recreated-panel recovery uses fresh credentials and a manual Run ID for status/final output, with no implied event/approval replay. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `recover()` is status-only and the panel renders the required form/copy; no native recreated-panel interaction was exercised by this verification. |
| 3 | Inspectable evidence distinguishes loss/buffering/recreation behavior without topology inference. | ✗ FAILED | Published recovery evidence omits refusal/unreachable and buffering; the unrendered scenario JSON is only test metadata. |
| 4 | Event history limitations are clearly disclosed and no lossless replay is promised. | ✓ VERIFIED | `REPLAY_LIMIT_NOTICE`, recovery-state copy, sanitized renderer copy, and UI contract tests retain the limitation. |
| 5 | Status failure at every interruption boundary stops automatic recovery and leaves manual Refresh. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Shared `reconcile()` code supports it, but the targeted test covers only initial-stream failure—not either reattach boundary. |
| 6 | Release/replacement invalidates pending recovery and prevents concurrent streams. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Generation guards and bearer clearing are present in `run-controller.js`; no targeted release/generation test exists. |
| 7 | One strict versioned recovery fixture safely carries version/capability/event/control/recovery/cleanup metadata. | ✓ VERIFIED | `sanitizeRecoveryEvidence()` enforces exact keys and `npm run validate` passed its complete-schema/redaction checks. |
| 8 | Host-native and Docker fixtures were each exercised through final native Muxy panels. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The JSON rows claim `actual: true`/`nativePanel: true`, but neither runtime harness projects to that file; the claim needs native evidence or rerun confirmation. |
| 9 | Remote analogue rows cannot become Supported and contain no workspace path/raw transport content. | ✓ VERIFIED | Sanitizer forcibly resets remote rows to `Unverified`; unit tests and aggregate validation reject content-bearing fields. |
| 10 | Every created validation resource was cleaned before evidence said cleanup passed. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Cleanup implementations and active-stream proxy test pass, but static cleanup claims have no fixture-to-evidence provenance. |

**Score:** 4/10 truths verified (5 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/run-client.js` | Fixed event observer and status lookup | ✓ VERIFIED | Fixed `/v1/runs/{id}` and `/events` paths; each observer constructs a new parser. |
| `src/run-controller.js` | Bounded generation-guarded recovery | ⚠️ PARTIAL | Core loop is substantive/wired; release and retry-boundary failure transitions lack behavioral coverage. |
| `src/panel/app.js` | Recovery form/state/copy | ✓ VERIFIED | Wires `recover()`/`refresh()` and same-origin evidence loader into rendered panel state. |
| `src/recovery-evidence.js` | Strict safe recovery evidence loader/renderer | ✓ VERIFIED | Exact schema, remote forced-Unverified policy, safe text-node projection. |
| `public/evidence/recovery-v1.json` | Evidence-backed five-condition recovery record | ✗ HOLLOW | Parses and renders, but is static, has no fixture provenance, and lacks required loss/buffering signatures. |
| `scripts/run-recovery-fixture.mjs` | Disposable proxy and safe observation writer | ⚠️ PARTIAL | Loopback-only interruption proxy is substantive; it never writes/projections recovery evidence. |
| `scripts/qualify-real.mjs` | Host qualification and evidence projection | ⚠️ PARTIAL | Isolated runtime/cleanup harness is substantive; it never writes/projections recovery evidence. |
| `fixtures/simulations/recovery-scenarios.json` | Exercised observed-behavior scenarios | ✗ HOLLOW | Descriptive records are consumed only by a unit test. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/run-controller.js` | `src/run-client.js` | Status before fresh observer/backoff | ✓ WIRED | `#streamSettled()` calls `reconcile()`, waits, then calls `client.observe()`. |
| `src/panel/app.js` | `src/run-controller.js` | Manual Run ID status-only recovery | ✓ WIRED | `recoverRun()` invokes `runController.recover()`; `refreshRun()` invokes `refresh()`. |
| `src/run-controller.js` | `src/curl-relay.js` | Single-stream teardown/generation | ✓ WIRED | Controller calls client teardown before recovery/release; client delegates to active relay teardown. |
| `scripts/run-recovery-fixture.mjs` | `public/evidence/recovery-v1.json` | Allowlisted observation projection | ✗ NOT_WIRED | No reference to the JSON file or writer exists in the script. |
| `scripts/qualify-real.mjs` | `public/evidence/recovery-v1.json` | Host-native observation projection | ✗ NOT_WIRED | No reference to the JSON file or writer exists in the qualifier. |
| `src/panel/app.js` | `src/recovery-evidence.js` | Same-origin safe loading/rendering | ✓ WIRED | Imports both functions and loads only `/evidence/recovery-v1.json`. |
| `fixtures/simulations/recovery-scenarios.json` | `test/recovery-fixture.test.js` | Scenario policy | ⚠️ PARTIAL | Test verifies labels/policy only; it does not exercise the client under those scenarios. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `src/panel/app.js` | `recoveryEvidenceState.rows` | `loadRecoveryEvidence()` → `/evidence/recovery-v1.json` | Static committed JSON, not fixture output | ⚠️ STATIC |
| `scripts/run-recovery-fixture.mjs` | `proxy.observation()` | Live in-memory proxy counters | Never flows to inspected evidence | ✗ DISCONNECTED |
| `scripts/qualify-real.mjs` | Native host lifecycle data | Runtime stdout/transient files | Never flows to inspected evidence | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Bounded reattach, initial status failure, recreated status-only recovery | `node --test --test-name-pattern='an interrupted same-panel observer…|an unavailable status…|recreated-panel recover…' test/run-controller.test.js` | 3/3 passed | ✓ PASS |
| Complete recovery fixture schema/redaction | `node --test --test-name-pattern='committed recovery fixture…' test/recovery-evidence.test.js` | 1/1 passed | ✓ PASS |
| Proxy active-stream cleanup | `node --test --test-name-pattern='recovery proxy closes…' test/recovery-fixture.test.js` | Passed outside sandbox; sandbox cannot bind loopback | ✓ PASS |
| Aggregate validation | `npm run validate` | Passed outside sandbox | ✓ PASS |
| Compose syntax | `docker compose -f fixtures/simulations/docker-compose.yml config --quiet` | Passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED (no Phase 3 `scripts/*/tests/probe-*.sh` probe declared or present).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| RECV-01 | 03-01 | Bounded open-panel reconnect with backoff | ✓ SATISFIED | Exact-two-attempt controller test passed. |
| RECV-02 | 03-01 | Reconciled status after interruption | ? NEEDS HUMAN | Initial failure and normal sequence are tested; retry-boundary failure paths are not. |
| RECV-03 | 03-01 | Close/reopen guidance and recovery | ? NEEDS HUMAN | Status-only recovery is tested; native panel recreation remains an empirical claim. |
| RECV-04 | 03-02 | Distinguishable observed failure evidence, no topology detection | ✗ BLOCKED | Required signatures are absent from rendered/published evidence. |
| RECV-05 | 03-01, 03-02 | Permanent no-lossless-replay warning | ✓ SATISFIED | Runtime and evidence renderer retain explicit incomplete-history/approval-detail copy. |
| DEPL-02 | 03-02 | Host-native loopback native-panel proof | ? NEEDS HUMAN | Static row claims it, but cannot be traced to qualification output. |
| DEPL-03 | 03-02 | Docker relay plus unreachable/interrupted evidence | ✗ BLOCKED | Interrupted row exists, but no unreachable-port observation is recorded; native claim has no provenance. |
| DEPL-04 | 03-02 | Simulated SSH loss/restoration, forced Unverified | ✗ BLOCKED | Metadata exists only; no simulation exercises loss/restoration through the client. |
| DEPL-05 | 03-02 | HTTPS/proxy cert/auth/CORS/unbuffered simulation, forced Unverified | ✗ BLOCKED | No TLS/reverse-proxy fixture or executable scenario exists. |
| DEPL-06 | 03-02 | Remote-workspace simulation with no workspace path, forced Unverified | ✗ BLOCKED | No transport simulation exists; only string/sentinel policy tests. |
| EVID-01 | 03-02 | Inspectable versioned safe fixture | ✓ SATISFIED | Public v1 JSON and strict sanitizer provide the stated structural fields; provenance remains a separate goal-level blocker. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No unreferenced `TBD`, `FIXME`, or `XXX` markers in Phase 3 source/artifacts | ℹ️ Info | No debt-marker blocker found. |

### Human Verification Required After Gap Closure

1. **Native recreation recovery**

**Test:** Recreate the native panel during a harmless active run and use fresh credentials plus a manual Run ID.
**Expected:** Current status/final output returns without prior activity, approval detail, or automatic event attachment.
**Why human:** Unit tests do not exercise the native panel lifecycle.

2. **Retry-boundary and cancellation invariants**

**Test:** Fail each reconciliation boundary and close/replace the panel during the retry delay.
**Expected:** No later observer or stale state appears; manual Refresh remains the only recovery action on status failure.
**Why human:** Existing controller tests do not cover those paths.

3. **Empirical fixture claims and cleanup**

**Test:** Review retained receipts or rerun the host/Docker fixtures after a provenance writer is added.
**Expected:** The safe evidence record is generated only from observed native facts and post-cleanup absence checks.
**Why human:** Static JSON and code-level schema checks cannot establish historical native interaction.

### Gaps Summary

The recovery controller and user-facing limits are implemented, and the aggregate validator passes. The phase goal is nevertheless not achieved: its evidence is neither wired back to the fixture harnesses nor complete enough to distinguish the required observed signatures. The declared SSH, HTTPS/proxy, and remote-workspace simulations are policy metadata rather than executed conditions. Additionally, Phase 3’s MVP goal is not in the required User Story form, so a formal MVP user-flow verdict is currently invalid.

The Docker evidence accurately reports `panelLifecycle: open`; its missing Docker-specific close/reopen subcase is not itself treated as a phase-goal blocker because host-native evidence is the claimed fresh-panel proof. It must remain `open` unless that Docker interaction is actually repeated and recorded.

---

_Verified: 2026-08-18T12:11:16Z_
_Verifier: the agent (gsd-verifier)_
