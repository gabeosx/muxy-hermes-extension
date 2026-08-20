---
phase: 1
slug: verified-gateway-connectivity
status: draft
nyquist_compliant: false
created: 2026-08-16
reconciled: 2026-08-17
---

# Phase 1 — Validation Strategy

> Feedback and sign-off contract for the consented curl-relay architecture. Direct WebKit is paired historical negative evidence; CORS and Origin observations are simulation-only where applicable and never positive qualification stages.

The gap-closure map spans Waves 5–11 plus the final Wave 12 aggregate gate; the table records each plan's actual execution wave.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Node built-in `node:test` |
| Production transport | One explicitly consented argv-form curl relay per stream, with a bounded workspace journal read by the open panel |
| Quick command | `npm run build && node --test` |
| Aggregate command | `npm run validate` |
| Feedback target | Under 10 seconds for focused Node suites; Compose and actual-Muxy sessions are wave gates |

## Sampling Rate

- After every task commit, run its exact command below. There are no watch-mode commands.
- Re-run the focused Plan 08, receipt, relay lifecycle, and diagnostics suites before Plan 09 consumes a receipt.
- Before phase verification, run `npm run validate`; manual checks are consolidated at the end of the phase.
- A production qualification is relay-native: relay consent, safe audit summary, authenticated capabilities, incremental streaming, terminal state, and awaited cleanup. It does not require a browser-origin result.

## Per-Task Verification Map

