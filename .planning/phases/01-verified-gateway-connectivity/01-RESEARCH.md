# Phase 1: Verified Gateway Connectivity - Research

**Researched:** 2026-08-16
**Domain:** Muxy WKWebView extension panel, browser-authenticated Hermes Gateway probing, streamed SSE qualification, and redacted compatibility evidence
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Proof Standard
- **D-01:** A deployment class may be marked `Supported` only after the actual Muxy panel completes real end-to-end validation through that class's real path. Simulators may supplement negative-path coverage but cannot establish support.
- **D-02:** `Supported` requires every required check to pass. `Unsupported` requires a reproducible required-check failure. Missing infrastructure, partial execution, or inconclusive evidence remains `Unverified`.
- **D-03:** `Supported` requires two complete successful probes from fresh panel sessions against the same fixture and resolved version pair.
- **D-04:** Every supported fixture must prove incremental delivery through a real authenticated Hermes SSE route using a controlled harmless fixture. Phase 1 does not add Phase 2 run-control UI.

### Fixture Ownership
- **D-05:** The repository owns validation tooling and reproducible recipes for all modeled conditions.
- **D-06:** The validation harness may launch and stop a pinned host-native Hermes process. This process authority belongs only to test tooling and must never enter the extension panel.
- **D-07:** The repository owns a Docker Compose fixture with a resolved Hermes image or revision and a loopback-only published port; the validation runner starts and tears it down.
- **D-08:** V1 does not require real remote infrastructure. SSH-forwarded, direct HTTPS, and remote-workspace conditions are simulated locally with Docker and must remain `Unverified`; real end-to-end qualification is deferred. — **Reversibility:** costly — reversing this decision adds remote infrastructure, credentials, and real-path acceptance work to the v1 milestone.

### Version Policy
- **D-09:** Validation continuously resolves the latest stable Muxy and Hermes releases rather than maintaining a permanently pinned project pair. Each run records the exact resolved Muxy version, Hermes version and commit or image digest, and test date.
- **D-10:** When newer stable releases appear, the most recent `Supported` verdict carries forward until a regression is observed. The exact last-verified versions remain visible in details without a prominent freshness warning.
- **D-11:** A reproducible required-check failure on the latest stable pair takes precedence and marks that deployment class `Unsupported`; earlier passing results remain historical evidence.

### Evidence Artifacts
- **D-12:** Every validation run emits both a human-readable Markdown report and a schema-versioned JSON record.
- **D-13:** Redacted results are committed in a versioned repository directory. Historical version-pair evidence is retained and an index identifies the latest run.
- **D-14:** Committed evidence uses strict redaction. It may retain deployment class, loopback/non-loopback trust class, protocol, resolved versions, timing, and outcomes. It must omit hostnames, IP addresses, URL paths and queries, tokens, authorization headers, workspace paths, and raw response bodies.
- **D-15:** Representative SSE evidence uses an allowlist: event name, ID behavior, ordering, timing, schema shape, byte counts, and stable hashes. Prompt text, assistant output, tool arguments/results, and other payload contents are never committed.

### the agent's Discretion
- Validation framework and test-library selection.
- Exact repository directory names, run identifiers, and JSON field names, provided they preserve D-12 through D-15.
- Hash algorithm and canonicalization rules for sanitized SSE evidence.
- Probe-stage sequencing and implementation details, provided observed checks remain visible and unobserved checks remain `Not verified`.

### Deferred Ideas (OUT OF SCOPE)

- Real end-to-end qualification of SSH-forwarded Hermes, direct remote HTTPS, and remote Muxy workspace deployments. These stay `Unverified` in v1 until exercised through their actual paths.
</user_constraints>

## Project Constraints (from AGENTS.md)

