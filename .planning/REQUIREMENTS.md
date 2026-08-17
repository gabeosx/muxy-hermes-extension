# Requirements: Hermes Agent Extension for Muxy

**Defined:** 2026-08-16
**Core Value:** Prove secure, authenticated, streamed Hermes run control across representative Hermes deployment shapes inside a native-feeling Muxy panel before building the surrounding product.

## v1 Requirements

### Extension Foundation

- [x] **EXT-01**: User can build the npm/Vite extension and load its generated `dist/` directory unpacked in Muxy.
- [x] **EXT-02**: The generated `dist/` contains the extension `package.json` and all files required by Muxy's extension validator.

### Connection and Trust

- [x] **CONN-01**: User can provide one Hermes Gateway URL and bearer token when the panel loads.
- [x] **CONN-02**: User can test a connection through an explicitly consented curl relay and see whether relay launch, URL reachability, bearer authentication, and capability discovery succeeded.
- [x] **CONN-03**: User can see the Gateway capabilities negotiated from `/v1/capabilities`, and unavailable run controls remain disabled or absent.
- [x] **CONN-04**: User can connect directly to a non-loopback Gateway only through HTTPS with normal certificate validation.
- [x] **CONN-05**: User receives secret-safe diagnostics that distinguish malformed URL, relay denial/unavailability, DNS, TLS, connection refusal, timeout, authentication, journal-limit, protocol, and stream failures from observed facts.

### Deployment Compatibility

- [x] **DEPL-01**: User connects to host-native, Docker-published, SSH-forwarded, and direct HTTPS Gateways through the same URL/token client contract without selecting a deployment type.
- [ ] **DEPL-02**: A host-native loopback fixture proves authenticated capability discovery and unbuffered Runs event streaming through the consented relay and open Muxy panel.
- [ ] **DEPL-03**: A local Docker published-port fixture proves the same relay behavior and documents unreachable-port and interrupted-stream behavior without the extension inspecting or managing Docker.
- [ ] **DEPL-04**: A Docker-simulated SSH local-forward condition exercises the same client behavior, including tunnel-loss and restoration, without creating or managing a real tunnel; the deployment class remains `Unverified` until tested through a real SSH-forwarded path.
- [ ] **DEPL-05**: A Docker-hosted HTTPS and reverse-proxy simulation exercises certificate, authentication, CORS, and unbuffered-stream behavior; direct remote HTTPS remains `Unverified` until tested through its real network path.
- [ ] **DEPL-06**: A locally simulated remote-workspace condition exercises workspace-independent panel-to-Gateway transport and verifies that no workspace path is sent to Hermes; the deployment class remains `Unverified` until tested from a real remote Muxy workspace.

### Run Control

- [x] **RUN-01**: User can start one Hermes run from the panel after a successful capability probe.
- [x] **RUN-02**: User can observe assistant text incrementally while one authenticated curl SSE process writes a bounded ephemeral journal consumed by the open panel without repeated exec reads.
- [x] **RUN-03**: User can observe tool activity and run completion, failure, and cancellation events emitted by the Gateway.
- [x] **RUN-04**: User can answer a pending approval explicitly using only persistence choices supplied by the Gateway.
- [x] **RUN-05**: User can steer an active run when the Gateway advertises steer support.
- [x] **RUN-06**: User can request that an active run stop when the Gateway advertises stop support, and the UI does not claim termination until the Gateway reports a terminal state.
- [x] **RUN-07**: User sees the run-status endpoint's terminal state as authoritative when stream observations and server status differ.

### Recovery and Panel Lifecycle

- [ ] **RECV-01**: User sees bounded reconnect attempts with backoff when an active event stream is interrupted while the panel remains open.
- [ ] **RECV-02**: User receives a reconciled Gateway status after a stream interruption, regardless of whether event-stream reattachment succeeds.
- [ ] **RECV-03**: User can close and reopen the panel during an active run and is guided through token re-entry and the reattachment behavior supported by the pinned Gateway.
- [ ] **RECV-04**: User can distinguish tunnel loss, Gateway loss, proxy buffering, and panel recreation in the validation evidence without the extension claiming to detect deployment topology.
- [ ] **RECV-05**: User is clearly warned when event history cannot be recovered; the extension never promises lossless replay without fixture evidence.

### Security Boundaries

- [x] **SEC-01**: User's bearer token exists only in transient panel/exec-stdin memory and is absent from argv, URLs, environment, journal files, source, bundles, persisted settings, fixtures, audit summaries, and diagnostics.
- [x] **SEC-02**: User explicitly authorizes the argv-form curl executable boundary; the UI discloses that a remembered argv grant covers the executable rather than only one Hermes host.
- [x] **SEC-03**: User must explicitly decide every Hermes approval; the extension never auto-approves an action.
- [x] **SEC-04**: User is never asked to grant Docker, SSH-tunnel, Gateway-lifecycle, terminal, Git-write, or Muxy-source authority; v1 requests only the documented curl-exec and extension-owned journal read/scrub/remove permissions required by the relay.
- [x] **SEC-05**: User grants only the minimum Muxy extension permissions demonstrated to be necessary by the v1 implementation.

### Native UX

