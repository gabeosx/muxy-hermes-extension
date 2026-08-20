---
phase: 04-contract-and-attack-surface-cleanup
verified: 2026-08-20T20:14:15Z
status: passed
score: 5/5
behavior_unverified: 0
overrides_applied: 0
---

# Phase 4: Contract and Attack-Surface Cleanup Verification Report

**Phase Goal:** A reviewer can trace every shipped behavior and permission to the current password-session/WebSocket product contract, with no reachable historical bearer/SSE surface.
**Verified:** 2026-08-20T20:14:15Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The `hermes-agent` namespace supports password-provider login, allowlisted rotating sessions, fresh one-use tickets, and explicit unsupported OAuth/OIDC states. | ✓ VERIFIED | `package.json` fixes `name: hermes-agent`, `version: 0.1.0`; `DashboardAuthSession` discovers providers, accepts only `supports_password`, validates/rotates the three Hermes cookie families, and mints bounded tickets; `DashboardGatewayClient` mints anew for each connection and clears the URL/ticket immediately. Focused auth/reconnect tests passed. |
| 2 | Incompatible or malformed contracts, expired sessions, denied permissions, and missing optional plugins produce bounded safe troubleshooting states. | ✓ VERIFIED | Contract normalizers reject malformed providers, sessions, cookies, identities, tickets and relay output; expiry clears cookies; `CurlRelay` maps execution failures to fixed `relay_*` codes; panel/board error copy maps those codes to fixed prose. Unit coverage exercises expiry, malformed tickets, relay permission/launch failures, optional Kanban unavailability, and no sensitive diagnostics. |
| 3 | Import analysis proves the marketplace bundle excludes historical bearer, SSE journal, capability-probe, recovery-evidence, and phase-era product paths. | ✓ VERIFIED | `validateImportReachability()` walks both Vite entrypoints, requires every `src/*.js` module to be reachable, rejects legacy module names and legacy relay tokens. The observed 15-module graph exactly equals the source inventory. `npm run validate:dist` produced a deterministic 14-file allowlisted package with no forbidden historical artifact or token match. |
| 4 | The manifest contains only used command, panel/tab, and isolated-storage permissions; passwords and tickets never persist or enter argv. | ✓ VERIFIED | Manifest permits only `commands:exec`, `panels:write`, `tabs:write`, and isolated storage read/write. The relay passes cookies/request JSON through `stdin` to argv-form `/usr/bin/curl`; tests prove password absence from argv/environment. `SessionBroker` accepts only Dashboard URL, selected board, validated provider/identity metadata, and allowlisted session cookies. Gateway state/persisted session omit tickets. |
| 5 | Release documentation accurately freezes supported and excluded behavior, tested versions, security, privacy, and uninstall semantics. | ✓ VERIFIED | Shipped `README.md` has beta support matrix, recorded tuple (Muxy 1.5.0 (945), Hermes 0.20.2), password safety warning, permissions/rationale, privacy/no telemetry, troubleshooting, exclusions, compatibility policy, and rollback/uninstall behavior. `copy-manifest.mjs` copies the README into `dist/`; `validate-dist.mjs` checks byte equality. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | Marketplace identity, frozen manifest and least privilege | ✓ VERIFIED | Substantive manifest declares one panel, one tab type, two declarative commands, five required permissions, no background/events, and `engines.node: >=20`; copied into `dist/package.json` and compared exactly by the distribution validator. |
| `src/curl-relay.js` | Current authenticated Dashboard JSON relay with stdin-only secrets | ✓ VERIFIED | 177 lines of bounded argv/config construction, strict cookie parsing and sanitised error mapping; imported by `src/dashboard-auth.js`, exercised by auth, panel, board and qualification paths. |
| `src/dashboard-auth.js` and `src/dashboard-gateway.js` | Password session, ticket minting and WebSocket lifecycle | ✓ VERIFIED | Auth and socket logic are substantive and linked from `src/panel/app.js`; focused tests cover provider selection, cookie rotation, session expiry, ticket non-persistence and fresh-ticket reconnect. |
| `src/session-broker.js` | Extension-isolated validated session persistence | ✓ VERIFIED | Its only Dashboard storage path validates a versioned cookie/identity projection and is instantiated by both panel and board. Legacy `gateway.*` actions clear rather than read or migrate stale values. |
| `src/lib/dom.js` and `src/lib/icons.js` | Text-only DOM helper plus source-owned static SVG | ✓ VERIFIED | `dom.js` uses text nodes/attributes only and has no HTML setter. The sole `innerHTML` assignment is `icons.js` assigning the closed in-source `ICONS` map to a newly created SVG; panel imports the icon module for its static refresh glyph. |
| `scripts/validate-release.mjs` and `scripts/validate-dist.mjs` | Production-reachability and distribution allowlist proof | ✓ VERIFIED | Both are substantive validators. The release validator's graph begins at `src/main.js`/`src/board-main.js`; the dist validator follows built HTML/module references and rejects undeclared output. |
| `README.md` | Frozen release support, security, privacy and uninstall documentation | ✓ VERIFIED | 101 substantive lines; included in the built package and byte-compared with the source. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- |
| `src/main.js` | `src/panel/app.js` | `new HermesGatewayPanel(root).start()` | ✓ WIRED | Panel production entry imports and starts the real panel; no placeholder surface. |
| `src/panel/app.js` / `src/board/app.js` | `src/dashboard-auth.js` | Construct, discover, login, verify and persist `DashboardAuthSession` | ✓ WIRED | Both surfaces render provider/password state from the auth snapshot and clear transient password fields around login. |
| `src/dashboard-auth.js` | `src/curl-relay.js` | Default `new CurlRelay()` and `requestSessionJson()` | ✓ WIRED | Authentication, verification, logout and ticket calls all run through the constrained relay. |
| `src/panel/app.js` | `src/dashboard-gateway.js` | `DashboardGatewayClient` with `authSession.requestWebSocketTicket()` | ✓ WIRED | The panel connects only after a verified session; reconnect calls the same ticket-minting path. |
| `src/panel/app.js` / `src/board/app.js` | `src/session-broker.js` | `SessionBrokerClient` read/save/clear calls | ✓ WIRED | Session restore verifies the stored cookies with Hermes before recreating clients; expiry clears stored state. |
| `vite.config.js` / `scripts/copy-manifest.mjs` | `dist/` | Both panel/board entries plus package, README and static assets | ✓ WIRED | `npm run validate:dist` followed all emitted references and accepted only the 13 declared package files. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `HermesGatewayPanel` | `authSnapshot` | Provider/status/login responses through `DashboardAuthSession` and `CurlRelay` | Password form or explicit unsupported state reflects validated Dashboard data | ✓ FLOWING |
| `DashboardGatewayClient` | connection snapshot/events | Fresh ticket endpoint then live WebSocket JSON-RPC | Panel state and agent controller receive live connection/event data; reconnect test exercises the transition | ✓ FLOWING |
| `SessionBrokerClient` | persisted dashboard session | `window.muxy.storage`, schema-validated before use | Panel/board restore only a validated Dashboard projection, then reverify it | ✓ FLOWING |
| `validateDist` | emitted file inventory | Actual Vite build and package/asset copies | Validator compares manifest/README/assets/module references to real `dist/` output | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Password never enters curl argv | `node --test --test-name-pattern='Dashboard request uses argv-form curl with all secrets in stdin' test/curl-relay.test.js` | 1/1 passed | ✓ PASS |
| Login, cookie rotation and no OAuth fallback | `node --test --test-name-pattern='dashboard auth logs in, verifies identity, rotates cookies, and logs out\|ungated dashboards and OAuth-only dashboards never expose a token fallback\|dashboard auth mints a bounded WebSocket ticket' test/dashboard-auth.test.js` | 3/3 passed | ✓ PASS |
| Reconnect consumes a fresh ticket | `node --test --test-name-pattern='every reconnect mints a fresh ticket and reattaches the active live session' test/dashboard-gateway.test.js` | 1/1 passed | ✓ PASS |
| Manifest, static DOM boundary and docs contract | `node --test --test-name-pattern='marketplace identity, metadata, and permissions are frozen\|product source contains only the Dashboard session relay contract\|OAuth-only providers and password security boundaries are explicit' test/ui-contract.test.js` | 3/3 passed | ✓ PASS |
| Production graph and release secret scan | `node --test --test-name-pattern='production import graph contains only current Dashboard and Muxy modules\|release secret scanner returns file names only and finds no credential material' test/release-validator.test.js` | 2/2 passed | ✓ PASS |
| Full regression suite | `npm test` | 77/77 passed twice on the final stable tree. The sandbox's initial loopback bind denial was environmental (`EPERM`); the same suite passed outside it with its loopback fixture. | ✓ PASS |
| Deterministic marketplace package | `npm run validate:dist` | Deterministic 14-file package validated | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| CONT-01 | 04-01 | `hermes-agent@0.1.0`; no old namespace read/migration | ✓ SATISFIED | Source and copied manifest freeze the name/version. The broker does not read or migrate Gateway storage; its legacy handler deletes only its stale key. |
| CONT-02 | 04-01 | Provider-advertised password sign-in and transient password | ✓ SATISFIED | Provider validation gates login; relay body is stdin-only; auth/panel/board clear password values; focused auth and relay tests pass. |
| CONT-03 | 04-01 | Explicit OAuth/OIDC-only unsupported state | ✓ SATISFIED | `discover()` publishes `oauth_required` when no provider supports passwords, and both UI surfaces render unsupported/password-only guidance; test passes. |
| CONT-04 | 04-01 | Allowlisted rotating sessions and fresh one-use tickets | ✓ SATISFIED | Strict cookie allowlist/merge, reverify-on-restore, ticket shape/TTL validation and fresh reconnect minting are code- and behavior-tested. |
| CONT-05 | 04-01 | Bounded safe states for expiry, optional plugin, denial and malformed responses | ✓ SATISFIED | Bounded `DashboardAuthError`/`relay_*` codes, panel/board fixed copy, auth/operations/Kanban tests and full suite pass. |
| CONT-06 | 04-01 | Dashboard-only curl relay, stdin-only secrets | ✓ SATISFIED | Relay exposes only `requestSessionJson`, forms config over stdin and forbids historical bearer/SSE tokens; argv boundary test passes. |
| CONT-07 | 04-01 | Remove production-dead historical product surface after reachability proof | ✓ SATISFIED | Commit `ccf2b6a` removed legacy product modules; current import validator requires all source modules reachable and rejects forbidden names; dist allowlist passes. |
| CONT-08 | 04-01 | No dynamic DOM HTML, source-owned SVG icons only | ✓ SATISFIED | DOM helper cannot set HTML; the only HTML sink receives closed static strings from the icon module; UI contract test passes. |
| CONT-09 | 04-01 | Only used command/panel/tab/storage permissions | ✓ SATISFIED | Exact permission-array and no-background/no-events assertions pass in both UI and dist validation. |
| CONT-10 | 04-01 | Support, version, security, privacy, troubleshooting and uninstall docs | ✓ SATISFIED | README covers every listed release topic and is shipped/byte-verified in `dist`. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/lib/icons.js` | 21 | `innerHTML` | ℹ️ Reviewed | The assignment is deliberately limited to two closed, source-owned SVG path strings. `dom.js` contains no HTML-setting API and user/server strings flow through text nodes. |
| `src/session-broker.js` | 1, 95–99 | legacy `gateway` storage identifier | ℹ️ Reviewed | This is a deletion-only compatibility scrub, not a read or migration of the old extension namespace. |

### Disconfirmation Pass

- **Plan deviation checked:** the planned separate `SUPPORT.md` was consolidated into the shipped README. The roadmap requires the documentation content, not that filename; README supplies every required section and is included in `dist`.
- **Misleading-test risk checked:** source-text assertions alone could miss bundling. `validate-dist` performs a real Vite build twice, follows emitted HTML/module references, and rejects undeclared output; it passed.
- **Uncovered-error-path check:** provider discovery relay failures reach the panel's catch path and are reduced by `authErrorCopy()` to fixed troubleshooting prose. The relay's unknown/rejected-result cases are separately unit-tested for sanitisation; no raw command output reaches the UI.

### Human Verification Required

None. The Phase 04 contract behaviors have targeted automated coverage; visual/native integration work is separately qualified in Phase 6.

### Gaps Summary

No implementation gaps block the Phase 04 goal. Consolidating the planned support content into the shipped README leaves no missing required capability or document; no override is needed.

---

_Verified: 2026-08-20T20:14:15Z_
_Verifier: the agent (gsd-verifier)_
