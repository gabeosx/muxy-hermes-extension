---
status: resolved
trigger: "User reports that automation pasted values into the command prompt instead of panel fields, visible UI copy exposes internal implementation details, Gateway credentials are requested after every panel close/open, and the Dashboard appeared to request a session token users would not know."
created: 2026-08-18T22:00:00-04:00
updated: 2026-08-19T02:20:00-04:00
---

# Debug Session: User-facing auth and copy

## Symptoms

- expected_behavior: Native verification targets the actual panel inputs; UI uses product language; a successful connection/sign-in survives panel, tab, and Muxy restarts through extension-scoped storage; users authenticate with normal credentials rather than copied session tokens.
- actual_behavior: Prior Computer Use typed into the focused command prompt; visible panel/board copy explains filesystem, relay, and journal internals; the Gateway bearer is deliberately discarded on close; the loaded native board showed an obsolete session-token form.
- error_messages: No application exception. This is a focus-targeting, session-lifecycle, stale-build, and product-copy defect.
- timeline: Reported immediately after Phase 3 native qualification and completion.
- reproduction: Open the current Hermes panel/board, read the connection and mapping copy, close/reopen the panel, and inspect the loaded native board build.

## Current Focus

- hypothesis: Product code encoded verifier-era security constraints directly into visible UI and scoped all auth state to individual webviews; the native app was also running a stale board build.
- test: Add an in-memory background session broker, remove internal copy from primary UI, rebuild, and verify the packaged background entry and session contracts.
- expecting: Gateway and Dashboard sessions restore from the extension-scoped store, are checked before reuse and every five minutes while their UI is open, no session-token field exists, and all primary copy describes user goals/actions.
- next_action: None.

## Evidence

- timestamp: 2026-08-18T22:00:00-04:00
  finding: src/panel/app.js renders filesystem-path, curl, journal-scrubbing, panel-only credential, and fresh-bearer language directly in the primary UI.
- timestamp: 2026-08-18T22:00:00-04:00
  finding: HermesGatewayPanel.release clears the bearer and has no shared session owner.
- timestamp: 2026-08-18T22:00:00-04:00
  finding: Current src/board/app.js uses provider discovery plus username/password and explicitly contains no session-token field, so the reported native token prompt is from a stale loaded build.
- timestamp: 2026-08-18T22:00:00-04:00
  finding: Official Muxy manifest/events documentation supports a long-lived background script and permissionless same-extension extension.* events suitable for session-memory coordination.
- timestamp: 2026-08-18T23:10:00-04:00
  finding: Added src/background.js and src/session-broker.js. The broker retains only validated Gateway access tokens and Dashboard cookie snapshots in background-process memory, returning them only through same-extension events. It has no storage, file, network, or process API calls.
- timestamp: 2026-08-18T23:10:00-04:00
  finding: Gateway panel restores a previously verified connection and creates a fresh foreground RunController after panel recreation; closing the panel still ends live observation. Dashboard tabs restore and verify the saved cookie session, then reload the selected board. Explicit Forget connection and Log out clear their respective in-memory entries.
- timestamp: 2026-08-18T23:10:00-04:00
  finding: Primary panel and board copy now uses connection, sign-in, and board task language. Session-token, workspace-path, relay/journal, and panel-only credential language is absent from those flows.
- timestamp: 2026-08-18T23:10:00-04:00
  finding: Focused contract tests (21), full npm test (135), npm run build, and structural dist validation passed. Native UAT was intentionally not run because no credentials may be entered through automation.
- timestamp: 2026-08-19T02:20:00-04:00
  finding: The user selected Muxy's currently available per-extension persistent store as the session boundary. The broker now persists only validated Gateway connection data and allowlisted Dashboard session cookies under extension-owned keys; explicit Forget/Log out and authentication rejection delete them.
- timestamp: 2026-08-19T02:20:00-04:00
  finding: Saved Gateway credentials receive a lightweight authenticated capabilities check on restore and every five minutes while the idle panel is open. Dashboard cookies are verified through /api/auth/me on restore and every five minutes while the board is open; rotated cookies are saved again.
- timestamp: 2026-08-19T02:20:00-04:00
  finding: Native Muxy reload/UAT confirmed dedicated Gateway URL, Access token, Dashboard address, and Board name fields. The rebuilt board contains no session-token control and no filesystem/journal/mapping copy. Computer Use used accessibility actions and entered no text into the terminal.
- timestamp: 2026-08-19T02:20:00-04:00
  finding: Focused session/auth/UI/boundary tests passed 24/24; the full suite passed 136/136 with loopback fixture permission; build and two-build dist validation passed.

## Eliminated

- hypothesis: A background-memory-only session is sufficient product behavior.
  reason: The user requires browser-like persistence across app restarts, and Muxy explicitly isolates muxy.storage by extension ID.

## Resolution

- root_cause: Webviews owned both Gateway and Dashboard credentials, so their release handlers cleared each session on close; qualification-era implementation notes were rendered as primary UI copy. A stale loaded board build explained the obsolete session-token form.
- fix: Added a background session broker connected by same-extension events and backed by Muxy's extension-scoped persistent storage. Panels/tabs validate restored sessions, recheck them every five minutes while open, and clear them on authentication rejection or explicit Forget connection/Log out. Rewrote primary panel and board copy around user actions and outcomes, and build emits the declared background entry.
- verification: Focused session/auth/UI/boundary tests passed (24/24); full npm test passed (136/136); npm run build and two-build dist validation passed. Native reload/field UAT confirmed the rebuilt user-facing fields and absence of the obsolete session-token form without entering credentials.
- files_changed: package.json, vite.config.js, src/background.js, src/session-broker.js, src/dashboard-auth.js, src/panel/app.js, src/board/app.js, scripts/validate-dist.mjs, scripts/validate-phase.mjs, and regression tests.
