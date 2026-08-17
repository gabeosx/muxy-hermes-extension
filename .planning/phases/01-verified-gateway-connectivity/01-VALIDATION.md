---
phase: 1
slug: verified-gateway-connectivity
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false)
status: draft
nyquist_compliant: false
created: 2026-08-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` |
| **Config file** | none — Plan 01-01 Task 2 establishes the first runnable Vite/TypeScript build and Node test command |
| **Quick run command** | `npm run build && node --test` after 01-01 Task 2 |
| **Full suite command** | `npm run validate` after 01-06 Task 2; before then use the exact task/wave commands below |
| **Estimated runtime** | Quick suite target: <10 seconds; full automated suite target: <120 seconds |

---

## Sampling Rate

- **After 01-01 Task 1:** No automated command exists yet; this is the single blocking supply-chain checkpoint before `npm ci`.
- **After every later task commit:** Run that task's exact `<automated>` command from the map below. Plan 01-01 Task 2 is the bootstrap that makes build/test sampling runnable.
- **After Wave 1:** Re-run `npm run build && node scripts/validate-dist.mjs && node --test test/transport-tracer.test.ts`.
- **After Wave 2:** Re-run `npm run build && node --test` after all four Wave 2 task commands have passed.
- **After Wave 3:** Re-run both final task commands from Plans 01-04 and 01-05 so the real-fixture and simulation Compose configurations remain independently validated.
- **After Wave 4:** Run `npm run validate` as the aggregate non-watch build/unit/static/schema/redaction/scope gate.
- **Before `$gsd-verify-work`:** Full automated suite must be green and the manual Muxy qualification records must be complete.
- **Max feedback latency:** 10 seconds for the quick suite; Docker and real-panel qualification are wave/phase gates.
- **Continuity proof:** In execution order, only 01-01 Task 1 lacks `<automated>` verification. Tasks 01-01-02 through 01-06-02 each carry a runnable automated command, so the maximum consecutive gap is one task and no three consecutive tasks lack automated feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Bootstrap / Artifact Source | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-----------------------------|--------|
| 01-01-01 | 01-01 | 1 | EXT-01, EXT-02 | T-01-SC | Official starter package identities and lockfile are approved before installation | blocking human checkpoint | N/A — checkpoint intentionally precedes `npm ci` and the test bootstrap | Generated Muxy starter + lockfile; enables 01-01-02 | ⬜ pending |
| 01-01-02 | 01-01 | 1 | CONN-01, CONN-02, CONN-03, CONN-04, DEPL-01, SEC-01, SEC-02 | T-01-01 through T-01-05 | Direct bearer-authenticated capabilities plus exact deterministic real-Hermes SSE fixture; token/content remain ephemeral | tracer build + Node tests | `npm run build && node --test test/transport-tracer.test.ts` | Creates `test/transport-tracer.test.ts` and first runnable build/test path | ⬜ pending |
| 01-01-03 | 01-01 | 1 | EXT-01, EXT-02, SEC-04, SEC-05 | T-01-04, T-01-SC | Publish artifact contains the panel/manifest only and declares minimum authority | build/artifact + Node tests | `npm run build && node scripts/validate-dist.mjs && node --test test/transport-tracer.test.ts` | Creates `scripts/validate-dist.mjs`; bootstraps later dist checks | ⬜ pending |
| 01-02-01 | 01-02 | 2 | CONN-02, CONN-05, SEC-01, SEC-02 | T-01-01, T-01-02, T-01-05 | Diagnostics expose immutable observed/redacted facts and serialize no bearer/raw error | state-machine tests | `npm run build && node --test test/transport-tracer.test.ts test/probe-state.test.ts` | Extends Plan 01 transport types | ⬜ pending |
| 01-02-02 | 01-02 | 2 | CONN-03, SEC-05 | T-01-04, T-01-05 | Capabilities remain conservative/read-only and every approved native UI state is represented | UI/DOM contract tests | `npm run build && node --test test/probe-state.test.ts test/ui-contract.test.ts` | Creates `test/ui-contract.test.ts` for 01-06-01 | ⬜ pending |
| 01-03-01 | 01-03 | 2 | EVID-01, EVID-02 | T-01-01, T-01-05 | JSON/Markdown evidence is paired, schema-valid, allowlisted, redacted, and atomic | evidence/schema tests | `npm run build && node --test test/evidence.test.ts` | Creates evidence writer/schema used by Plans 01-04/01-05 | ⬜ pending |
| 01-03-02 | 01-03 | 2 | DEPL-01 through DEPL-06, EVID-02 | T-01-02 through T-01-05 | Only complete two-session real-path evidence can establish Supported; simulations/partials force Unverified | verdict truth-table tests | `npm run build && node --test test/evidence.test.ts test/verdict.test.ts` | Creates classifier/index used by Plans 01-04 through 01-06 | ⬜ pending |
| 01-04-01 | 01-04 | 3 | CONN-02, CONN-05, DEPL-02, SEC-02, SEC-04, EVID-01, EVID-02 | T-01-01 through T-01-05 | Installed/latest Muxy identity and deterministic host-native two-session stream fixture fail closed on every unproved input | host fixture + evidence tests | `npm run build && node --test test/host-fixture.test.ts test/evidence.test.ts test/verdict.test.ts` | Creates version resolver/host fixture used by 01-04-02 and final matrix | ⬜ pending |
| 01-04-02 | 01-04 | 3 | DEPL-03, SEC-02, SEC-04, EVID-01, EVID-02 | T-01-01 through T-01-05 | Docker lane is loopback-only, deterministic, two-session qualified, and observes refusal/interruption without panel authority | Compose structure + fixture tests | `docker compose -f fixtures/docker-compose.yml config && npm run build && node --test test/docker-fixture.test.ts test/evidence.test.ts test/verdict.test.ts` | Creates real Docker fixture/evidence consumed by 01-06 | ⬜ pending |
| 01-05-01 | 01-05 | 3 | DEPL-04, DEPL-06, SEC-04, EVID-01, EVID-02 | T-01-01, T-01-04, T-01-05 | SSH/workspace simulations force Unverified and transmit/persist no workspace path | Compose structure + simulation tests | `docker compose -f fixtures/simulations/docker-compose.yml config && npm run build && node --test test/simulated-ssh-workspace.test.ts test/verdict.test.ts test/evidence.test.ts` | Creates simulation Compose/scenarios used by 01-05-02 and 01-06 | ⬜ pending |
| 01-05-02 | 01-05 | 3 | DEPL-05, SEC-02, SEC-04, EVID-01, EVID-02 | T-01-02 through T-01-05 | TLS/auth/CORS/buffering are observed without bypass and direct remote HTTPS remains Unverified | Compose structure + simulation tests | `docker compose -f fixtures/simulations/docker-compose.yml config && npm run build && node --test test/simulated-https.test.ts test/verdict.test.ts test/evidence.test.ts` | Extends the same simulation/evidence interfaces without a client branch | ⬜ pending |
| 01-06-01 | 01-06 | 4 | CONN-05, DEPL-01 through DEPL-06, EVID-01 through EVID-04 | T-01-01 through T-01-05 | Five-row matrix preserves verdict boundaries; unsafe real transport emits only the redacted stop contract | stop-gate/UI/evidence tests | `npm run build && node --test test/stop-gate.test.ts test/evidence.test.ts test/verdict.test.ts test/ui-contract.test.ts` | Consumes all prior safe evidence/index artifacts | ⬜ pending |
| 01-06-02 | 01-06 | 4 | All 21 Phase 1 IDs | T-01-01 through T-01-05 | Aggregate gate enforces build, schema, redaction, permissions, API scope, simulations, and no upstream change | aggregate phase validation | `npm run validate` | Creates final non-watch validation command from every prior test/validator | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Bootstrap Dependencies (No Fictional Wave 0)

| Bootstrap Task | Creates | First Consumers |
|---|---|---|
| 01-01-01 | Approved generated starter/lockfile supply chain | 01-01-02 `npm ci`, build, and tracer tests |
| 01-01-02 | Vite build plus `test/transport-tracer.test.ts` | 01-01-03 and every later `npm run build`/transport regression command |
| 01-01-03 | `scripts/validate-dist.mjs` and publish-valid dist contract | 01-06-02 aggregate phase validator |
| 01-03-01 | Evidence schema/writer and `test/evidence.test.ts` | 01-03-02, both Wave 3 plans, and 01-06 |
| 01-03-02 | Verdict classifier/index and `test/verdict.test.ts` | Both Wave 3 qualification plans and final matrix |
| 01-04-01 | Installed/latest version resolver, deterministic host fixture, and host test | 01-04-02 and final real-path evidence gate |
| 01-04-02 / 01-05-01 | Real/simulation Compose definitions | Their own task commands, Wave 3 resampling, and 01-06 evidence consumption |
| 01-06-02 | `npm run validate` aggregate | End-of-phase verification and `$gsd-verify-work` entry |

There is no Wave 0 plan or identifier. The dependency graph is Wave 1 (01-01) → Wave 2 (01-02/01-03) → Wave 3 (01-04/01-05) → Wave 4 (01-06), and each bootstrap appears before its first consumer in that graph.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Host-native qualification | DEPL-02, SEC-02 | Requires the actual Muxy panel and its WebKit origin/stream behavior | Capture `com.muxy.app` short/build versions via the 01-RESEARCH `plutil` preflight, resolve the official latest stable Muxy/Hermes releases, open two fresh panel sessions, and complete capabilities plus COVERAGE.md's deterministic two-delta/no-tool Hermes SSE contract before validating redacted evidence. Any missing/mismatch/unproved condition remains Unverified. |
| Docker loopback qualification | DEPL-03, SEC-02 | Requires the actual Muxy panel against the loopback-published container path | Start the resolved Hermes container and deterministic fixture model, complete two fresh panel-session probes, exercise refusal and interrupted-stream cases, then validate evidence and fixture logs. Any tool event/content persistence or unproved first-frame-before-completion result remains Unverified. |
| Muxy-change stop gate | EVID-03, EVID-04 | Requires user-visible confirmation in the real panel and human authorization judgment | Force the direct-transport failure path; confirm the panel names the failed check, produces only the minimum redacted change contract, and performs no Muxy source, bridge, or registration change. |

---

## Validation Sign-Off

- [x] Every submitted 01-01 through 01-06 task is mapped to its real wave and exact `<automated>` command; 01-01-01 is explicitly the sole pre-install human checkpoint.
- [x] Sampling continuity is explicit: the maximum automated-verification gap is one task, and every task from 01-01-02 onward has an automated command.
- [x] Fictional Wave 0 identifiers/claims are removed; bootstrap creators and first consumers are mapped to Waves 1–4.
- [ ] No watch-mode flags.
- [ ] Quick feedback latency remains below 10 seconds.
- [ ] Two fresh real-panel successes exist for both host-native and Docker loopback.
- [ ] SSH-forwarded, direct remote HTTPS, and remote-workspace simulations remain `Unverified`.
- [ ] `nyquist_compliant: true` is set in frontmatter after validation.

**Approval:** pending
