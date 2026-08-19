---
quick_id: 260819-oji
status: passed
verified: 2026-08-19
---

# Verification: Dashboard session and transparent agent connection

## Must-have results

| Requirement | Result | Evidence |
|---|---|---|
| Ordinary users never enter `API_SERVER_KEY` or a WebSocket ticket | Passed | `src/panel/app.js` presents only the Dashboard address and advertised sign-in provider fields; UI contract tests reject token/internal copy. |
| Dashboard cookies are the sole durable authentication material | Passed | `src/session-broker.js` allowlists only the Dashboard cookie family; legacy Gateway save/read support was removed and tested. |
| Every connection attempt uses a new single-use ticket | Passed | `DashboardGatewayClient.#open()` calls `requestWebSocketTicket()` immediately before constructing each WebSocket; reconnect tests prove distinct tickets. |
| Reconnect is automatic and bounded | Passed | Saved-session restore and connection ownership are coalesced, socket events use WebKit's reliable listener path, and a capped retry schedule, open timeout, focus recovery, and fresh-ticket retries are covered by gateway tests. |
| Only an authoritative Dashboard 401/403 signs the user out | Passed | Auth and gateway tests distinguish primary-session rejection from ticket/network/socket failures. |
| Connection state is understandable and contains no implementation jargon | Passed | Panel contract tests cover `Connected`, `Reconnecting`, `Offline — retrying`, `Signed out`, and the no-action reconnect message. |
| Agent work uses supported Hermes JSON-RPC methods | Passed | Tests cover `session.create`, `prompt.submit`, `approval.respond`, `session.steer`, `session.interrupt`, `session.activate`, and `session.resume`. |
| The publishable extension stays within least privilege | Passed | Manifest contains only command execution for the authenticated relay, panel/tab access, and extension-scoped storage; build validation passed. |

## Automated gates

- Focused final transport and panel suite: 20 passed, 0 failed.
- Full suite: 158 passed, 0 failed with loopback fixture access.
- Full aggregate validation: passed (`Phase 3 recovery proof validation passed`).
- Publishable `dist/` validation: 12 declared files, stable across two clean builds.
- Source and distribution secret/internal-copy checks: passed.

## Native Muxy observation

After a build and extension reload, the command palette exposed **Hermes: Toggle Agent Panel**. Opening the panel restored the saved `gabe` Dashboard session at `http://127.0.0.1:9119`, reached `Connected`, stayed there beyond the 15-second open timeout, and enabled the request composer without showing any credential or ticket field.

Closing and reopening the panel restored the same primary sign-in while Hermes accepted a fresh socket. The final Muxy before-close path closed the previous socket cleanly with code 1000 and reason `panel closed`. Earlier UAT exposed and then resolved a WebKit listener-path failure that had left Hermes's accepted socket open while the panel incorrectly displayed `Offline — retrying`.

This proves the real saved-session → ticket mint → `/api/ws` path for the configured loopback Dashboard. A real prompt was not submitted, and direct remote HTTPS was not claimed.

## Verdict

Passed. The requested transparent session/ticket design is implemented, packaged, and connected through the native Muxy panel. Live work remains intentionally owned by the open panel.
