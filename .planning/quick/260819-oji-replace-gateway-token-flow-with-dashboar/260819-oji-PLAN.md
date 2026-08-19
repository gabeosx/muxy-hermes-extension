---
quick_id: 260819-oji
mode: quick-full
description: Replace Gateway token flow with Dashboard-session WebSocket tickets and transparent reconnect
must_haves:
  truths:
    - "The Hermes panel asks for one Dashboard address and the Dashboard's advertised sign-in credentials; it never asks an ordinary user for API_SERVER_KEY or a WebSocket ticket."
    - "A verified Dashboard session is shared through Muxy's isolated extension storage, while usernames, passwords, and single-use WebSocket tickets remain transient."
    - "Every WebSocket connection attempt mints a fresh single-use ticket immediately before opening /api/ws; an established socket is not periodically renewed."
    - "Network loss, sleep, and panel-focus recovery reconnect automatically with one in-flight attempt, capped exponential backoff, and a fresh ticket without user action."
    - "Only an authoritative 401/403 from the authenticated Dashboard session path clears the saved session and returns the panel to sign-in."
    - "The panel shows user-facing Connected, Reconnecting, Offline, and Signed out states without exposing relay, cookie, ticket, JSON-RPC, or filesystem terminology."
    - "Run submission, streamed assistant/tool activity, approvals, steering, and stop use Hermes's supported TUI Gateway JSON-RPC methods over /api/ws."
  artifacts:
    - path: src/dashboard-auth.js
      provides: Authenticated single-use ticket minting and rotating Dashboard-session persistence
    - path: src/dashboard-gateway.js
      provides: Bounded JSON-RPC WebSocket client, reconnect state machine, and live-session reattachment
    - path: src/dashboard-agent.js
      provides: Hermes session, prompt, streamed event, approval, steer, and stop model
    - path: src/panel/app.js
      provides: Unified Dashboard sign-in and transparent connection UI
  key_links:
    - from: src/panel/app.js
      to: src/dashboard-auth.js
      via: restored or newly verified Dashboard session is the sole durable authentication source
    - from: src/dashboard-gateway.js
      to: src/dashboard-auth.js
      via: each socket attempt calls requestWebSocketTicket immediately before new WebSocket
    - from: src/dashboard-agent.js
      to: src/dashboard-gateway.js
      via: session.create/activate/resume, prompt.submit, approval.respond, session.steer, and session.interrupt RPCs
    - from: src/panel/app.js
      to: src/session-broker.js
      via: rotated Dashboard cookies are saved after login, verification, and every ticket mint while legacy Gateway bearer storage is cleared
---

# Quick task 260819-oji

Replace the operator-oriented API Server key and `/v1/runs` SSE panel with the same authenticated Dashboard backend used by the board, then make WebSocket ticket minting and reconnect invisible during normal use.

## Task 1: Add the authenticated ticket and WebSocket transport contract

**Files:** `src/dashboard-auth.js`, `src/dashboard-gateway.js`, `test/dashboard-auth.test.js`, `test/dashboard-gateway.test.js`

**Action:** Add an authenticated `POST /api/auth/ws-ticket` method that accepts only Hermes's bounded `{ ticket, ttl_seconds }` response, rotates allowlisted session cookies, and never publishes or persists the ticket. Implement a browser WebSocket JSON-RPC client for `/api/ws?ticket=...` with bounded message parsing, request IDs/timeouts, event subscriptions, one in-flight connect, and automatic reconnect using a fresh ticket on every attempt. Treat ticket-endpoint 401/403 as a terminal signed-out state; treat network, socket, and ticket-consumption failures as recoverable connection failures. Reconnect with capped exponential backoff, reset after a successful open, and reattach an existing live session with `session.activate`, falling back to `session.resume` using its stored session id when necessary. Do not refresh a ticket while the socket remains open.

