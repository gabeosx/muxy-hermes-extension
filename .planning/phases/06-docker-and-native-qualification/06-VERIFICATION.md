---
phase: 06-docker-and-native-qualification
verified: 2026-08-20T20:45:00Z
status: passed
score: 5/5
behavior_unverified: 0
overrides_applied: 0
scope_revision: "Muxy SSH workspaces explicitly unsupported in 0.1.0"
---

# Phase 6: Docker and Native Qualification Verification

**Phase Goal:** Real local/Docker, operator-owned SSH-forward, and trusted HTTPS paths repeatedly satisfy the frozen behavioral and safety claims with no fixture residue, while unsupported Muxy SSH workspaces fail safely.

## Goal Achievement

| # | Observable truth | Status | Evidence |
|---|---|---|---|
| 1 | The digest-pinned disposable lab uses task-local protected credentials for Hermes, deterministic model behavior, actual SSH forwarding, and a short-lived HTTPS/WebSocket tunnel. | Verified | Compose, qualification tests, and sanitized receipts. |
| 2 | Actual `ssh -L` and trusted HTTPS/WebSocket complete the frozen authentication, reconnect, agent-control, operations, schedules, and board flows. | Verified | Real lab categories, host-WebKit evidence, and behavioral tests. |
| 3 | Invalid password, expiry, permission denial, missing optional plugin, malformed response, interrupted connection, approval, guidance, stop, and cancellation fail safely. | Verified | Dashboard, gateway, operations, Kanban, relay, and qualification control-flow tests. |
| 4 | Native UI passes the supported local-workspace theme, scale, pane, focus, accessibility, and reduced-motion matrix. | Verified | Real Muxy screenshots and 24/24 UI review. |
| 5 | Cleanup leaves no owned resource or secret; Muxy SSH workspaces are explicitly unsupported rather than falsely claimed compatible. | Verified | Cleanup receipts/tests, shipped unsupported guidance, next-release `OPEN_ISSUES.md` entry, and opt-in non-attesting native reproducer. |

## Requirements

| Requirement | Status | Evidence |
|---|---|---|
| QUAL-01–QUAL-05 | Satisfied | Pinned lab, protected secrets, Compose topology, actual SSH forward, and host-WebKit HTTPS qualification. |
| QUAL-06 | Satisfied | Revised contract explicitly excludes Muxy SSH workspaces from `0.1.0`; both surfaces fail safely and the diagnostic remains non-release evidence. |
| QUAL-07–QUAL-10 | Satisfied | Supported behavioral matrix, 24/24 native UI review, and secret/path exclusion checks. |
| QUAL-11 | Satisfied | Cleanup proofs report no owned containers, networks, volumes, processes, listeners, keys, secrets, active marker, or task root. |

## Scope Decision

The failed Muxy 1.5.0 `posix_spawn("/usr/bin/ssh")` result remains valid historical evidence in `06-NATIVE-QUALIFICATION.md`; it was not reclassified as a pass. The `0.1.0` contract now says that topology is unsupported and directs users to a local Muxy workspace with an operator-owned `ssh -L` forward or trusted HTTPS. Restoring SSH-workspace support is a next-release issue whose acceptance criteria require the complete native matrix.

## Verification Gates

- Full stable-tree suite passes twice without retries.
- Development Node and Node 20 deterministic validators produce an identical clean-copy digest with zero high/critical findings.
- Security audit: 12/12 threats closed.
- UI audit: 24/24.
- Code review: no extension-owned warning.

**Verdict:** Phase 6 passes the revised, explicitly narrower `0.1.0` support contract.
