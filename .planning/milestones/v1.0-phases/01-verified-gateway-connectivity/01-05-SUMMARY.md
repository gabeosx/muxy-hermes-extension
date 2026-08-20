---
phase: 01-verified-gateway-connectivity
plan: 05
subsystem: gateway-transport
tags: [muxy, hermes, docker, sse, qualification, redaction]
requires:
  - phase: 01-04
    provides: Consented argv-form curl relay and bounded streaming journal
provides:
  - Actual-Muxy proof of two fresh host-native and two fresh Docker relay sessions
  - Latest-stable pinned Docker simulation fixture with refusal, interruption, and recovery coverage
  - Forced-Unverified SSH, HTTPS, and remote-workspace simulation records
  - Accurate safe UI taxonomy for Gateway refusal and timeout
affects: [01-06, phase-2-run-control, phase-3-recovery]
actuals:
  tasks: 2
  commits: 13
tech-stack:
  added: [Docker Compose, pinned Hermes Agent v2026.8.16 image, deterministic OpenAI-compatible model stub]
  patterns: [unchanged relay across deployment conditions, fresh-panel qualification pairs, simulated conditions never imply support]
key-files:
  created: [fixtures/simulations/docker-compose.yml, fixtures/simulations/model-stub.py, fixtures/simulations/scenarios.json, scripts/qualify-simulations.mjs, test/simulated-relay.test.js]
  modified: [src/curl-relay.js, src/gateway-client.js, src/probe.js, src/panel/app.js, scripts/qualify-real.mjs]
key-decisions:
  - "The extension receives only a URL and token; it neither detects nor controls Docker, SSH, proxies, or remote workspaces."
  - "Only actual host-native and Docker-published-loopback Muxy sessions count as real-path observations; all remote analogues remain Unverified."
  - "Latest stable means Muxy 1.5.0 build 945 and Hermes Agent v2026.8.16 / API 0.20.2 for this qualification run."
  - "A completed curl process with a connection error is a Gateway reachability failure, not a relay-consent failure."
patterns-established:
  - "Every claimed streaming result is driven through the actual Muxy panel and the same CurlRelay implementation."
  - "A refused or interrupted Gateway leaves unobserved downstream stages Not verified and remains safely retryable."
requirements-completed: []
coverage:
  - id: D1
    description: "The actual Muxy panel completes authenticated capability discovery and a multi-frame SSE qualification through one curl stream."
    requirement: CONN-02
    verification:
      - kind: human
        ref: "Two fresh host-native Muxy panels and two fresh Docker Muxy panels reached Connection verified"
        status: pass
      - kind: unit
        ref: "test/curl-relay.test.js and test/transport-tracer.test.js"
        status: pass
    human_judgment: true
  - id: D2
    description: "The Docker published-port path fails safely on refusal and interruption and recovers without topology-specific extension behavior."
    requirement: DEPL-03
    verification:
      - kind: human
        ref: "Actual Muxy panel observed unreachable, interrupted-stream, and restored-success states at 127.0.0.1:18642"
        status: pass
      - kind: integration
        ref: "docker compose config plus test/simulated-relay.test.js"
        status: pass
    human_judgment: true
  - id: D3
    description: "The bearer and qualification prompt are absent from the Muxy audit log, Docker logs, durable evidence, and the cleaned runtime journal."
    requirement: SEC-01
    verification:
      - kind: integration
        ref: "Post-session audit, container-log, runtime-root, dist, and evidence sentinel scans"
        status: pass
    human_judgment: false
  - id: D4
    description: "SSH, HTTPS, and remote-workspace simulations cannot produce a Supported verdict."
    requirement: DEPL-04
    verification:
      - kind: unit
        ref: "test/simulated-relay.test.js#simulation matrix keeps Docker real and every remote analogue forced Unverified"
        status: pass
    human_judgment: false
duration: 1d
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 05: Real-Panel and Deployment Simulation Summary

