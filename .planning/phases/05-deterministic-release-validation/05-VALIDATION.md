---
phase: 05
slug: deterministic-release-validation
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-20
---

# Phase 05 — Validation Strategy

> Nyquist audit reconstructed from the completed plan, summary, verification report, current test suite, and Phase 06 security register.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` |
| **Config file** | none |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run validate` |
| **Node-20 compatibility command** | `npx --yes --package node@20 node scripts/validate-release.mjs` |
| **Observed runtime** | ~17 seconds for the full current-Node gate |

## Sampling Rate

- **After validator or manifest changes:** Run `npm test` and `npm run validate -- --structural`.
- **Before release verification:** Run `npm run validate` on the development Node and the Node-20 compatibility command.
- **No-retry rule:** Each successful full-gate invocation runs its canonical suite twice and each of two isolated `npm ci` copies twice; the validator contains no retry loop.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | VAL-01 | T06-05 / T06-07 | Production graph is complete, legacy relay paths are absent, and the marketplace manifest/distribution only expose the frozen surface. | integration | `npm run validate` | ✅ | ✅ green |
| 05-01-02 | 01 | 1 | VAL-02 | T06-07 / T06-09 | Qualification health checks use bounded diagnostics, unique resources, and fail-closed cleanup behavior. | unit + integration | `node --test test/qualification-lab.test.js` | ✅ | ✅ green |
| 05-01-03 | 01 | 1 | VAL-03 | — | Two isolated clean `npm ci` copies each run two no-retry suites and must emit equal inventories/hashes. | integration | `npm run validate` | ✅ | ✅ green |
| 05-01-04 | 01 | 1 | VAL-04 | — | Two builds and two clean-copy distributions must have identical file inventories and SHA-256 maps. | integration | `npm run validate` | ✅ | ✅ green |
| 05-01-05 | 01 | 1 | VAL-05 | — | `>=20`, zero runtime dependencies, and the full gate work on Node 20 and the development Node. | integration | `npx --yes --package node@20 node scripts/validate-release.mjs` | ✅ | ✅ green |
| 05-01-06 | 01 | 1 | VAL-06 | T06-01 / T06-05 | High/critical audit findings and recognizable release-surface credentials block the gate. | integration | `npm run validate` | ✅ | ✅ green |
| 05-01-07 | 01 | 1 | VAL-07 | — | Behavioral, security, UI, fixture, and contract tests pass twice per full-gate execution without retry masking. | integration | `npm run validate` | ✅ | ✅ green |
| 05-01-08 | 01 | 1 | VAL-08 | T06-01…T06-12 | Security review is closed with no open high or unaccepted medium release threat. | evidence + integration | `npm run validate` | ✅ | ✅ green |

*Status: ✅ green — current behavioral execution passed; no product test was added because each requirement already has an executable release-gate or qualification test path.*

## Evidence From This Audit

| Command | Result |
|---------|--------|
| `npm test` | 77 passed, 0 failed, twice (development Node) |
| `npm run validate -- --structural` | Passed: 15 production modules; audit high/critical 0 |
| `npm run validate` | Passed: clean-copy digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef` |
| `npx --yes --package node@20 node --test test/*.test.js` | 77 passed, 0 failed |
| `npx --yes --package node@20 node scripts/validate-release.mjs` | Passed: Node `v20.20.2`; same clean-copy digest |

One Node-20 audit attempt overlapped another auditor adding `test/auth-ui-unsupported.test.js` to the shared working tree and was discarded as a non-stable-tree run after `canonical_test_1_failed:1`. On the final unchanged tree, the direct suite passed 77/77 twice and complete Node 20 and development-Node gates both passed with the identical digest. No release-gate run itself retries failures.

## Wave 0 Requirements

Existing infrastructure covers all Phase 05 requirements; no Wave 0 additions were needed.

## Manual-Only Verifications

All Phase 05 requirements have automated verification. Marketplace submission and the actual Muxy SSH-workspace qualification remain Phase 06/07 concerns and are not treated as Phase 05 evidence.

## Validation Audit 2026-08-20

| Metric | Count |
|--------|-------|
| Requirements audited | 8 |
| Gaps found | 0 |
| Tests created | 0 |
| Escalated implementation bugs | 0 |

## Validation Sign-Off

- [x] Every Phase 05 requirement has an automated behavioral or integration command.
- [x] Sampling continuity is maintained by the canonical test suite and full release gate.
- [x] The full gate executes no-retry canonical and clean-copy suites.
- [x] Node 20 and the current development Node have a successful complete-gate run.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** validated 2026-08-20; Node-20 first-attempt caveat retained above for final release review.
