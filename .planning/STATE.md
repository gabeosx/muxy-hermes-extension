---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Marketplace Beta Hardening
status: active
last_updated: "2026-08-21T17:18:12.000Z"
last_activity: 2026-08-21
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-18)

**Core value:** Give a user safe, authenticated Hermes control from Muxy across claimed deployments without topology-specific behavior or secret exposure.
**Current focus:** Phase 7 — Marketplace Submission

## Current Position

Phase: 7 of 7 — Marketplace Submission
Plan: Not started
Status: Ready — Phase 6 passed the revised `0.1.0` support matrix; Muxy SSH workspaces are explicitly unsupported and tracked for the next release
Last activity: 2026-08-21 — Completed quick task 260821-i95: corrected the approval screenshot caption to describe all four approval choices

## Performance Metrics

**Velocity:**

- Total plans completed: 6
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 15m | 3 tasks | 15 files |
| Phase 01 P02 | 183m | 2 tasks | 7 files |
| Phase 01 P03 | 9m | 2 tasks | 7 files |
| Phase 01 P04 | 1d | 2 tasks | 18 files |
| Phase 01-verified-gateway-connectivity P06 | 8m | 2 tasks | 9 files |
| Phase 01 P07 | 6min | 3 tasks | 8 files |
| Phase 01 P08 | 4min | 2 tasks | 8 files |
| Phase 01-verified-gateway-connectivity P09 | 7m 42s | 2 tasks | 5 files |
| Phase 02 P01 | 20m | 4 tasks | 9 files |
| Phase 03 P01 | 24m | 2 tasks | 7 files |
| Phase 03 P02 | 14h 23m | 3 tasks | 11 files |
| Phase 03 P03 | 8m | 2 tasks | 8 files |
| Phase 03 P05 | completed | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- [Phase 6]: Muxy SSH workspaces are unsupported in `0.1.0`; this known Muxy 1.5.0 remote-executor failure is tracked as a non-blocking next-release issue, while local/Docker, operator-owned SSH-forward, and trusted HTTPS remain the frozen beta matrix.

- [Phase 1]: Use one deployment-neutral URL/token client contract for host-native, Docker, SSH local-forward, direct HTTPS, and remote Muxy workspace evidence.
- [Phase 1]: Direct WebKit transport produced a negative result; v1 now uses one consented argv-form curl process per SSE stream and a bounded workspace journal.
- [Phase 1]: V1 is extension-only; Muxy agent/provider registration and all Muxy source changes remain deferred.
- [Phase 3]: Rich run ownership exists only while the panel and sole SSE subscriber remain attached; status/final output can be reconciled, but missed events and approval detail cannot.
- [Phase 01]: Plan 01-01 leaves real Muxy controlled-fixture streaming Not verified and qualification Unverified until Plan 01-04.
- [Phase 01]: Plan 01-01 ships a permissionless declarative panel with no background entry.
- [Phase 01]: Bearer material crosses only exec stdin and is forbidden in argv, URL, environment, journal, storage, diagnostics, and audit summaries.
- [Phase ?]: Render capability names strictly as read-only data; no capability creates a Phase 1 control.
- [Phase ?]: Adapt stale TypeScript plan paths to the existing JavaScript panel scaffold.
- [Phase ?]: Evidence persists only allowlisted projections and SHA-256 shape hashes; raw transport observations remain ephemeral.
- [Phase 01]: Detailed closed-panel notifications, provider registration, and every Muxy/Hermes source change remain deferred.
- [Phase ?]: Use a fail-closed evidence matrix: only reproducible fresh real-path origin or stream failures, or an explicit change signal, activate the Muxy-change stop gate.
- [Phase ?]: Keep simulated SSH, direct HTTPS, and remote-workspace evidence Unverified at the panel projection boundary.
- [Phase ?]: Use one cancellable execAsync owner for SSE and await its cleanup before panel release.
- [Phase ?]: Derive diagnostics only from observed curl, HTTP, parser, journal, or cancellation outcomes.
- [Phase ?]: Receipt generation is opt-in through a verifier-owned fixed challenge file and otherwise leaves production panel sessions without a receipt.
- [Phase ?]: Receipt correlation uses SHA-256 digests of relay observations, never raw execution, endpoint, journal, secret, or stream content.
- [Phase ?]: Only a 2xx authenticated terminal stream with awaited successful cleanup is support-eligible.
- [Phase ?]: Only buildVerifiedEvidenceRecord may create a schema-v2 support-eligible record.
- [Phase ?]: The generic CLI accepts only fixed failure/incomplete metadata and always emits supportEligible false.
- [Phase ?]: Schema-v1 artifacts remain readable historical evidence but expose no support eligibility marker.
- [Phase 01]: Stop the multi-plan qualification expansion after Plan 09; keep the working connect/stream/cancel vertical slice, defer Plans 10-15, and validate once against a user-operated Gateway.
- [Phase 02]: Require `run_submission`, `run_status`, and `run_events_sse` for the run surface; gate approval, steer, and stop independently from advertised capabilities.
- [Phase 02]: Retain only bounded allowlisted run events in panel memory and reconcile terminal truth from `GET /v1/runs/{run_id}`.
- [Phase 02]: Clear the bearer input immediately after connection and clear the controller's private bearer on panel release.
- [Phase ?]: Same-panel SSE recovery makes two reattach attempts only after authoritative status reconciliation.
- [Phase ?]: Panel recreation requires a fresh bearer and manual Run ID for status-only recovery.
- [Post-Phase 3]: Use the verified Dashboard session as the sole user authentication source; mint a fresh single-use `/api/auth/ws-ticket` credential for every `/api/ws` connection attempt.
- [Post-Phase 3]: Persist only allowlisted Dashboard cookies in Muxy's isolated extension store; passwords and WebSocket tickets stay transient, and the obsolete Gateway bearer record is removed.
- [Post-Phase 3]: Keep live JSON-RPC ownership in the open panel, automatically reattach after reconnect, and require user action only when Hermes rejects the primary Dashboard session.
- [Post-Phase 3]: Make the narrow Hermes panel an at-a-glance operations and command surface: bounded attention signals, exact queue counts/age, scheduled-job state, coarse health, and the agent composer; keep detailed administration in Hermes.
- [Post-Phase 3]: Refresh authenticated operations only while the panel is open, serialize requests through session-cookie rotation, and discard cron prompts/scripts, diagnostic detail, worker identity, paths, and resource measurements at the request boundary.

