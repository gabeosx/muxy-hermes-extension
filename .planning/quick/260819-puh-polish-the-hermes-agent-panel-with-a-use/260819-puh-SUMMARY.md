---
quick_id: 260819-puh
status: complete
completed: 2026-08-19
commits:
  - 33bec09
  - f7a6a7f
---

# Hermes operations and agent panel

The signed-in Hermes panel is now a compact operational overview and agent control surface. It answers what needs attention, what is waiting, what runs next, and whether Hermes is healthy before asking the user to start a request.

## Completed work

- Added a bounded Dashboard operations projection for Kanban status counts, oldest-ready age, active workers, board diagnostics, scheduled jobs, and coarse Gateway/memory/disk health.
- Added a **Needs attention** summary, exact waiting/running queue meter, scheduled-job watchlist, health chips, manual refresh, 30-second open-panel refresh, and focus refresh.
- Kept optional Hermes surfaces independent so an older or reduced Gateway shows partial status instead of breaking the panel.
- Added a bottom-anchored agent composer with safe queue/job starters, visible user requests, clear starting/working/completed states, and a return to the overview after a run.
- Preserved explicit approval, guidance, stop, reconnect, saved-session restore, and sign-out behavior.
- Serialized authenticated Dashboard requests through cookie rotation so status polling and WebSocket ticket renewal cannot persist an older session cookie.
- Re-read the saved board on panel focus so a board chosen in the board tab becomes the operations target without another sign-in.

## Security and copy boundary

- The operations snapshot retains only counts, bounded job names/states/timestamps, and coarse health enums. Cron prompts/scripts/workdirs, diagnostic detail, worker PIDs/locks, resource measurements, cookies, and tickets are discarded at the request boundary.
- Credentials remain transient; Dashboard cookies remain in Muxy's isolated extension storage.
- The panel uses user-facing labels only and does not expose transport, filesystem, token, or deployment terminology.

## Verification

- Focused auth, operations, agent, and UI contract suites: 25/25 passed.
- Full repository suite: 164/164 passed outside the sandbox, including loopback and HTTPS fixtures.
- `npm run build`: passed.
- `npm run validate`: passed (`Phase 3 recovery proof validation passed`).
- `node scripts/validate-dist.mjs`: passed across two clean builds.
- `git diff --check`: passed.

## Native Muxy proof

A fresh docked Hermes panel restored the saved `http://127.0.0.1:9119` Dashboard session without credentials or user action. It rendered the live default-board queue, 12 scheduled jobs, and normal Gateway/memory/disk health at the real narrow panel width with no clipped copy or horizontal overflow. Closing and reopening the panel retained the session and loaded a fresh operational snapshot. No real agent request was submitted and the user's Dashboard session was not invalidated.

## Deviations

The initial quick plan focused too narrowly on improving the empty composer. The user restored the intended product direction—scheduled jobs, queue pressure, attention, and health—so the plan was revised before completion to deliver the operational overview instead of a decorative idle state.
