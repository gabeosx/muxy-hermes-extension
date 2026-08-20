# Phase 3: Open-Panel Recovery Proof - Validation Plan

**Status:** planned  
**Nyquist validation:** enabled by `.planning/config.json`

## Phase Gate

`npm run validate` must pass after the recovery implementation. The phase is not complete until focused recovery tests pass and fixture evidence is either captured or explicitly marked `Unverified`—never inferred.

## Automated Test Matrix

| ID | Requirement | Test | Acceptance assertion |
|---|---|---|---|
| V-01 | RECV-01 | `test/run-controller.test.js` | An interrupted active stream performs the exact bounded retry count with injected backoff; no fourth subscription starts. |
| V-02 | RECV-01 / RECV-02 | `test/run-controller.test.js` | Each ended/failed attempt issues a status request before retry and updates the snapshot from authoritative Gateway state. |
| V-03 | RECV-02 | `test/run-controller.test.js` | Retry exhaustion leaves the run recoverable by status and presents a safe interruption warning rather than false completion. |
| V-04 | RECV-02 | `test/run-controller.test.js` | A terminal status observed after interruption stops further reconnect attempts and retains server final output. |
| V-05 | RECV-01 | `test/run-controller.test.js` | `release()` or a later start invalidates queued backoff/observer completions and publishes no stale state. |
| V-05a | RECV-02 | `test/run-controller.test.js` | A failed status GET after the initial observer, either retry, or final exhaustion publishes `status_unavailable` + `disconnected`, starts no later automatic observer, and makes no terminal/reconciled claim. |
| V-05b | RECV-02 | `test/run-controller.test.js` | Manual Refresh is available from `status_unavailable`; repeated failure remains unavailable and later success adopts returned status without restarting SSE. |
| V-06 | RECV-03 | `test/run-client.test.js` | Reattach uses the same fixed run-events endpoint, a fresh parser, bearer in relay input, and validates the run ID. |
| V-07 | RECV-03 / RECV-05 | `test/ui-contract.test.js` | Recovery UI demands freshly entered token + Run ID and contains explicit no-history/no-approval-replay copy. |
| V-08 | RECV-03 / SEC-01 | `test/ui-contract.test.js` | Manifest remains without storage/background permissions and panel source has no browser/Muxy storage usage. |
| V-09 | RECV-04 | `test/simulated-relay.test.js` | Scenario records label observed interruption/restoration/proxy buffering/panel recreation without choosing a topology. |
| V-10 | RECV-04 / DEPL-04..06 | `test/simulated-relay.test.js` + `test/evidence*.test.js` | SSH, proxy/HTTPS, and remote-workspace simulations remain `Unverified`. |
| V-11 | RECV-05 / EVID-01 | `test/evidence*.test.js` | Recovery evidence contains only allowlisted structural outcomes and rejects bearer, URL, output, event text, approval detail, journal data, and workspace paths. |
| V-12 | EVID-01 | `test/evidence*.test.js` | Version tuple, capability metadata/shape, representative event metadata, controls/status outcomes, recovery observation, and cleanup state are validated before publication. |

## Native/Fixture Proof Checklist

Run only against a disposable fixture. The extension never launches, stops, pauses, or repairs it; the operator/test harness does. Remove all containers, networks, temporary homes, journals, and exposed ports afterward.

### Docker published-loopback recovery

1. Start the existing pinned compose fixture on a unique loopback port and record the exact Muxy build plus Hermes image digest/version.
2. In Muxy, reload the built `dist/`, enter fixture URL/token, and record only the negotiated capability names/shape.
3. Start a harmless delayed run, confirm first incremental event, then use an external fixture fault to interrupt the event path while keeping the Gateway run alive.
4. Observe the bounded reconnect state, its final status reconciliation, and whether a second subscription receives new framed events. Mark event completeness `not_verified` unless a dedicated predicate proves it.
5. Close and reopen the panel during a second active run. Re-enter token, provide the displayed run ID, recover status/final output, and confirm the UI does not recreate earlier activity or approval details.
6. Exercise a refused/unreachable endpoint as a separate observed condition; it must not be called a tunnel or gateway type by the panel.
7. Capture a redacted evidence record, then clean fixture and runtime artifacts.

### Host-native and simulated rows

- Host-native: pass the explicit pinned `v0.20.2 (2026.8.16)` temporary Hermes executable to the existing host qualification harness; create a fresh 0700 HOME/HERMES_HOME and empty workspace; run authenticated capabilities plus the fixed harmless incremental Runs task through native Muxy; verify terminal status and cleanup. Phase 3 cannot complete DEPL-02 with `not_run`, Unverified, or Blocked.
- Simulated SSH forward: trigger a relay interruption/restoration in the local scenario and retain `Unverified`.
- Local proxy/HTTPS: test only the named simulation behavior (certificate/auth/buffering); direct remote HTTPS remains `Unverified`.
- Simulated remote workspace: prove no workspace path appears in request/evidence and retain `Unverified` without trying to infer workspace topology.

## Required Commands

```bash
node --test test/run-client.test.js test/run-controller.test.js test/ui-contract.test.js
node --test test/host-fixture.test.js test/recovery-fixture.test.js test/recovery-evidence.test.js test/simulated-relay.test.js test/evidence.test.js test/evidence-provenance.test.js
npm run build
npm run validate
docker compose -f fixtures/simulations/docker-compose.yml config --quiet
```

## Manual Assertions

- Every recovery message is readable at Muxy light/dark themes and current interface scale; focus remains visible and motion is not required to understand retry state.
- User-visible wording says “attempting to resume live updates” / “status is authoritative,” never “lossless replay,” “fully recovered transcript,” or “tunnel detected.”
- Bearer is cleared from the visible field after each successful probe and after panel release.
- Recovery never adds a manifest permission, background script, storage use, deployment selector, URL mutation, TLS bypass, or Muxy/Hermes source change.

## Failure Policy

- A status failure after a stream interruption is `status_unavailable` plus `disconnected`, preserves manual Refresh, starts no further automatic observer, and is never a fabricated completion or successful reconciliation.
- An event reattach failure after the retry budget is an explicit `disconnected` result with status refresh available.
- Host-native or Docker fixture failure leaves DEPL-02 or DEPL-03 incomplete and blocks phase completion; it cannot be converted into a passing requirement through an Unverified row. Simulated remote analogues remain Unverified by design.
