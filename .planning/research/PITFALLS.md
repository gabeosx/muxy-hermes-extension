# Domain Pitfalls

**Domain:** Deployment-neutral Hermes Gateway control surface for a Muxy desktop extension  
**Researched:** 2026-08-16  
**Overall confidence:** MEDIUM — current primary documentation was cross-checked; the exact Muxy WebKit origin and each pinned Hermes stream path require an executable spike.

## Critical Pitfalls

### Pitfall 1: Treating every Gateway URL as an equivalent HTTP target

**Confidence:** MEDIUM (verified against current Muxy, Hermes, Apple, and web-platform documentation)

**What goes wrong:** The extension uses `muxy.http.fetch` for all connections, or treats local Docker and SSH-tunneled `127.0.0.1` as a small configuration variation of direct remote HTTPS. Muxy rejects loopback and private targets before consent, including resolved aliases and redirects; its API returns a buffered body rather than an incremental stream. Browser `fetch` from the panel is therefore the only candidate for local SSE, but it is subject to WebKit origin/CORS/ATS behavior.

**Why it happens:** The native HTTP bridge is attractive because it bypasses ordinary CORS for public hosts. That does not make it a general transport or an SSE bridge.

**Consequences:** Host-native, Docker, and SSH-tunnel variants fail after the UI is built; developers may respond by exposing a local Gateway on the LAN or by adding an unsafe native bridge.

**Warning signs:** `http: blocked request to private or loopback host`; a request succeeds but the transcript appears only at completion; an alias hostname is blocked after DNS resolution; background code cannot call `muxy.http`.

**Prevention:** Define two explicit transports: direct panel `fetch` as a **gated** candidate for the single development endpoint, and `muxy.http` only for non-private, non-streaming calls where its consent model is suitable. Do not add a bridge until the direct WebKit experiment has an explicit failure verdict and a minimal bridge contract. Never make address class or URL shape select product behavior.

**Validation test:** For each supported endpoint class, run `/v1/capabilities`, `POST /v1/runs`, authenticated `GET /events`, and stop/approval against the exact panel build. Record which API executed the request, timing of the first event, raw error, target address, Muxy version, and Hermes revision. Assert that `muxy.http.fetch('http://127.0.0.1:…')` is rejected and that the panel stream is truly incremental.

**Affected deployment variants:** Host-native; local Docker; SSH-tunneled remote Hermes; any private/LAN Gateway. Direct remote HTTPS is also affected if the user enters an address that resolves private.

**Phase that must address it:** Phase 1 — transport feasibility, before panel UI or profiles.

