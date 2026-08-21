---
quick_id: 260821-hyr
status: complete
completed: 2026-08-21
commit: 76aeddc
---

# README readability and voice review

The README now explains the extension in the order a prospective user is likely to ask questions, with less repetition and more direct, natural language.

## Delivered

- Kept the opening focused on what the extension lets someone do without changing their Hermes installation.
- Rewrote the Agent and Kanban sections around concrete user actions and exact interface labels.
- Clarified that Hermes owns Kanban work independently while the Muxy Agent panel needs to remain open for live controls.
- Replaced release-oriented phrases such as "qualified" and "durable cards owned by Hermes" with plain explanations.
- Reduced repeated credential-storage copy while preserving the security, privacy, compatibility, and permission details.
- Tightened setup, troubleshooting, and development wording without changing supported behavior.

## Verification

- Documentation contract test: 5/5 passed.
- Full test suite: 78/78 passed.
- `npm run build`: passed.
- `npm run validate:dist`: deterministic 17-file distribution passed.
- `npm run validate`: passed with zero high/critical audit findings.
- `git diff --check`: passed.
