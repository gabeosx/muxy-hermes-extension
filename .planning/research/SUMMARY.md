# Project Research Summary

**Project:** Hermes Agent Extension for Muxy  
**Domain:** Deployment-neutral, security-sensitive Hermes Gateway control surface in a Muxy panel  
**Researched:** 2026-08-16  
**Confidence:** MEDIUM

## Executive Summary

This is an extension-only, transport-first feasibility proof for operating an existing Hermes Gateway from a native-feeling Muxy panel. The product must treat host-native Hermes, local Docker, an SSH local forward, and a direct remote HTTPS deployment as different ways an operator supplies a reachable authenticated endpoint—not as client modes. A remote Muxy workspace is a separate concern: it changes workspace identity and filesystem namespace, never the network contract. The single v1 contract is therefore `panel → authenticated Gateway URL → capabilities → runs/status/events`, with no Docker, SSH, shell, process, or deployment detection.

The recommended v1 is a strict TypeScript Muxy `WKWebView` panel using direct `fetch()` for authenticated JSON and incremental SSE parsing. It must obtain the exact WebKit `Origin`, prove preflight and the live SSE response both carry a narrow CORS allowlist, and capture a pinned Muxy/Hermes fixture set. `muxy.http.fetch` is not a fallback: it blocks loopback/private addresses and buffers bodies, while `EventSource` cannot attach Hermes's bearer header. If direct authenticated panel streaming cannot be safely proven, the correct v1 outcome is a reproducible negative transport verdict and a minimal Muxy streaming-bridge contract—not profiles, a sidecar, or product UI.

The key risks are trust and lifecycle, not REST endpoint availability. Bearer tokens authorize terminal/file-capable agent tools and must exist only in open-panel memory. CORS, TLS, CORS on the SSE response, version/capability drift, network interruption, and panel recreation need separate, observable verdicts. Hermes owns execution and terminal truth; the open panel owns only the live subscription, ephemeral secret, and approval surface. V1 may reconcile status after a reconnect or reopen, but must not promise lossless replay, closed-panel approval handling, or workspace-aware execution until their explicit decision gates are met.

## Key Findings

### Recommended Stack

Use Muxy's current vanilla Vite extension scaffold, pin its generated lockfile and tested Muxy build, and copy `package.json` into `dist/`. Keep v1 deliberately small: strict vanilla TypeScript, DOM `fetch`, `ReadableStream`/`TextDecoderStream`, `AbortController`, and a tiny fixture-tested SSE parser. No database, runtime helper, web framework, profile store, or secret-storage dependency belongs in the proof.

**Core technologies:**

- **Muxy panel (`WKWebView`)**: the only suitable native panel surface for DOM streaming and Muxy visual conventions.
- **Direct authenticated `fetch()`**: one request/event transport for all endpoint variants; supports `Authorization` and incremental `Response.body` reading.
- **In-repo SSE parser**: parses `event`, `data`, `id`, and frame boundaries under fixture control; avoids `EventSource`'s missing custom-header support.
- **Hermes Runs API and `/v1/capabilities`**: the authoritative client contract for run creation, status, events, approval, steer, stop, and feature negotiation.
- **Exact Gateway CORS configuration**: a required browser trust boundary, based on observed panel origin—not a UI preference.

### Deployment Matrix

| User-operated deployment | Same client contract | Variant-specific trust/lifecycle facts | V1 acceptance condition |
|---|---|---|---|
| Host-native Hermes | URL, bearer header, capabilities, runs, fetch-SSE, status reconciliation | Literal loopback HTTP may be considered only for the signed-off local WebKit experiment. | Exact-origin CORS and incremental stream proof. |
| Local Docker | Identical; Docker stays invisible to extension code. | Operator must publish a loopback port, not accidentally expose the Gateway to the LAN. Container paths are not host paths. | Same local transport proof; no Docker probing or commands. |
| SSH-tunneled remote Hermes | Identical URL contract, normally to a local forwarded port. | User owns tunnel lifecycle; a listening local port is not a healthy remote Gateway. Tunnel loss is a normal recoverable failure. | Authenticated capability/stream test, then bounded reconnect and status reconciliation. |
| Direct remote HTTPS | Identical protocol and capability gating. | Normal certificate and hostname validation are mandatory; remote HTTP and certificate bypass are forbidden. Proxy buffering must be tested. | Trusted HTTPS, exact CORS including SSE response, real incremental delivery. |
| Remote Muxy workspace | No transport branch; same selected endpoint. | Workspace path/identity is not evidence that the Gateway sees the same repository or filesystem. | Chat/run control only; no `cwd` or active-worktree execution claim. |

