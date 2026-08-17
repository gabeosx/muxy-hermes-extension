---
quick_id: 260817-mzi
status: complete
completed: 2026-08-17
duration: 20m
commits:
  - 2414c6f
  - af516a5
  - 9f57c20
---

# Implement Capability-Driven Hermes Run Control — Summary

Phase 2 is complete through the user-approved fast path.

## Delivered

- Added a bounded, incremental Hermes run SSE parser that retains only recognized events for the active run.
- Added a fixed-endpoint run client for submission, status, approval, steer, and stop over the existing bearer-in-stdin curl relay.
- Added a one-run controller with bounded assistant/activity state, exact approval-choice enforcement, serialized controls, cleanup, and authoritative status reconciliation.
- Reconciled rejected controls as well, so a failed stop request cannot leave the UI stuck in a transient stopping state.
- Added the native Muxy run composer, live assistant/activity/status surfaces, approval card, and independently advertised steer/stop controls.
- Cleared the visible bearer field after connection and the controller credential on panel release.
- Updated the aggregate validator and added focused parser/client/controller/UI coverage without changing permissions.

## Verification

- `npm run validate` — PASS.
- Native Muxy + pinned disposable Docker Gateway — PASS for connection, capability discovery, incremental completion, credential-field clearing, steer, stop, and authoritative cancellation.
- Disposable containers, network, port binding, and temporary Hermes home — removed and verified absent.

## Remaining Boundary

Phase 3 owns interrupted-stream recovery, panel recreation, replay limits, and the still-unverified broader deployment matrix. Approval and tool-event paths are deterministic-test verified but were not induced in the harmless native fixture.
