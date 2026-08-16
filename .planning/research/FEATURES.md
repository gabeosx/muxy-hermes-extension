# Feature Landscape

**Domain:** Deployment-neutral Hermes Gateway control surface for Muxy
**Researched:** 2026-08-16
**Overall confidence:** MEDIUM — current primary Muxy, Hermes, WHATWG, and OpenSSH documentation; direct WebKit origin and exact Hermes replay semantics still need a local spike.

## Decision Summary

Treat every supported installation as a user-operated, authenticated Gateway URL. Host-native Hermes, local Docker, an SSH local-forward, and direct remote HTTPS differ in how the URL becomes reachable, not in the control-surface protocol. A remote Muxy workspace is different again: it changes the active-worktree identity and path namespace, not where the panel's network request originates. The extension must not infer a deployment type from a URL, launch Docker, create an SSH tunnel, or assume either side sees the same path.

The transport-first v1 should support one runtime-supplied development endpoint in any of the five forms below, but only after it proves actual panel WebKit `fetch()` behavior, observed `Origin`, exact CORS allowlisting, bearer authentication, and SSE behavior against a pinned Gateway. Muxy's native `muxy.http.fetch` is unsuitable for local or tunneled streaming: it blocks loopback/private hosts and returns a buffered body. The v1 success condition is a documented transport verdict, including a safe negative verdict and minimum bridge contract if direct browser streaming is not viable.

Hermes already provides the external control-plane primitives: capability discovery, run submission, status polling, SSE run events, approval, and cooperative stop. Its status endpoint and short-lived event buffer make an attach/reconcile UX plausible, but the public docs do not establish a stable Last-Event-ID replay contract. Reconnect must therefore be bounded and always reconcile through run status; it cannot promise lossless token replay until fixtures prove it.

## Deployment-by-Feature Matrix

**Legend:** **V1** = required transport proof; **Later** = retain as a design boundary, defer implementation; **Never** = anti-feature. “Same URL contract” means the extension sends the identical authenticated Gateway protocol, not that every network path has already been validated.

| Capability | Host-native Gateway | Local Docker Gateway | SSH-tunneled remote Gateway | Direct remote HTTPS Gateway | Remote Muxy workspace | V1 decision / complexity |
|---|---|---|---|---|---|---|
| Discovery & configuration | Ask for URL and token at panel load; never assume `hermes` exists. | Same; do not inspect Docker or port mappings. | Same local forwarded URL; user owns tunnel lifecycle. | Same URL; no deployment inference. | Same network configuration; workspace does not supply endpoint. | **V1**, Med — one ephemeral connection tuple. Profiles later. |
| Connectivity diagnostics | Test authenticated health/capabilities and record browser-origin/CORS result. | Same, including published-port failure. | Detect refused/reset/tunnel-closed distinctly. | Diagnose DNS, TLS, HTTP/auth/CORS distinctly. | Report that workspace location is separate from Gateway reachability. | **V1**, High — exact WebKit transport proof is the gate. |
| Authentication | Send bearer token from panel memory only. | Same. | Same; SSH authenticates the tunnel, not Hermes API calls. | Same; do not weaken bearer auth because TLS exists. | Same; never put token in workspace metadata. | **V1**, Med — prompt each recreated panel; keychain later. |
| Capability negotiation | Fetch `/v1/capabilities`; render only advertised controls. | Same. | Same. | Same. | Same. | **V1**, Low — version-tolerant UI boundary. |
| Streaming | Panel WebKit `fetch()`/stream must pass exact CORS test. | Same; native HTTP bridge is blocked/buffered. | Same after local forwarding; tunnel loss is expected. | Same; TLS/proxy buffering also requires a real stream test. | Same client-side stream; remote workspace has no special transport privilege. | **V1**, High — capture real SSE frames and timing fixtures. |
| Human approvals | Show only Gateway-advertised approval, require explicit user decision. | Same. | Same. | Same. | Same, but only while panel is open. | **V1**, Med — never auto-approve or persist a broad approval. |
| Steer / stop | Show only when advertised; stop remains “stopping” until terminal state. | Same. | Same; request failure must not claim run stopped. | Same. | Same. | **V1**, Low/Med — capability-gated, terminal state from stream/status. |
| Reconnect & reconciliation | Reattach while panel remains open; poll status after interruption/reopen. | Same. | Backoff and distinguish tunnel loss from Gateway terminal state. | Backoff for transient network failure; preserve only in-memory run metadata. | Panel recreation during project switch requires re-entry and reconciliation. | **V1**, High — no lossless replay promise absent fixture evidence. |
| Workspace identity & path semantics | No active-worktree execution in v1. | Do not equate host path with container path. | Do not equate local Muxy path with remote Gateway path. | Do not guess a remote path mapping. | Capture visible workspace identity/path only for display; do not send `cwd` without a validated Gateway contract. | **Later**, High — needs explicit mappings and validated per-run `cwd`. |
| TLS & tunnels | Loopback HTTP is acceptable only after direct-panel CORS proof; bearer still required. | Same. | User may bind tunnel to loopback; extension never starts/manages it. | Require normal certificate validation; no bypass. | Does not alter TLS or tunnel ownership. | **V1** diagnostics; tunnel management **Never**. |
| Failure messaging | Show actionable phase: endpoint, CORS, auth, stream, run/terminal. | Add “port/container exposure” as user-owned check, not a Docker command. | Name tunnel loss/SSH-forward failure without exposing secrets. | Name DNS/certificate/CORS/auth/server failures distinctly. | Explain that workspace path is not a Gateway execution path. | **V1**, Med — normalized error taxonomy and safe redaction. |