### Expected Features

**Must have (v1 table stakes):**

- One runtime-entered Gateway URL and bearer token, retained only while the panel is open.
- Safe URL validation, normalized connection diagnostics, authenticated capability discovery, and a recorded transport verdict.
- Capability-driven run start, structured token/tool/lifecycle display, explicit approval, and advertised steer/stop controls.
- Manual authenticated fetch-SSE parsing with bounded reconnect, deduplication where fixtures support it, and status-based reconciliation.
- Native Muxy theme, keyboard focus, reduced-motion behavior, least privilege, redacted errors, and versioned protocol fixtures.

**Should have after the proof:**

- Named, non-secret connection profiles and token-free preference storage.
- Explicit workspace mapping preview and policy, only with a validated server-side per-run `cwd` capability.
- A deliberately designed durable stream owner, closed-panel status/notifications, and production secret storage if the product later requires them.

**Defer / anti-features:**

- Deployment detection, Docker/Compose/SSH lifecycle management, host shell probing, automatic tunnel creation, and port publication.
- `muxy.http.fetch` as local/tunneled SSE transport, `EventSource` bearer workarounds, sidecars/helpers before a failed direct-transport gate, and background.js as an implicit stream owner.
- Wildcard, `null`, reflected CORS; remote plaintext HTTP; TLS/ATS or certificate bypass; token in URL/storage/logs/fixtures; auto-approval.
- Workspace path guessing, silent mapping, arbitrary `cwd`, and tool-capable active-worktree runs before Gateway-side validation.

### Architecture Approach

Build one deployment-neutral `GatewayClient` with swappable request/event transports, a conservative capability adapter, and an idempotent per-run projection. The direct WebKit transport is the sole v1 implementation; a bridge may later implement the same `EventTransport` interface only after a failed gate. Transport selection must follow an explicit recorded verdict, never URL topology. The panel handles presentation and open-session state; Hermes handles run execution, approvals, session state, cancellation, and terminal truth.

**Major components:**

1. **Panel shell and connection coordinator** — prompts for URL/token, validates endpoint policy, surfaces accessibility-safe state and diagnostics; owns no deployment logic.
2. **GatewayClient plus capability firewall** — canonicalizes capabilities and exposes only documented, advertised run controls; unknown means unavailable.
3. **RequestTransport and direct EventTransport** — send bearer-header requests and incrementally parse authenticated SSE with abort/timeout/reconnect controls.
4. **Run store / reconciler** — records bounded, deduplicated render state; `GET /v1/runs/{id}` is terminal authority after errors, gaps, and reopen.
5. **Post-v1 workspace resolver** — translates explicit mappings only when a Gateway-advertised contract validates the final `cwd` server-side.

### Critical Pitfalls

1. **Treating native HTTP as a universal transport** — it cannot carry loopback/private live SSE; prove the WebKit path directly and stop at a bridge contract if it fails.
2. **Guessing the panel origin or loosening CORS** — capture actual `Origin`, preflight, and live SSE headers; exact, stable, non-wildcard allowlisting is a hard gate.
3. **Downgrading remote trust** — allow plaintext only for literal loopback in the signed-off development proof; direct remote endpoints need normally trusted HTTPS, with no bypass or token retry.
4. **Assuming streams/transcripts are durable** — bound retries to an open, nonterminal run; reconcile with status and disclose replay gaps rather than claiming lossless recovery.
5. **Extending token or approval authority beyond the panel** — token stays in memory; pending approval is explicit only while the panel is open; background ownership is a separate future architecture.
6. **Conflating workspace paths with execution paths** — mappings are intent, not authorization; block tool-capable workspace execution until validated per-run `cwd` exists.

## Implications for Roadmap

### Phase 1: Transport, Trust, and Fixture Spike

**Rationale:** Direct authenticated WebKit streaming is the existential assumption and differs materially by endpoint trust class. No product layer reduces this risk.

