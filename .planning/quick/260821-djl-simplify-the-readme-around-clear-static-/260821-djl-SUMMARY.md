---
quick_id: 260821-djl
status: complete
completed: 2026-08-21
commit: ffae54e
---

# Clear static README screenshots

The README now presents Hermes Agent through three readable, privacy-safe static views instead of a GIF/video narrative.

## Delivered

- Added 760×475 Operations, approval, and project-board PNGs designed at their actual README display size.
- Rewrote the opening feature flow around agent activity, explicit approvals, and user-managed Kanban status changes.
- Retained the accurate Kanban ownership contract: cards move only when the user changes their status, with confirmation for Done and Blocked.
- Replaced all three required marketplace screenshots with matching 1600×1000 feature compositions.
- Updated distribution validation to enforce the three README PNGs and the unchanged marketplace screenshot inventory.

## Privacy review

- Every product crop excludes browser chrome, sidebars, selectors, connection details, and unrelated workspace content.
- Apple Vision OCR was run against all six final images. Recognized visible text contained only generic product copy and the disposable `muxy-hermes-demo-launchpad` task path/text.
- Embedded-string checks found no user paths, personal names, Tankhouse references, hosts, URLs, credentials, or tokens.
- Desktop-size and 358-pixel mobile previews were visually inspected.

## Verification

- `npm test`: 77/77 passed.
- `npm run validate:dist`: passed with a deterministic 17-file distribution.
- `npm run validate`: passed with zero high/critical audit findings and identical clean-copy output.
- `git diff --check`: passed.