## Table Stakes

Features users expect from a developer control surface once they provide a reachable Gateway. Missing any of these makes the deployment-neutral claim unreliable.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| One explicit, ephemeral Gateway connection (base URL + bearer token) | A control surface must connect to a service without assuming whether it is native, Docker, tunneled, or remote. | Med | URL/token are panel-memory only in v1; never discover, start, or reconfigure the Gateway. **Confidence: HIGH** for the product boundary, MEDIUM for direct panel connectivity. |
| Preflight connectivity diagnosis | A failed connection must tell the user whether URL reachability, CORS, authentication, TLS, or streaming is at fault. | High | Record observed WebKit `Origin`, status, safe error class, negotiated Gateway version/capabilities, and timestamps. Never log token values. **Confidence: HIGH**. |
| Capability-driven controls | Versions and deployments vary; controls must follow `/v1/capabilities`, not assumptions or user toggles. | Low | Gate stream, approval, steer, stop, and optional session features independently. **Confidence: HIGH**. |
| Run submission with live, structured activity | Start a run and render text, tool/lifecycle activity, pending approvals, completion, failure, and cancellation. | Med | Hermes runs are explicitly designed for dashboard/thick-client event subscribers. **Confidence: HIGH**. |
| Explicit approval, steer, and stop control | The panel must let users respond to approvals and control a live run when the Gateway advertises those endpoints. | Med | Disable unavailable controls. Stop is asynchronous: show “stopping” until stream/status is terminal. **Confidence: HIGH**. |
| Reconnect plus status reconciliation | Panel close/recreation and networks fail; users need truthful recovery rather than a frozen transcript. | High | Reopen requires token re-entry in v1. Reconnect stream if possible, then call run status; label unrecoverable event gaps honestly. **Confidence: MEDIUM**. |
| Deployment-aware, secret-safe errors | Operational users need remediation without deployment automation or credential leakage. | Med | Use error categories: malformed URL, loopback/native-bridge block, CORS/preflight, 401/403, DNS, TLS certificate, connection refused, tunnel closed, timeout, protocol mismatch, run terminal. **Confidence: HIGH**. |
| Native Muxy panel behavior | The proof must be legible and accessible in its host environment. | Low | Muxy theme tokens, visible focus, reduced motion, and least privilege are required; panels are WKWebViews. **Confidence: HIGH**. |

## Differentiators

These do not expand v1 into a product, but materially improve confidence and make a later multi-deployment product safer.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Versioned transport-verdict fixture pack | Makes compatibility failures reproducible across Muxy/Hermes releases instead of anecdotal. | Med | Record Muxy/Hermes versions, capability JSON, safe CORS/origin result, representative event frames, approval/stop responses, and reopen observations. **V1. Confidence: HIGH**. |
| Deployment-neutral diagnostic wording | Gives a host-native, Docker, SSH-forward, or HTTPS user the next safe action without false detection. | Med | Describe observed facts (“connection refused at supplied URL”), not guessed deployment (“Docker is down”). **V1. Confidence: HIGH**. |
| Capability snapshot in the connection UI | Explains why a control is absent and protects users from version mismatch. | Low | Show the negotiated API/features, not a configurable list of presumed features. **V1. Confidence: HIGH**. |
| Workspace mapping preview and explicit policy | Enables safe tool-capable active-worktree runs across native/container/remote namespace differences. | High | Post-v1: longest normalized prefix, traversal rejection, preview, explicit unmapped policy, and Gateway-enforced `cwd`. **Later. Confidence: MEDIUM**. |
| Named non-secret connection profiles | Makes multiple endpoints usable without token persistence. | Med | Post-v1; keep tokens session-supplied unless Muxy gains vetted secret storage. **Later. Confidence: HIGH**. |
| Durable closed-panel ownership and notifications | Lets runs/approvals survive panel absence. | High | Requires an appropriate streaming-capable owner in Muxy; current background runtime is not that owner. **Later. Confidence: MEDIUM**. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Auto-detecting deployment type or managing Docker | A URL does not reliably identify host, container, tunnel, or remote topology; lifecycle control is outside the extension's authority. | Accept a user-supplied Gateway URL and diagnose the observed connection only. |
| Creating, restarting, or repairing SSH tunnels | Requires credentials and process ownership; can expose a forwarded port or leave orphaned infrastructure. | Let users operate their tunnel; recommend a loopback bind and surface tunnel loss as a reconnectable error. |
| Using `muxy.http.fetch` for local/tunneled SSE | Muxy intentionally blocks private/loopback hosts and returns a buffered body, so it cannot validate or carry that stream. | Prove panel WebKit streaming with a narrow CORS policy; stop at a documented bridge contract if unsafe. |
| Wildcard/null CORS or disabled certificate validation | The Gateway exposes terminal-capable agent tools; broad browser access or TLS bypass defeats the security boundary. | Use bearer auth plus the exact observed extension origin; reject bad certificates. |
| Persisting bearer tokens in Muxy storage/settings | Muxy extension storage is not a keychain/secret facility. | Keep token in panel memory and request it at panel creation; add secure storage only after host support is validated. |
| Auto-approval or remembered broad approval defaults | Approvals protect terminal/file actions; automation turns a control surface into unchecked execution. | Require an explicit decision for each Gateway-provided approval; show persistence choices only as Gateway semantics. |
| Silent workspace-path translation or sending an unvalidated `cwd` | Host, Docker, SSH, and remote workspace namespaces are different; a guessed path can execute in the wrong place. | Defer tool-capable workspace execution until mappings and a Gateway-validated per-run `cwd` contract exist. |
| Promising lossless event replay | SSE supports Last-Event-ID in general, but Hermes’s documented contract currently guarantees status reconciliation, not a permanent replay guarantee. | Use bounded reconnect + GET run status; label transcript gaps and validate replay with fixtures. |