**The unchanged extension relay was exercised end to end in actual Muxy panels against latest-stable host-native and Docker Hermes fixtures, including safe failure and recovery paths.**

## Accomplishments

- Completed two distinct fresh-panel host-native sessions and two distinct fresh-panel Docker sessions; every session observed relay launch, bearer authentication, capability discovery, and a delayed multi-frame terminal SSE sequence.
- Added a loopback-only Docker Compose fixture pinned to the immutable Hermes v2026.8.16 image digest, with a deterministic internal model stub and no privileged, host-network, TLS-bypass, or panel-side Docker authority.
- Observed Docker refusal, deliberate mid-stream interruption, and restoration in the actual Muxy panel. Downstream stages remained `Not verified` when their prerequisites were not observed.
- Verified one capability curl plus one streaming curl per panel session, empty runtime roots after cleanup, and no disposable token or qualification prompt in the Muxy audit log or Docker logs.
- Kept SSH-forward, direct-HTTPS, and remote-workspace analogues explicitly simulated and permanently `Unverified` by construction.

## Task Commits

1. **Actual Muxy relay cleanup and host-native tracer** — `1471791`, `2c56133`, `8a37b33`, `3f9572a`, `831bdbb`, `8dba86c`, `f4bc93f`, `cca4e18`, `7dec6e7`
2. **Docker simulation matrix and live failure/recovery proof** — `d718015`, `b7e35e5`
3. **Accurate refused-Gateway diagnostics found during live verification** — `ea2b1ef`, `549ec7d`

## Deviations from Plan

### Auto-fixed issues

**1. Fresh workspaces initially failed during stale-journal preparation**

- A missing `.muxy-hermes-runtime` root was incorrectly surfaced as a cleanup failure.
- The relay now treats a missing fixed root as empty while still refusing unexpected entries.
- Reproduced in `8dba86c`; fixed in `f4bc93f`.

**2. Hermes adds safe metadata to the qualification request**

- The first deterministic model stub rejected the real Gateway request because Hermes added system/tool metadata around the exact user qualification message.
- The stub now requires the exact model, stream flag, and qualification user message while permitting normal Hermes metadata; title probes and replay remain rejected.
- Reproduced in `cca4e18`; fixed in `7dec6e7`.

**3. A refused port was mislabeled as missing relay consent**

- Live Docker failure testing showed that a completed curl with a connection error rendered `Relay not available`, even though consent and relay execution had succeeded.
- Safe bounded reasons now distinguish Gateway refusal and timeout without exposing raw curl output.
- Reproduced in `ea2b1ef`; fixed in `549ec7d` and reverified in Muxy before recovery to success.

## Verification

- `npm run build` — pass
- `node --test` with permitted loopback fixtures — 39/39 pass
- `node scripts/validate-dist.mjs` — two clean builds and six-file dist contract pass
- `docker compose -f fixtures/simulations/docker-compose.yml config --quiet` — pass
- Actual Muxy 1.5.0 build 945 with Hermes v2026.8.16 / API 0.20.2 — host 2/2 pass, Docker 2/2 pass
- Actual Muxy Docker negative paths — refused port pass, mid-stream interruption pass, restoration pass
- Runtime/audit/container sentinel checks — pass

## User Setup Required

None for this qualification. The extension was rebuilt and reloaded, disposable fixtures were operated directly, and the panel-only token was cleared by closing the panel.

## Next Phase Readiness

- Plan 01-06 can migrate the evidence schema, publish the five-row matrix, and enforce the phase stop gate using these observed real-path results.
- Remote deployment rows must remain `Unverified` until they are exercised through their real network path; local simulations are diagnostic evidence only.
- No Muxy or Hermes source change, provider registration, daemon, public ingress, or additional infrastructure was introduced.

## Self-Check

PASSED — source and fixture artifacts exist; all 39 tests, build, dist validation, Compose validation, actual Muxy success/failure/recovery flows, and redaction checks pass.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