**Delivers:** A publish-valid vanilla panel; panel-memory URL/token prompt; endpoint policy; authenticated `/v1/capabilities`; manual fetch-SSE probe/parser; diagnostics that distinguish URL, auth, CORS/preflight, SSE-response CORS, TLS, stream, and protocol failure; sanitized fixtures capturing Muxy/Hermes versions, actual Origin, headers, event frames, and timing.

**Addresses:** One ephemeral connection, preflight diagnosis, deployment-neutral diagnostics, capability snapshot, and transport-verdict fixture pack.

**Avoids:** Native HTTP/local-SSE misuse, broad CORS, token leakage, TLS downgrade, Docker/SSH management, and accidental Docker LAN exposure.

**Gate A — hard stop:** Against a pinned Gateway, the panel must send bearer-authenticated requests and receive incremental stream data with an exact safe origin on every claimed endpoint class. If the origin is unstable/unsafe or the stream is not viable, document the smallest Muxy bridge contract and stop v1 expansion.

### Phase 2: Capability-Driven Single-Run Control

**Rationale:** Once the transport is proven, Hermes's existing Runs API provides the smallest valuable slice without inventing backend behavior.

**Delivers:** `GatewayClient`, capability adapter, run state machine, structured token/tool/approval/lifecycle projection, advertised approval/steer/stop controls, explicit user approval, safe event validation/rendering, and terminal status reconciliation.

**Addresses:** Live run control, capability-driven UI, control semantics, native Muxy panel behavior.

**Avoids:** Hard-coded version assumptions, auto-approval, token-in-URL `EventSource` workarounds, and claiming stop succeeded before terminal state.

**Gate B:** Every visible control is currently advertised and exercised on the pinned fixture pair; absent/unknown capabilities suppress it. Capture what replay identifiers and duplicate semantics actually exist.

### Phase 3: Panel Lifetime and Recovery Proof

**Rationale:** The panel is not a durable run owner, and remote/tunnel conditions make interruption normal rather than exceptional.

**Delivers:** Capped reconnect with jitter while the panel lives; bounded event rendering; stream-generation/event dedupe; close/reopen/project-switch tests; fresh token entry; run-status reconciliation; explicit replay-window and pending-approval messaging.

**Addresses:** Recoverability evidence and truthful deployment-aware failure states.

**Avoids:** Background-stream assumptions, durable-token persistence, stranded approval automation, and false lossless-transcript promises.

**Gate C:** Product accepts panel-local ownership for v1. Otherwise fund a separately threat-modeled durable transport owner; do not repurpose background.js.

### Phase 4: Post-v1 Profiles and Safe Workspace Semantics

**Rationale:** Profiles and workspace execution are useful only after the protocol path is proven, and paths require server—not client—authorization.

**Delivers:** Token-free versioned profiles, explicit mapping UI, normalized longest-component-prefix resolution, translated-path preview, remote workspace identity, and an explicit unmapped policy.

**Addresses:** Multi-endpoint usability and future native/container/remote workspace clarity.

**Avoids:** Deployment type fields, profile-secret export, silent fallback to Gateway default, prefix traversal, and guessed `cwd`.

**Gate D:** Hermes must advertise and enforce a validated per-run `cwd`/allowed-root contract before any tool-capable workspace run. Until then, use `cwdPolicy: omit` and block that capability.

### Phase 5: Durable / Production Remote Support (Optional)

**Rationale:** Persistent credentials, closed-panel state, notifications, and a bridge each add a new trust owner and cannot be assumed from v1.

**Delivers:** Only after a design decision: one audited durable stream owner, secret-storage integration, TLS/auth-rotation policy, production remote observability, or a minimal streaming bridge behind the established transport interface.

**Gate E:** Select one ownership model with threat model, token lifetime, replay contract, and failure handling. Do not split run ownership between panel and background.

### Phase Ordering Rationale

