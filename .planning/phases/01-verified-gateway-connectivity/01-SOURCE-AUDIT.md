# Phase 1 Multi-Source Coverage Audit

**Audited:** 2026-08-16  
**Result:** All in-scope GOAL, REQ, RESEARCH, and CONTEXT items are covered. No source item is missing.

| Source | ID | Feature / constraint | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Build/load and safely prove authenticated capabilities plus direct event streaming through one deployment-neutral URL/token contract | 01-01 through 01-06 | COVERED | Walking skeleton, native diagnostics, evidence, real lanes, simulations, and stop gate form one tracer-first expansion. |
| REQ | EXT-01 | Build npm/Vite extension and load generated dist unpacked | 01-01 | COVERED | Starter checkpoint, tracer build, and end-of-phase real Muxy load check. |
| REQ | EXT-02 | dist contains package.json and validator inputs | 01-01 | COVERED | Ordered manifest copy and structural dist validation. |
| REQ | CONN-01 | Runtime URL and bearer token | 01-01 | COVERED | Single labeled form, in-memory secret only. |
| REQ | CONN-02 | Reachability/auth/origin/CORS/capabilities result | 01-01, 01-02, 01-04 | COVERED | Tracer plus fact-first UI and real controlled origin evidence. |
| REQ | CONN-03 | Capability discovery with unavailable controls absent | 01-01, 01-02 | COVERED | Read-only conservative capability adapter and no Phase 2 controls. |
| REQ | CONN-04 | Trusted HTTPS for non-loopback | 01-01, 01-05 | COVERED | Local URL gate plus normal WebKit TLS simulations. |
| REQ | CONN-05 | Secret-safe observed diagnostic classes | 01-02, 01-04, 01-06 | COVERED | Fact-first stages, controlled fixture attribution, final copy/report gate. |
| REQ | DEPL-01 | Same URL/token contract across conditions | 01-01, 01-03, 01-06 | COVERED | Client is topology-neutral; condition identity lives in evidence only. |
| REQ | DEPL-02 | Host-native real panel capabilities and stream | 01-04, 01-06 | COVERED | Current stable resolver plus two fresh real Muxy sessions. |
| REQ | DEPL-03 | Docker loopback real panel plus refusal/interruption | 01-04, 01-06 | COVERED | Loopback-only Compose lane plus controlled negative cases. |
| REQ | DEPL-04 | Docker-simulated SSH-forward remains Unverified | 01-05, 01-06 | COVERED | Proxy loss/restoration simulation and forced-Unverified assertions. |
| REQ | DEPL-05 | Docker HTTPS/proxy simulation remains Unverified | 01-05, 01-06 | COVERED | Normal TLS, exact CORS, auth, buffering lanes and forced-Unverified assertions. |
| REQ | DEPL-06 | Remote-workspace simulation sends no path and remains Unverified | 01-05, 01-06 | COVERED | Sentinel request/evidence checks and forced-Unverified assertions. |
| REQ | SEC-01 | Bearer remains panel-memory-only and absent from artifacts | 01-01, 01-02, 01-06 | COVERED | Closure/abort lifecycle, safe models, sentinel phase scan; threat T-01-01. |
| REQ | SEC-02 | Exact observed origin only | 01-01, 01-02, 01-04, 01-06 | COVERED | Real origin capture; wildcard/null/reflection fail; threat T-01-02. |
| REQ | SEC-04 | No Docker/SSH/process/terminal/Git/filesystem authority | 01-01, 01-04, 01-05, 01-06 | COVERED | Harness-only adapters and structural source/dist policy; threat T-01-04. |
| REQ | SEC-05 | Minimum Muxy permissions | 01-01, 01-02, 01-06 | COVERED | Panel-only manifest, exact structural permission audit. |
| REQ | EVID-01 | Versioned fixtures with versions/capabilities/SSE observations | 01-03 through 01-06 | COVERED | Schema-v1 paired reports and fixture lanes. |
| REQ | EVID-02 | Five-row Supported/Unsupported/Unverified matrix | 01-03 through 01-06 | COVERED | Exhaustive classifier, real and simulated evidence, panel integration. |
| REQ | EVID-03 | Failure report and minimum bridge contract | 01-06 | COVERED | Exact trigger/field boundaries and non-dismissible UI. |
| REQ | EVID-04 | Alert and stop before Muxy change | 01-06 | COVERED | Immediate execution halt and blocking authorization return. |
| RESEARCH | — | Current Muxy vanilla TypeScript/Vite scaffold and lockfile | 01-01 | COVERED | Required starter and package-legitimacy checkpoint. |
| RESEARCH | — | Direct WebKit fetch with bearer and streamed Response.body only | 01-01, 01-06 | COVERED | Tracer plus final API/authority enforcement. |
| RESEARCH | — | Chunk-safe in-repo SSE parser | 01-01 | COVERED | Parser and boundary tests. |
| RESEARCH | — | Staged fact-first probe with browser observability limits | 01-02, 01-04 | COVERED | Safe state machine plus harness attribution. |
| RESEARCH | — | Native Muxy theme, scale, focus, hover, and reduced motion | 01-01, 01-02, 01-06 | COVERED | UI-SPEC implemented and checked in actual Muxy. |
| RESEARCH | — | Evidence allowlist, SHA-256 shape hashing, paired atomic reports | 01-03 | COVERED | Versioned schema and writer. |
| RESEARCH | — | Continuously resolve current stable Muxy/Hermes | 01-03, 01-04 | COVERED | Evidence fields and execution-time release resolver. |
| RESEARCH | — | Host-native harness may own process lifecycle | 01-04 | COVERED | Narrow fixture adapter; extension authority test. |
| RESEARCH | — | Docker loopback fixture and negative paths | 01-04 | COVERED | Resolved revision/digest, loopback-only Compose. |
| RESEARCH | — | Local remote-class simulations never establish support | 01-03, 01-05, 01-06 | COVERED | Classifier, runners, and all output boundaries. |
| RESEARCH | — | Missing Muxy/Hermes are blocking empirical preconditions | 01-01, 01-04 | COVERED | User setup/preconditions; no substitute environment. |
| RESEARCH | — | No native HTTP, EventSource, helper, sidecar, background owner, bridge, or provider registration | 01-01, 01-06 | COVERED | Direct path and final forbidden-surface validator. |
| RESEARCH | — | Official Hermes API coverage is explicit | COVERAGE.md, 01-01, 01-06 | COVERED | Capability/chat-stream integration and every other endpoint opt-out. |
| CONTEXT | D-01 | Only actual real path can establish Supported | 01-01, 01-03, 01-04, 01-06 | COVERED | Cited in truths/actions/classifier. |
| CONTEXT | D-02 | All checks pass; reproducible fail is Unsupported; otherwise Unverified | 01-01, 01-03 through 01-06 | COVERED | Exhaustive verdict tests and UI. |
| CONTEXT | D-03 | Two fresh panel sessions on one version pair | 01-03, 01-04, 01-06 | COVERED | Session ordinals and real-run workflow. |
| CONTEXT | D-04 | Real authenticated Hermes SSE, no Phase 2 run-control UI | 01-01 through 01-04, 01-06 | COVERED | Qualification-only chat stream and explicit control absence. |
| CONTEXT | D-05 | Repository owns validation tooling/recipes | 01-03 through 01-05 | COVERED | CLI/harness/evidence split. |
| CONTEXT | D-06 | Host process authority is harness-only | 01-04 | COVERED | Host fixture allowlist and extension isolation. |
| CONTEXT | D-07 | Resolved Docker fixture, loopback-only, runner lifecycle | 01-04 | COVERED | Compose contract and tests. |
| CONTEXT | D-08 | Simulate remote classes locally and keep Unverified | 01-05, 01-06 | COVERED | Costly reversibility record plus forced status. |
| CONTEXT | D-09 | Resolve latest stable and record exact versions/digest/date | 01-01, 01-03, 01-04 | COVERED | Execution-time resolver and schema. |
| CONTEXT | D-10 | Carry last support until regression; show exact pair without prominent freshness warning | 01-03, 01-06 | COVERED | Index semantics and UI. |
| CONTEXT | D-11 | Latest-pair reproducible failure takes precedence; retain history | 01-03, 01-06 | COVERED | Verdict/index ordering. |
| CONTEXT | D-12 | Paired Markdown and schema-versioned JSON | 01-03, 01-06 | COVERED | Atomic report pair and final validation. |
| CONTEXT | D-13 | Commit redacted versioned history and latest index | 01-03, 01-06 | COVERED | `public/evidence/` model and matrix. |
| CONTEXT | D-14 | Strict safe-field evidence allowlist | 01-03, 01-06 | COVERED | Schema/sanitizer/sentinel tests. |
| CONTEXT | D-15 | SSE metadata/hash allowlist; no content | 01-01, 01-03, 01-06 | COVERED | Parser projection and evidence schema. |

