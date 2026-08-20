---
phase: 03-open-panel-recovery-proof
plan: 05
subsystem: testing
tags: [hermes, recovery, docker, tls, cors, simulation, evidence]
requires:
  - phase: 03-04
    provides: receipt-backed recovery evidence projection and disposable native-fixture seams
provides:
  - Executable common-client interruption/restoration and workspace no-path analogues
  - Isolated Docker TLS reverse-proxy matrix with normal certificate validation
  - Cleanup-backed, forced-Unverified simulation evidence rows
affects: [phase-03-verification, remote-deployment-support]
actuals:
  tokens: 11918
  tasks: 2
  commits: 4
tech-stack:
  added: [Node built-in HTTPS relay, Python standard-library TLS proxy, OpenSSL task-owned CA]
  patterns: [digest-only simulation receipts, fixed-route loopback Docker fixtures, forced-Unverified evidence projection]
key-files:
  created:
    - fixtures/simulations/tls-reverse-proxy.py
  modified:
    - scripts/qualify-simulations.mjs
    - fixtures/simulations/docker-compose.yml
    - public/evidence/recovery-v1.json
    - test/simulated-relay.test.js
key-decisions:
  - "Run all topology analogues through test-only relays around the existing RunClient and RunController; production transport remains topology-neutral."
  - "Trust the generated CA explicitly rather than disabling certificate verification, and keep all key/certificate paths outside receipts and public evidence."
  - "Project only cleanup-complete structural signatures and forcibly retain actual:false, nativePanel:false, and Unverified for every analogue."
patterns-established:
  - "Simulation receipts contain digests and structural signatures only; raw tokens, URLs, run IDs, paths, event content, and certificate material remain transient."
  - "Concurrent Docker fixture runs receive unique Compose project names, loopback ports, runtime roots, certificate roots, and bearer tokens."
requirements-completed: [RECV-04, RECV-05, DEPL-04, DEPL-05, DEPL-06, EVID-01]
coverage:
  - id: D1
    description: "SSH-forward interruption/restoration and remote-workspace no-path analogues execute through the common run client."
    requirement: DEPL-04
    verification:
      - kind: integration
        ref: "test/simulated-relay.test.js#SSH-forward analogue executes an interruption and restored observer through the common controller"
        status: pass
      - kind: integration
        ref: "test/simulated-relay.test.js#remote-workspace analogue keeps its sentinel out of common-client traffic and durable projection"
        status: pass
    human_judgment: false
  - id: D2
    description: "Disposable Docker HTTPS proxy proves normal certificate validation, auth, exact CORS, buffering, concurrency isolation, and cleanup."
    requirement: DEPL-05
    verification:
      - kind: integration
        ref: "test/simulated-relay.test.js#HTTPS reverse-proxy simulation validates its CA, exact CORS, authentication, and buffering without a TLS bypass"
        status: pass
      - kind: integration
        ref: "test/simulated-relay.test.js#parallel HTTPS simulations use disjoint task-owned namespaces and remove every owned resource"
        status: pass
    human_judgment: false
  - id: D3
    description: "Public recovery rows display only receipt-backed structural simulation signatures and remain Unverified."
    requirement: EVID-01
    verification:
      - kind: unit
        ref: "test/recovery-evidence.test.js#remote analogues are always Unverified and renderer visibly names behavior signatures without topology claims"
        status: pass
    human_judgment: false
duration: 2h 5m
completed: 2026-08-18
status: complete
---

# Phase 03 Plan 05: Executable Remote-Analogue Simulations Summary

**Common-client recovery analogues and a disposable Docker TLS proxy now produce safe, cleanup-backed evidence while all simulated deployments remain explicitly Unverified.**

## Performance

- **Duration:** 2h 5m
- **Completed:** 2026-08-18
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Executed a refused endpoint, one-shot stream interruption, status-before-observer recovery, and restored observer through the real `RunClient`/`RunController` contract.
- Proved that an out-of-band workspace sentinel never reaches request traffic, simulation receipts, diagnostics, or public recovery evidence.
- Added a pinned, loopback-only Docker TLS proxy fixture that uses an ephemeral CA/server certificate, exact test-origin CORS, real bearer checks, and observable unbuffered versus delayed streaming.
- Ran two concurrent HTTPS matrices with disjoint resource namespaces and verified their task-owned ports, containers, certificates, and roots are removed.
- Projected safe signatures into the three analogue rows while retaining `actual: false`, `nativePanel: false`, and `Unverified`.

