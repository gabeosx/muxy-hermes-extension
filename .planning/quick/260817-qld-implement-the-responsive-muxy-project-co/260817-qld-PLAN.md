---
quick_id: 260817-qld
title: Responsive Hermes project control surfaces
status: complete
---

# Goal

Turn the existing proof-heavy panel into a usable compact control surface and add a full responsive, project-scoped Hermes Kanban tab without implying that Muxy and Hermes share a machine or filesystem.

# Tasks

1. Fix the panel scroll container and move proof/recovery material behind explicit advanced disclosures while preserving existing run controls and security boundaries.
2. Add an in-memory authenticated Hermes Kanban client and responsive board tab with board loading, card creation, and card status changes; fail closed when the selected Hermes backend does not expose the Kanban API.
3. Register the board tab and palette command, update build/manifest validation, and run the complete test and validation suite.

# Acceptance

- The right panel scrolls vertically at constrained heights and presents the connection/run path before diagnostics.
- `Hermes: Open Project Board` opens a full Muxy tab that uses wide columns when space permits and stacked columns on narrow panes.
- A user explicitly enters a Hermes backend URL, dashboard session token, and board slug; none are inferred from the active worktree, and the token is never persisted.
- The tab reads real `/api/plugins/kanban` data and supports create/move only when those authenticated endpoints succeed; unsupported backends are clearly identified.
- `npm test`, `npm run build`, and `npm run validate` pass.
