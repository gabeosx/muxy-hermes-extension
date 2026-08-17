---
quick_id: 260817-qld
status: complete
completed: 2026-08-17
commit: fb3f6d9
---

# Responsive Hermes project control surfaces

Implemented a compact, scroll-correct Hermes Gateway panel plus a full Muxy tab for project-scoped Hermes Kanban work.

## Delivered

- Fixed the right-panel scroll chain with explicit full-height and `min-height: 0` containers, reduced panel density, and moved validation/recovery internals behind advanced disclosures.
- Added a native `Hermes: Open Project Board` command and an in-panel board launcher.
- Added a responsive Kanban tab: horizontal columns on wide panes and a vertically scrollable stacked layout on narrow panes.
- Added explicit dashboard URL/session-token/board-slug mapping. No Muxy workspace path is inferred, compared, or sent to Hermes.
- Integrated the real Hermes dashboard plugin REST surface for board reads, task creation, and task status changes.
- Added capability-safe failures for missing Kanban, rejected dashboard authentication, and incompatible response contracts.
- Kept the dashboard session token in the open tab only and excluded it from URLs, request bodies, rendering, and persistence.
- Extended the multi-entry Vite build and distribution validator for both panel and board surfaces.

## Verification

- `npm test` — 92/92 passed.
- `npm run build` — passed; emitted both `panel/index.html` and `board/index.html`.
- `npm run validate` — passed, including the full transport/evidence boundary and package validation.
- `git diff --check` — passed.

## Notes

The Kanban API is distinct from the Hermes Runs Gateway API. The tab requires the Hermes dashboard Kanban plugin and its current session token. A separately hosted Hermes instance can be reached through HTTPS or a user-operated loopback SSH tunnel; the extension does not infer deployment topology.
