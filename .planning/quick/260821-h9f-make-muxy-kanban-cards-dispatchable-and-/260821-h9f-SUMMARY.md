---
quick_id: 260821-h9f
status: complete
completed: 2026-08-21
commit: 36c7b5c
---

# Verified Hermes Kanban worker lifecycle

Muxy-created cards can now carry the assignee and task instructions Hermes needs to dispatch work, and the open board follows Hermes-owned status changes without a manual refresh.

## Delivered

- Added bounded task instructions and an optional Hermes assignee to Kanban card creation while retaining scratch workspaces and idempotent submission.
- Added a serialized three-second board refresh while the tab is open; polling pauses around mutations and session checks and stops when the board releases.
- Corrected the README to distinguish durable Hermes Kanban workers from standalone Agent-panel requests.
- Replaced the Kanban README and marketplace images with sharp, current captures that describe the automatic Hermes lifecycle accurately.

## Real Hermes proof

- Ran Hermes Agent `0.20.2` in a disposable, isolated Docker runtime with no access to the user's Hermes state or external network.
- Created both verification cards through `KanbanClient.createTask`, assigned them, and promoted them to Ready.
- Observed `ready -> running -> done` for the completion case and `ready -> running -> blocked` for the blocked case.
- Confirmed exactly one attached run per card, the expected `completed` or `blocked` run outcome, and a cleared current-run pointer after termination.
- Removed the disposable containers, network, runtime files, and test harness after verification.

## Privacy and visual review

- Apple Vision OCR found only the intended generic Hermes/Kanban demo copy in both images.
- Embedded-string checks found no existing projects, personal identifiers, hosts, URLs, credentials, paths, tokens, or run/session identifiers.
- Final image dimensions are 760x475 for the README and 1600x1000 for the marketplace.

## Verification

- `npm test`: 78/78 passed.
- Browser runtime proof: the actual board component polled once and rerendered a Running card in Done without a user refresh.
- `npm run build`: passed.
- `npm run validate:dist`: deterministic 17-file distribution passed.
- `npm run validate`: passed with zero high/critical audit findings.
- `git diff --check`: passed.
