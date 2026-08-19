---
status: resolved
trigger: "I put in http://127.0.0.1:9119 and Default board and it doesn't seem to be working"
created: 2026-08-18
---

# Board at 127.0.0.1:9119 does not connect

## Expected

Entering the running Hermes Dashboard address and the `Default` board should discover the Dashboard's supported sign-in provider, then show the username/password form.

## Actual

The board remains disconnected and says that the Hermes board could not be reached.

## Evidence

- `http://127.0.0.1:9119/api/status` responds `200` with Hermes `0.20.1`, `auth_required: true`, and the `basic` provider.
- `http://127.0.0.1:9119/api/auth/providers` responds `200` with the Username & Password provider.
- Muxy's extension audit records an allowed curl request to `/api/status`, followed by cleanup, but no request to `/api/auth/providers`.
- `dist/logs/output.log` records a background-script syntax error caused by a static `import` in `dist/background.js`.
- `Default` is normalized to the valid board slug `default`; the board name is not the cause.
- The corrected live request records both `/api/status` and `/api/auth/providers` in Muxy's audit log, and the Board renders the Username & Password sign-in form.

## Current hypothesis

Two extension defects caused the failure:

1. Dashboard discovery wrote curl's headers and body to temporary workspace files, then failed before the provider request when reading across Muxy's command/file boundary.
2. Session persistence depended on a background script that Vite code-split into an ES module, while Muxy's background host accepts a classic script.

## Next checks

- Parse bounded Dashboard response headers and JSON directly from curl stdout, avoiding the temporary file boundary.
- Use Muxy's per-extension storage directly from panel and board webviews, which removes the unnecessary background runtime.
- Reload the extension and verify that Check sign-in reaches the provider form without entering credentials.

## Resolution

- **Root cause:** Dashboard discovery relied on temporary response files that were not readable after the successful Muxy-managed curl; saved sessions additionally depended on an unsupported ES-module background entry.
- **Fix:** Parse response headers and JSON from bounded curl stdout, and access Muxy's isolated extension storage directly from the Board and Gateway panel.
- **Verification:** `npm test`, `node scripts/validate-dist.mjs`, and native Muxy UAT all pass. The running dashboard at `http://127.0.0.1:9119` now displays the Username & Password sign-in form for the default board.
