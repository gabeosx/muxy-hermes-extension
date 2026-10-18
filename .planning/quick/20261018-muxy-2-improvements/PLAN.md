---
status: complete
date: 2026-10-18
---

# Muxy 2 improvements

User authorized fixing the board toolbar and dependency advisory, then adopting execAsync and openPanel. Execute inline through gsd-quick; the installed skill's referenced gsd-core workflow/runtime remains absent, so maintain plan, verification, summary, and STATE tracking directly. Preserve unrelated untracked work.

1. Separate board selection and card creation layouts so the toolbar wraps without compressing controls at panel and split widths. Verify representative rendered widths.
2. Update only the vulnerable source-map-js transitive lockfile resolution to the patched compatible release. Keep the audit gate.
3. Prefer feature-detected Muxy execAsync for relay requests, retain legacy exec when unavailable, cancel pending requests on session/surface teardown, logout, and connection replacement, and suppress late or queued responses after cancellation. Preserve stdin secrets, limits, and sanitized errors. Add focused cancellation and fallback tests.
4. Add an idempotent Hermes Open Agent Panel manifest command using openPanel and preserve Toggle. Record changes under Unreleased without publishing/versioning a release.
5. Run the full tests, build, release validation, and disposable qualification matrix. Record results and cleanup; commit only this task's changes.