## Feature Dependencies

```text
Runtime-supplied URL + in-memory bearer token
  → authenticated health/capabilities probe
  → exact observed WebKit Origin + explicit Hermes CORS allowlist
  → direct browser SSE transport verdict
  → run submission + structured event rendering
  → capability-gated approval / steer / stop
  → reconnect attempt + run-status reconciliation

Workspace-aware tool execution (deferred)
  → stable Muxy workspace identity
  → explicit user mapping + normalized-path preview
  → Gateway per-run validated cwd contract
  → opt-in tool-capable run
```

Additional operational dependencies:

- Local Docker needs a user-published reachable port, but the extension must never inspect or operate Docker.
- SSH-tunneled remote mode needs a user-maintained local forward. OpenSSH documents that a `localhost` bind keeps the listener local; wildcard/empty binds expose it more broadly.
- Direct remote HTTPS needs a trusted certificate, reachable DNS/network path, bearer token, and browser CORS allowlist.
- Remote Muxy workspace support is not a transport feature. Its path namespace must not be sent to Hermes until the deferred workspace contract exists.

## MVP Recommendation

Prioritize:

1. **Transport-first connection proof** — one panel-memory URL/token, authenticated capability probe, detailed connectivity result, observed origin, and exact CORS guidance. Exercise this against host-native, local Docker, SSH-forward, direct HTTPS, and a remote Muxy workspace while treating the latter as a path-identity case rather than a network route.
2. **Capability-driven live run surface** — run start, SSE token/tool/lifecycle display, explicit approval, steer/stop only when advertised, native focus/theme/reduced-motion behavior, and secret-safe error messaging.
3. **Recoverability evidence** — bounded reconnect, status reconciliation after interruption/panel recreation, and a versioned protocol-fixture/transport verdict that says exactly what replay is or is not supported.

Defer: named profiles and non-secret preference storage; all workspace mappings and active-worktree execution; keychain or pairing-based secret storage; terminal/TUI launchers; background ownership/status while closed; notifications outside the open panel; Muxy provider or Hermes plugin changes; marketplace and remote production hardening. These add product surface without reducing the v1 existential transport risk.

## Sources

- [Muxy HTTP extension API](https://muxy.app/docs/extensions/http) — **HIGH**: native bridge behavior, blocked private/loopback hosts, buffered response body, CORS distinction.
- [Muxy extension panels](https://muxy.app/docs/extensions/panels) and [Muxy extension authoring guidance](https://raw.githubusercontent.com/muxy-app/muxy/main/Muxy/Resources/skills/muxy-extension/SKILL.md) — **HIGH**: WKWebView panel model, native UX and remote-workspace conventions.
- [Hermes API server documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — **HIGH**: bearer auth, explicit CORS, `/v1/capabilities`, runs, SSE, status, approvals, stop, buffer retention, and concurrent-run behavior.
- [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — **HIGH**: `text/event-stream` and `Last-Event-ID` reconnection mechanics; applying it to Hermes replay remains **MEDIUM** pending fixture validation.
- [OpenSSH `ssh(1)`](https://man.openbsd.org/ssh.1) — **HIGH**: local forwarding and bind-address exposure semantics.

## Research Gaps to Validate in the First Spike

- The exact `Origin` emitted by Muxy’s extension WKWebView, whether it is stable/allowlistable, and whether authenticated streamed `fetch()` can safely use it.
- The exact Hermes run-event schema, event identifiers, replay window, duplicate behavior, and behavior after the documented five-minute unconsumed-buffer expiry.
- The deploy-by-deploy direct-stream result (host, Docker, SSH forward, HTTPS) and whether intermediaries buffer SSE.
- The precise Muxy panel recreation/reopen behavior during project/workspace switching and its interaction with in-memory credentials.
