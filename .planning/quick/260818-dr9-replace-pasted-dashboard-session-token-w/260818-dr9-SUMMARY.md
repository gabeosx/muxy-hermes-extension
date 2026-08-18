---
quick_id: 260818-dr9
status: complete
completed: 2026-08-18
commits:
  - 7390deb
  - 2129ba2
  - 7c8ecf0
---

# Outcome

The Hermes Project Board no longer asks for a Dashboard session token. It now discovers the Dashboard's advertised authentication providers, offers username/password only for providers that support it, verifies the resulting session through `/api/auth/me`, and visibly represents checking, logged-in, expired, logged-out, OAuth-required, and unavailable-auth states.

# Implementation

- Added a Dashboard session relay that carries credentials and allowlisted Hermes cookies only through curl config stdin. Temporary response headers and bodies are bounded, parsed, scrubbed, and removed on success or failure.
- Added provider discovery, password login, cookie rotation, identity verification, expiry handling, and best-effort server logout with unconditional local secret clearing.
- Converted the Kanban client from caller-supplied bearer authentication to a verified Dashboard session.
- Replaced the board's token field with a URL-first authentication flow, provider selector, username/password form, visible session status, and Logout action.
- Expanded the disposable Kanban fixture to model Hermes provider discovery, HttpOnly sessions, identity, expiry, and logout.

# Security boundary

- The Runs Gateway `API_SERVER_KEY` remains a separate operator credential and is unchanged.
- Dashboard credentials and cookies are not written to argv, URLs, Muxy storage, logs, evidence, or built assets.
- OAuth-only providers are identified honestly. Native PKCE/callback support remains future work; there is no imported-secret fallback.

# Verification

- Focused authentication, relay, Kanban, UI-contract, and phase-boundary suites: 24/24 passed.
- Full repository suite: 130/130 passed, including disposable loopback session and Kanban fixtures.
- `npm run build`: passed; both panel and board production bundles were generated.

