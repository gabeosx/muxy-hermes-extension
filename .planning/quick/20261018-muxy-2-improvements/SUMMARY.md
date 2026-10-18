---
status: complete
date: 2026-10-18
---

# Muxy 2 improvements completed

Implemented the four user-authorized improvements on `codex/muxy-2-improvements`.

## Changes

- Board selection has its own grid; card creation occupies a separate full-width row. Narrow views stack controls. Explicit `minmax(0, 1fr)` root/workspace tracks prevent intrinsic header width from pushing the toolbar outside its viewport. Header titles truncate while Refresh and Log out remain available.
- Updated only the transitive `source-map-js` lockfile resolution from 1.2.1 to patched 1.2.2. No dependency range changes or audit exceptions.
- CurlRelay feature-detects native `execAsync`, tracks cancellable jobs, cancels each pending handle once, rejects cancelled requests immediately, sanitizes cancellation failures, and discards late completions. Explicit test executors stay independent of the host. Hosts without `execAsync` keep bounded legacy `exec`; underlying legacy processes cannot be interrupted, but their late results are discarded.
- Dashboard authentication invalidates old queued work and checks request generations before merging cookies/identity. Logout cancels prior work before sending the logout request with the existing cookies. Surface release clears transient authentication, cancels work, and prevents a delayed storage read from restoring a closed surface. Replacing a panel connection invalidates its old requests.
- Added **Hermes: Open Agent Panel** with `openPanel`; preserved **Hermes: Toggle Agent Panel**. The permission set is unchanged. Distribution validation explicitly allows the new command.
- Added focused cancellation, fallback, logout, stale-session, surface teardown, and manifest tests. Updated README command instructions and Unreleased notes. No version bump, publishing, or remote-support claim.

## Validation

- Full suite: **103 tests passed**, including the additional surface-release test. Final release validation runs the suite twice and also checks clean-copy builds.
- `npm audit`: **zero vulnerabilities** across all severity levels.
- `npm run build`: passed, manifest copied into `dist/`.
- `npm run validate`: passed, including structural checks, secret scan, audit, distribution checks, and two reproducible clean builds. Clean-copy digest: `3f0d9ecffecf2180efc7e2c70672aca5767bb007ce39edcc1dd5c99963ff5258`.
- `npm run qualify`: `passed_supported_beta_matrix`; receipt `.qualification/receipts/9a11f8b4b959.json`. Real pinned Hermes client checks passed loopback, SSH-forward, and HTTPS streaming/auth/controls. Cleanup proved zero owned containers/networks/volumes and removal of temporary roots, listeners, secrets, and SSH process.
- Rendered the actual board component with disposable fixtures using an isolated agent-browser session. Checked 320, 480, 720, 780, 1024, and 1200 px layouts. Inspected 320 and 780 px screenshots; fixed a root-track overflow revealed at 320 px. Final 320 px toolbar width exactly matched the viewport and no control extended beyond it. Wide/panel layouts remained within their tracks. Screenshots are temporary local QA artifacts, not marketplace assets.
- Native macOS Muxy 2.1.0 (1143): rebuilt extension loaded and enabled; new Open command appeared, opened the panel, and left it open when invoked again. Dashboard status/provider requests completed through the updated relay after one-time native consent and displayed the password sign-in form.
- Native delayed-request close timing was not established because pointer routing prevented the intended close before the fixture responded. Native request completion and idempotent open are observed; process cancellation and stale-state guarantees are verified by the focused automated tests. This does not expand the earlier compatibility investigation's full native 2.2/remote/live-run coverage.
- `git diff --check`: passed.

## Cleanup

Unloaded the native test extension; no saved command consent rule was created. No fixture account was signed in during this smoke test. Stopped the exact temporary fixture processes and Vite server, closed the isolated browser, and independently verified all three listeners were absent. Preserved unrelated pre-existing untracked work.

## Commits

- `2ddf4b0` — patched dependency resolution.
- `45808f3` — toolbar layout, Muxy 2 APIs, lifecycle guards, and tests.

GSD quick plan/summary/STATE were maintained inline because the installed skill's referenced gsd-core workflow/runtime is absent. No subagents were used.
