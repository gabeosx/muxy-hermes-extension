# Walking Skeleton — Hermes Agent Extension for Muxy

**Phase:** 1  
**Generated:** 2026-08-16

## Capability Proven End-to-End

A Hermes Gateway user can load the built Muxy panel, enter one runtime URL and bearer token, and receive an exact-origin authenticated capability result plus an incremental, qualification-only Hermes SSE verdict without persisting the secret or adding infrastructure authority.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Current Muxy vanilla TypeScript/Vite panel scaffold, with its resolved lockfile preserved | The panel is the native Muxy surface that exposes WebKit `fetch()` and streamed `Response.body`; vanilla TypeScript keeps the proof auditable. |
| Data layer | No application database or credential persistence | Hermes owns server state. The real Phase 1 data boundary is an authenticated `GET /v1/capabilities` plus a qualification-only incremental SSE response; repository-owned validation tooling writes only redacted evidence. |
| Authentication | Runtime bearer in open-panel memory, sent only in `Authorization`; exact observed CORS origin required | Muxy storage is not a credential vault, and the Gateway grants terminal/file-capable authority. |
| Deployment target | Local unpacked `dist/` loaded by the current stable Muxy app; host-native and Docker loopback fixtures are the real qualification lanes | Phase 1 is a development proof, not marketplace or hosted deployment. The same client path is used for every condition. |
| Directory layout | `src/` panel/client, `test/` pure contracts, `fixtures/` harness-only infrastructure, `scripts/` validation commands, `public/evidence/` committed redacted records | Separates the least-privilege extension from process/Docker authority and makes evidence ship-readable without exposing raw observations. |
| Transport | Direct panel WebKit `fetch()` with bearer header and chunk-safe in-repo SSE parser | It is the only authorized production transport and the existential premise Phase 1 must prove. |
| Compatibility | Runtime `/v1/capabilities` negotiation plus continuously resolved stable Muxy/Hermes fixtures | Avoids private internals and preserves exact version/digest evidence while testing the current pair. |

## Stack Touched in Phase 1

- [ ] Project scaffold — current Muxy vanilla Vite starter, strict TypeScript, build, lint/static policy checks, Node test runner, preserved lockfile.
- [ ] Routing — one real Muxy panel entry loaded from `dist/`.
- [ ] Data boundary — no database by design; one authenticated capability read and one real incremental SSE qualification request replace the generic database read/write proof.
- [ ] UI — URL/token form and `Test connection` interaction wired to the direct Gateway client.
- [ ] Deployment — documented local build/load command plus real Muxy qualification against host-native and Docker-published loopback fixtures.
- [ ] Evidence — schema-versioned JSON and Markdown reports, append-only history, and a latest-result index created only by repository-owned tooling.

## Trust and Ownership Boundaries

```text
Open Muxy panel
  ├─ owns ephemeral URL/token, normalized UI state, direct fetch, stream reader
  └─ owns no Docker, SSH, process, terminal, Git-write, filesystem-write, or background helper

Hermes Gateway
  ├─ authenticates bearer and authorizes exact browser origin
  └─ owns capability truth and the real streamed response

Repository validation harness
  ├─ may resolve/start/stop test fixtures and simulations
  └─ transforms ephemeral raw observations into strict redacted evidence
```

## Out of Scope (Deferred to Later Slices)

- Phase 2: user run submission, transcript rendering, approvals, stop, and any steer surface actually advertised by current Hermes capabilities.
- Phase 3: run-status reconciliation, reconnect/replay behavior, panel recreation, and token re-entry guidance.
- Named profiles, persisted settings, credential storage, workspace mappings, tool-capable `cwd`, durable background ownership, and notifications.
- Real SSH-forwarded, direct remote HTTPS, and remote-Muxy-workspace qualification; local simulations remain `Unverified`.
- Muxy source changes, provider registration, native bridges, helpers, sidecars, and marketplace publication.

## Subsequent Slice Plan

- Phase 2: A connected user starts, observes, approves, steers when genuinely advertised, and stops one Hermes run through the proven client contract.
- Phase 3: A user receives truthful status and replay guidance after stream interruption or panel recreation.