## Exclusions (Not Gaps)

- CONTEXT Deferred Idea: real SSH-forwarded, direct remote HTTPS, and remote-Muxy-workspace qualification is explicitly deferred by D-08; Plan 05 supplies local simulations and keeps the classes Unverified.
- Phase 2 requirements: user run submission, transcript/tool events, approval, stop, and any genuinely advertised steer surface.
- Phase 3 requirements: reconnect, replay, terminal reconciliation, and panel recreation.
- Project out-of-scope items: profiles, storage, workspace mapping/`cwd`, durable background ownership, Muxy/Hermes source changes, provider registration, bridge implementation, helpers/sidecars, marketplace publication.

## Edge-Probe Count Preservation

All 28 supplied edge items are authored under `must_haves.edge_cases`: Plan 01 (12), Plan 02 (4), Plan 03 (4), Plan 04 (2), Plan 05 (3), and Plan 06 (3). Flagged empirical assumptions remain visible for the generated starter layout and live Muxy Origin; the other items have concrete acceptance criteria sourced from CONTEXT/RESEARCH/UI-SPEC.

## Prohibition Precision Pass

Bespoke product/transparency/privacy prohibitions are authored descriptor-less under `must_haves.prohibitions`, with `status: unverified` and `flagged: true`. Canon security concerns—bearer disclosure, CORS authorization, TLS downgrade, SSRF/infrastructure authority, and raw evidence leakage—are not duplicated; they breadcrumb to T-01-01 through T-01-05 in every plan's threat model.

