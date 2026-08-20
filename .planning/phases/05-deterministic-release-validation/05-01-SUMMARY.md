---
phase: 05-deterministic-release-validation
plan: 01
subsystem: testing
tags: [node20, reproducible-build, npm-audit, secret-scan, marketplace]
requires:
  - phase: 04-contract-and-attack-surface-cleanup
    provides: frozen Dashboard contract and least-privilege release surface
provides:
  - Clean-copy release validator with deterministic distribution comparison
  - Node 20 and development-Node compatibility evidence
  - Import, secret, permission, manifest, asset, and audit gates
affects: [qualification, marketplace-submission]
actuals:
  tokens: 0
  tasks: 5
  commits: 1
tech-stack:
  added: []
  patterns: [two-clean-copy validation, sanitized subprocess diagnostics, complete dist hash inventory]
key-files:
  created: [scripts/validate-release.mjs, test/release-validator.test.js]
  modified: [scripts/validate-dist.mjs, package.json, package-lock.json]
key-decisions:
  - "Use two npm-ci clean copies and compare complete distribution hashes."
  - "Treat high/critical audit findings, secrets, extra permissions, and unreachable legacy modules as hard failures."
patterns-established:
  - "Validators retain only bounded classifications and digests, never raw command output or credentials."
requirements-completed: [VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06, VAL-07, VAL-08]
coverage:
  - id: D1
    description: "Two clean installs run the full no-retry suite twice and produce identical distribution inventories."
    requirement: VAL-03
    verification:
      - kind: integration
        ref: "npm run validate on Node v26.5.0"
        status: pass
      - kind: integration
        ref: "npx --yes --package node@20 node scripts/validate-release.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "The release gate checks imports, permissions, assets, secrets, audit findings, and deterministic output."
    requirement: VAL-01
    verification:
      - kind: unit
        ref: "test/release-validator.test.js"
        status: pass
    human_judgment: false
duration: 1d
completed: 2026-08-20
status: complete
---

# Phase 5 Plan 01: Deterministic Release Validation Summary

**One release command now proves clean-install tests, least privilege, secret safety, marketplace shape, Node compatibility, and reproducible `dist/` output.**

## Accomplishments

- Replaced phase-era validation with current Dashboard architecture and marketplace checks.
- Ran two clean `npm ci` workspaces, two no-retry suites in each, and byte-level distribution comparison.
- Passed on Node v26.5.0 and Node v20.20.2 with identical narrowed-contract digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef` and zero high/critical audit findings.

## Threat Flags

- Validator secret leakage: mitigated by filename-only scanning results and bounded subprocess diagnostics.
- Path-dependent or non-reproducible output: mitigated by two task-unique clean roots and full-file hash comparison.
- Supply-chain findings: high and critical npm audit findings block the gate.

## Issues Encountered

No validation failure remains. The independent security audit closed all 12 registered threats with no open high or unaccepted medium finding.

## Next Phase Readiness

Ready for disposable topology qualification; marketplace submission remains gated on the independent audits.

---
*Phase: 05-deterministic-release-validation*
*Completed: 2026-08-20*
