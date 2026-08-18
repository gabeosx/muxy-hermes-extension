---
quick_id: 260818-a1t
status: complete
completed: 2026-08-18
commit: runtime-only
---

# Outcome

The Muxy Hermes project board was proven against a real, isolated Hermes Agent dashboard and its bundled SQLite-backed Kanban plugin. No product source changes were required.

# Real Hermes instance

- Executable identity: Hermes Agent v0.20.2 (2026.8.16).
- Dashboard plugin: bundled `kanban` v1.0.0 with a mounted backend API.
- Runtime: one newly created task-owned `/private/tmp/hermes-kanban-real.*` root with mode `0700` and an isolated `HERMES_HOME`.
- Network: dashboard bound only to `127.0.0.1` on an OS-assigned port.
- Authentication: one process-local 256-bit session token, entered only in the open Muxy tab and cleared on disconnect.
- Board: `muxy-real-test`, created through `hermes kanban boards create` with two CLI-seeded cards.

# Native Muxy proof

Computer Use connected the Muxy `Hermes Project Board` tab to the real dashboard and observed the two CLI-seeded cards. It then:

1. Created `Real Hermes Computer Use proof` through the Muxy surface.
2. Observed Hermes return the new card in Triage.
3. Moved the card to Ready through the card status control.
4. Observed `Card moved.`, a three-card count, and the card rendered in Ready.

The real Hermes CLI independently returned task `t_a61bfd26` with:

- `title: Real Hermes Computer Use proof`
- `status: ready`
- `workspace_kind: scratch`
- `created_by: dashboard`

This demonstrates that the Muxy board used Hermes's real dashboard REST plugin and shared Kanban database, not the deterministic Node analogue.

# Cleanup

- Disconnected the Muxy board, which cleared the session token field.
- Stopped the owned Hermes dashboard process.
- Confirmed its loopback port was closed and no listener remained.
- Removed the exact task-owned runtime root and its SQLite database.
- Preserved the separately supplied pinned Hermes executable/runtime because this task did not own it.

# Observation

The pinned Hermes dashboard source lacked prebuilt web assets, so its official npm dependencies were installed and the bundled web UI was built before launch. npm reported one high-severity advisory in that upstream dependency snapshot; no dependency upgrade or upstream source mutation was attempted because it was outside this integration proof.