| Task ID | Plan | Wave | Secure behavior | Automated command | Bootstrap / handoff | Status |
|---|---|---:|---|---|---|---|
| 01-07-01 | 01-07 | 6 | Close cancels the sole stream and scrubs its journal before panel release. | `npm run build && node --test test/transport-lifecycle.test.js test/curl-relay.test.js test/probe-state.test.js test/transport-tracer.test.js` | Relay lifecycle for Plan 08 receipts. | ✅ green |
| 01-07-02 | 01-07 | 6 | Observed curl/SSE status and diagnostics do not infer topology or expose raw failures. | `npm run build && node --test test/transport-diagnostics.test.js test/transport-lifecycle.test.js test/curl-relay.test.js test/probe-state.test.js test/ui-contract.test.js` | Safe stage vocabulary for Plans 08–15. | ✅ green |
| 01-07-03 | 01-07 | 6 | MVP story validates without changing transport scope. | `node /Users/gabe/.codex/gsd-core/bin/gsd-tools.cjs query user-story.validate --story 'As a Hermes Gateway user, I want to build and load a Muxy panel and safely prove an authenticated Gateway connection through one explicitly consented, deployment-neutral relay contract, so that I can confirm the connection works without exposing credentials or expanding extension authority.' --pick valid` | Valid phase outcome for final verification. | ✅ green |
| 01-08-01 | 01-08 | 7 | Authoritative contracts use relay stages and retain direct-WebKit/CORS only as historical or simulation evidence. | `node --test test/contract-reconciliation.test.js` | Reconciled UI, API coverage, and validation contracts. | in progress |
| 01-08-02 | 01-08 | 7 | One valid challenge yields one safe receipt only after stream finalization and cleanup. | `npm run build && node --test test/qualification-receipt.test.js test/transport-lifecycle.test.js test/transport-diagnostics.test.js test/contract-reconciliation.test.js` | Receipt input for provenance evidence. | pending |
| 01-09-01 | 01-09 | 8 | Pair receipt-backed evidence with a schema-versioned safe projection. | `npm run build && node --test test/evidence-provenance.test.js test/evidence.test.js test/qualification-receipt.test.js` | Receipt bundle for classifier. | pending |
| 01-09-02 | 01-09 | 8 | Caller-authored positive validation input cannot become evidence. | `npm run build && node --test test/evidence-provenance.test.js test/evidence.test.js` | Closed CLI trust boundary. | pending |
| 01-10-01 | 01-10 | 9 | A real two-session receipt pair reaches the safe verdict index. | `npm run build && node --test test/verdict.test.js test/evidence-provenance.test.js test/evidence.test.js` | Index for stop gate and final validation. | pending |
| 01-10-02 | 01-10 | 9 | The stop gate needs a reproducible current-pair failure. | `npm run build && node --test test/stop-gate.test.js test/verdict.test.js test/evidence-provenance.test.js` | Native stop-boundary input. | pending |
| 01-11-01 | 01-11 | 10 | Host-native fixture completes two relay-backed receipt sessions. | `npm run build && node --test test/real-qualification.test.js test/host-fixture.test.js test/evidence-provenance.test.js test/verdict.test.js` | Real host qualification evidence. | pending |
| 01-11-02 | 01-11 | 10 | Direct-WebKit non-arrival is published only as paired historical negative transport evidence. | `npm run build && node --test test/real-qualification.test.js test/evidence-provenance.test.js test/verdict.test.js test/stop-gate.test.js` | Historical evidence for UI and reports. | pending |
| 01-12-01 | 01-12 | 11 | Docker lifecycle preserves unchanged panel access through one bounded slice. | `docker compose -f fixtures/simulations/docker-compose.yml config --quiet && node --test test/docker-qualification.test.js test/real-qualification.test.js test/evidence-provenance.test.js` | Docker readiness and ownership checks. | pending |
| 01-12-02 | 01-12 | 11 | Docker qualification covers two sessions, refusal, interruption, and restoration. | `docker compose -f fixtures/simulations/docker-compose.yml config --quiet && node --test test/docker-qualification.test.js test/transport-diagnostics.test.js test/evidence-provenance.test.js test/verdict.test.js` | Real Docker evidence. | pending |
| 01-13-01 | 01-13 | 10 | HTTPS proxy models TLS/auth/CORS simulation, streaming timing, and cleanup under one relay contract. | `docker compose -f fixtures/simulations/docker-compose.yml config --quiet && node --test test/simulated-relay.test.js test/evidence-provenance.test.js test/verdict.test.js` | Simulation-only HTTPS coverage. | pending |
| 01-13-02 | 01-13 | 10 | SSH interruption and remote-workspace namespaces stay forced `Unverified`. | `docker compose -f fixtures/simulations/docker-compose.yml config --quiet && node --test test/simulated-relay.test.js test/evidence-provenance.test.js test/verdict.test.js test/phase-boundary.test.js` | Simulation-only remote boundaries. | pending |
| 01-14-01 | 01-14 | 10 | Receipt-backed failure drives the native non-dismissible stop alert. | `npm run build && node --test test/stop-gate.test.js test/ui-contract.test.js test/verdict.test.js test/evidence-provenance.test.js` | Safe native stop UI. | pending |
| 01-14-02 | 01-14 | 10 | Native verification build is staged without changing canonical evidence. | `npm run build && node --test test/ui-contract.test.js test/stop-gate.test.js` | Manual verification artifact. | pending |
| 01-15-01 | 01-15 | 12 | Every automated evidence and authority gate passes from one clean build. | `npm run validate` | Final automated phase gate. | pending |
| 01-15-02 | 01-15 | 12 | Actual-Muxy checklist uses disposable/staged data without canonical evidence mutation. | `npm run validate` | Consolidated human verification handoff. | pending |

## Manual Actual-Muxy Checks

| Check | Expected result |
|---|---|
| Relay consent | Muxy presents the single argv-form curl operation; the bearer is absent from argv and its audit summary. |
| Safe audit summary | Audit, panel details, and receipt contain no token, endpoint identity, journal content/path, workspace path, prompt/output, topology label, or browser-origin claim. |
| Two fresh receipts | Two fresh panel instances, each with one verifier challenge, produce one correlatable receipt after capabilities, incremental stream, terminal frame, and cleanup. |
| Cancellation and cleanup | Closing or retesting cancels the relay and scrubs/removes the bounded journal before release. |
| Simulation boundaries | HTTPS proxy CORS/preflight, SSH interruption, and remote-workspace evidence remain simulations; SSH, direct remote HTTPS, and remote workspace remain `Unverified`. |

## Validation Sign-Off

- [x] Plans 07 through 15 map to their real JavaScript paths, waves 6 through 12, and exact commands.
- [x] Direct WebKit is historical negative evidence; browser CORS/Origin behavior is simulation-only where applicable.
- [ ] Contract reconciliation and receipt suites are green.
- [ ] Two fresh receipt-backed host-native and Docker qualifications exist.
- [ ] `npm run validate` is green and `nyquist_compliant: true` is set after validation.

**Approval:** pending
