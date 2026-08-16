# Architecture Patterns

**Domain:** Deployment-neutral Hermes Gateway client embedded in a Muxy extension
**Researched:** 2026-08-16
**Confidence:** MEDIUM — current Muxy and Hermes primary documentation establishes the available contracts, but the decisive WebKit+CORS+SSE path remains an empirical v1 gate.

## Recommended Architecture

Model Hermes as an independently operated, authenticated **Gateway service**. Do not model it as a local executable, Docker container, SSH host, or Muxy workspace. Every deployment reaches the same `GatewayClient` through an endpoint URL, an in-memory credential, a transport implementation, and the capability document returned by that Gateway. This prevents a growing set of deployment branches from leaking into the panel.

```text
Muxy panel (per open instance; owns live UI and ephemeral secret)
  ├─ Connection coordinator ── profile/config metadata (no secret)
  ├─ GatewayClient ────────── normalized, capability-gated Hermes protocol
  │    ├─ Request transport ── GET/POST JSON + Authorization
  │    └─ Event transport ──── authenticated SSE reader + parser + reconnect
  ├─ Run store ────────────── run snapshots, dedupe cursor, render projection
  └─ Workspace resolver ───── Muxy workspace identity → explicit Gateway path
                                      │
                                      ▼
                  HTTPS | loopback | SSH local-forward (all just endpoint URLs)
                                      │
                                      ▼
               user-operated Hermes Gateway → tools/files/processes

Post-v1 only: a local streaming bridge may implement the same EventTransport
interface; it must not change GatewayClient, run state, or profile semantics.
```

### Why this boundary is necessary

Muxy panels are individual `WKWebView` instances, while `muxy.http.fetch` is a native, buffered HTTP API and deliberately blocks loopback/private destinations; background scripts have no native `fetch`. Therefore the native HTTP helper cannot validate or carry a local SSE run stream. The v1 adapter must prove ordinary panel `fetch()` plus Hermes's exact CORS allowlist. [Muxy HTTP docs](https://muxy.app/docs/extensions/http), [Muxy panel docs](https://muxy.app/docs/extensions/panels) [MEDIUM]

