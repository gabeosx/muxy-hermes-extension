# Hermes Gateway API Coverage — Phase 1

**Phase:** 1 — Verified Gateway Connectivity  
**Reviewed:** 2026-08-16  
**Authority:** Current official Hermes API Server documentation on `main`, cross-checked against the official programmatic-integration endpoint inventory  
**Primary source:** https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md  
**Cross-check:** https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/programmatic-integration.md

## Coverage Rule

Phase 1 integrates only the read-only capability contract and the smallest authenticated SSE request needed to qualify direct WebKit streaming. The stream request uses the OpenAI-compatible chat stream with a fixed, harmless validation input; it does not expose prompt, chat, run, approval, stop, session, job, skill, toolset, or model controls to the user. Every run-control surface is reserved for Phase 2. Session recovery belongs to Phase 3.

`INTEGRATE` means the endpoint or protocol behavior is exercised by Phase 1 production panel code or its repository-owned qualification harness. `OPT-OUT` means the surface was reviewed and intentionally excluded with a phase-scope reason. `NOT-ADVERTISED` records a capability that project requirements mention but current official HTTP API documentation does not expose.

## Official Endpoint Surface

| capability | decision | reason |
|---|---|---|
| Capability discovery — `GET /v1/capabilities` | INTEGRATE | The authenticated machine-readable compatibility contract is Phase 1's primary data read; names are read-only and unknown/absent flags stay unavailable. |
| Harmless SSE qualification — `POST /v1/chat/completions` with `stream: true` | INTEGRATE | A fixed harmless request proves bearer-authenticated incremental SSE in the real Muxy panel without adding a user chat composer or retaining content. |
| CORS preflight — browser `OPTIONS` for bearer-authenticated requests | INTEGRATE | The harness records the actual panel origin and verifies that preflight and SSE responses authorize that exact non-null, non-wildcard origin. |
| Responses API — `POST /v1/responses` | OPT-OUT | Stateful response creation and chaining are run/chat product behavior assigned to Phase 2 or later. |
| Stored response read — `GET /v1/responses/{id}` | OPT-OUT | Stored-response history is outside the connectivity proof. |
| Stored response deletion — `DELETE /v1/responses/{id}` | OPT-OUT | Phase 1 performs no response persistence or destructive response control. |
| Model alias discovery — `GET /v1/models` | OPT-OUT | Model selection is not needed for the transport verdict; the harness uses the resolved Gateway's configured default. |
| Rich model options — `GET /api/model/options` and `?refresh=1` | OPT-OUT | Provider/model pricing and selection UI are outside Phase 1. |
| Public liveness — `GET /health`, `GET /v1/health` | OPT-OUT | A liveness call cannot establish bearer auth, exact-origin CORS, capability compatibility, or incremental streaming. |
| Authenticated readiness — `GET /health/detailed` | OPT-OUT | Readiness internals are monitoring data, not part of the single URL/token client contract or support verdict. |
| Run submission — `POST /v1/runs` | OPT-OUT | User-directed run creation belongs to Phase 2; Phase 1 uses no Runs API control endpoint. |
| Run status — `GET /v1/runs/{run_id}` | OPT-OUT | Run-state authority and reconciliation are Phase 2/3 behavior. |
| Run events — `GET /v1/runs/{run_id}/events` | OPT-OUT | Phase 1 proves SSE through the qualification-only chat stream; run-scoped observation belongs to Phase 2. |
| Run stop — `POST /v1/runs/{run_id}/stop` | OPT-OUT | Stop UI and terminal-state reconciliation belong to Phase 2. |
| Run approval — `POST /v1/runs/{run_id}/approval` | OPT-OUT | Explicit approval handling belongs to Phase 2 and is never auto-invoked by the connectivity probe. |
| Run steer — no public run-scoped HTTP endpoint in current official inventory | OPT-OUT | The surface is not currently advertised; Phase 2 must capability-gate steer and cannot invent an HTTP endpoint. |
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
| Explicit browser CORS | INTEGRATE | Exercise `API_SERVER_CORS_ORIGINS`, SSE CORS headers, and preflight caching; wildcard, null, reflection, or absent route-specific CORS cannot establish support. |

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
- Current official HTTP docs do not advertise a run-scoped steer endpoint. Phase 2 must re-resolve `/v1/capabilities` and current official docs before implementing steer.
- If the qualification stream itself is unsafe or cannot prove exact-origin incremental delivery, the result is the redacted failure report and minimum bridge contract. No alternate endpoint, helper, Muxy source change, or bridge implementation is authorized.
