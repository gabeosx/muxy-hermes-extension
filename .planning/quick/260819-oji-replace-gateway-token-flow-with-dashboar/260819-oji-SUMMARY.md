---
quick_id: 260819-oji
status: complete
completed: 2026-08-19
---

# Replace Gateway-token setup with one Hermes sign-in

The Hermes agent panel now uses the same verified Dashboard session as the project board. A user signs in once, and the extension transparently mints a short-lived, single-use credential whenever it opens or reopens the live Hermes connection.

## Completed work

- Added authenticated `POST /api/auth/ws-ticket` support without rendering, logging, or persisting the returned ticket.
- Added a bounded `/api/ws` JSON-RPC client with correlated requests, connection timeouts, automatic retry, fresh-ticket reconnects, and live-session reattachment.
- Added a panel agent model for session creation, prompt submission, streamed assistant and tool activity, explicit approvals, guidance, and stop.
- Replaced the operator-oriented Gateway URL/API-key interface with a user-facing Dashboard address and provider-advertised username/password sign-in.
- Persisted only allowlisted Dashboard session cookies in Muxy's isolated extension store. Passwords remain transient, and the obsolete saved Gateway bearer record is erased and cannot be restored.
- Added clear `Connected`, `Connecting`, `Reconnecting`, `Offline — retrying`, and `Signed out` states. Reconnects need no user action unless Hermes rejects the primary session.
- Removed unused workspace file permissions and the `file.changed` subscription from the shipped extension.

## Verification

- `node --test test/dashboard-auth.test.js test/dashboard-gateway.test.js test/dashboard-agent.test.js test/session-broker.test.js test/ui-contract.test.js test/phase-boundary.test.js` — 33/33 passed.
- `npm run validate` — passed, including the full test suite, build, distribution validation, authority checks, and recovery evidence checks.
- `node scripts/validate-dist.mjs` — passed across two clean sequential builds.
- Native Muxy UAT at `http://127.0.0.1:9119` — the saved Dashboard session restored, the panel moved from `Connecting…` to `Connected`, and reopening established a new authenticated connection without another credential prompt.

The native check intentionally did not submit a real agent prompt or invalidate the user's live Dashboard session. Prompt/control/event projection, reconnect, timeout, and authentication-rejection paths are covered by the protocol tests. Direct remote HTTPS remains unverified because its WebSocket Origin policy depends on the upstream deployment.

## Commits

- `f94634a` — Dashboard ticket and WebSocket transport
- `d18d894` — unified agent panel, storage migration, UI, and validation

## Deviations

The native UAT used the user's already-saved Dashboard session and exercised a real ticket-backed connection, but avoided starting a paid or tool-capable Hermes run. No product behavior was deferred.
