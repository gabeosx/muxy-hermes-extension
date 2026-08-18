---
quick_id: 260818-dr9
status: passed
verified: 2026-08-18
---

# Dashboard Authentication — Verification

## Verdict

PASS. The Kanban board is gated by a Hermes Dashboard user session verified through `/api/auth/me`; it no longer accepts or solicits a pasted session token.

## Automated evidence

- `node --test test/board-ui-contract.test.js test/phase-boundary.test.js test/dashboard-auth.test.js test/kanban-client.test.js test/curl-relay.test.js` — 24 passed, 0 failed.
- `npm test` — 130 passed, 0 failed with disposable loopback fixtures enabled.
- `npm run build` — production build passed.
- Tests cover provider discovery, invalid credentials, verified identity, session-cookie rotation, expiry, logout, OAuth-only refusal, secret-safe relay cleanup, authenticated board reads/mutations, and UI boundary copy.

## Bounded claims

- Password authentication is usable only when the Dashboard advertises a provider with `supports_password`.
- OAuth-only Dashboard authentication is detected but not completed inside Muxy; a secure native PKCE redirect/callback bridge is required before enabling it.
- This verification does not alter the separate Runs Gateway bearer flow or claim that Gateway bearer credentials are Dashboard user sessions.

