# Roadmap: Hermes Agent Extension for Muxy

## Overview

V1 proves that a native-feeling Muxy panel can safely control one existing Hermes Gateway across representative deployment conditions through one URL/token client contract. The direct WebKit experiment produced a negative result, so the approved extension-only path uses one consented curl process per SSE stream and a bounded workspace journal read by the open panel. No Muxy source change, provider registration, external daemon, hosted relay, or infrastructure ownership is authorized.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (for example, 2.1): Urgent insertions after planning

- [x] **Phase 1: Verified Gateway Connectivity** - Build the extension, record the direct-WebKit negative result, and prove the consented relay boundary.
- [ ] **Phase 2: Capability-Driven Run Control** - Let users operate one Hermes run with advertised controls in a native Muxy panel.
- [ ] **Phase 3: Open-Panel Recovery Proof** - Make interruption, panel recreation, and replay limits truthful and reproducible.

## Phase Details

### Phase 1: Verified Gateway Connectivity

**Goal:** As a Hermes Gateway user, I want to build and load a Muxy panel and safely prove an authenticated Gateway connection through one explicitly consented, deployment-neutral relay contract, so that I can confirm the connection works without exposing credentials or expanding extension authority.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** EXT-01, EXT-02, CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, DEPL-01, SEC-01, SEC-02, SEC-04, SEC-05, EVID-02, EVID-03, EVID-04
**Success Criteria** (what must be TRUE):

  1. User can build the Vite extension, load its `dist/` directory unpacked, enter one Gateway URL and bearer token, explicitly authorize the curl relay, and see an authenticated capability probe without the token entering argv, files, storage, diagnostics, or audit summaries.
  2. User can use the same URL/token flow—without selecting or detecting a deployment type—to complete one live end-to-end proof against a disposable Docker-published loopback Gateway; host-native, SSH-forward, direct HTTPS, and remote-workspace rows remain explicitly `Unverified` until their later qualification work runs.
  3. User can see observed, secret-safe verdicts for URL, relay consent/launch, DNS, TLS, refusal, timeout, authentication, protocol, journal-limit, and streaming failures; non-loopback connections require normally trusted HTTPS.
  4. User can inspect versioned evidence for the direct-WebKit negative result and relay behavior across the deployment matrix; only a real path may establish `Supported`, and simulated remote conditions remain `Unverified`.
  5. The extension requests only `commands:exec`, journal file read/write, and panel authority; it never performs Docker, SSH, Gateway lifecycle, terminal, Git, Muxy-source, Hermes-source, or provider-registration changes.

**Plans:** 15/15 accounted for — 9 executed, 6 superseded

**Fast-path decision (2026-08-17):** Plans 10-15 were superseded. The retained MVP is the built and native-loaded URL/token → consented relay → capabilities → incremental stream → awaited cleanup path. That path passed against a pinned disposable Docker Gateway and all temporary resources were removed. Broader deployment qualification remains deferred and unclaimed.

Plans:

**Wave 1**

- [x] 01-01-PLAN.md — Prove the publish-valid panel-to-capabilities-and-SSE walking skeleton.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Complete fact-first diagnostics and the native Muxy UI state contract.
- [x] 01-03-PLAN.md — Build redacted evidence, verdict classification, and version history.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Record the direct-WebKit negative result and implement the consented curl streaming relay.
- [x] 01-05-PLAN.md — Exercise SSH, HTTPS/proxy, and remote-workspace simulations as Unverified.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — Render the matrix, enforce the Muxy-change stop gate, and validate the phase boundary.

**Wave 6** *(gap closure; blocked on the executed-plan DAG through Wave 5)*

- [x] 01-07-PLAN.md — Close relay cancellation and diagnostic gaps, then repair the MVP goal contract.

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 01-08-PLAN.md — Reconcile authoritative contracts to the curl relay and emit safe verifier-bound receipts.

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 01-09-PLAN.md — Publish verifier-owned receipt bundles through the versioned evidence contract.

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 01-10-PLAN.md — Superseded: failure-receipt schema expansion deferred.

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 01-11-PLAN.md — Superseded: host-native two-session qualification deferred.
- [x] 01-13-PLAN.md — Superseded: broader deployment simulations deferred.
- [x] 01-14-PLAN.md — Superseded: native base UI checked directly; staged stop state deferred.

**Wave 11** *(blocked on Wave 10 host and simulation completion)*

- [x] 01-12-PLAN.md — Superseded: live Docker connection proven; fault harness deferred.

**Wave 12** *(blocked on Waves 10–11 completion)*

- [x] 01-15-PLAN.md — Superseded by focused validator and native fast-path checklist.

**UI hint:** yes

### Phase 2: Capability-Driven Run Control

**Goal:** Users can safely start, observe, and control one Hermes run using only controls the connected Gateway advertises.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-07, SEC-03, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):

  1. After a successful capability probe, user can start one Hermes run and observe assistant text incrementally through one authenticated curl SSE process and the bounded open-panel journal.
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
**Requirements:** RECV-01, RECV-02, RECV-03, RECV-04, RECV-05, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06, EVID-01
**Success Criteria** (what must be TRUE):

  1. When an active event stream interrupts while the panel remains open, user receives reconciled Gateway status and is told that the disconnected Hermes event stream cannot be reattached safely.
  2. User can close and reopen the panel during an active run, re-enter the token, and recover current status/final output without a promise of missed-event or approval-detail replay.
  3. User can inspect validation evidence that distinguishes tunnel loss, Gateway loss, proxy buffering, and panel recreation by observed behavior without the extension claiming to identify deployment topology.
  4. User is clearly told when event history cannot be recovered; the panel never promises lossless replay without fixture evidence.

**Plans:** TBD
**UI hint:** yes

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Verified Gateway Connectivity | 15/15 | Complete | 2026-08-17 |
| 2. Capability-Driven Run Control | 0/TBD | Not started | - |
| 3. Open-Panel Recovery Proof | 0/TBD | Not started | - |