- [x] **UX-01**: User can use the panel in light and dark Muxy themes without illegible, hard-coded, or visually conflicting colors.
- [x] **UX-02**: User can use the panel at multiple Muxy interface scales with controls and text following the host sizing contract.
- [x] **UX-03**: User can navigate interactive controls by keyboard and see visible focus and hover states.
- [x] **UX-04**: User who enables reduced motion does not receive nonessential interface animation.

### Compatibility Evidence

- [ ] **EVID-01**: User can inspect versioned fixtures identifying the tested Muxy version, Hermes version or commit, capabilities payload, representative SSE frames, control responses, and recovery observations.
- [x] **EVID-02**: User can inspect a deployment matrix that marks every required fixture as supported, unsupported, or unverified and explains the evidence behind each verdict.
- [x] **EVID-03**: User can inspect the reproducible direct-WebKit negative result and receives an observed relay failure report if the consented fallback is denied, unavailable, or cannot stream safely.
- [x] **EVID-04**: User is alerted and v1 work stops before any requirement is expanded into a Muxy source-code change.

## v2 Requirements

### Connection Profiles

- **PROF-01**: User can create, edit, duplicate, delete, and select named non-secret Gateway connection profiles.
- **PROF-02**: User can import and export non-secret connection configuration with credentials always omitted.

### Workspace Execution

- **WORK-01**: User can preview an explicit Muxy-to-Hermes workspace-path mapping before a tool-capable run.
- **WORK-02**: User can request a tool-capable run in a Gateway-validated per-run working directory.
- **WORK-03**: User receives an explicit prompt, chat-only mode, Gateway-default mode, or block when the active workspace has no mapping.

### Durable Operation

- **DURA-01**: User can retain run ownership and truthful status while the extension panel is closed.
- **DURA-02**: User can receive approval and completion attention outside the open panel.
- **DURA-03**: User can store Gateway credentials through a vetted Muxy keychain-backed secret facility or pairing flow.

### Native Muxy Integration

- **MUXY-01**: User sees Hermes as a registered Muxy agent provider if built-in Agent Focused status or provider recognition is later selected.
- **MUXY-02**: User can use a consent-gated local streaming bridge if the v1 direct WebKit transport verdict proves one necessary and the user separately authorizes the Muxy change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Any Muxy source-code change in v1 | V1 is extension-only; if direct transport requires upstream work, produce the bridge contract, alert the user, and stop. |
| Muxy agent/provider registration in v1 | Embedded Gateway run control does not require registration; revisit only for later native Agent Focused status. |
| Docker or Gateway lifecycle management | The extension connects to a user-operated service and must not own deployment infrastructure. |
| SSH tunnel creation or repair | Tunnel credentials, exposure, and process ownership remain with the user. |
| Deployment-type detection | A URL does not reliably reveal topology; diagnostics report observed transport facts instead. |
| Hermes repository or API changes in v1 | Workspace execution and validated per-run `cwd` are separate post-v1 work. |
| Workspace path translation or tool-capable active-worktree execution | Container and remote namespaces require explicit mappings plus Gateway-side path validation. |
| Persisted bearer tokens | Current Muxy extension storage is not an approved secret store. |
| Durable background status or detailed approvals | The current background surface cannot read the extension's workspace journal or recover Hermes events after subscriber disconnect. |
| Lossless replay guarantee | Hermes replay behavior must be measured; status reconciliation is the authoritative fallback. |
| Marketplace publication | V1 is a development proof against pinned versions, not a production release. |
| General-purpose chat features | Multiple conversations, history management, model selection, and polished chat UX do not reduce the core transport risk. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXT-01 | Phase 1 | Complete |
| EXT-02 | Phase 1 | Complete |
| CONN-01 | Phase 1 | Complete |
| CONN-02 | Phase 1 | Complete |
| CONN-03 | Phase 1 | Complete |
| CONN-04 | Phase 1 | Complete |
| CONN-05 | Phase 1 | Complete |
| DEPL-01 | Phase 1 | Complete |
| DEPL-02 | Phase 3 | Deferred fast-path qualification |
| DEPL-03 | Phase 3 | Partial: live connection passed; faults deferred |
| DEPL-04 | Phase 3 | Deferred fast-path qualification |
| DEPL-05 | Phase 3 | Deferred fast-path qualification |
| DEPL-06 | Phase 3 | Deferred fast-path qualification |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| EVID-01 | Phase 3 | Deferred until control/recovery evidence exists |
| EVID-02 | Phase 1 | Complete |
| EVID-03 | Phase 1 | Complete |
| EVID-04 | Phase 1 | Complete |
| RUN-01 | Phase 2 | Complete |
| RUN-02 | Phase 2 | Complete |
| RUN-03 | Phase 2 | Complete |
| RUN-04 | Phase 2 | Complete |
| RUN-05 | Phase 2 | Complete |
| RUN-06 | Phase 2 | Complete |
| RUN-07 | Phase 2 | Complete |
| SEC-03 | Phase 2 | Complete |
| UX-01 | Phase 2 | Complete |
| UX-02 | Phase 2 | Complete |
| UX-03 | Phase 2 | Complete |
| UX-04 | Phase 2 | Complete |
| RECV-01 | Phase 3 | Pending |
| RECV-02 | Phase 3 | Pending |
| RECV-03 | Phase 3 | Pending |
| RECV-04 | Phase 3 | Pending |
| RECV-05 | Phase 3 | Pending |

**Coverage:**

- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-08-16*
*Last updated: 2026-08-17 after Phase 2 fast-path verification*