- The order front-loads the only unproven contract: authenticated streaming from the real Muxy WebKit origin. It prevents profiles, mapping, and polished UI from becoming throwaway work.
- A shared `GatewayClient` keeps host-native, Docker, SSH, and remote HTTPS behavior identical while preserving their different operational obligations in diagnostics and acceptance tests.
- Lifecycle proof follows live control because status is authoritative only after a real run exists; workspace execution follows both because filesystem mapping is unrelated to transport and needs server enforcement.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** Required live spike. Verify actual Muxy WebKit Origin, CORS headers on preflight and SSE, PNA/ATS behavior, all five deployment test cases, proxy buffering, and exact Hermes event schema.
- **Phase 3:** Required fixture-led lifecycle research. Hermes manual-fetch cursor/`Last-Event-ID` behavior, duplicate keys, five-minute buffer boundaries, panel recreation, and approval visibility remain insufficiently specified.
- **Phase 4:** Required server-contract research. Validate Hermes per-run `cwd`, allowed roots, remote Muxy workspace identity APIs, symlink/canonicalization behavior, and mapping policy.
- **Phase 5:** Required security architecture research. Any bridge, background owner, keychain, notification, or production remote design changes the token and stream trust boundaries.

Phases with standard patterns (skip research-phase only after Phase 1 facts are pinned):

- **Phase 2:** Standard typed HTTP client, state-machine, safe text rendering, and accessibility patterns; use the captured protocol fixtures rather than new platform research.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | MEDIUM | Official Muxy, Hermes, and web APIs support the tools chosen; direct WKWebView CORS/SSE remains empirical. |
| Features | MEDIUM | Hermes documents capabilities and run controls; exact replay and lifecycle behavior need pinned fixtures. |
| Architecture | MEDIUM | The service-oriented client boundary cleanly reconciles every deployment, but direct transport and durable ownership are open gates. |
| Pitfalls | MEDIUM | Trust, storage, native HTTP, Docker/SSH, and TLS findings are well-supported; PNA and manual-fetch replay are evolving/under-specified. |

**Overall confidence:** MEDIUM. The architecture is intentionally conditional: it is strong precisely because it stops when the observable transport/trust evidence does not support its first assumption.

### Gaps to Address

- **Exact WebKit origin and local/private-network behavior:** Capture from the actual Muxy build; reject `null`, unstable, or non-allowlistable origins rather than broadening CORS.
- **SSE CORS and incremental delivery per route/deployment:** Test `/events` itself, including proxy behavior; a passing OPTIONS or JSON call is insufficient.
- **Replay semantics:** Do not send manual cursor headers or promise lossless recovery without Hermes fixture evidence for IDs, cursor format, duplicate behavior, and expiry.
- **Endpoint safety classification:** URL validation must distinguish literal loopback from remote destinations; address resolution/private-network behavior needs test coverage rather than heuristic deployment labels.
- **Panel recreation and run reattachment UX:** Establish whether and how an active `run_id` is discoverable after teardown without retaining a secret; token re-entry and server status remain mandatory.
- **Workspace execution:** No user mapping can authorize a remote/container path. Require advertised Gateway-side validation before sending `cwd`.
- **Remote production expansion:** Keychain support, token rotation, TLS posture, bridge SSRF/consent policy, and durable ownership require a separate threat model.

## Sources

### Primary (HIGH confidence)

- [Muxy extension HTTP](https://muxy.app/docs/extensions/http) — native HTTP constraints, private/loopback blocking, buffering, and panel availability.
- [Muxy extension panels](https://muxy.app/docs/extensions/panels) and [manifest](https://muxy.app/docs/extensions/manifest) — WKWebView panel and Vite/dist contracts.
- [Hermes API server and Runs API](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — bearer auth, explicit CORS, capabilities, runs, status, SSE, approval, steer, and stop.
- [MDN Fetch streaming](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) and [EventSource constructor](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource) — readable streamed fetch bodies and EventSource header limitations.
- [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — SSE framing and general last-event semantics.

### Secondary (MEDIUM confidence)

- [Apple App Transport Security](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity) and [WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler) — remote transport/TLS and custom-scheme context.
- [OpenSSH client configuration](https://man.openbsd.org/ssh_config) — local-forward lifecycle and exposure semantics.
- [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) and [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) — local exposure and distinct host/container paths.
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — strict CORS, client-side secret, and safe rendering principles.

### Tertiary (LOW confidence / validate in spike)

- [WICG Private Network Access](https://wicg.github.io/private-network-access/) — evolving local/private access rules.
- Hermes streaming-CORS issue #72892 — route-specific CORS regression evidence; validate against the pinned revision.

---
*Research completed: 2026-08-16*  
*Ready for roadmap: yes*
