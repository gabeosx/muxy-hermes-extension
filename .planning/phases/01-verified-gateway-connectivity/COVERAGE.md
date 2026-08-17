# Hermes Gateway API Coverage — Phase 1

**Phase:** 1 — Verified Gateway Connectivity  
**Reviewed:** 2026-08-16  
**Authority:** Current official Hermes API Server documentation on `main`, cross-checked against the official programmatic-integration endpoint inventory  
**Primary source:** https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md  
**Cross-check:** https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/programmatic-integration.md

## Coverage Rule

Phase 1 integrates only the read-only capability contract and the smallest isolated harmless authenticated stream needed to qualify one explicitly consented argv-form curl relay. The relay uses one argv-form curl execution and a bounded workspace journal; the stream request uses the OpenAI-compatible chat stream with a fixed, harmless validation input. It does not expose prompt, chat, run, approval, stop, session, job, skill, toolset, or model controls to the user. Every run-control surface is a Phase 2 opt-out. Session recovery belongs to Phase 3.

`INTEGRATE` means the endpoint or protocol behavior is exercised by Phase 1 production panel code or its repository-owned qualification harness. `OPT-OUT` means the surface was reviewed and intentionally excluded with a phase-scope reason. `NOT-ADVERTISED` records a capability that project requirements mention but current official HTTP API documentation does not expose.

## Qualification Fixture Contract

Hermes does not document a stream-only heartbeat or dry-run route. Its system-message contract explicitly preserves the agent's tools, so prompt wording alone is not accepted as a harmlessness control. Phase 1 therefore uses a real authenticated `POST /v1/chat/completions` SSE request only against a repository-owned qualification Gateway configured with a fresh temporary `HERMES_HOME`, an empty fixture workspace, no user profiles/MCP/memory, and a loopback deterministic OpenAI-compatible model stub. The stub emits no tool call, flushes two non-empty text deltas 250 ms apart, then returns `finish_reason: stop` and `[DONE]`.

The panel request body is exactly `{"model":"hermes-agent","messages":[{"role":"user","content":"HERMES_STREAM_QUALIFICATION_V1"}],"stream":true}`. The actual Muxy panel authorizes one consented curl relay, observes incremental journal delivery before EOF, observes the terminal frame, awaits journal scrub/removal, and observes zero `hermes.tool.progress`/tool-call shapes. Prompt/delta/raw-frame content is discarded; D-15 metadata and sanitized hashes are the only durable projection. If the controlled provider is incompatible, the fixture is unavailable, delivery is coalesced so incremental delivery cannot be proved, a tool event appears, cleanup fails, the fixture directory changes, or an unexpected outbound request occurs, the stream stage is `Not verified` and the deployment remains `Unverified`. The harness never substitutes an arbitrary live prompt, Runs API operation, synthetic non-Hermes stream, or Phase 2 UI.

## Official Endpoint Surface

