---
status: resolved
trigger: "I'm trying to login and view a board but it's not working"
created: 2026-08-19
---

# Accepted Dashboard login does not open the board

## Expected

Entering valid credentials for `http://127.0.0.1:9119` and board `default` should verify the new Dashboard session, load the board, and persist the validated session in Muxy's extension-scoped storage.

## Actual

Hermes accepts the credentials, but the extension returns to the logged-out connection view and does not request the board.

## Evidence

- Muxy's extension audit records `POST /auth/password-login` for each user attempt.
- Hermes's redacted authentication audit records `login_success` at the matching timestamps: 20:18:21, 20:18:33, 20:18:39, and 20:18:49 UTC.
- After each successful login POST, Muxy's audit contains no `GET /api/auth/me` and no Kanban board request.
- Hermes 0.20.4's installed route returns HTTP 200 JSON and sets session cookies on password-login success.
- The extension's `DashboardAuthSession.login()` only stops between that response and `/api/auth/me` when the response relay fails to return an accepted access-token cookie.
- No passwords, session tokens, or identity values were read during diagnosis.

## Resolution

- **Root cause:** Hermes's Python cookie serializer wraps URL-safe base64 session values that end in `=` in double quotes. The relay treated the quotes as part of the value, rejected them against its strict token allowlist, and stopped before `/api/auth/me`.
- **Fix:** The relay now accepts only a bare allowlisted value or one double-quoted allowlisted value, normalizes the latter to the bare value, and still rejects escapes or other cookie syntax. It also preserves Hermes's full session-cookie family, including the provider routing hint and `__Host-`/`__Secure-` names.
- **Verification:** Focused relay/auth/storage tests pass; the full `npm test` suite and `npm run build` pass. A fresh Board tab must be opened after reloading the extension before the user signs in; no passwords or session tokens were read during this investigation.
