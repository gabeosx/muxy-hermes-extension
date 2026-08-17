---
quick_id: 260817-mzi
status: complete
created: 2026-08-17
phase: 02-capability-driven-run-control
requirements:
  - RUN-01
  - RUN-02
  - RUN-03
  - RUN-04
  - RUN-05
  - RUN-06
  - RUN-07
  - SEC-03
  - UX-01
  - UX-02
  - UX-03
  - UX-04
---

# Implement Capability-Driven Hermes Run Control

## Objective

Extend the verified consented curl relay into one open-panel Hermes run owner: submit one run, parse and render its streamed assistant/tool/terminal/approval activity, reconcile the Gateway's authoritative status, and expose approval, stop, and steer actions only when advertised.

## Must Haves

- A successful connection retains URL, bearer, and capability names only in panel memory; the bearer input is cleared immediately and all credential state is cleared on release.
- Run submission requires `run_submission`, `run_status`, and `run_events_sse`; unsupported Gateways get an explicit read-only explanation instead of controls.
- Stream payloads are parsed incrementally into an allowlisted, bounded projection. Malformed, oversized, unknown, or wrong-run events never reach rendered state.
- Approval choices come only from the pending `approval.request`; no approval is automatic and no arbitrary choice can be sent.
- Stop and steer are displayed and callable only when `run_stop` and `run_steer` are advertised. A stop request remains nonterminal until authoritative Gateway status is terminal.
- The final state is reconciled through `GET /v1/runs/{run_id}` after stream completion or control responses.
- The panel stays native to Muxy theme/scale/focus/hover/reduced-motion behavior and does not add permissions, persistence, topology branches, background ownership, or TLS bypasses.

## Tasks

1. Add a bounded Hermes run SSE parser and capability-gated Gateway run client for submission, status, approval, stop, and steer endpoints.
2. Add a one-run controller that owns state, incremental activity, pending approval, action serialization, cleanup, and authoritative status reconciliation.
3. Integrate the controller into the panel with a run composer, live assistant/activity/status views, exact approval choices, and advertised-only stop/steer controls; clear the credential field after connection.
4. Add focused parser/client/controller/UI tests and update the aggregate validator from the Phase 1 authority boundary to the Phase 2 advertised-control boundary.

## Verification

- `npm test`
- `npm run build`
- `npm run validate`
- Native Muxy smoke test against a disposable pinned Hermes Gateway if the local fixture can be recreated safely; remove all disposable resources afterward.

## Prohibitions

- Never place the bearer in argv, URL, files, storage, diagnostics, rendered state, or audit output.
- Never auto-approve or invent an approval choice.
- Never infer controls from version/topology or render unadvertised controls.
- Never claim a stop completed before the Gateway reports `completed`, `failed`, or `cancelled`.
- Never add a second streaming owner, background process, sidecar, deployment selector, workspace path, or new manifest permission.
