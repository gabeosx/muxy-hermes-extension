# Hermes Gateway API Coverage — Phase 3

**Phase:** 3 — Open-Panel Recovery Proof  
**Reviewed:** 2026-08-17  
**Authority:** Current official Hermes API Server documentation on `main`, plus the pinned repository fixture contract  
**Primary source:** https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md

## Coverage Rule

Phase 3 changes lifecycle behavior, not the deployment-neutral API surface. It reuses the existing authenticated Runs status and event endpoints. A same-open-panel observer may make two best-effort reattach attempts after interruption, but every attempt is preceded by authoritative status reconciliation and never creates a lossless/exactly-once claim. A recreated panel accepts fresh URL/token input and a manually entered Run ID, then performs status-only recovery. No endpoint cursor, session history API, background owner, storage API, topology-specific route, or new permission is introduced.

`INTEGRATE` means Phase 3 production code directly invokes or renders the endpoint behavior. `INHERITED` means Phase 2 already integrated the surface and Phase 3 preserves its contract. `OPT-OUT` means reviewed and deliberately unused.

## Runs Surface

| capability | decision | reason |
|---|---|---|
| `GET /v1/capabilities` | INTEGRATE | A fresh connection still gates all run/recovery controls from advertised names; fixture evidence records only safe capability metadata/shape. |
| `POST /v1/runs` | INTEGRATE | Starts the initial run and observer exactly as Phase 2; Phase 3 adds no automatic resubmission or idempotent replay. |
| `GET /v1/runs/{run_id}` | INTEGRATE | Authoritative after every stream interruption, before every reattach decision, after exhaustion, and for manual recreated-panel recovery/refresh. |
| `GET /v1/runs/{run_id}/events` | INTEGRATE | Initial subscription plus exactly two serialized best-effort same-panel reattach attempts using a fresh parser. Recreated panels do not automatically attach. |
| `POST /v1/runs/{run_id}/stop` | INTEGRATE | Remains capability-gated; recovered active runs may request stop, then reconcile authoritative status. |
| `POST /v1/runs/{run_id}/steer` | INTEGRATE | Remains capability-gated; no recovery state implies delivery or replay. |
| `POST /v1/runs/{run_id}/approval` | INTEGRATE | Remains capability- and exact-choice-gated. Pending approval detail is cleared on interruption/recreation and is never synthesized from status. |

## Reviewed Opt-Outs

| capability | decision | reason |
|---|---|---|
| Responses/session message history endpoints | OPT-OUT | They are a different product/session contract and cannot reconstruct the active Runs event stream or approval detail. |
| Jobs/background APIs | OPT-OUT | Durable background ownership and closed-panel attention are post-v1. |
| Skills/toolsets/models/profile discovery | OPT-OUT | Recovery requires no new metadata or model selection. |
| Any event cursor/resume token | OPT-OUT | Current contract supplies no client-confirmed exactly-once cursor; the panel must warn about incomplete/duplicated events. |
| Native Muxy HTTP, `EventSource`, helper daemon, or background script | OPT-OUT | They either cannot satisfy the authenticated local stream or would add a second authority/owner. |

## Fixture and Claim Boundary

- The pinned Docker-published-loopback fixture may establish only the recovery facts actually observed in the final Muxy panel.
- DEPL-02 completes only after the explicitly pinned host Hermes executable runs with a fresh HOME/workspace through the final native Muxy panel and proves authenticated capabilities plus incremental Runs SSE and cleanup; `not_run` is not accepted.
- Simulated SSH loss/restoration, proxy/TLS/buffering, and remote-workspace independence remain Unverified and cannot establish their deployment class.
- Recovery evidence stores version/capability/event/control/status/recovery/cleanup metadata only. It excludes bearer, URL, content, raw errors/headers/bodies, journal/subprocess data, and workspace paths.
- The existing transport evidence index, classifier, and stop gate remain authoritative and unchanged; Phase 3 recovery facts use a separate schema-versioned document.
