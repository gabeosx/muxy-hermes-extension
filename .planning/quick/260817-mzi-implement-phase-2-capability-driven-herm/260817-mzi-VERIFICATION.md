---
quick_id: 260817-mzi
status: passed
verified: 2026-08-17
---

# Capability-Driven Hermes Run Control — Verification

## Verdict

PASS. The extension now owns one open-panel Hermes run through the existing consented curl relay and exposes only controls advertised by `/v1/capabilities`.

## Automated Evidence

- `npm run validate` — PASS. Rebuilt `dist/`, ran all repository tests with loopback fixture binding, validated packaging/evidence/redaction, and enforced the Phase 2 authority boundary.
- Focused run suites — PASS for incremental SSE framing, wrong-run/unknown/oversized rejection, exact approval choices, endpoint construction, advertised feature gating, streamed controller state, stop semantics, and authoritative terminal reconciliation.
- Manifest authority remains unchanged: `commands:exec`, `files:read`, `files:write`, and `panels:write`; no storage, background, native HTTP, deployment, terminal, Git, or TLS-bypass authority was added.

## Native Muxy Evidence

- Reloaded the final `dist/` in Muxy and connected to pinned Hermes image `nousresearch/hermes-agent:v2026.8.16@sha256:f8f548d87d16634d1ad9e3777280f3f577ba2358703f04e18e74007ffd3621bf` through Docker-published loopback.
- Observed all six run capabilities: submission, status, event SSE, approval response, steer, and stop.
- Confirmed the bearer field cleared immediately after the successful probe.
- Started the fixed harmless run and observed incremental `alpha` then `beta`, a `run.completed` lifecycle item, and authoritative `Completed` status.
- Started a slowed second run, sent advertised steer, observed both local send and Gateway `run.steered`, requested stop, and observed authoritative `Cancelled` rather than treating the request itself as terminal.
- Closed the panel, removed both containers and their network, removed the exact temporary Hermes home, and confirmed no service remained on loopback port 18642.

## Bounded Claims

- Approval choice handling is verified by deterministic unit coverage against Gateway-supplied choices; the harmless native fixture did not create a dangerous command or approval prompt.
- Tool/subagent/reasoning lifecycle rendering is covered by allowlisted parser/controller tests; the harmless native run emitted reasoning but no tool call.
- Interrupted-stream replay, panel recreation, and broader deployment qualification remain Phase 3 work.
