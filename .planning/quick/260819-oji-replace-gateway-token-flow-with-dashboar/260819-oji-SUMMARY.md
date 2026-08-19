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
- Matched Hermes's browser client lifecycle in Muxy's WebKit panel by using one-shot `addEventListener` open/error handlers, separate connect/RPC/prompt timeouts, and a native before-close cleanup hook.
- Coalesced saved-session restore and generation-scoped connection ownership so focus/open races cannot leave a healthy socket controlled by stale UI state.
- Added a panel agent model for session creation, prompt submission, streamed assistant and tool activity, explicit approvals, guidance, and stop.
- Replaced the operator-oriented Gateway URL/API-key interface with a user-facing Dashboard address and provider-advertised username/password sign-in.
- Persisted only allowlisted Dashboard session cookies in Muxy's isolated extension store. Passwords remain transient, and the obsolete saved Gateway bearer record is erased and cannot be restored.
- Added clear `Connected`, `Connecting`, `Reconnecting`, `Offline — retrying`, and `Signed out` states. Reconnects need no user action unless Hermes rejects the primary session.
- Removed unused workspace file permissions and the `file.changed` subscription from the shipped extension.

## Verification

- Focused final transport and panel suite — 20/20 passed.
- `npm test` — 158/158 passed with the loopback fixtures enabled.
- `npm run validate` — passed, including the full test suite, build, distribution validation, authority checks, and recovery evidence checks.
- `node scripts/validate-dist.mjs` — passed across two clean sequential builds.
- Native Muxy UAT at `http://127.0.0.1:9119` — the saved Dashboard session restored to a stable `Connected` state, remained connected beyond the open timeout, and reopening established a fresh authenticated connection without another credential prompt. The final lifecycle hook closed the old socket with code 1000 and reason `panel closed`.

The native check intentionally did not submit a real agent prompt or invalidate the user's live Dashboard session. Prompt/control/event projection, reconnect, timeout, and authentication-rejection paths are covered by the protocol tests. Direct remote HTTPS remains unverified because its WebSocket Origin policy depends on the upstream deployment.

## Commits

- `f94634a` — Dashboard ticket and WebSocket transport
- `d18d894` — unified agent panel, storage migration, UI, and validation
- `9aa563c` — WebKit socket lifecycle, restore ownership, user-facing recovery reasons, and timeout hardening

## Deviations

The first native pass exposed a WebKit-specific socket lifecycle failure after Hermes had accepted the upgrade. The final client uses the same event-listener shape as Hermes's browser client and passed a stable open plus clean close/reopen cycle. UAT used the user's already-saved Dashboard session but avoided starting a paid or tool-capable Hermes run. No product behavior was deferred.
