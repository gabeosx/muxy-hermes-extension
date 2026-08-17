---
phase: 1
slug: verified-gateway-connectivity
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` |
| **Config file** | none — Wave 0 establishes the Vite/TypeScript build and test scripts |
| **Quick run command** | `node --test` |
| **Full suite command** | `npm run build && node --test && docker compose --project-name hermes-muxy-fixture up --abort-on-container-exit` |
| **Estimated runtime** | Quick suite target: <10 seconds; full automated suite target: <120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && node --test` once Wave 0 establishes both commands.
- **After every plan wave:** Run `npm run build && node --test && docker compose --project-name hermes-muxy-fixture up --abort-on-container-exit`.
- **Before `$gsd-verify-work`:** Full automated suite must be green and the manual Muxy qualification records must be complete.
- **Max feedback latency:** 10 seconds for the quick suite; Docker and real-panel qualification are wave/phase gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-W0-01 | TBD | 0 | EXT-01, EXT-02 | — | Publish artifact contains only declared extension assets | build/artifact | `npm run build` plus `dist/` manifest assertion | ❌ W0 | ⬜ pending |
| 01-W0-02 | TBD | 0 | CONN-01, SEC-01 | T-01 | Token remains memory-only and absent from UI, bundle, logs, and evidence | unit/static | `node --test` plus sentinel-token `rg` scan | ❌ W0 | ⬜ pending |
| 01-W0-03 | TBD | 0 | CONN-02, CONN-05 | — | Diagnostics expose only observed, redacted facts | unit | `node --test` | ❌ W0 | ⬜ pending |
| 01-W0-04 | TBD | 0 | CONN-03 | — | Capability snapshot normalizes known and unknown data without Phase 2 controls | unit | `node --test` | ❌ W0 | ⬜ pending |
| 01-W0-05 | TBD | 0 | CONN-04 | T-02 | Non-loopback HTTP and URL-policy bypasses are rejected | unit | `node --test` | ❌ W0 | ⬜ pending |
| 01-W0-06 | TBD | 0 | DEPL-01 | T-03 | Every condition uses one URL/token contract with no topology selector | unit/static | `node --test` plus manifest/source audit | ❌ W0 | ⬜ pending |
| 01-W0-07 | TBD | 0 | DEPL-02, DEPL-03, SEC-02 | T-02 | Real local paths require exact origin, authenticated incremental SSE, and two fresh successful sessions | manual Muxy E2E + fixture validation | qualification runner plus fixture-log validator | ❌ W0 | ⬜ pending |
| 01-W0-08 | TBD | 0 | DEPL-04, DEPL-05, DEPL-06 | T-03 | Docker-simulated remote conditions can never produce `Supported`; no workspace path is transmitted | Compose integration + unit | `node --test` plus Compose simulation runner | ❌ W0 | ⬜ pending |
| 01-W0-09 | TBD | 0 | SEC-04, SEC-05 | T-03 | Manifest and source request no Docker, SSH, process, terminal, Git-write, filesystem-write, helper, or background authority | static | manifest/source policy script | ❌ W0 | ⬜ pending |
| 01-W0-10 | TBD | 0 | EVID-01, EVID-02 | T-04 | JSON/Markdown evidence is schema-valid, allowlisted, redacted, versioned, and indexed | unit/schema | `node --test` | ❌ W0 | ⬜ pending |
| 01-W0-11 | TBD | 0 | EVID-03, EVID-04 | T-04 | Failed direct transport emits a redacted report and minimum change contract, then stops without modifying Muxy | unit + manual UI | `node --test` plus Muxy alert inspection | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Muxy vanilla Vite starter, strict TypeScript configuration, manifest-copy script, and build artifact assertion — covers EXT-01 and EXT-02.
- [ ] Pure unit-test setup for URL policy, probe-state projection, SSE parsing, redaction, evidence schema, and verdict classification.
- [ ] Harness-owned fixtures for host-native Hermes, Docker loopback Hermes, simulated SSH loss, simulated HTTPS/reverse proxy, and simulated remote workspace conditions.
- [ ] Evidence writer/validator with committed non-secret fixtures and a latest-run index.
- [ ] Muxy installation/version-capture preflight and operator-run real-panel qualification script.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Host-native qualification | DEPL-02, SEC-02 | Requires the actual Muxy panel and its WebKit origin/stream behavior | Resolve latest stable Muxy and Hermes, open two fresh panel sessions, complete capability and incremental authenticated SSE probes, then validate the redacted evidence records. |
| Docker loopback qualification | DEPL-03, SEC-02 | Requires the actual Muxy panel against the loopback-published container path | Start the resolved Hermes container, complete two fresh panel-session probes, exercise refusal and interrupted-stream cases, then validate evidence and fixture logs. |
| Muxy-change stop gate | EVID-03, EVID-04 | Requires user-visible confirmation in the real panel and human authorization judgment | Force the direct-transport failure path; confirm the panel names the failed check, produces only the minimum redacted change contract, and performs no Muxy source, bridge, or registration change. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test and fixture references.
- [ ] No watch-mode flags.
- [ ] Quick feedback latency remains below 10 seconds.
- [ ] Two fresh real-panel successes exist for both host-native and Docker loopback.
- [ ] SSH-forwarded, direct remote HTTPS, and remote-workspace simulations remain `Unverified`.
- [ ] `nyquist_compliant: true` is set in frontmatter after validation.

**Approval:** pending
