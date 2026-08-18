---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: open-panel-recovery-proof
status: ready_to_execute
stopped_at: Completed 03-01-PLAN.md
last_updated: "2026-08-18T11:23:54.000Z"
last_activity: 2026-08-18
last_activity_desc: Completed quick task 260818-a1t — real disposable Hermes Kanban proof in native Muxy
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 17
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-16)

**Core value:** Prove secure, authenticated, streamed Hermes run control across representative Hermes deployment shapes inside a native-feeling Muxy panel before building the surrounding product.
**Current focus:** Phase 03 — open-panel-recovery-proof

## Current Position

Phase: 03 (open-panel-recovery-proof) — READY TO EXECUTE
Plan: 03-01 of 2 plans
Status: Planning complete; bounded runtime recovery is Wave 1 and evidence/native proof is Wave 2
Last activity: 2026-08-18 — Completed quick task 260818-a1t: real disposable Hermes Kanban proof in native Muxy

Progress: [█████████░] 94%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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
| Phase 03 P01 | 24m | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: The current Muxy webview exposes Promise-based `exec`, not cancellable `execAsync`; interrupted and closed-panel stream ownership must remain bounded and truthful.
- [Phase 3]: Host-native, SSH-forward, direct-HTTPS, remote-workspace, and Docker fault/recovery qualification remain deferred and must stay `Unverified` until tested.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260817-mp9 | Close Phase 1 using the verified ephemeral fast path | 2026-08-17 | a2d0a31 | Passed | [260817-mp9-close-phase-1-using-the-verified-ephemer](./quick/260817-mp9-close-phase-1-using-the-verified-ephemer/) |
| 260817-mzi | Implement Phase 2 capability-driven Hermes run control | 2026-08-17 | 9f57c20 | Passed | [260817-mzi-implement-phase-2-capability-driven-herm](./quick/260817-mzi-implement-phase-2-capability-driven-herm/) |
| 260817-qld | Implement the responsive Muxy project control surfaces | 2026-08-17 | fb3f6d9 | Passed | [260817-qld-implement-the-responsive-muxy-project-co](./quick/260817-qld-implement-the-responsive-muxy-project-co/) |
| 260817-v6x | Add a deterministic Hermes Kanban dashboard fixture and prove the Muxy board UI end to end with Computer Use | 2026-08-17 | 9ad48f9 | Passed | [260817-v6x-add-a-deterministic-hermes-kanban-dashbo](./quick/260817-v6x-add-a-deterministic-hermes-kanban-dashbo/) |
| 260818-a1t | Prove the Muxy Hermes board against a real disposable Hermes Gateway instance | 2026-08-18 | runtime-only | Passed | [260818-a1t-prove-the-muxy-hermes-board-against-a-re](./quick/260818-a1t-prove-the-muxy-hermes-board-against-a-re/) |

### Roadmap Evolution

- Phase 1 completed through the user-approved fast path: one disposable Docker live proof, native UI checks, and no broader deployment support claim.
- Phase 2 completed through quick task 260817-mzi: one native completed run plus advertised steer and authoritative cancellation against a disposable pinned Docker Gateway.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Muxy integration | Agent/provider registration and any source change | Deferred — requires separate authorization | v1 initialization |
| Durable operation | Token persistence, background run ownership, and notifications | Deferred — needs a distinct trust model | v1 initialization |
| Workspace execution | `cwd` and workspace path mapping | Deferred — needs Gateway-side validation | v1 initialization |

## Session Continuity

Last session: 2026-08-17T21:21:01.710Z
Stopped at: Completed 03-01-PLAN.md
Resume file: 03-02-PLAN.md