- Keep the work extension-only: do not implement a Muxy source change, bridge, provider registration, deployment lifecycle management, or persisted credentials. [VERIFIED: AGENTS.md]
- Use one user-supplied URL/token contract; do not inspect, infer, or manage the Gateway deployment. [VERIFIED: AGENTS.md]
- Retain the bearer only in open-panel memory; require an exact CORS origin and never accept `*`; no auto-approval. [VERIFIED: AGENTS.md]
- Use direct WebKit streaming for the local SSE proof; Muxy's native HTTP bridge is not a substitute. [VERIFIED: AGENTS.md]
- Follow the local `muxy-extension` skill: Muxy theme variables only, native sizing/focus/reduced-motion behavior, least privilege, and copy `package.json` into `dist/`. [VERIFIED: AGENTS.md; .agents/skills/muxy-extension/SKILL.md]
- This greenfield repository has no existing extension source or test setup to preserve. [VERIFIED: 01-CONTEXT.md]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXT-01 | Build and load generated `dist/` unpacked in Muxy | Muxy manifest/build contract and build smoke checks |
| EXT-02 | `dist/` contains manifest and validator inputs | Required manifest-copy build step and artifact assertion |
| CONN-01 | Runtime URL and bearer token | Panel-local connection coordinator and memory-only secret boundary |
| CONN-02 | Test reachability, auth, origin/CORS, capabilities | Staged probe model plus fixture-side observability |
| CONN-03 | Display `/v1/capabilities` and suppress unavailable controls | Capability snapshot as read-only Phase 1 data |
| CONN-04 | Non-loopback direct connections use trusted HTTPS | URL trust-policy gate; no certificate bypass |
| CONN-05 | Secret-safe observed diagnostics | Normalized facts, no speculative root cause, redacted reports |
| DEPL-01 | One deployment-neutral client contract | One direct panel `fetch()` client, no topology branch |
| DEPL-02 | Real host-native capability + stream qualification | Two fresh real-panel sessions through a harness-managed host fixture |
| DEPL-03 | Real Docker published-port qualification | Two fresh real-panel sessions through a loopback-published Compose fixture |
| DEPL-04 | Simulated SSH-forward conditions stay unverified | Docker simulation recipes and explicit `Unverified` verdict rule |
| DEPL-05 | Simulated HTTPS/reverse-proxy conditions stay unverified | Docker TLS/proxy exercise plus real-path qualification rule |
| DEPL-06 | Simulated remote workspace stays unverified and sends no path | Workspace-independent request contract and negative payload test |
| SEC-01 | Bearer never persists or leaks | Memory-only state, sentinel scans, report/artifact allowlists |
| SEC-02 | Exact observed origin only | CORS/SSE checks recorded by the controlled Gateway fixture; fail closed |
| SEC-04 | No infrastructure/process/terminal/Git/filesystem authority | Empty/minimal manifest permissions and static manifest test |
| SEC-05 | Least demonstrated Muxy permissions | Panel declaration only; audit every added permission |
| EVID-01 | Versioned protocol fixtures | Schema-versioned JSON + Markdown emitter, hashes instead of payloads |
| EVID-02 | Deployment matrix verdicts | Rules for `Supported`, `Unsupported`, and `Unverified` |
| EVID-03 | Reproducible failure report and bridge contract | Hard-stop report template and minimal contract, not an implementation |
| EVID-04 | Alert and stop before upstream expansion | Non-dismissible stop alert and planner stop gate |

## Summary

Phase 1 should build the smallest Muxy panel that accepts an in-memory Gateway URL and bearer token, enforces the locked URL trust policy, performs an authenticated capability probe, and qualifies a separately controlled real Hermes SSE route. The only v1 network implementation is direct browser `fetch()` from the panel's `WKWebView`; it can send the bearer header and consume `Response.body` incrementally. The native `muxy.http.fetch` API is deliberately excluded because it rejects loopback/private destinations and returns a completed text body rather than an incremental reader. [CITED: https://muxy.app/docs/extensions/panels] [CITED: https://muxy.app/docs/extensions/http] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch]

The test verdict, not a URL heuristic, is the product boundary. Two fresh real panel sessions are required to mark host-native loopback or Docker-published loopback `Supported`. Docker simulations for SSH-forwarded, remote HTTPS, and remote-workspace conditions exercise expected failures and data boundaries but remain `Unverified`. If exact-origin authenticated incremental streaming cannot be demonstrated for either real-qualified class, emit the redacted failure report and minimum bridge contract, show the required stop alert, and stop; no Muxy modification or helper is authorized. [VERIFIED: 01-CONTEXT.md] [VERIFIED: 01-UI-SPEC.md]

Browser failure detail is intentionally limited: after cross-origin `fetch()` fails, the panel must report the observed stage and generic browser failure, not assert DNS, TLS, or CORS as a fact it cannot read. The controlled fixture/harness records the actual request origin, preflight, authenticated request, response headers, timing, and stream chunks to establish those specific causes in redacted evidence. This is the only truthful way to satisfy diagnostic and exact-origin evidence requirements without weakening CORS. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS] [ASSUMED]

**Primary recommendation:** Implement one panel-local direct-`fetch` `GatewayClient`, qualify it through harness-owned real Hermes fixtures, and make the compatibility-evidence pipeline and Muxy-change stop gate first-class Phase 1 deliverables.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| URL/token input, local trust policy, secret-safe rendering | Browser / Client | — | The open panel owns ephemeral input and must never persist bearer material. [VERIFIED: 01-CONTEXT.md] |
| Authenticated capability request and SSE reading | Browser / Client | API / Backend | The panel makes the direct request; Hermes authenticates and streams authoritative protocol data. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] |
| CORS allowlist and bearer authorization | API / Backend | Browser / Client | Hermes decides which origin and bearer may read the service; the panel only observes the result. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] |
| Real protocol fixture creation, origin/preflight evidence, result redaction | Validation harness | API / Backend | Test tooling can own fixtures and logs; the extension must not gain process or Docker authority. [VERIFIED: 01-CONTEXT.md] |
| Deployment verdict/history index | Repository evidence | Validation harness | Git-tracked redacted evidence retains qualification history without endpoint or secret data. [VERIFIED: 01-CONTEXT.md] |
| Muxy-change stop condition | Browser / Client | Repository evidence | The panel displays the locked alert while the emitted report specifies the smallest external change needed. [VERIFIED: 01-UI-SPEC.md] |