**Verify:** `node --test test/dashboard-auth.test.js test/dashboard-gateway.test.js`

**Done:** Tests prove tickets are single-attempt, transient, freshly minted after disconnect, never included in snapshots/storage/errors, concurrent connects coalesce, backoff is capped, and auth rejection is the only path to signed out.

## Task 2: Replace the Gateway-key run surface with the unified Dashboard session

**Files:** `src/dashboard-agent.js`, `src/panel/app.js`, `src/styles/global.css`, `src/session-broker.js`, `package.json`, `test/dashboard-agent.test.js`, `test/ui-contract.test.js`, `test/session-broker.test.js`, `test/phase-boundary.test.js`, `scripts/validate-phase.mjs`

**Action:** Rewrite the compact panel around the saved Dashboard session already shared with the board. Restore and verify it on open/focus; otherwise discover advertised providers and show the existing username/password flow. After authentication, automatically connect the JSON-RPC socket and present a small native status indicator: Connected at rest, a double-arrow Reconnecting state during recovery, Offline during delayed retries, and Signed out only after session rejection. Preserve the current transcript/activity/approval/steer/stop value by mapping `session.create`, `prompt.submit`, event envelopes, `approval.respond`, `session.steer`, and `session.interrupt` into a bounded panel model. Preserve content while reconnecting and reattach the live session before accepting new input. Save rotated session cookies after every successful verification/ticket request, clear credentials after each attempt, erase legacy saved Gateway API keys, and make logout revoke then clear the Dashboard session. Remove file-journal permissions/events no longer used by the shipped surfaces and update validation gates to the new supported contract.

**Verify:** `node --test test/dashboard-agent.test.js test/ui-contract.test.js test/session-broker.test.js test/phase-boundary.test.js && npm test && npm run build && npm run validate`

**Done:** The ordinary user configures one Hermes Dashboard address, signs in once, runs Hermes through `/api/ws`, and sees automatic connection recovery without ever handling a Gateway key or ticket.

## Task 3: Package and exercise the native loopback path

**Files:** `dist/**`, `test/ui-contract.test.js`, `.planning/quick/260819-oji-replace-gateway-token-flow-with-dashboar/260819-oji-VERIFICATION.md`

**Action:** Build and validate the publishable `dist/`, reload the unpacked extension, and exercise the configured `http://127.0.0.1:9119` Dashboard in a fresh Muxy panel. Confirm saved-session restore or user-entered sign-in, automatic ticket mint, `/api/ws` connection, one prompt with streamed events, forced reconnect using a fresh ticket, and signed-out transition only after an invalidated primary session. Record any server/version limitation truthfully; direct HTTPS remains unverified if Hermes rejects Muxy's non-web WebSocket Origin.

**Verify:** `node scripts/validate-dist.mjs && npm test && npm run build && npm run validate`

**Done:** Automated gates pass and native UAT establishes the bounded local result without exposing credentials, cookies, or ticket values.

## Threat model

- Passwords are submitted only to the selected Dashboard's advertised password-login endpoint and cleared immediately; they are never logged or stored.
- Allowlisted Dashboard session cookies may persist only through `muxy.storage`; a successful authenticated response may rotate them, and 401/403 clears them.
- WebSocket tickets are minted just-in-time, used once in the required upgrade URL, held only in a local variable, and never stored, logged, rendered, retried, or reused.
- WebSocket frames are untrusted: bound size/depth/text fields, require JSON-RPC envelopes, correlate responses to locally generated request IDs, and render all content as DOM text.
- Only allowlisted Hermes RPC methods are called. Approval choices are allowlisted and never auto-approved.
- Do not weaken TLS or Hermes Origin/Host protections. Loopback HTTP remains allowed; non-loopback requires HTTPS and an upstream-compatible WebSocket Origin policy.
- The open panel remains the live transport owner. Closing it ends live updates; reopening uses the saved primary session but does not claim durable background ownership.