Hermes already provides the correct client-facing shape: a run is created, polled by `run_id`, and observed via an SSE event endpoint. Its run event buffers have a five-minute retention window, but a live run remains controllable/status-queryable after that buffer expires. That makes the Gateway—not the webview—the durable authority. [Hermes Runs API](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#runs-api-streaming-friendly-alternative) [MEDIUM]

### Component Boundaries

| Component | Responsibility | Communicates With | Lifecycle owner |
|---|---|---|---|
| **Panel shell** | Native-feeling controls, render projection, token prompt, focus/accessibility; never makes deployment decisions. | Connection coordinator, run store | The open panel instance |
| **Connection coordinator** | Validates URL, injects the ephemeral token, performs capability negotiation, creates one client per selected connection. | Profile repository, GatewayClient | Panel in v1; future connection manager |
| **Profile repository** | Stores non-secret versioned profile metadata and mappings. No run state and no bearer token. | Connection coordinator | Future Muxy storage/settings layer |
| **GatewayClient** | Canonical Hermes contract: `capabilities`, `startRun`, `getRun`, `approve`, `steer`, `stop`, `subscribe`. Normalizes HTTP/SSE errors. | Request/Event transports | Coordinator |
| **RequestTransport** | Authenticated JSON request/response; supports timeout, abort, idempotency key, error normalization. | Gateway URL | GatewayClient |
| **EventTransport** | Opens authenticated event stream, incrementally parses SSE, tracks cursor/event identity, emits typed events, closes/retries. | Gateway URL, run store | GatewayClient; panel in v1 |
| **Capability adapter** | Converts versioned `/v1/capabilities` into a stable internal feature set. Unknown/missing capability means unavailable. | GatewayClient, panel shell | GatewayClient |
| **Run store / reconciler** | Maintains a per-run projection; deduplicates events; polls status after detach/error; treats terminal status as authoritative. | GatewayClient, panel | Panel in v1 |
| **Workspace resolver** | Resolves the active Muxy workspace/worktree into a stable identity, then explicitly translates a path only for an advertised/validated per-run `cwd` contract. | Muxy project/workspace APIs, profile mapping | Coordinator |
| **Optional bridge (post-v1)** | Owns a durable/privileged stream only if v1 proves direct WebKit transport unsafe. It exposes the same transport interface and never owns Hermes deployment. | EventTransport interface | Separate, explicitly approved host service |

**Invariant:** only transport adapters vary. `GatewayClient`, capability gating, run state machine, workspace resolver, UI controls, and profile schema are shared across every deployment.

## Deployment Matrix

| Deployment | Endpoint configured by user | What stays common | Variant-specific configuration only | Security / acceptance condition |
|---|---|---|---|---|
| Host-native Hermes | `http://127.0.0.1:8642` | Bearer auth, capability fetch, run REST, SSE parse/reconcile, panel UI | URL; optional identity mapping | Direct panel CORS probe succeeds with the actual observed webview origin; never use `muxy.http`. |
| Local Docker | published host port, commonly `http://127.0.0.1:<port>` | Exactly the same as host-native | URL and optional host→container workspace mapping | Extension never runs/discovers Docker or compose. CORS proof is identical. |
| SSH-tunnelled remote Hermes | local forward, e.g. `http://127.0.0.1:<forwarded-port>` | Exactly the same Gateway protocol | URL; SSH tunnel is user-managed outside extension; remote path mapping is optional later | Treat as loopback transport, not as a special SSH mode. Reconnect budget must tolerate tunnel loss. |
| Direct remote HTTPS Gateway | `https://gateway.example` (possibly `/p/<profile>/`) | Same protocol and adapters | URL, remote TLS policy, profile-specific bearer token, optional mapping | HTTPS required in production; exact CORS origin and per-profile token. Hermes profile routing rejects a default key on named profiles. [Hermes API docs](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#multi-profile-routing-pprofile) [MEDIUM] |
| Remote Muxy workspace | Any of the above | Same Gateway protocol and run UI | Workspace identity + explicit remote Muxy-root→Gateway-root mapping | Do not infer that Muxy remote shell path is visible to Hermes. Until Hermes validates per-run `cwd`, allow chat/planning only. |

The deployment choice is deliberately **not** a profile field. A URL does not reliably reveal container/SSH/native topology, and an extension must not use `docker`, shell probing, SSH management, or filesystem inspection to guess it. The only legitimate variants are explicit endpoint, credential reference, connection policy, and mapping data.

## Data Flow

### Connect and negotiate

1. Panel opens and asks for the v1 URL and bearer token. Keep both in panel memory only; URL may be remembered only after v1 as non-secret metadata.
2. Coordinator normalizes the URL (HTTPS or explicit development HTTP; preserve an intentional base path such as `/p/<profile>/`) and rejects userinfo, fragments, insecure remote HTTP, and redirects to a different origin unless explicitly re-approved.
3. `RequestTransport` calls `/v1/capabilities` with `Authorization: Bearer …`; a cheap health endpoint may precede this, but capabilities are the compatibility contract.
4. Capability adapter records the raw versioned fixture and produces a conservative internal set such as `runs`, `runEvents`, `runApproval`, `runSteer`, `runStop`, `sessions`, and `perRunCwd`. Controls are derived from this result—never profile toggles.
5. A v1 CORS/stream probe records the actual WebKit `Origin`, preflight/result headers, first bytes, timing, and error class. Success requires an exact configured origin, a bearer-authenticated request, and incremental receipt of test/run frames. It is not enough that native `muxy.http.fetch` can complete.

### Run and stream

```text
User submits input
  → Workspace resolver attaches no cwd in v1
  → POST /v1/runs (unique Idempotency-Key when retry semantics are supported)
  ← { run_id, status: started }
  → RunStore records `starting` before subscribing
  → GET /v1/runs/{id}/events with Authorization
  → EventTransport reads Response.body incrementally, parses SSE frames
  → RunStore validates schema, deduplicates, projects token/tool/approval/lifecycle
  → Panel renders projection and enables only advertised controls
  → terminal frame OR GET /v1/runs/{id} declares terminal
```

Use `fetch` with an incremental `Response.body` reader and a small SSE parser for v1 rather than browser `EventSource`: the standard constructor exposes only a URL and `withCredentials`, not a custom `Authorization` header; Fetch response bodies are readable streams. This is an intentional design inference from the platform APIs and must be proven in the pinned WKWebView build. [EventSource constructor](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource), [Fetch streaming](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#streaming_the_response_body) [MEDIUM]

Treat every event payload as untrusted data: schema-parse into a discriminated union, bound field sizes, render text through text nodes, and never evaluate HTML/tool output. [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) [MEDIUM]

### Detach, reconnect, and replay reconciliation

The extension needs two complementary recovery paths rather than assuming browser SSE replay:

1. **While the panel remains open:** on recoverable reader/network failure, reconnect with capped exponential backoff plus jitter while the run is non-terminal. Persist in memory: `runID`, last accepted event identifier (if Hermes emits one), stream generation, and semantic dedupe keys.
2. **If Hermes supports an event cursor / emits SSE `id`:** send the cursor according to the Gateway's documented contract. The web SSE standard defines `Last-Event-ID` only for `EventSource` reconnections and only after `id` fields; a manual-fetch adapter must prove the Gateway's equivalent header/query behavior in fixtures before claiming lossless replay. [WHATWG SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-last-event-id-header) [MEDIUM]
3. **Always:** immediately and after a reconnect failure call `GET /v1/runs/{id}`. Status polling resolves terminal truth, catches a missed approval/terminal transition, and makes duplicate token frames harmless. Hermes documents status polling specifically for UI reconnect/navigation and retains terminal status briefly. [Hermes Runs API](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#runs-api-streaming-friendly-alternative) [MEDIUM]
4. **Panel recreated/closed in v1:** discard the secret and live subscription. On reopen, require token re-entry, let the user supply/select the active `runID` only if product requirements allow it, and reconcile by status. Do not promise full transcript recovery unless recorded Gateway events and a documented cursor prove it.
5. **Approval safety:** a reconnect may display a previously seen pending approval, but the user must explicitly decide again in the currently open panel. The server remains authoritative; never replay/auto-submit an approval.

## Trust Boundaries and Ownership

| Boundary | Threat / ambiguity | Rule |
|---|---|---|
| User input → profile parser | Malformed or hostile URL/mapping; accidental insecure endpoint | Validate URL scheme/origin/path, mapping roots, timeout bounds, and enum values. Never infer deployment type. |
| Panel memory → Gateway | Bearer token gives access to terminal/file tools | Token is passed only in request headers, redacted from logs/fixtures, never placed in URL, Muxy storage, `localStorage`, or profile export. Hermes requires bearer auth and recommends narrow CORS. [Hermes authentication/CORS](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md#authentication) [MEDIUM] |
| Webview origin → Gateway CORS | A broad origin policy grants browser code access to powerful tools | Configure an exact observed Muxy origin, not `*`, suffix matching, or reflection. CORS is supplemental to bearer auth, not authorization. [OWASP CORS guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing) [MEDIUM] |
| Gateway → panel event stream | Tool output, model text, and event fields are untrusted display data | Validate, cap, and text-render; don't make tool calls client-executable. Hermes runs execute server-side. |
| Muxy workspace → Hermes workspace | Same project has different local/container/remote paths | Translate only through an explicit, validated mapping and only when server advertises a validating per-run cwd feature. |
| Extension → process/deployment | Silent control of Docker, SSH, host shell, or Gateway lifecycle | Forbidden. The user owns starting/stopping/tunnelling/updating Hermes; a future launcher is a separate opt-in action. |

### Lifecycle ownership

**V1 owner: the open panel.** It owns the in-memory bearer token, connection instance, active stream reader, run render projection, and approval UI. It cancels its reader when unmounted. Muxy may recreate panels across project lifecycle changes, so neither a panel nor its background script may be treated as durable run ownership.

**Gateway owner: Hermes.** It owns execution, approval state, session state, cancellation semantics, and durable terminal truth. The extension is a client that can attach/detach.

**Post-v1 owner: only a purpose-built transport owner.** If product requirements demand closed-panel notifications or durable running state, add a minimal bridge/service after an explicit decision gate. Do not misuse Muxy `background.js`: it can relay extension-local events, but lacks native fetch and therefore cannot own a standard streaming connection. [Muxy events](https://muxy.app/docs/extensions/events), [Muxy HTTP](https://muxy.app/docs/extensions/http) [MEDIUM]

## Workspace and Path Identity Semantics

Separate **identity** from **path**:

```ts
type WorkspaceIdentity = {
  muxyWorkspaceID: string | null;
  projectID: string;
  worktreeID: string | null;
  muxyRoot: string;          // canonical absolute path in the Muxy execution namespace
};

type WorkspaceMapping = {
  muxyRoot: string;          // canonical absolute directory, never a raw prefix
  hermesRoot: string;        // canonical absolute directory in Gateway namespace
};
```

`WorkspaceIdentity` is a UI/conversation scope and should be sent as an opaque, namespaced client session key only if the advertised Hermes capability supports it. It is not a filesystem authorization grant. A `cwd` is a separately computed execution request:

1. Canonicalize roots using the relevant namespace; reject empty roots, `..`, NUL/control characters, and ambiguous separators.
2. Select the mapping with the longest **path-component** `muxyRoot` match, not a string-prefix match (`/code/a` must not match `/code/ab`).
3. Compute the relative suffix, append to `hermesRoot`, and verify the result still lies beneath that root.
4. Display the proposed Gateway path and mapped-root label before first tool-capable execution.
5. Send it only through a Hermes endpoint/capability that validates the path against server-side allowed roots. The client mapping improves clarity; it cannot authorize remote filesystem access.

Until that server-side per-run cwd contract exists and is capability-advertised, use `cwdPolicy: "omit"`; connection profiles can support conversation/planning, but tool-capable active-worktree execution is blocked. This is the decisive distinction that lets one architecture handle remote Muxy workspaces safely without pretending their paths are locally meaningful.

## Deployment Profile Schema

Profiles are **post-v1 configuration**, not a prerequisite to transport validation. The schema has no `deploymentType`, shell command, Docker fields, or stored secret.

```ts
type ConnectionProfileV1 = {
  version: 1;
  id: string;
  label: string;
  endpoint: {
    baseURL: string;              // origin plus optional Hermes path prefix
    allowInsecureHttp: boolean;   // false except explicit development confirmation
  };
  auth: { kind: "bearer"; tokenRef: "promptEachPanel" | "futureKeychain" };
  transport: {
    preferred: "directWebviewSse" | "bridgeSse";
    connectTimeoutMs: number;
    requestTimeoutMs: number;
    reconnect: { initialDelayMs: number; maxDelayMs: number; maxAttempts: number };
  };
  workspace: {
    mappings: WorkspaceMapping[];
    unmappedBehavior: "blockToolRuns" | "gatewayDefaultForChatOnly";
  };
  presentation: { defaultInstructions?: string; showToolActivity: boolean };
};
```

Common configuration is endpoint, auth policy, transport budget, mapping, and display preferences. Variant-specific values are simply the endpoint URL, its bearer token reference, and any path mapping. Gateway capability flags, CORS origins, run IDs, serialized token state, tunnel commands, Docker compose settings, and arbitrary `cwd` values do **not** belong in a profile.

## Patterns to Follow

### Pattern 1: Capability firewall

**What:** Adapt raw `/v1/capabilities` into stable internal feature keys and fail closed on unknown versions/features.

**When:** On every new connection and after an authentication/upgrade error.

**Example:**

```ts
const capabilities = await client.capabilities();
const controls = {
  canApprove: capabilities.has("run_approval"),
  canSteer: capabilities.has("run_steer"),
  canStop: capabilities.has("run_stop"),
  canSetCwd: capabilities.has("run_cwd_validated"),
};
```

### Pattern 2: Transport strategy behind a protocol client

**What:** `GatewayClient` accepts `RequestTransport` and `EventTransport`; a direct WebKit adapter and a future bridge adapter both return the same normalized events.

**When:** Always. The choice is based on the explicit profile transport policy and a recorded v1 verdict—not topology detection.

**Example:**

```ts
interface EventTransport {
  subscribe(request: RunSubscription, emit: (event: HermesEvent) => void): AbortController;
}

// DirectWebviewSseTransport uses fetch(url, { headers: { Authorization }, signal })
// then incrementally parses response.body as text/event-stream.
```

### Pattern 3: Event-sourced projection with status authority

**What:** Preserve a bounded local projection of each active run and make it idempotent. Events improve immediacy; `GET run` determines final authority.

**When:** Stream lifecycle, reconnect, panel recreation.

**Example:**

```ts
if (!store.accepts(event)) return;       // cursor/semantic dedupe
store.apply(event);                      // token, tool, approval, lifecycle projection
if (streamLost || event.isTerminal) await store.reconcile(client.getRun(runID));
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Deployment branches in the UI

**What:** `if (docker)`, `if (ssh)`, or URL heuristic branches in controls/run logic.

**Why bad:** A tunnel may look local, Docker may publish remote ports, and remote workspaces have independent namespaces. These branches multiply test matrices and produce unsafe guesses.

**Instead:** Explicit endpoint/mapping configuration plus one protocol client.

### Anti-Pattern 2: Native HTTP as an SSE fallback

**What:** Using `muxy.http.fetch` for a local run stream because it bypasses CORS.

**Why bad:** It rejects loopback/private addresses and returns buffered text, so it cannot demonstrate token-by-token local streaming.

**Instead:** Prove authenticated panel `fetch` in v1; if it fails, define a minimal bridge adapter.

### Anti-Pattern 3: Profile UI before a transport verdict

**What:** Building profile CRUD, import/export, or workspace mapper first.

**Why bad:** It validates none of the high-risk requirements and becomes throwaway work if panel streaming is impossible/safe only through a bridge.

**Instead:** One ephemeral development connection, one pinned Gateway, captured fixtures, then profile persistence.

### Anti-Pattern 4: Treating CORS as authorization

**What:** Using wildcard/reflected origins or storing a bearer token in settings/storage because CORS seems restrictive.

**Why bad:** Hermes can run terminal/file tools; CORS only constrains browser reads and bearer auth remains the protection.

**Instead:** Exact CORS origin, header token in memory, server-side auth/path validation, redacted telemetry.

## Build Order and Architecture Decision Gates

1. **Protocol fixtures and direct transport spike** — create the thin panel, in-memory URL/token prompt, raw capability request, authenticated incremental `fetch` SSE parser, and a run-status poller. Capture Muxy/Hermes versions, actual origin, CORS headers, request/response shape, event frames, and detach/reopen behavior.
   - **Gate A (hard stop):** direct WebKit request can authenticate and receive incremental data from a pinned Gateway with an exact CORS origin. If no, write the smallest bridge contract and stop; do not build profiles.
2. **Capability-driven single-run control** — add typed capability adapter, run state machine, token/tool/approval/steer/stop rendering, idempotent state projection, and reconciliation tests.
   - **Gate B:** every displayed control is both advertised and exercised; unknown capability suppresses the control. Reconnect behavior is documented, including whether cursor replay exists.
3. **Panel lifecycle proof** — close/reopen/recreate during an active run, prove token re-entry and status reconciliation, bound event-log memory, redact fixtures.
   - **Gate C:** product accepts panel-local ownership for v1, or explicitly funds a post-v1 bridge/durable owner. A background script is not an implicit substitute.
4. **Persisted profiles and path semantics (post-v1)** — add schema migration, non-secret storage, explicit map preview, remote workspace identity, and unmapped policy.
   - **Gate D:** Hermes exposes and validates a per-run cwd contract. Until then, no tool-capable workspace execution—even for a matching local path.
5. **Durability / production remote support (post-v1)** — evaluate keychain integration, bridge transport, TLS/auth rotation, multiplexed profile routes, remote offline state, and notifications.
   - **Gate E:** choose exactly one durable stream owner with a threat model and replay contract; do not distribute partial ownership between panel and background script.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---|---|---|---|
| Extension client state | Per-panel in-memory projection; cap rendered event log. | Same; versioned feature telemetry and deterministic fixture corpus. | Same client shape; no shared service assumed. |
| Gateway connections | One open stream per active panel/run; explicit reconnect budget. | Gateway concurrency caps/backoff and observable 429 handling. Hermes has a configurable concurrent-run cap. | Deployment/operator concern: load balancing, auth rotation, event retention/observability; extension remains stateless client. |
| Event volume | Collapse token deltas into animation-frame batches; retain semantic milestones. | Backpressure-aware parser and bounded ring buffer. | Gateway/bridge fan-out only after a separate durable-transport design; do not make Muxy panel a broker. |
| Workspace mapping | Few mappings, longest-root match. | Validated mapping migration and team policy. | Central policy/authorization belongs server-side; mappings remain user intent only. |

## Sources

- [Muxy extension HTTP](https://muxy.app/docs/extensions/http) — private/loopback restrictions, buffered response contract, and surface availability. [MEDIUM]
- [Muxy extension panels](https://muxy.app/docs/extensions/panels) — independent WKWebView panel lifecycle/surface. [MEDIUM]
- [Muxy extension events](https://muxy.app/docs/extensions/events) — background/webview event boundary and extension-local relay. [MEDIUM]
- [Hermes API server and Runs API](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — bearer auth, CORS, capabilities, runs, polling, SSE buffer, and profile routing. [MEDIUM]
- [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — event framing, reconnect, and `Last-Event-ID` semantics. [MEDIUM]
- [MDN Fetch streaming](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#streaming_the_response_body) and [EventSource constructor](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource) — streaming fetch body and standard EventSource options. [MEDIUM]
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — strict CORS, client-side secret handling, and safe event rendering. [MEDIUM]

## Confidence and Open Validation

| Area | Confidence | Reason / required evidence |
|---|---|---|
| Shared GatewayClient, capability firewall, and deployment-neutral profile model | MEDIUM | Direct consequence of the documented common Hermes HTTP contract; independent of process topology. |
| Hermes run lifecycle, polling, capability gating, and five-minute event buffer | MEDIUM | Current official Hermes documentation supports it; capture pinned-version fixtures before implementation. |
| Direct authenticated WKWebView Fetch SSE | MEDIUM | Browser APIs support it and Hermes documents browser CORS/SSE, but Muxy's actual injected origin and WebKit behavior must be proven in v1. |
| Exact replay cursor / lossless transcript recovery | LOW | SSE has standard `id`/`Last-Event-ID` semantics, but Hermes's manual-fetch cursor behavior is not sufficiently specified in the cited docs; use status reconciliation until fixture evidence exists. |
| Per-run workspace path execution | LOW | Client mapping is straightforward, but safe execution requires an advertised Hermes server-side `cwd` validation contract not established by v1. |