## Standard Stack

### Core

| Library / Platform | Version | Purpose | Why Standard |
|--------------------|---------|---------|--------------|
| Muxy extension panel | Resolve latest stable per test run; current official release is `v1.5.0` dated 2026-08-16 | Open-panel native control surface | A panel is an isolated `WKWebView`, and Muxy validates/publishes only built `dist/` output. [CITED: https://muxy.app/docs/extensions/panels] [CITED: https://muxy.app/docs/extensions/manifest] [CITED: https://github.com/muxy-app/muxy/releases] |
| Vanilla TypeScript + DOM APIs | Use Muxy's generated starter lockfile; npm registry currently reports Vite `8.2.1` and TypeScript `7.0.2` | Transparent panel, client state, and validation helpers | Phase 1 needs a small auditable state machine rather than an extra UI runtime. `vite` is named by Muxy's official manifest documentation. [CITED: https://muxy.app/docs/extensions/manifest] [ASSUMED: TypeScript versioning/toolchain compatibility is confirmed by the generated starter] |
| Direct `fetch`, `AbortController`, `ReadableStream`, `TextDecoderStream` | Browser platform APIs | Bearer-header requests and incremental event decoding | `Response.body` is a stream and may be processed as chunks arrive; an abort signal cancels an in-flight operation. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch] |
| Hermes Gateway API | Resolve latest stable per run; current official release is `v0.20.2` / `v2026.8.16` dated 2026-08-16 | Authentication, capabilities, harmless fixture run, and authenticated SSE | Hermes documents bearer auth, explicit CORS allowlisting, `/v1/capabilities`, and `GET /v1/runs/{run_id}/events`. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] [CITED: https://github.com/NousResearch/hermes-agent/releases] |

### Supporting

| Library / Platform | Version | Purpose | When to Use |
|--------------------|---------|---------|-------------|
| Node built-in `node:test` | Node `v26.5.0` available in this workspace | Unit-test URL policy, redaction, SSE framing, evidence-schema validation | Use in Wave 0 rather than add a test framework to a greenfield phase. [VERIFIED: environment probe] |
| Docker Compose | Docker `29.7.2`; Compose `v5.3.1` available in this workspace | Real local Docker fixture and local simulations | Use only in the repository-owned validation harness, never in the extension. [VERIFIED: environment probe] |
| In-repo SSE frame parser | No external package | Frame `event:`, `data:`, `id:`, comments, blank-line termination, and chunk boundaries | Use because Hermes's event route is a fetch stream and EventSource has no arbitrary-header option. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource] [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct panel `fetch()` | `muxy.http.fetch` | Native HTTP is useful for buffered cross-origin APIs but rejects loopback/private hosts and exposes only `{ status, headers, body, truncated }`; it cannot qualify required local streaming. [CITED: https://muxy.app/docs/extensions/http] |
| Fetch-stream SSE parser | `EventSource` | `EventSource` accepts a URL and a `withCredentials` option only; it does not expose a request-header option for Hermes bearer authentication. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource] |
| Panel-only ownership | `background.js` plus `curl`/helper | Requires subprocess authority and creates an unauthorized second secret/stream owner. [CITED: https://muxy.app/docs/extensions/manifest] [VERIFIED: 01-CONTEXT.md] |
| Evidence-backed transport stop | Muxy bridge, sidecar, provider registration | These are explicitly deferred and cannot be planned or implemented in Phase 1. [VERIFIED: 01-CONTEXT.md] |

**Installation:** Start from Muxy's current vanilla extension starter and preserve its generated lockfile. Do not add a production transport, UI, SSE, CORS, secret-storage, Docker, SSH, or process-management package. [CITED: https://muxy.app/docs/extensions/manifest] [VERIFIED: 01-CONTEXT.md]

## Package Legitimacy Audit

The phase does not prescribe any new production dependency. The Muxy starter will bring its own build dependencies; registry results below are recorded because Vite and TypeScript are expected starter tooling, not because the plan should independently install them.

| Package | Registry | Age / current version | Source Repo | Verdict | Disposition |
|---------|----------|-----------------------|-------------|---------|-------------|
| `vite` | npm | Registry reports `8.2.1`; Muxy documentation names Vite | `github.com/vitejs/vite` | SUS — legitimacy seam could not obtain age/download/repository signals | Flagged — preserve the Muxy starter lockfile and add `checkpoint:human-verify` before any standalone install. [WARNING: flagged as suspicious — verify before using.] |
| `typescript` | npm | Registry reports `7.0.2` | `github.com/microsoft/TypeScript` | SUS — legitimacy seam could not obtain age/download/repository signals | Flagged — verify the generated starter package and lockfile before install. [WARNING: flagged as suspicious — verify before using.] |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** `vite`, `typescript`; the planner must add a `checkpoint:human-verify` before any independent installation. The npm registry queries found no `postinstall` value for either package. `vite` is documented by Muxy; TypeScript is otherwise [ASSUMED] until the generated starter is inspected. [CITED: https://muxy.app/docs/extensions/manifest] [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User enters URL + bearer (panel memory only)
                  |
                  v
          Local URL/trust-policy gate
             | invalid / policy reject
             v
      Secret-safe local verdict ───────────────┐
                                                |
                                                v
Muxy Panel WKWebView --> direct fetch + Authorization --> Hermes Gateway
      |                       |                     |\
      |                       |                     | \--> /v1/capabilities
      |                       |                     |       -> capability summary
      |                       |                     |
      |                       |                     \----> controlled harmless run events
      |                       |                               -> response.body -> SSE parser
      |                       v
      |          browser-visible observed outcome
      v
Redacted current verdict + evidence matrix

Harness-owned fixtures/log capture --> redacted JSON + Markdown --> versioned evidence index
          |                                                               |
          +-- failed exact-origin/incremental-stream gate ----------------+
                                                                          v
                                            Muxy-change-required alert + minimum bridge contract
                                            (STOP; no bridge/Muxy/provider implementation)
```

The same client path must run for every fixture. The only differing input is the supplied URL; the evidence process, not client branching, gives conditions their classifications. [VERIFIED: 01-CONTEXT.md]

### Recommended Project Structure

```text
src/                         # Panel UI, state coordinator, direct GatewayClient, SSE parser
test/                        # Node unit tests for pure policy/redaction/parser/evidence modules
fixtures/                    # Non-secret fixture definitions and Compose configuration
scripts/                     # Build manifest-copy and validation/evidence CLI scripts
evidence/                    # Versioned redacted JSON, Markdown reports, and latest index
```

The directory names are a recommendation under the agent's discretion; evidence must remain versioned, redactable, and testable regardless of exact layout. [VERIFIED: 01-CONTEXT.md]

### Pattern 1: Staged, fact-first connection probe

**What:** Represent each stage independently: local URL policy, request initiation, authenticated capabilities response, observed origin/CORS verdict, capability parsing, and controlled event-stream delivery. A stage can be `passed`, `failed`, or `not_verified`; an overall `Supported` verdict requires every required observed stage plus the fixture evidence rules. [VERIFIED: 01-CONTEXT.md] [VERIFIED: 01-UI-SPEC.md]

**When to use:** Every manual panel test and every automated fixture run.

**Rules:**

- Never infer Docker, SSH, remote workspace, DNS, or a server's CORS configuration from the URL or a browser `TypeError`. [VERIFIED: 01-CONTEXT.md] [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS]
- Treat `401`/`403` HTTP responses as observed authentication failures; distinguish a browser-rejected response only as a failed browser request until fixture logs identify a CORS/preflight or transport fact. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS] [ASSUMED]
- A non-loopback endpoint is rejected locally unless it uses HTTPS with normal platform certificate validation; do not add bypass UI or alternate transports. [VERIFIED: 01-UI-SPEC.md]
- The capability payload is read-only Phase 1 output; no run control is rendered. Missing/unknown capability data stays unavailable. [VERIFIED: 01-UI-SPEC.md]

### Pattern 2: Fetch-backed, chunk-safe SSE probe

**What:** Use a fresh direct authenticated fetch to the Hermes events route for the controlled harmless fixture and parse decoded lines only after a blank frame delimiter. Hermes documents that the route is a Server-Sent Events stream and current source writes `data:` JSON frames, keepalive comments, and a close comment; parser tests must also cover arbitrary network chunk boundaries. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch]

**When to use:** The Phase 1 qualification probe only; Phase 2 owns actual run control UI.

**Example:**

```ts
// Sources: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//          https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md
const controller = new AbortController();
const response = await fetch(eventsUrl, {
  headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
  signal: controller.signal,
});

if (!response.ok || response.body === null) throw new Error("stream-not-verified");

for await (const textChunk of response.body.pipeThrough(new TextDecoderStream())) {
  sseParser.push(textChunk); // parser retains incomplete lines/frames across chunks
}
```

The example intentionally keeps `eventsUrl`, `token`, and decoded payload out of logs and evidence. [VERIFIED: 01-CONTEXT.md]

### Pattern 3: Evidence as an append-only redaction boundary

**What:** The runner receives raw ephemeral fixture observations, derives an allowlisted summary, creates a deterministic hash of a canonical sanitized event-shape object, validates the result against a schema version, and writes paired Markdown/JSON reports plus a latest index. [VERIFIED: 01-CONTEXT.md]

**When to use:** Every qualification attempt, including unsuccessful and incomplete attempts.

**Required stored fields:** deployment condition, trust class, requested test class, verdict, required-stage outcomes, resolved Muxy release, resolved Hermes release and commit/image digest, test timestamp, durations, origin verdict, capability shape digest, and safe event-frame metadata. Do not store endpoint identity, bearer data, raw headers, raw bodies, workspace paths, or content-bearing event fields. [VERIFIED: 01-CONTEXT.md]

### Pattern 4: Explicit Muxy-change stop gate

**What:** A failed exact-origin or incremental-stream qualification creates a reproducible failure report and a text-only minimum bridge contract. The panel shows the approved non-dismissible alert; planning/execution stops before any upstream code, provider registration, bridge, helper, or permission expansion. [VERIFIED: 01-UI-SPEC.md] [VERIFIED: 01-CONTEXT.md]

**Minimum bridge-contract contents:** target request class; desired streaming response/abort contract; exact consent, SSRF/private-host, TLS, token-redaction, and CORS responsibilities; observed failure evidence; acceptance test; and a statement that no implementation occurred. The contents are [ASSUMED] as a sufficient report template and require user approval before any upstream work.

### Anti-Patterns to Avoid

- **Using `muxy.http.fetch` for the Gateway:** It blocks the required local endpoint classes and buffers the response. [CITED: https://muxy.app/docs/extensions/http]
- **Using EventSource plus a token in the URL:** It cannot set Hermes's bearer header and would leak a secret into URL surfaces. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource] [VERIFIED: 01-CONTEXT.md]
- **Treating a successful OPTIONS/capabilities request as a streaming verdict:** the live events response must itself prove incremental authenticated delivery. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] [VERIFIED: 01-CONTEXT.md]
- **Guessing a root cause from blocked browser fetch:** show `Not verified` for unobservable details and use controlled fixture evidence. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS] [ASSUMED]
- **Adding a background script or manifest permission pre-emptively:** Phase 1 has neither a durable background use case nor authority for host processes, Docker, SSH, Git, or files. [CITED: https://muxy.app/docs/extensions/manifest] [VERIFIED: 01-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extension packaging | Custom bundle/manifest copier | Muxy's vanilla Vite starter plus its manifest-copy build step | Muxy ships `dist/` only and requires `package.json` inside it. [CITED: https://muxy.app/docs/extensions/manifest] |
| Network streaming transport | `curl`, Node helper, sidecar, or custom native bridge | Browser `fetch()` plus standard stream APIs | A helper changes the secret, process, consent, and lifecycle boundary before the direct proof is known. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch] [VERIFIED: 01-CONTEXT.md] |
| Server authorization | Client CORS reflection or a permissive origin fallback | Hermes `API_SERVER_CORS_ORIGINS` explicit allowlist | Hermes controls browser access and documents CORS disabled by default. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] |
| SSE browser client | Token-in-URL EventSource workaround | Fetch streaming reader and small tested frame parser | Fetch can send `Authorization`; EventSource configuration does not provide arbitrary headers. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource] |
| Run lifecycle/control UI | Phase 1 custom chat/run/approval controls | Capability readout and harness-owned harmless probe only | Controls belong to Phase 2; Phase 1 proves the transport. [VERIFIED: 01-CONTEXT.md] |

**Key insight:** Direct WebKit transport is the one uncertain premise; all implementation should make its outcome measurable, safe, and terminal rather than obscure it with an alternative transport. [VERIFIED: 01-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Treating Muxy's native HTTP API as a universal fallback

**What goes wrong:** A request/response call looks successful for a public API but cannot exercise localhost, a Docker loopback publish, or a live stream. [CITED: https://muxy.app/docs/extensions/http]

**How to avoid:** Do not put `muxy.http` in `GatewayClient`; write a regression test/assertion that the Phase 1 client uses browser `fetch` only. [VERIFIED: 01-CONTEXT.md]

**Warning signs:** A manifest/background addition or a result object shaped as buffered text appears in the client. [CITED: https://muxy.app/docs/extensions/http]

### Pitfall 2: Claiming CORS or DNS facts the panel did not observe

**What goes wrong:** Browser cross-origin protection can conceal the response, leaving code with a generic fetch rejection. A UI that calls it definitively DNS, TLS, or CORS becomes misleading. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS]

**How to avoid:** Emit per-stage facts (`HTTP 401`, `stream received first chunk`, `browser request rejected`) and preserve raw diagnostic attribution for the controlled fixture runner only; any unobserved detail is `Not verified`. [VERIFIED: 01-CONTEXT.md] [ASSUMED]

**Warning signs:** A UI branch maps one thrown browser error directly to a network cause or stores raw browser/server error text. [VERIFIED: 01-UI-SPEC.md] [ASSUMED]

### Pitfall 3: Passing qualification with only JSON/CORS preflight

**What goes wrong:** Capabilities and OPTIONS may pass while a proxy buffers SSE or the stream route lacks required response headers. Hermes explicitly documents CORS headers on SSE responses, so qualification must exercise that route. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]

**How to avoid:** Require an authenticated harmless Hermes run stream with at least one incremental frame delivered before terminal close; store only allowlisted metadata/hashes. [VERIFIED: 01-CONTEXT.md]

### Pitfall 4: Accidentally retaining bearer material

**What goes wrong:** A token leaks through logs, copied reports, fixture artifacts, manifest settings, URLs, or storage. Hermes documents that the API key grants access to its toolset, including terminal commands. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]

**How to avoid:** Keep the input in panel state only, send it only as `Authorization: Bearer`, clear it on panel teardown, and run sentinel-token scans over `dist`, evidence, tests, logs, and report output. [VERIFIED: 01-CONTEXT.md] [VERIFIED: 01-UI-SPEC.md]

### Pitfall 5: Misclassifying a simulated remote condition

**What goes wrong:** A local Docker simulation is marked `Supported` for SSH, public HTTPS, or a remote Muxy workspace. [VERIFIED: 01-CONTEXT.md]

**How to avoid:** Make classification a testable function that requires `real_path: true`, two fresh sessions, and every required stage. Simulation records an exercised condition but forces `Unverified`. [VERIFIED: 01-CONTEXT.md] [ASSUMED]

## Code Examples

Verified patterns from official sources:

### Incrementally decode a fetch response without buffering it

```ts
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
const response = await fetch(url, { signal: controller.signal });
if (!response.ok || response.body === null) throw new Error("request-not-verified");

const textStream = response.body.pipeThrough(new TextDecoderStream());
for await (const chunk of textStream) {
  consumeChunk(chunk);
}
```

### Authenticate browser calls to Hermes with an explicit CORS allowlist

```text
# Source: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md
Authorization: Bearer <panel-memory-token>

# Gateway operator configuration: exact observed panel origin only.
API_SERVER_CORS_ORIGINS=<exact-observed-origin>
```

`<panel-memory-token>` and `<exact-observed-origin>` are placeholders, not literal project values; the real values must never be committed. [VERIFIED: 01-CONTEXT.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed project-pinned Muxy/Hermes pair | Resolve the latest stable pair on each validation run; record the exact pair/digest as evidence | Locked Phase 1 decision | Evidence remains reproducible while support follows current releases. [VERIFIED: 01-CONTEXT.md] |
| Muxy `1.5.0` prereleases | Stable Muxy `v1.5.0` is marked Latest on the official release page | 2026-08-16 | Phase validation should begin at stable `v1.5.0` and record the exact build used. [CITED: https://github.com/muxy-app/muxy/releases] |
| Hermes `v0.20.1` | Hermes `v0.20.2` / `v2026.8.16` is marked Latest | 2026-08-16 | Resolve again at each run; do not rely on this document as a permanent pin. [CITED: https://github.com/NousResearch/hermes-agent/releases] |

**Deprecated/outdated:** A `vite build`-only script is insufficient for Muxy publication because the manifest must be copied into `dist/`. [CITED: https://muxy.app/docs/extensions/manifest]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Browser-level blocked-fetch details cannot be authoritatively split into DNS, TLS, and CORS without controlled fixture observations. | Summary / Pitfalls | Diagnostics could overclaim; validate with the real Muxy panel. |
| A2 | The stated bridge-contract fields are sufficient for a future upstream decision. | Architecture Patterns | A later upstream proposal may omit a required security or streaming constraint. |
| A3 | A classification function can encode `real_path`, two fresh sessions, and all required checks without requiring topology detection in the extension. | Common Pitfalls | Evidence semantics could drift from D-01 through D-04. |
| A4 | TypeScript remains part of the current Muxy-generated vanilla starter and is compatible with the version the starter resolves. | Standard Stack / Package Audit | Do not independently install it until a human checks the generated starter. |

## Open Questions

1. **What exact Origin does the current Muxy `WKWebView` send, and can Hermes explicitly allow it?**
   - What we know: A panel is a `WKWebView`; Hermes has an explicit comma-separated CORS allowlist and does not enable browser CORS by default. [CITED: https://muxy.app/docs/extensions/panels] [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]
   - What's unclear: The live emitted Origin and local/private-network behavior on current Muxy/WebKit have not been measured in this workspace. [VERIFIED: environment probe]
   - Recommendation: Make this the first real-panel gate; record it only in redacted trust-class evidence and stop if it is `null`, unstable, or cannot be safely allowlisted. [VERIFIED: 01-CONTEXT.md]

2. **What harmless real Hermes run fixture can reliably produce an event increment without shipping payload content?**
   - What we know: Hermes exposes a runs event route and reports token/tool/lifecycle events. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]
   - What's unclear: The exact current safe fixture trigger and resulting capability/event shapes must be captured on the resolved release. [ASSUMED]
   - Recommendation: The harness, not the panel UI, should create/prestage the controlled harmless run and give the panel an authenticated stream target under an ephemeral test token. [VERIFIED: 01-CONTEXT.md] [ASSUMED]

3. **How is the current Muxy application version discovered automatically by the runner?**
   - What we know: The official stable release is `v1.5.0`; no `muxy` CLI was found in this workspace. [CITED: https://github.com/muxy-app/muxy/releases] [VERIFIED: environment probe]
   - What's unclear: The app/bundle command or metadata path that returns the installed build version. [ASSUMED]
   - Recommendation: Make version capture a runner preflight. If it cannot collect a resolved Muxy version, the run emits evidence but cannot be a `Supported` qualification. [VERIFIED: 01-CONTEXT.md] [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build and Node unit tests | ✓ | `v26.5.0` | — [VERIFIED: environment probe] |
| npm | Starter dependency install/build | ✓ | `11.17.0` | — [VERIFIED: environment probe] |
| Docker | Local Docker real fixture and simulations | ✓ | `29.7.2` | — [VERIFIED: environment probe] |
| Docker Compose | Fixture orchestration | ✓ | `v5.3.1` | — [VERIFIED: environment probe] |
| Muxy application | Real panel qualification | ✗ | — | Blocking: install/current stable Muxy is required; browser substitutes cannot establish a Muxy verdict. [VERIFIED: environment probe] |
| Hermes executable/image | Host-native real fixture and Docker fixture | ✗ locally | — | Host-native fixture is blocking until harness resolves a tested Hermes install; Docker image/revision may provide the Docker fixture. [VERIFIED: environment probe] |

**Missing dependencies with no fallback:** Muxy application for both real-panel support verdicts; host-native Hermes executable for the host-native fixture.

**Missing dependencies with fallback:** Docker fixture can use a resolved Hermes image/revision rather than a local Hermes executable. [VERIFIED: 01-CONTEXT.md]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` (no framework currently installed) [VERIFIED: environment probe] |
| Config file | none — use ESM/TypeScript compilation boundary established by the Muxy starter in Wave 0 [ASSUMED] |
| Quick run command | `node --test` for emitted/pure JavaScript test modules [CITED: https://nodejs.org/api/test.html] |
| Full suite command | `npm run build && node --test && docker compose --project-name hermes-muxy-fixture up --abort-on-container-exit` [ASSUMED] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01, EXT-02 | Build emits a publish-valid `dist/` including `package.json` | build/artifact | `npm run build` plus a script asserting the expected `dist` manifest and panel entry | ❌ Wave 0 |
| CONN-01, SEC-01 | URL/token stay panel-local and are excluded from rendered/report/artifact state | unit + static scan | `node --test` plus sentinel-token `rg` scan over build/evidence | ❌ Wave 0 |
| CONN-02, CONN-05 | Stage model maps only observed outcomes and redacts details | unit | `node --test` | ❌ Wave 0 |
| CONN-03 | Capability snapshot normalizes known/unknown data with no Phase 1 controls | unit | `node --test` | ❌ Wave 0 |
| CONN-04 | URL policy rejects non-loopback HTTP and bypass attempts | unit | `node --test` | ❌ Wave 0 |
| DEPL-01 | All fixture scenarios use one client contract and no deployment selector | unit/static | `node --test` plus manifest/source audit | ❌ Wave 0 |
| DEPL-02 | Real host-native panel capability + incremental SSE proof twice | manual Muxy E2E + evidence validation | runner command plus two recorded fresh-session reports | ❌ Wave 0 |
| DEPL-03 | Real Docker loopback panel proof plus refusal/interruption observations | manual Muxy E2E + Compose | runner command plus two recorded fresh-session reports | ❌ Wave 0 |
| DEPL-04, DEPL-05, DEPL-06 | Simulations force `Unverified`, including no workspace path transmission | Compose integration + unit | `node --test` and Compose simulation runner | ❌ Wave 0 |
| SEC-02 | Exact origin/preflight/SSE headers are fixture-recorded; wildcard/null/reflection never pass | integration + manual panel E2E | fixture-log validator plus Muxy session runner | ❌ Wave 0 |
| SEC-04, SEC-05 | No dangerous Muxy permissions/background/process APIs | static manifest/source | `node --test` or a manifest-policy script | ❌ Wave 0 |
| EVID-01, EVID-02 | JSON/Markdown reports, index, verdict semantics, strict redaction | unit + schema | `node --test` | ❌ Wave 0 |
| EVID-03, EVID-04 | Failed direct gate emits redacted report, minimum contract, and stop state | unit + manual UI | `node --test` plus manual Muxy alert check | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run build && node --test` once Wave 0 is established. [ASSUMED]
- **Per wave merge:** Full build/unit/Compose-fixture suite; perform Muxy real-panel qualification whenever transport, manifest, URL policy, or fixture code changes. [VERIFIED: 01-CONTEXT.md] [ASSUMED]
- **Phase gate:** Two fresh real Muxy panel successes each for host-native and Docker loopback; simulated classes explicitly remain `Unverified`; full redaction scan is clean. [VERIFIED: 01-CONTEXT.md]

### Wave 0 Gaps

- [ ] Muxy vanilla starter, strict TypeScript configuration, manifest-copy script, and build artifact assertion — covers EXT-01/EXT-02.
- [ ] Pure unit test setup for URL policy, probe-state projection, SSE parser, redaction, evidence schema, and verdict classification.
- [ ] Harness-owned fixture recipes for host-native Hermes, Docker loopback Hermes, simulated SSH loss, simulated HTTPS/proxy, and simulated remote workspace.
- [ ] Evidence writer/validator plus committed non-secret fixtures and latest index.
- [ ] Muxy installation/version-capture preflight and an operator-run real-panel qualification script.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Hermes bearer header; do not persist/echo the bearer. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] |
| V3 Session Management | yes | Panel-lifetime-only secret/session state; no background owner. [VERIFIED: 01-CONTEXT.md] |
| V4 Access Control | yes | Exact Gateway CORS allowlist and least-privilege Muxy manifest. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md] [VERIFIED: 01-CONTEXT.md] |
| V5 Input Validation | yes | Parse/canonicalize the URL before request; enforce the locked trust policy and use only text-safe DOM rendering. [VERIFIED: 01-UI-SPEC.md] [ASSUMED] |
| V6 Cryptography | yes | Normal browser TLS/certificate validation for non-loopback HTTPS; never implement certificate bypass or custom cryptography. [VERIFIED: 01-UI-SPEC.md] |

### Known Threat Patterns for the Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bearer disclosure in bundle, storage, URL, logs, or evidence | Information disclosure | Memory-only token, redaction allowlist, sentinel scans, and no copied raw reports. [VERIFIED: 01-CONTEXT.md] |
| Wildcard/null/reflected CORS authorization | Elevation of privilege | Exact observed origin on Hermes; fail a qualification otherwise. [VERIFIED: 01-CONTEXT.md] |
| TLS downgrade/certificate bypass on remote endpoint | Tampering / information disclosure | Reject non-loopback HTTP and retain normal WebKit certificate validation. [VERIFIED: 01-UI-SPEC.md] |
| Local SSRF or accidental infrastructure authority | Elevation of privilege | No native HTTP fallback, helper, background process API, Docker/SSH command, or topology detection. [CITED: https://muxy.app/docs/extensions/http] [VERIFIED: 01-CONTEXT.md] |
| Secret/raw payload written into compatibility evidence | Information disclosure | Strict allowlisted event metadata plus stable hash over canonical sanitized shapes. [VERIFIED: 01-CONTEXT.md] |

## Sources

### Primary (MEDIUM confidence)

- [Muxy manifest documentation](https://muxy.app/docs/extensions/manifest) — Vite/`dist`/manifest-copy contract, panels, manifest permissions, and background boundaries.
- [Muxy panels documentation](https://muxy.app/docs/extensions/panels) — panel `WKWebView` architecture.
- [Muxy HTTP documentation](https://muxy.app/docs/extensions/http) — native buffered API, loopback/private SSRF block, and webview-only availability.
- [Hermes API server documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — bearer auth, CORS, capabilities, runs events, and security posture.
- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) — streamed response bodies and decoding pattern.
- [MDN EventSource constructor](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource) — constructor options and lack of arbitrary request headers.

### Secondary (MEDIUM confidence)

- [Muxy releases](https://github.com/muxy-app/muxy/releases) — `v1.5.0` latest stable release on the research date.
- [Hermes releases](https://github.com/NousResearch/hermes-agent/releases) — `v0.20.2` / `v2026.8.16` latest stable release on the research date.
- [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) — browser enforcement and response observability constraints.

### Tertiary (LOW confidence)

- No third-party ecosystem sources were used. The assumptions log identifies remaining empirical Muxy/WebKit and fixture-design questions.

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM — official Muxy, Hermes, MDN, npm, and release sources confirm the pieces; real WKWebView origin/stream behavior remains empirical.
- Architecture: MEDIUM — it directly implements locked decisions, while the harness shape and harmless run fixture require first-run validation.
- Pitfalls: MEDIUM — native HTTP, fetch/SSE, bearer/CORS, and evidence boundaries are official/locked; detailed browser error attribution is deliberately marked assumed.

**Research date:** 2026-08-16

**Valid until:** 2026-08-23 — release and Muxy/Hermes API behavior are fast-moving; resolve versions again at every validation run.
