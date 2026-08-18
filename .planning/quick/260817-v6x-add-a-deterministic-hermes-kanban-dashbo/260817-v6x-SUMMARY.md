---
quick_id: 260817-v6x
status: complete
completed: 2026-08-17
commit: 9ad48f9
---

# Delivered

- Added a deterministic, loopback-only Hermes Kanban fixture with a fixed test bearer, a seeded `muxy-test` board, and bounded in-memory task creation and status mutation.
- Added contract tests for authentication, board loading, task creation, status changes, board/status validation, and unknown-route rejection.
- Added `npm run fixture:kanban` so the fixture can be started on an ephemeral loopback port for native Muxy testing.

# Native Muxy proof

Computer Use opened the Hermes project board from Muxy's command palette and connected it to the running fixture. The native surface:

1. Rendered all eight seeded columns and four seeded cards.
2. Created `Computer Use fixture proof` in Triage.
3. Moved the new card to Ready and displayed `Card moved.` with a five-card board count.
4. Preserved usable horizontal scrolling in the wide board layout.
5. Switched to vertically scrollable stacked columns after Muxy's split-pane narrowed the board.

A direct read-only fixture query confirmed task `t_fixture_created_001` had status `ready` and event sequence `2` after the UI workflow.

# Verification

- Fixture-focused tests: 8 passed.
- Full test suite: 94 passed, 0 failed.
- `npm run build`: passed; both Hermes panel entry points were emitted.
- `npm run validate`: passed.
- `git diff --check`: passed.

# Cleanup

The temporary fixture was stopped after the proof and its ephemeral loopback port was confirmed closed. All fixture mutations were memory-only and were discarded with the process.
