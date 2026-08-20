---
phase: 04
slug: contract-and-attack-surface-cleanup
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-20
validated: 2026-08-20
---

# Phase 04 — Validation Strategy

> Retroactive Nyquist audit of the frozen Dashboard-session release contract.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner |
| **Config file** | none |
| **Quick run command** | `node --test test/dashboard-auth.test.js test/curl-relay.test.js test/dashboard-gateway.test.js test/auth-ui-unsupported.test.js` |
| **Full suite command** | `npm test` |
| **Distribution command** | `npm run validate:dist` |
| **Observed runtime** | ~0.5 seconds (full suite); ~1.3 seconds (distribution validation) |

## Sampling Rate

- **After a contract or UI change:** Run the focused command for the affected module.
- **Before release validation:** Run `npm test` and `npm run validate:dist`.
- **No watch-mode flags:** all commands terminate deterministically.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01 | 01 | 1 | CONT-01 | Marketplace identity is frozen and stale Gateway credentials are deletion-only. | unit | `node --test test/ui-contract.test.js test/session-broker.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-02 | Only provider-advertised password login is accepted; password stays transient and outside argv. | integration | `node --test test/dashboard-auth.test.js test/curl-relay.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-03 | OAuth/OIDC-only provider discovery renders explicit unsupported guidance in both shipped surfaces. | integration | `node --test test/dashboard-auth.test.js test/auth-ui-unsupported.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-04 | Allowlisted rotating cookies restore safely; tickets are bounded, transient, and renewed on reconnect. | integration | `node --test test/dashboard-auth.test.js test/dashboard-gateway.test.js test/session-broker.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-05 | Expiry, denial, malformed contracts, and optional Kanban absence become bounded safe states. | integration | `node --test test/dashboard-auth.test.js test/curl-relay.test.js test/dashboard-operations.test.js test/kanban-client.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-06 | Dashboard relay has no bearer/SSE path and passes request secrets only through stdin. | unit | `node --test test/curl-relay.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-07 | Production entries reach every current module and reject historical product paths. | integration | `node --test test/release-validator.test.js && npm run validate:dist` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-08 | Dynamic HTML is absent from the DOM helper; static SVG use remains constrained. | unit | `node --test test/ui-contract.test.js` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-09 | Manifest requests only the current command, panel/tab, and isolated-storage authority. | unit | `node --test test/ui-contract.test.js && npm run validate:dist` | ✅ | ✅ green |
| 04-01 | 01 | 1 | CONT-10 | Support, compatibility, security, privacy, troubleshooting, and uninstall content ship in `dist/`. | integration | `node --test test/ui-contract.test.js && npm run validate:dist` | ✅ | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing Node test infrastructure covered the phase; the retroactive audit added one integration test to replace CONT-03's source-text-only UI assertion with rendered-state evidence.

## Manual-Only Verifications

All Phase 04 release-contract behaviors have automated verification. Native Muxy visual and topology qualification is intentionally tracked by Phase 06, not this contract-cleanup phase.

## Validation Audit 2026-08-20

| Metric | Count |
|--------|-------|
| Requirements audited | 10 |
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

### Gap Filled

`CONT-03` previously checked the unsupported OAuth/OIDC copy only by source-text matching. `test/auth-ui-unsupported.test.js` installs a minimal DOM fixture, loads both Vite entry modules through Vite's resolver, renders the actual `oauth_required` state, and asserts the rendered guidance. It passed in the full suite.

## Validation Sign-Off

- [x] Every Phase 04 requirement has a green automated command.
- [x] No three consecutive requirements lack an automated verification path.
- [x] No watch-mode flags are used.
- [x] Full suite passed: `npm test` — 77/77.
- [x] Deterministic package validation passed: `npm run validate:dist` — 14 files, including the shipped open-issue disclosure.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** validated 2026-08-20