### Pending Todos

None yet.

### Blockers/Concerns

- [Next release]: Muxy 1.5.0 remote extension execution fails `posix_spawn(/usr/bin/ssh)` with `ENOENT`; restore SSH-workspace support only after the full native qualification gate passes.

- [Phase 3]: The current Muxy webview exposes Promise-based `exec`, not cancellable `execAsync`; interrupted and closed-panel stream ownership must remain bounded and truthful.
- [Phase 3]: Native host/Docker observations are receipt-backed and complete; SSH, HTTPS, and remote-workspace deployment classes intentionally remain `Unverified` beyond their executable analogues.
- [Phase 3]: SSH-forward, direct-HTTPS, and remote-workspace analogues executed successfully but deliberately remain `Unverified` for their real deployment classes.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260817-mp9 | Close Phase 1 using the verified ephemeral fast path | 2026-08-17 | a2d0a31 | Passed | [260817-mp9-close-phase-1-using-the-verified-ephemer](./quick/260817-mp9-close-phase-1-using-the-verified-ephemer/) |
| 260817-mzi | Implement Phase 2 capability-driven Hermes run control | 2026-08-17 | 9f57c20 | Passed | [260817-mzi-implement-phase-2-capability-driven-herm](./quick/260817-mzi-implement-phase-2-capability-driven-herm/) |
| 260817-qld | Implement the responsive Muxy project control surfaces | 2026-08-17 | fb3f6d9 | Passed | [260817-qld-implement-the-responsive-muxy-project-co](./quick/260817-qld-implement-the-responsive-muxy-project-co/) |
| 260817-v6x | Add a deterministic Hermes Kanban dashboard fixture and prove the Muxy board UI end to end with Computer Use | 2026-08-17 | 9ad48f9 | Passed | [260817-v6x-add-a-deterministic-hermes-kanban-dashbo](./quick/260817-v6x-add-a-deterministic-hermes-kanban-dashbo/) |
| 260818-a1t | Prove the Muxy Hermes board against a real disposable Hermes Gateway instance | 2026-08-18 | runtime-only | Passed | [260818-a1t-prove-the-muxy-hermes-board-against-a-re](./quick/260818-a1t-prove-the-muxy-hermes-board-against-a-re/) |
| 260818-dr9 | Replace pasted Dashboard session token with provider-aware login, verified session state, and logout | 2026-08-18 | 7c8ecf0 | Passed | [260818-dr9-replace-pasted-dashboard-session-token-w](./quick/260818-dr9-replace-pasted-dashboard-session-token-w/) |
| 260819-n51 | Authenticate first, then list available Hermes boards in a dropdown before opening one | 2026-08-19 | 0fd985b | Passed | [260819-n51-authenticate-first-then-list-available-h](./quick/260819-n51-authenticate-first-then-list-available-h/) |
| 260819-oji | Replace Gateway token flow with Dashboard-session WebSocket tickets and transparent reconnect | 2026-08-19 | 9aa563c | Passed | [260819-oji-replace-gateway-token-flow-with-dashboar](./quick/260819-oji-replace-gateway-token-flow-with-dashboar/) |
| 260819-puh | Turn the Hermes Agent panel into a compact operations and command surface | 2026-08-19 | f7a6a7f | Passed | [260819-puh-polish-the-hermes-agent-panel-with-a-use](./quick/260819-puh-polish-the-hermes-agent-panel-with-a-use/) |
| 260820-fqf | Make scheduled jobs expandable, show cadence, and integration-test the operations panel | 2026-08-20 | eab3fc3 | Passed | [260820-fqf-make-scheduled-jobs-expandable-show-cade](./quick/260820-fqf-make-scheduled-jobs-expandable-show-cade/) |
| 260820-n3r | Descope Muxy SSH workspaces from 0.1.0 and track restoration as an open issue | 2026-08-20 | this commit | Passed | [260820-n3r-descope-muxy-ssh-workspaces-from-0-1-0-a](./quick/260820-n3r-descope-muxy-ssh-workspaces-from-0-1-0-a/) |
| 260820-ntb | Rewrite README in clear human language that accurately distinguishes Hermes Agent from the Muxy extension | 2026-08-20 | this commit | Passed | [260820-ntb-rewrite-readme-in-clear-human-language-t](./quick/260820-ntb-rewrite-readme-in-clear-human-language-t/) |
| 260821-djl | Simplify the README around clear static screenshots and remove the hard-to-follow demo-video presentation | 2026-08-21 | ffae54e | Passed | [260821-djl-simplify-the-readme-around-clear-static-](./quick/260821-djl-simplify-the-readme-around-clear-static-/) |
| 260821-e4b | Replace blurry README and marketplace screenshots with sharp high-density captures | 2026-08-21 | 9e2e483 | Passed | [260821-e4b-replace-blurry-readme-and-marketplace-sc](./quick/260821-e4b-replace-blurry-readme-and-marketplace-sc/) |
| 260821-h9f | Make Muxy Kanban cards dispatchable and reflect Hermes worker-driven status changes | 2026-08-21 | 36c7b5c | Passed | [260821-h9f-make-muxy-kanban-cards-dispatchable-and-](./quick/260821-h9f-make-muxy-kanban-cards-dispatchable-and-/) |
| 260821-hyr | Polish the README for readability, logical flow, and a natural human voice | 2026-08-21 | 76aeddc | Passed | [260821-hyr-polish-the-readme-for-readability-logica](./quick/260821-hyr-polish-the-readme-for-readability-logica/) |
| 260821-i95 | Correct the approval screenshot caption to describe all four approval choices | 2026-08-21 | 679b806 | Passed | [260821-i95-correct-the-approval-screenshot-caption-](./quick/260821-i95-correct-the-approval-screenshot-caption-/) |

### Roadmap Evolution

- Phase 1 completed through the user-approved fast path: one disposable Docker live proof, native UI checks, and no broader deployment support claim.
- Phase 2 completed through quick task 260817-mzi: one native completed run plus advertised steer and authoritative cancellation against a disposable pinned Docker Gateway.
- Phase 3 gap closure added receipt provenance, fresh native host/Docker observations, executable remote analogues, and a passing aggregate validation and verification gate.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Muxy integration | Agent/provider registration and any source change | Deferred — requires separate authorization | v1 initialization |
| Durable operation | Background run ownership and notifications | Deferred — needs a distinct transport owner | v1 initialization |
| Workspace execution | `cwd` and workspace path mapping | Deferred — needs Gateway-side validation | v1 initialization |
| Muxy SSH workspace | Restore support only after a valid Muxy remote executor passes the full native gate | Next release — tracked in OPEN_ISSUES.md | v1.1 Phase 6 scope revision |

## Session Continuity

Last session: 2026-08-20T20:50:00.000Z
Stopped at: Phase 06 complete under revised beta scope; Phase 07 ready
Resume file: None

## Operator Next Steps

- Execute Phase 07 marketplace submission after restoring GitHub authentication and configuring the repository remote.
