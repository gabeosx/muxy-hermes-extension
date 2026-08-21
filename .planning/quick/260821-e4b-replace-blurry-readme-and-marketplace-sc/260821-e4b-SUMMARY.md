---
quick_id: 260821-e4b
status: complete
completed: 2026-08-21
commit: 9e2e483
---

# Sharp high-density screenshots

The README and marketplace screenshots retain the approved compositions, but every embedded product view now comes from a lossless high-density render of the real extension UI.

## Delivered

- Re-rendered Operations and approval directly from the production panel components at 2× device scale.
- Re-rendered the focused project board directly from the production board component at 3× device scale.
- Rebuilt all three 760×475 README images and all three 1600×1000 marketplace images without enlarging low-resolution UI crops.
- Kept the capture state isolated and demo-safe; no capture fixture or raw frame was added to the repository.

## Privacy and visual review

- Browser chrome, account menus, unrelated projects, schedules, connection details, and personal sidebars are absent.
- Apple Vision OCR recognized only generic product copy, `Launchpad Checklist`, `muxy-hermes-demo`, and `/workspace/muxy-hermes-demo-launchpad/app.js` demo content.
- Embedded-string checks found no personal identifiers, hostnames, URLs, credentials, tokens, or user filesystem paths.
- Native 760-pixel and 358-pixel mobile previews were inspected; UI typography, borders, icons, and controls remain crisp.

## Verification

- `npm test`: 77/77 passed.
- `npm run validate:dist`: deterministic 17-file distribution passed.
- `npm run validate`: passed with zero high/critical audit findings and matching clean-copy output.
- `git diff --check`: passed.
