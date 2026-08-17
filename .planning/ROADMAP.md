# Roadmap: Hermes Agent Extension for Muxy

## Overview

V1 proves that a native-feeling Muxy panel can safely control one existing Hermes Gateway across host-native, Docker-published, SSH-forwarded, direct HTTPS, and remote-workspace conditions through one URL/token client contract. The roadmap front-loads the direct WebKit transport, CORS, and deployment-evidence gate; then adds capability-driven single-run control and open-panel recovery. It remains extension-only throughout: no Muxy source change, provider registration, bridge implementation, or infrastructure ownership is authorized.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (for example, 2.1): Urgent insertions after planning

- [ ] **Phase 1: Verified Gateway Connectivity** - Build the extension and prove safe direct streaming across every required deployment class.
- [ ] **Phase 2: Capability-Driven Run Control** - Let users operate one Hermes run with advertised controls in a native Muxy panel.
- [ ] **Phase 3: Open-Panel Recovery Proof** - Make interruption, panel recreation, and replay limits truthful and reproducible.

## Phase Details

### Phase 1: Verified Gateway Connectivity
**Goal:** Users can build, load, and safely prove an authenticated Hermes Gateway connection and direct event stream using one deployment-neutral URL/token client contract.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** EXT-01, EXT-02, CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06, SEC-01, SEC-02, SEC-04, SEC-05, EVID-01, EVID-02, EVID-03, EVID-04
**Success Criteria** (what must be TRUE):
  1. User can build the Vite extension, load its `dist/` directory unpacked, enter one Gateway URL and bearer token, and see an authenticated capability probe result without the token being persisted or disclosed.
  2. User can use the same URL/token flow—without selecting or detecting a deployment type—to complete real end-to-end verification for host-native loopback and local Docker-published loopback; Docker simulations exercise SSH local-forward, direct remote HTTPS, and remote Muxy workspace conditions, remain `Unverified`, and never send a workspace path to Hermes.
  3. User can see observed, secret-safe connection verdicts for URL, DNS, TLS, refusal, timeout, CORS/origin, authentication, protocol, and streaming failures; non-loopback connections require normally trusted HTTPS and successful connections require an exact observed origin rather than wildcard, `null`, or reflected CORS.
  4. User can inspect versioned protocol fixtures and a deployment matrix that record the Muxy and Hermes versions, capabilities, representative event frames, and `Supported`, `Unsupported`, or `Unverified` verdict for every required deployment condition; only a real-path end-to-end test may establish `Supported`, simulated remote conditions remain `Unverified`, and the extension requests no Docker, SSH, process, terminal, Git-write, or filesystem-write authority.
  5. If direct authenticated WebKit transport is unsafe or fails for either real-qualified deployment class, or validation reveals that a Muxy source change, bridge, or agent/provider registration change is required, user receives a reproducible failure report and the smallest required change contract; v1 expansion pauses for an explicit user decision, and no Muxy or registration change is performed automatically.
**Plans:** 6 plans

Plans:
- [ ] 01-01-PLAN.md — Prove the publish-valid panel-to-capabilities-and-SSE walking skeleton.
- [ ] 01-02-PLAN.md — Complete fact-first diagnostics and the native Muxy UI state contract.
- [ ] 01-03-PLAN.md — Build redacted evidence, verdict classification, and version history.
- [ ] 01-04-PLAN.md — Qualify host-native and Docker loopback through real Muxy paths.
- [ ] 01-05-PLAN.md — Exercise SSH, HTTPS/proxy, and remote-workspace simulations as Unverified.
- [ ] 01-06-PLAN.md — Render the matrix, enforce the Muxy-change stop gate, and validate the phase boundary.
**UI hint:** yes

### Phase 2: Capability-Driven Run Control
**Goal:** Users can safely start, observe, and control one Hermes run using only controls the connected Gateway advertises.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-07, SEC-03, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. After a successful capability probe, user can start one Hermes run and observe assistant text incrementally through the authenticated streamed `fetch()`/SSE connection.
  2. User can observe Gateway-emitted tool activity and terminal lifecycle events, and the Gateway run-status endpoint is treated as authoritative whenever stream observations disagree with server state.
  3. User can explicitly answer every pending approval using only the choices supplied by the Gateway; no action is auto-approved.
  4. User can steer or request stop only when the current Gateway advertises that control, and a stop request is not shown as complete until the Gateway reports a terminal state.
  5. User can operate the panel in light and dark themes and at supported Muxy interface scales, with keyboard navigation, visible focus/hover states, and no nonessential animation when reduced motion is enabled.
**Plans:** TBD
**UI hint:** yes

### Phase 3: Open-Panel Recovery Proof
**Goal:** Users receive a truthful, evidence-backed account of interrupted runs while the panel is open or recreated.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** RECV-01, RECV-02, RECV-03, RECV-04, RECV-05
**Success Criteria** (what must be TRUE):
  1. When an active event stream interrupts while the panel remains open, user sees bounded reconnect attempts with backoff and receives reconciled Gateway status whether or not reattachment succeeds.
  2. User can close and reopen the panel during an active run, re-enter the token, and receive clear guidance on the pinned Gateway's supported run-reattachment behavior.
  3. User can inspect validation evidence that distinguishes tunnel loss, Gateway loss, proxy buffering, and panel recreation by observed behavior without the extension claiming to identify deployment topology.
  4. User is clearly told when event history cannot be recovered; the panel never promises lossless replay without fixture evidence.
**Plans:** TBD
**UI hint:** yes

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Verified Gateway Connectivity | 0/6 | Not started | - |
| 2. Capability-Driven Run Control | 0/TBD | Not started | - |
| 3. Open-Panel Recovery Proof | 0/TBD | Not started | - |
