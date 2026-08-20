---
phase: 06-docker-and-native-qualification
plan: 01
subsystem: testing
tags: [docker, ssh, cloudflare-tunnel, muxy, native-qualification]
requires:
  - phase: 05-deterministic-release-validation
    provides: reproducible release gate and frozen build surface
provides:
  - Digest-pinned disposable Hermes, model, SSH, and Quick Tunnel lab
  - Real loopback, ssh-L, trusted HTTPS, and host-WebKit qualification evidence
  - Fail-closed native Muxy workspace gate and verified cleanup receipts
affects: [marketplace-submission]
actuals:
  tokens: 0
  tasks: 5
  commits: 0
tech-stack:
  added: [Docker Compose qualification lab]
  patterns: [task-owned mode-0700 secrets, digest-only receipts, SIGTERM-to-SIGKILL teardown]
key-files:
  created: [qualification/docker-compose.yml, qualification/model-stub.py, scripts/qualify-release.mjs, scripts/complete-native-qualification.mjs, test/qualification-lab.test.js]
  modified: [src/curl-relay.js, src/dashboard-agent.js, src/dashboard-auth.js, src/panel/app.js, package.json, .gitignore]
key-decisions:
  - "Default qualification emits passed_supported_beta_matrix only for the explicitly supported 0.1.0 topologies after cleanup proof."
  - "Self-authored native observations are non-attested and cannot satisfy the release gate."
  - "Block publication after real Muxy 1.5.0 remote exec fails to spawn /usr/bin/ssh."
patterns-established:
  - "Every task owns uniquely named infrastructure and proves its absence before retaining a receipt."
requirements-completed: [QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, QUAL-09, QUAL-10, QUAL-11]
coverage:
  - id: D1
    description: "Disposable Docker, actual ssh-L, trusted HTTPS/WebSocket, agent/control, operations, schedules, board, and cleanup mechanisms execute against pinned fixtures."
    requirement: QUAL-04
    verification:
      - kind: e2e
        ref: "sanitized qualification receipt a7c2ee1f6051"
        status: pass
    human_judgment: false
  - id: D2
    description: "Muxy SSH workspaces are explicitly unsupported in 0.1.0 and fail safely while the native reproducer remains available for later qualification."
    requirement: QUAL-06
    verification:
      - kind: manual_procedural
        ref: "06-NATIVE-QUALIFICATION.md"
        status: pass
    human_judgment: true
    rationale: "The scope decision excludes this broken Muxy 1.5.0 topology from 0.1.0 without claiming it works or weakening the transport boundary."
duration: 1d
completed: 2026-08-20
status: complete
---

# Phase 6 Plan 01: Docker and Native Qualification Summary

**The pinned disposable lab passed every supported `0.1.0` topology and cleanup invariant; the broken Muxy SSH-workspace path is explicitly unsupported and retained as a next-release issue.**

## Accomplishments

- Built and exercised pinned Hermes, deterministic model, actual SSH forwarding, and short-lived trusted HTTPS/WebSocket fixtures.
- Covered password/session/ticket/reconnect, agent/control, operations, schedules, board, negative-response, and teardown categories without retaining raw credentials.
- Captured three real Muxy listing screenshots and replaced the earlier synthetic assets.
- Made the supported beta qualification pass only after its real mechanisms and cleanup proof succeed; optional native observations remain non-release diagnostic evidence.

## Threat Flags

- Fixture secret persistence: mitigated by task-local mode-0700 roots, stdin-only credentials, digest-only receipts, and verified removal.
- Orphaned infrastructure/processes: mitigated by owned project names, bounded termination, Docker absence queries, closed-listener checks, and root removal.
- Untrusted native attestation: bounded by design; optional SSH-workspace observations remain explicitly non-attested and never prove support.
- Remote command diagnostics: raw Muxy errors are mapped into bounded `relay_*` categories before display.

## Issues Encountered

- Actual Muxy 1.5.0 (945) remote execution allowed the request but failed `posix_spawn("/usr/bin/ssh", ...)` with `ENOENT` even though `/usr/bin/ssh` exists; this is now an explicit non-blocking next-release issue outside the `0.1.0` support contract.

## Next Phase Readiness

Ready for marketplace submission of the narrower beta. The package must state that Muxy SSH workspaces are unsupported; restoring that support requires a valid Muxy build and a fresh full native qualification run.

---
*Phase: 06-docker-and-native-qualification*
*Completed: 2026-08-20 after support-contract revision*