## Task Commits

1. **Task 1: Execute SSH-loss/restoration and remote-workspace no-path analogues through the common run client**
   - `3fe93dd` — failing TDD coverage
   - `f2b8544` — executable common-client simulation and declarative scenario contract
2. **Task 2: Execute an isolated Docker HTTPS reverse-proxy certificate, auth, CORS, and buffering matrix**
   - `d45fd80` — failing TDD coverage
   - `5f0a76b` — Docker TLS proxy, runner, receipt projection, and integration coverage

## Files Created/Modified

- `scripts/qualify-simulations.mjs` — test-only Node relay, common-client scenarios, TLS matrix, isolated resource lifecycle, and safe projection.
- `fixtures/simulations/tls-reverse-proxy.py` — fixed-route standard-library TLS proxy with exact-origin CORS and startup-selected buffering.
- `fixtures/simulations/docker-compose.yml` — loopback-published TLS proxy service using the existing digest-pinned Hermes image.
- `fixtures/simulations/recovery-scenarios.json` — exact support-ineligible scenario contracts and expected structural signatures.
- `public/evidence/recovery-v1.json` — cleanup-backed Unverified rows for SSH, HTTPS, and remote-workspace analogues.
- `test/simulated-relay.test.js` — executable recovery, sentinel, certificate, CORS, buffering, concurrency, and cleanup coverage.

## Decisions Made

- Kept simulations outside production source and made labels declarative only; the client does not detect or branch on Docker, SSH, TLS, or workspace topology.
- Used explicit CA trust with the default Node TLS checks; no verification-disable option or insecure curl flag exists.
- Delayed the proxy only at startup configuration and compared warmed first-chunk timings, separating cold Gateway startup from buffering behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Security] Restricted TLS proxy routes to exact Runs endpoints**

- **Found during:** Task 2
- **Issue:** An initial route predicate could accept arbitrary one-segment Runs subpaths.
- **Fix:** Restricted the proxy to capabilities, run submission, run status, and run events; query, traversal, and encoded paths are rejected.
- **Verification:** TLS matrix passes and the proxy source is covered by the Compose security assertion.
- **Committed in:** `5f0a76b`

**2. [Rule 1 - Correctness] Warmed the pinned Gateway before measuring buffering**

- **Found during:** Task 2
- **Issue:** Cold model startup could dominate the first timing sample and invert the intended buffering comparison.
- **Fix:** Added an untimed warm-up stream, then compared warmed unbuffered and buffered first chunks.
- **Verification:** Certificate/auth/CORS/buffering matrix passes against the disposable Docker fixture.
- **Committed in:** `5f0a76b`

**3. [Rule 2 - Evidence completeness] Added the safe refused/unreachable signature to the SSH analogue**

- **Found during:** Task 1
- **Issue:** Interruption/restoration alone did not make the required refusal behavior visible in published evidence.
- **Fix:** Exercised a bounded unused loopback port and projected `refused_or_unreachable` with the interruption/restoration signatures.
- **Verification:** Common-client simulation tests and public evidence redaction scan pass.
- **Committed in:** `5f0a76b`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 2)
**Impact on plan:** All were required for safe fixed-route behavior and complete, truthful structural evidence; no production authority or topology inference was added.

## Issues Encountered

- The Docker daemon was initially unavailable to the sandboxed process; the approved disposable-fixture run used the local daemon and confirmed deterministic cleanup.
- The complete test suite can outlive a short command-output window because it runs the two HTTPS matrices serially; each matrix was also run independently and left no `muxy-hermes-tls-*` Compose project behind.

## Known Stubs

None.

## Self-Check: PASSED

- All six plan artifacts and this summary exist on disk.
- TDD and implementation commits `3fe93dd`, `f2b8544`, `d45fd80`, and `5f0a76b` exist in Git history.

## Next Phase Readiness

- The three remote-deployment rows now have executable structural evidence, but remain support-ineligible by design.
- The host-native and Docker-native rows are intentionally still pending their human/native-panel receipts from Plan 03-04; this plan does not upgrade or replace them.

---
*Phase: 03-open-panel-recovery-proof*
*Completed: 2026-08-18*