Sources: [Muxy HTTP](https://muxy.app/docs/extensions/http) (MEDIUM), [Muxy permissions](https://muxy.app/docs/extensions/permissions) (MEDIUM), [Hermes API server](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) (MEDIUM).

### Pitfall 2: Guessing a safe custom-scheme Origin or using permissive CORS

**Confidence:** MEDIUM — the need for the experiment is HIGH; the Muxy-specific wire origin is intentionally unverified.

**What goes wrong:** Hermes is configured with `*`, a broad `null` policy, an assumed `muxy-ext://…` origin, or a copied localhost origin before the panel’s actual `Origin` and preflight have been captured. A bearer-authenticated Hermes API controls terminal and file tools, so CORS is part of the trust boundary, not a developer-experience setting. A recent Hermes issue also shows a streaming route can pass OPTIONS yet omit `Access-Control-Allow-Origin` on the SSE response itself.

**Why it happens:** WKWebView custom-scheme resources are host-provided and Apple does not define Muxy’s particular origin serialization. It is tempting to "fix" a failed preflight with wildcards or an ATS exception.

**Consequences:** Any web content granted the broad origin can issue privileged requests, or the proof incorrectly passes capability discovery but fails when the browser reads the stream.

**Warning signs:** Console reports `Origin: null`; OPTIONS is 204/200 but the stream is blocked; requests work from `curl` but not the panel; `Access-Control-Allow-Origin: *` appears on an authenticated endpoint; different Muxy builds send different origins.

**Prevention:** Start the Gateway with CORS disabled, capture the real Origin plus OPTIONS and GET response headers, then permit one exact origin only if it is stable and specific. Require `Access-Control-Allow-Origin` on every browser-visible response, including SSE and error responses; allow the request method and `Authorization` in preflight. If the origin is `null`, unstable, or cannot be safely allowlisted, stop the direct path and document the smallest required Muxy-owned bridge rather than weakening CORS. Do not send bearer tokens in an SSE query string or URL.

**Validation test:** A fixture test must make preflight and authenticated stream requests from the panel, assert the exact request Origin, exact non-wildcard ACAO, allowed `Authorization`, and ACAO on the live SSE response. Repeat after Muxy/Hermes upgrades and test a hostile non-allowed origin receives no readable response.

**Affected deployment variants:** All five; highest impact for local endpoints because a custom-origin allowlist is the only browser gate.

**Phase that must address it:** Phase 1 — transport and trust-boundary gate.

Sources: [Hermes API server CORS and runs](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) (MEDIUM), [current Hermes streaming-CORS issue](https://github.com/NousResearch/hermes-agent/issues/72892) (MEDIUM), [Apple WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler) (MEDIUM), [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) (MEDIUM).

### Pitfall 3: Downgrading remote trust to make a connection work

**Confidence:** MEDIUM (current Apple and Hermes primary docs)

**What goes wrong:** The extension accepts `http://` for a remote/Gateway URL, disables certificate validation, tells users to accept any self-signed certificate, or changes Muxy/host ATS globally. It may also use a URL hostname that does not match the certificate SAN.

**Why it happens:** Loopback development is commonly plain HTTP and an SSH tunnel legitimately terminates in loopback, which makes the remote/direct distinction easy to blur.

**Consequences:** The bearer token and full agent-control API can be intercepted; an attacker can impersonate the Gateway and receive approvals or run requests.

**Warning signs:** ATS/TLS trust errors; users suggest `NSAllowsArbitraryLoadsInWebContent`; a URL uses a raw IP with a DNS-only certificate; certificate errors are hidden behind a generic connection failure.

**Prevention:** Permit plain HTTP only for literal loopback (`127.0.0.1`, `[::1]`, `localhost`) in the development proof; require HTTPS with normal platform trust and hostname validation for direct remote endpoints. Treat an SSH local forward as loopback only after the user establishes it—its remote leg remains SSH's trust boundary. Provide no certificate-bypass control, no global ATS exception, and no token retry over downgraded transport.

**Validation test:** Test valid HTTPS, expired/untrusted certificate, hostname mismatch, direct remote HTTP, and loopback HTTP. The first three must fail closed without submitting `Authorization`; direct remote HTTP must be rejected by the URL validator; loopback HTTP may proceed only through the signed-off transport experiment.

**Affected deployment variants:** Direct remote HTTPS (primary); SSH tunnel (remote-leg verification); host-native/Docker if users publish them through a reverse proxy.

**Phase that must address it:** Phase 1 — connection validation and threat model.

Sources: [Apple ATS](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity) (MEDIUM), [Apple insecure-network guidance](https://developer.apple.com/documentation/security/preventing-insecure-network-connections) (MEDIUM), [Hermes API environment variables](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/environment-variables.md) (MEDIUM).

### Pitfall 4: Losing control semantics across SSE disconnects and panel recreation

**Confidence:** MEDIUM (current Hermes run semantics; Muxy panel lifecycle behavior requires live confirmation)

**What goes wrong:** The transcript is treated as the run’s source of truth. On a network break, project switch, or closed/recreated panel, the client reconnects indefinitely and assumes it can replay all tokens and approvals. Hermes retains unconsumed event buffers for only five minutes; run status remains available briefly after terminal state, while approvals and stop can remain meaningful for a still-running run.

**Why it happens:** SSE reconnection and EventSource defaults encourage an assumption of durable replay, but the server’s retention and panel lifetime are bounded.

**Consequences:** Duplicated/missing transcript data, stale "running" UI, an approval stranded without a surface, or an apparently completed run that is still executing.

**Warning signs:** Reconnect succeeds but starts mid-run; event IDs/sequence state are unavailable; panel reopening has no in-memory token; run status differs from the last event; panel is torn down on project switch.

**Prevention:** V1 owns only the open-panel session. Persist no bearer token; on recreation require token re-entry, then explicitly poll `GET /v1/runs/{id}` and show a reconciliation result. Use bounded exponential reconnect only while the panel is alive and the known run is nonterminal; deduplicate documented event identities where available. State clearly that events older than the replay window may be unavailable and terminal status is authoritative over a missing stream. Do not promise notifications or approvals outside the panel in V1.

**Validation test:** Start a multi-tool run, disconnect the network/tunnel, reopen inside and after five minutes, switch Muxy projects, and close/reopen the panel while it awaits approval. Verify replay boundaries, token re-entry, status reconciliation, no duplicated tool actions, and a truthful terminal/unknown state in each case.

**Affected deployment variants:** All five; SSH is most likely to experience transient disconnects, remote HTTPS to encounter mobile/VPN changes.

**Phase that must address it:** Phase 2 — panel-local run control and recovery.

Sources: [Hermes Runs API](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#runs-api-streaming-friendly-alternative) (MEDIUM), [Muxy panels](https://muxy.app/docs/extensions/panels) (MEDIUM), [Muxy extension lifecycle guide](https://muxy.app/docs/extensions/lifecycle) (MEDIUM).

### Pitfall 5: Treating closed-panel approvals as a notification problem

**Confidence:** MEDIUM

**What goes wrong:** A background script or status item claims it can safely retain the stream, bearer token, and approval authority after the panel closes. The user sees an approval only after recovery, or an extension attempts auto-approval to avoid a stuck run.

**Why it happens:** Hermes correctly keeps the run/approval alive, while Muxy panels are not a durable run owner and the native background runtime does not expose the same streaming HTTP surface.

**Consequences:** Dangerous tools wait indefinitely without an actionable surface, credentials outlive the session, or security policy is defeated by automatic approval.

**Warning signs:** An approval arrives immediately before close; background code needs to duplicate panel transport; a product requirement says "notify after panel closes" without naming the durable transport owner.

**Prevention:** Make V1’s contract explicit: approvals can be answered only with the open panel and are never auto-approved. On reopen, display pending status only after fresh token entry and status/approval reconciliation. Defer background status, out-of-panel notifications, and durable credential ownership to a separate architecture with an audited streaming owner and secret storage.

**Validation test:** Induce an approval, then close the panel and switch projects. Confirm there is no auto-approval, token persistence, fake background ownership, or lost run ID; re-enter token and verify the server’s pending state can be represented safely.

**Affected deployment variants:** All five.

**Phase that must address it:** Phase 2 — lifecycle contract; later durability milestone for any change in behavior.

Sources: [Hermes approval endpoint](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#runs-api-streaming-friendly-alternative) (MEDIUM), [Muxy manifest/background runtime](https://muxy.app/docs/extensions/manifest) (MEDIUM).

### Pitfall 6: Exposing or retaining the bearer token

**Confidence:** MEDIUM

**What goes wrong:** The token is placed in an extension manifest, bundle, source-controlled config, URL/query string, browser storage, logs, imported/exported connection profile, or non-secret `muxy.storage`. A connection test can also leak it through error telemetry.

**Why it happens:** Muxy storage is easy to use and HTTP URLs are convenient for native EventSource, but neither is a secret store and EventSource does not offer arbitrary request-header configuration.

**Consequences:** A local or remote attacker obtains full Hermes API/tool access. Token rotation becomes invisible and a panel reopens with unbounded authority.

**Warning signs:** `?token=` in a stream URL; a token appears in devtools/audit/log fixtures; an export includes `auth`; a request implementation changes from authenticated `fetch` to `EventSource` just to obtain automatic reconnect.

**Prevention:** Prompt for one token per panel instance, hold it only in JavaScript memory, redact it from every error/fixture, and send it solely as `Authorization: Bearer …` over the accepted transport. Use a fetch-based streamed reader if custom headers are needed. Token persistence, pairing, and keychain integration are later milestones with an explicit security review.

**Validation test:** Search build output, storage, logs, snapshots, captured fixtures, URLs, and exported JSON for a sentinel token. Close/reopen/reload the panel and assert it must be re-entered. Inspect SSE request headers and assert no token is in URL, Referer, or transcript.

**Affected deployment variants:** All five; impact is greatest for direct remote HTTPS and any shared/remote workstation.

**Phase that must address it:** Phase 1 — secret handling; regression gate in every later phase.

Sources: [Hermes bearer authentication](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#authentication) (MEDIUM), [Muxy storage guidance](https://muxy.app/docs/extensions/settings) (MEDIUM), [MDN EventSource credentials](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/withCredentials) (MEDIUM).

## Moderate Pitfalls

### Pitfall 1: Managing SSH tunnels or Docker from the extension

**Confidence:** MEDIUM

**What goes wrong:** The product probes for Docker, runs `docker compose`, chooses a tunnel command, restarts a Gateway, or assumes port `8642` and a particular mount. This silently expands a control-surface proof into infrastructure management.

**Warning signs:** The manifest requests `commands:exec`; implementation contains `docker`, `ssh`, `compose`, or a service restart; a connection form asks the user to select "Docker" before it has tested the URL.

**Prevention:** Accept a user-operated reachable URL only. A tunnel’s lifecycle belongs to the user’s SSH configuration/process; Docker lifecycle and mount declaration belong to the user’s compose/run configuration. Offer precise diagnostics (connection refused, unhealthy, auth failed) but no remediation command. SSH users may choose loopback-bound forwards with `ExitOnForwardFailure` and encrypted keepalives; the extension still health-checks the Gateway because the forward can exist when its ultimate target fails.

**Validation test:** Run against a manually created host-native service, `127.0.0.1` Docker publication, and a manually created SSH `-L` forward. Assert the extension never invokes `docker`, `ssh`, shell, or lifecycle APIs and never changes service state.

**Affected deployment variants:** Docker and SSH tunnel primarily; protects all variants from deployment inference.

**Phase that must address it:** Phase 1 — connection contract and permissions.

Sources: [OpenSSH client configuration](https://man.openbsd.org/ssh_config) (MEDIUM), [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) (MEDIUM), [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) (MEDIUM).

### Pitfall 2: Assuming a Muxy workspace path is a Gateway execution path

**Confidence:** MEDIUM

**What goes wrong:** A remote Muxy workspace path, macOS project path, or worktree path is sent as if it exists inside Docker or on a remote Gateway. Conversely, UI derives deployment type from a path and guesses a mapping.

**Warning signs:** A run payload contains a macOS path for a container/remote endpoint; a UI label says "Docker" based on `/workspace`; a remote workspace opens the wrong repository; an unmapped path silently falls back to the Gateway default.

**Prevention:** V1 must remain chat/run-control only, using the Gateway’s configured execution context. Later, use an explicit per-connection mapping from Muxy workspace identity/path to an approved Gateway root, choose longest normalized component-prefix, reject traversal, preview the translation, and have Hermes validate a per-run `cwd` server-side. An unmapped remote workspace blocks tool-capable execution rather than falling back silently.

**Validation test:** Attempt host-native identity mapping, Docker `/host` → `/workspace`, remote Muxy `/home/user/project` → remote Gateway root, prefix-collision, symlink/traversal, and no mapping. Confirm no unvalidated path is sent or inferred.

**Affected deployment variants:** Docker, direct remote HTTPS, remote Muxy workspaces, and SSH-tunneled remote Hermes.

**Phase that must address it:** Post-V1 workspace-execution milestone; explicitly out of scope for Phase 1/2.

Sources: [Muxy files/workspace sandbox](https://muxy.app/docs/extensions/files) (MEDIUM), [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) (MEDIUM), [Hermes remote execution note](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/messaging/open-webui.md) (MEDIUM).

### Pitfall 3: Capability/version drift and endpoint-specific CORS regressions

**Confidence:** MEDIUM

**What goes wrong:** Controls are hard-coded for an early Hermes snapshot; a Muxy or Hermes upgrade changes capability flags, approval payloads, event shapes, Origin behavior, or a single streaming route’s CORS headers. The UI displays steer/approval/stop even when unsupported, or trusts a successful preflight without reading the SSE response.

**Warning signs:** A control returns 404/405 despite rendering enabled; event parsing falls into an unknown-state branch; a Muxy or Hermes update changes a fixture; preflight succeeds but the browser rejects the event stream.

**Prevention:** Call `/v1/capabilities` on every connection; show only advertised controls; capture sanitized versioned fixtures for capabilities, representative events, approval data, control responses, request Origin, preflight, and SSE headers. Pin supported dev versions and make a failed fixture check a transport verdict, not an opportunity to relax security.

**Validation test:** Run fixture/contract tests on the pinned pair, a newer Hermes build, and a newer Muxy build. Mutate capability flags and omit stream ACAO in a test server; verify disabled controls, clear incompatibility state, and no unsafe fallback.

**Affected deployment variants:** All five.

**Phase that must address it:** Phase 1 — fixtures/capability negotiation; Phase 2 — control rendering.

Sources: [Hermes capabilities and CORS](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) (MEDIUM), [Hermes streaming-CORS issue](https://github.com/NousResearch/hermes-agent/issues/72892) (MEDIUM), [Muxy extension manifest](https://muxy.app/docs/extensions/manifest) (MEDIUM).

### Pitfall 4: Accidentally exposing a Docker-hosted Gateway to the LAN

**Confidence:** MEDIUM

**What goes wrong:** Documentation or UI implies `-p 8642:8642` is local-only. Docker publishes unspecified host addresses on all interfaces by default; a Gateway configured to listen beyond loopback plus broad CORS creates a network-accessible terminal-control service.

**Warning signs:** `docker ps` shows `0.0.0.0:8642->…`; the Gateway advertises a LAN address; a second device can reach `/health`; docs omit the host IP from a publish rule.

**Prevention:** Deployment docs must show explicit loopback publication (`127.0.0.1:8642:8642`) for development. For remote access use a deliberate HTTPS reverse proxy or user-managed SSH forward, strong bearer authentication, a narrow CORS allowlist, and normal certificate validation. The extension never rewrites Docker settings.

**Validation test:** Inspect actual listening addresses on the Docker host and test from a second LAN machine; local development must be unreachable there. Confirm no code path selects `0.0.0.0` or configures CORS broadly.

**Affected deployment variants:** Docker; host-native services bound to all interfaces.

**Phase that must address it:** Phase 1 — security documentation and connection tests.

Sources: [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) (MEDIUM), [Hermes API security](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#authentication) (MEDIUM).

## Minor Pitfalls

### Pitfall 1: Ignoring private-network-access evolution

**Confidence:** LOW to MEDIUM — specifications are evolving and WebKit behavior must be measured.

**What goes wrong:** A panel transports successfully today but a browser-engine update introduces a private/local-network permission or preflight requirement. Teams mistakenly treat this as a generic CORS misconfiguration.

**Warning signs:** The same endpoint works in one Muxy/WebKit build but produces a permission/preflight error in another; a new `Access-Control-Request-Private-Network`-like header appears; local access changes without a Gateway release.

**Prevention:** Keep loopback/private access behind the transport verdict and record browser-engine/Muxy versions. Test a direct local path separately from HTTPS remote. Do not claim PNA behavior is uniform across WebKit/Chromium; PNA remains an evolving web-platform area.

**Validation test:** In the support matrix, run local/private and remote HTTPS connection tests after each Muxy/WebKit upgrade; collect all request/preflight headers and user-visible permission/error state.

**Affected deployment variants:** Host-native, Docker, SSH tunnel, private/LAN Gateways.

**Phase that must address it:** Phase 1, then release regression checks.

Source: [WICG Private Network Access draft](https://wicg.github.io/private-network-access/) (LOW), [Local Network Access proposal](https://wicg.github.io/local-network-access/) (LOW).

### Pitfall 2: Mistaking a healthy TCP forward for a healthy Gateway

**Confidence:** MEDIUM

**What goes wrong:** SSH reports a successful local bind but the remote service has stopped, moved ports, or the forward later loses connectivity. The UI calls this “connected” based only on URL parsing or socket open.

**Warning signs:** `ssh -L` stays running while `/v1/capabilities` fails; the panel reconnects repeatedly with `ECONNRESET`; a tunnel’s local listener exists after its remote Gateway is stopped.

**Prevention:** Connection status must mean an authenticated capabilities/health response from Hermes, not that a tunnel process exists. Separate connect, auth, capabilities, stream, and run-status failures in diagnostics; use timeout/backoff without starting a tunnel.

**Validation test:** Establish a tunnel, stop the remote Gateway, and sever the SSH session. Assert health becomes degraded, active run reconciliation is attempted within the bounded policy, and neither the extension nor user token is used to restart anything.

**Affected deployment variants:** SSH-tunneled remote Hermes; reverse-proxied remote HTTPS.

**Phase that must address it:** Phase 1 connection diagnostics; Phase 2 reconnection.

Source: [OpenSSH `ExitOnForwardFailure` and server-alive controls](https://man.openbsd.org/ssh_config) (MEDIUM).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: extension scaffold | Building UI that assumes native HTTP can stream localhost | Use only the smallest panel and prove direct WebKit transport first. |
| Phase 1: trust boundary | Allowlisting guessed/custom `null` origin or using CORS `*` | Capture exact Origin, OPTIONS, and SSE response headers; fail closed. |
| Phase 1: URL validation | Treating tunnel and direct remote HTTPS as the same security class | Allow HTTP only for literal loopback; require trusted HTTPS remotely. |
| Phase 1: deployment neutrality | Calling Docker/SSH, inferring mounts, or publishing ports | User supplies a reachable URL; extension does no infrastructure management. |
| Phase 2: streaming state | Replay assumed durable through panel close or tunnel interruption | Bound reconnect; reconcile with run status; disclose five-minute event-buffer boundary. |
| Phase 2: approval UX | Auto-approving or promising closed-panel approvals | Open-panel ownership only; require explicit decision and re-entry on reopen. |
| Phase 2: controls | Static feature assumptions | Gate all controls through current `/v1/capabilities` and pinned fixtures. |
| Post-V1: profiles/secrets | Persisting token in storage/export | Add a reviewed keychain/pairing design; keep export token-free. |
| Post-V1: workspace execution | Passing Muxy paths to Docker/remote Hermes | Implement explicit mappings plus server-side validated `cwd`; block unmapped paths. |
| Post-V1: durability | Adding status/notifications without a stream owner | Design an auditable durable transport owner before expanding lifecycle promises. |

## Sources

- [Muxy HTTP](https://muxy.app/docs/extensions/http) — MEDIUM
- [Muxy permissions](https://muxy.app/docs/extensions/permissions) — MEDIUM
- [Muxy panels](https://muxy.app/docs/extensions/panels) — MEDIUM
- [Muxy manifest/background runtime](https://muxy.app/docs/extensions/manifest) — MEDIUM
- [Hermes API server](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — MEDIUM
- [Hermes API environment variables](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/environment-variables.md) — MEDIUM
- [Hermes streaming CORS issue #72892](https://github.com/NousResearch/hermes-agent/issues/72892) — MEDIUM (open issue; test the pinned revision)
- [Apple App Transport Security](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity) — MEDIUM
- [Apple WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler) — MEDIUM
- [OpenSSH client configuration](https://man.openbsd.org/ssh_config) — MEDIUM
- [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) — MEDIUM
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) — MEDIUM
- [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — MEDIUM
- [WICG Private Network Access](https://wicg.github.io/private-network-access/) — LOW (evolving draft)