| capability | decision | reason |
|---|---|---|
| Capability discovery — `GET /v1/capabilities` | INTEGRATE | The authenticated machine-readable compatibility contract is Phase 1's primary data read; names are read-only and unknown/absent flags stay unavailable. |
| Harmless SSE qualification — `POST /v1/chat/completions` with `stream: true` | INTEGRATE | The exact isolated deterministic fixture contract above proves bearer-authenticated incremental SSE in the real Muxy panel without adding a user chat composer, invoking Runs controls, retaining content, or trusting prompt wording to suppress tools. |
| CORS/preflight proxy variants | SIMULATION-ONLY | Controlled HTTPS/proxy fixtures may model CORS response variants. They are not observed by the curl relay and cannot qualify a production connection. |
| Responses API — `POST /v1/responses` | OPT-OUT | Stateful response creation and chaining are run/chat product behavior assigned to Phase 2 or later. |
| Stored response read — `GET /v1/responses/{id}` | OPT-OUT | Stored-response history is outside the connectivity proof. |
| Stored response deletion — `DELETE /v1/responses/{id}` | OPT-OUT | Phase 1 performs no response persistence or destructive response control. |
| Model alias discovery — `GET /v1/models` | OPT-OUT | Model selection is not needed for the transport verdict; the harness uses the resolved Gateway's configured default. |
| Rich model options — `GET /api/model/options` and `?refresh=1` | OPT-OUT | Provider/model pricing and selection UI are outside Phase 1. |
| Public liveness — `GET /health`, `GET /v1/health` | OPT-OUT | A liveness call cannot establish bearer authentication, relay grant, capability compatibility, incremental streaming, or cleanup. |
| Authenticated readiness — `GET /health/detailed` | OPT-OUT | Readiness internals are monitoring data, not part of the single URL/token client contract or support verdict. |
| Run submission — `POST /v1/runs` | OPT-OUT | User-directed run creation belongs to Phase 2; Phase 1 uses no Runs API control endpoint. |
| Run status — `GET /v1/runs/{run_id}` | OPT-OUT | Run-state authority and reconciliation are Phase 2/3 behavior. |
| Run events — `GET /v1/runs/{run_id}/events` | OPT-OUT | Phase 1 proves SSE through the qualification-only chat stream; run-scoped observation belongs to Phase 2. |
| Run stop — `POST /v1/runs/{run_id}/stop` | OPT-OUT | Stop UI and terminal-state reconciliation belong to Phase 2. |
| Run approval — `POST /v1/runs/{run_id}/approval` | OPT-OUT | Explicit approval handling belongs to Phase 2 and is never auto-invoked by the connectivity probe. |
| Run steer — `POST /v1/runs/{run_id}/steer` | OPT-OUT | Current official source advertises the route, but steering is Phase 2 behavior and must remain capability-gated there; Phase 1 never invokes or renders it. |
| Job list/create — `GET /api/jobs`, `POST /api/jobs` | OPT-OUT | Scheduled/background work is unrelated to direct panel transport qualification. |
| Job read/update/delete — `GET`, `PATCH`, `DELETE /api/jobs/{job_id}` | OPT-OUT | Job management is outside the milestone's extension proof. |
| Job pause/resume/run-now — `POST /api/jobs/{job_id}/pause`, `/resume`, `/run` | OPT-OUT | Phase 1 neither manages background work nor starts user work. |
| Session list/create — `GET /api/sessions`, `POST /api/sessions` | OPT-OUT | Session product behavior is outside the connectivity proof. |
| Session read/update/delete — `GET`, `PATCH`, `DELETE /api/sessions/{id}` | OPT-OUT | No session CRUD is needed in Phase 1. |
| Session messages — `GET /api/sessions/{id}/messages` | OPT-OUT | Transcript/history rendering is outside Phase 1. |
| Session fork — `POST /api/sessions/{id}/fork` | OPT-OUT | Branching session state is outside Phase 1. |
| Session chat — `POST /api/sessions/{id}/chat` | OPT-OUT | User chat turns belong to Phase 2. |
| Session chat stream — `POST /api/sessions/{id}/chat/stream` | OPT-OUT | The connectivity proof uses one qualification stream; session streaming belongs to the run-control product slice. |
| Skills discovery — `GET /v1/skills` | OPT-OUT | Skill enumeration is not needed for the transport verdict and could expose tool-adjacent metadata unnecessarily. |
| Toolset discovery — `GET /v1/toolsets` | OPT-OUT | Tool inventory is not needed for connectivity and is deliberately withheld from the Phase 1 UI. |
| Multi-profile routing — `/p/<profile>/...` | OPT-OUT | Phase 1 accepts one complete base URL and token without discovering profiles or constructing profile routes. |
| Session-key header — `X-Hermes-Session-Key` | OPT-OUT | Long-term memory scoping is outside the ephemeral connectivity probe. |
| Transcript-session header — `X-Hermes-Session-Id` | OPT-OUT | Phase 1 creates no durable conversation or transcript identity. |
| Request idempotency — `Idempotency-Key` | OPT-OUT | The qualification probe is bounded and does not expose retryable user run creation. |
| Per-request model/provider options — `model`, `provider`, `model_options` | OPT-OUT | The proof uses the Gateway default and does not expose model selection. |
| Profile-scoped bearer authentication — `Authorization: Bearer ...` | INTEGRATE | Every Phase 1 Gateway call uses the runtime-entered bearer header; the secret remains in panel memory and is never written to evidence. |
| Response security headers — `X-Content-Type-Options`, `Referrer-Policy` | INTEGRATE | The harness records pass/fail presence as safe booleans without copying raw headers. |
| Direct WebKit and browser CORS | HISTORICAL / SIMULATION-ONLY | The recorded direct-WebKit non-arrival is paired historical negative evidence. CORS/Origin and preflight behavior may be exercised only by controlled proxy simulations and cannot establish support. |

## Capability Fields Consumed

Phase 1 stores and displays only safe names/shapes from the capability payload:

| Capability family | Disposition | Phase 1 behavior |
|---|---|---|
| Object/platform/model/auth metadata | **INTEGRATE** | Normalize known scalar metadata; render protocol/fixture version and auth-required state without raw payload retention. |
| `features.chat_completions` | **INTEGRATE** | Required only for the qualification-only streamed chat request; absent/false means streaming is `Not verified`. |
| `features.run_submission`, `run_status`, `run_events_sse`, `run_stop`, `run_approval` | **OPT-OUT** | Display advertised names read-only, but create no controls and make no Runs API call in Phase 1. |
| `session_*` feature flags and `endpoints.session_*` | **OPT-OUT** | Session control is outside Phase 1. |
| Skills/toolsets endpoint descriptors | **OPT-OUT** | Phase 1 does not enumerate tool-adjacent metadata. |
| `session_key_header` | **OPT-OUT** | No memory/session scope is created by the connectivity probe. |
| Unknown future fields | **OPT-OUT** | Preserve no raw payload; report only a stable sanitized shape hash and treat unknown capabilities as unavailable until a later phase explicitly integrates them. |

## Phase Boundary Checks

- No endpoint in the `OPT-OUT` set may be called by Phase 1 panel code, except that the names of capability-advertised surfaces may appear in the read-only capability summary.
- The qualification-only chat stream must not expose user prompt input, run controls, model selection, session state, tool arguments/results, or assistant content in evidence.
- Current official source advertises a run-scoped steer endpoint. Phase 2 must still re-resolve `/v1/capabilities` and current official docs before implementing it; Phase 1 keeps the route opted out.
- If the qualification stream itself is unsafe or cannot prove relay-backed incremental delivery and awaited cleanup, the result is the redacted failure report and minimum bridge contract. No alternate endpoint, helper, Muxy source change, or bridge implementation is authorized.

## Deployment Scope

Host-native and Docker-published loopback can qualify only from receipt-backed real panel sessions. SSH local-forward, direct remote HTTPS, and remote workspace cases remain `Unverified`; their simulation evidence is useful for failure coverage but cannot establish a production verdict. The direct-WebKit result remains historical negative evidence rather than a client branch.
