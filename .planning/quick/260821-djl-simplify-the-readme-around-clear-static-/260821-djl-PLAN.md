---
quick_id: 260821-djl
mode: quick
description: Simplify the README around clear static screenshots and remove the hard-to-follow demo-video presentation
---

# Quick task 260821-djl

## Task 1: Replace the demo sequence with readable static screenshots

**Files:** `assets/readme/**`, `assets/screenshots/**`, obsolete `assets/demo/**`

**Action:** Produce three privacy-safe static views—Operations, approval, and Kanban—using only the isolated Launchpad Checklist capture. Optimize each composition for its actual display size, retain exact 1600×1000 marketplace counterparts, and remove the GIF/MP4 assets.

**Verify:** Every final image is manually inspected, contains only demo-safe content, and is readable at 760-pixel GitHub width; marketplace images remain exactly 1600×1000.

**Done:** The screenshots clearly show the product without blank regions, browser chrome, private data, or a video narrative.

## Task 2: Rewrite the README around the three product views

**Files:** `README.md`, `scripts/validate-dist.mjs`, `package.json`, `test/**`, obsolete demo-render/audit scripts

**Action:** Lead with a short product explanation, show the Operations, approval, and Kanban screenshots beside concise feature copy, keep setup/security/reference material scannable, and remove video-rendering documentation and tooling.

**Verify:** README desktop and approximately 390-pixel previews are understandable; `npm test`, `npm run build`, `npm run validate:dist`, and `npm run validate` pass.

**Done:** The README is easy to follow and the repository contains only the static screenshot workflow the user wants.
