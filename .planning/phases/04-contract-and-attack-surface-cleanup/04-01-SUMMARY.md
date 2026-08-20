---
phase: 04-contract-and-attack-surface-cleanup
plan: 01
subsystem: security
tags: [muxy, hermes, dashboard-session, websocket, marketplace]
requires:
  - phase: v1.0
    provides: development extension and native Hermes control surfaces
provides:
  - Password-authenticated Dashboard session and one-use WebSocket ticket contract
  - Least-privilege hermes-agent marketplace manifest and release documentation
  - Production import graph without historical bearer or SSE product paths
affects: [release-validation, qualification, marketplace-submission]
actuals:
  tokens: 0
  tasks: 5
  commits: 1
tech-stack:
  added: []
  patterns: [stdin-only secret relay, allowlisted Dashboard cookies, source-owned static SVG]
key-files:
  created: [README.md]
  modified: [package.json, src/curl-relay.js, src/dashboard-auth.js, src/panel/app.js, src/board/app.js]
key-decisions:
  - "Freeze the beta on password providers and show OAuth/OIDC-only providers as unsupported."
  - "Persist only allowlisted Dashboard cookies; passwords and one-use tickets remain transient."
  - "Remove unreachable legacy Gateway product code only after import reachability proves it is unused."
patterns-established:
  - "External command secrets enter curl through stdin, never argv, URL, environment, or diagnostics."
requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09, CONT-10]
coverage:
  - id: D1
    description: "The marketplace product uses only the password-session and one-use WebSocket-ticket contract."
    requirement: CONT-04
    verification:
      - kind: integration
        ref: "test/dashboard-auth.test.js and test/dashboard-gateway.test.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "The production graph, permissions, documentation, and secret boundaries match the frozen release contract."
    requirement: CONT-09
    verification:
      - kind: unit
        ref: "test/release-validator.test.js and test/ui-contract.test.js"
        status: pass
    human_judgment: false
duration: 1d
completed: 2026-08-20
status: complete
---

# Phase 4 Plan 01: Contract and Attack-Surface Cleanup Summary

**The extension now ships as `hermes-agent` with a password-only Dashboard session contract, one-use WebSocket tickets, least privilege, and no reachable bearer/SSE legacy surface.**

## Accomplishments

- Replaced the stale Gateway contract with provider discovery, allowlisted rotating cookies, session verification, and fresh tickets on every WebSocket connection.
- Reduced the curl relay and DOM helpers to production-used behavior and removed unreachable historical product code.
- Added marketplace metadata, support/security/privacy documentation, troubleshooting, compatibility policy, and uninstall behavior.

## Verification

- Current behavioral, contract, UI, and release-surface tests pass.
- Production import reachability and the distribution allowlist exclude historical evidence and legacy Gateway modules.

## Threat Flags

- Password/session disclosure at the command boundary: mitigated by argv-form curl plus stdin-only request configuration and bounded error classification.
- Ambient cookie authority: mitigated by an exact Hermes session-cookie allowlist and extension-isolated storage.
- Dynamic markup injection: mitigated by removing dynamic HTML support and retaining source-owned SVG only.

## Issues Encountered

None remaining within this phase's contract scope.

## Next Phase Readiness

Ready for deterministic release validation.

---
*Phase: 04-contract-and-attack-surface-cleanup*
*Completed: 2026-08-20*
