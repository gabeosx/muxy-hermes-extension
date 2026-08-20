---
quick_id: 260820-n3r
status: complete
completed: 2026-08-20
commit: this-commit
---

# Summary

- Muxy SSH workspaces are now explicitly unsupported in `hermes-agent@0.1.0` instead of blocking the supported beta matrix.
- Both product surfaces provide bounded guidance to use a local Muxy workspace with an operator-owned SSH forward or trusted HTTPS.
- `npm run qualify` now passes only the supported beta matrix after cleanup proof; `npm run qualify:native` remains a non-release diagnostic reproducer.
- `OPEN_ISSUES.md` records the failure, safe behavior, and full acceptance criteria for restoring support.
- Phase 6 and its revised Nyquist/verification evidence are complete; Phase 7 is ready to start.
- Full suite passed 77/77 twice. Node v26.5.0 and Node v20.20.2 produced identical clean-copy digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef`, with zero high/critical findings.
- A fresh real disposable run produced `passed_supported_beta_matrix` in sanitized receipt `81cae6d7136f` and proved complete cleanup.
- A remote GitHub issue could not be created because this checkout has no Git remote and the configured `gabeosx` GitHub token is invalid. The local issue record is ready to publish once the repository and authentication exist.
