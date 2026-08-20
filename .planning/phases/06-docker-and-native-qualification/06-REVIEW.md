---
phase: 06-docker-and-native-qualification
reviewed: 2026-08-20T20:25:00Z
depth: deep
files_reviewed: 41
files_reviewed_list:
  - README.md
  - package.json
  - .gitignore
  - assets/icon.svg
  - assets/screenshots/operations.png
  - assets/screenshots/agent-approval.png
  - assets/screenshots/project-board.png
  - qualification/README.md
  - qualification/docker-compose.yml
  - qualification/model-stub.py
  - scripts/qualify-release.mjs
  - scripts/complete-native-qualification.mjs
  - scripts/validate-dist.mjs
  - scripts/validate-release.mjs
  - src/curl-relay.js
  - src/dashboard-auth.js
  - src/dashboard-gateway.js
  - src/dashboard-agent.js
  - src/dashboard-operations.js
  - src/kanban-client.js
  - src/session-broker.js
  - src/stop-confirmation.js
  - src/panel/app.js
  - src/board/app.js
  - src/styles/global.css
  - src/styles/board.css
  - src/lib/dom.js
  - src/lib/icons.js
  - test/curl-relay.test.js
  - test/dashboard-auth.test.js
  - test/dashboard-agent.test.js
  - test/dashboard-gateway.test.js
  - test/dashboard-operations.test.js
  - test/kanban-client.test.js
  - test/kanban-fixture.test.js
  - test/session-broker.test.js
  - test/stop-confirmation.test.js
  - test/board-ui-contract.test.js
  - test/ui-contract.test.js
  - test/qualification-lab.test.js
  - test/release-validator.test.js
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: passed
---

# Phase 06: Code Review Report

**Reviewed:** 2026-08-20T20:25:00Z
**Depth:** deep
**Files Reviewed:** 41
**Status:** passed

## Summary

The current Dashboard-only product contract, argv-form cookie relay, session storage boundary, pinned qualification topology, host-key pinning, teardown checks, marketplace assets, and native UI changes were reviewed together. The earlier qualification-test warning is resolved: `qualifyRelease()` now accepts injected boundaries and its tests execute the automated-pending, manual-evidence-blocked, partial-setup, and cleanup-failure control-flow branches. The final 77-test suite passes twice, and deterministic release validation passes on the supported Node 20 and Node 26 environments; the focused stop-confirmation/controller suite also passes locally. `git diff --check` is clean.

No extension-owned critical defect or warning remains. The observed Muxy native SSH-workspace failure is a documented next-release issue outside the explicit `0.1.0` support contract.

## Narrative Findings (AI reviewer)

## Informational Issues

### INFO-01: Muxy SSH-workspace support remains deferred

**File:** `scripts/qualify-release.mjs:865-921`

**Issue:** On the tested Muxy 1.5.0 (945), the remote workspace authorizes `muxy.exec` but Muxy's internal `/usr/bin/ssh` launch fails with `posix_spawn` `ENOENT` before Hermes receives a request. This topology is explicitly unsupported in `0.1.0`; the extension presents bounded guidance and does not weaken its security boundary.

**Fix:** For a later release, obtain a valid Muxy build whose remote command runner can launch SSH, then repeat the full disposable SSH-workspace qualification from a fresh task root. Do not introduce an extension-side workaround that weakens the relay's security boundary.

## Prior Finding Recheck

- Prior CR-02 is resolved under the revised contract. Default `qualify` covers the supported beta matrix and emits `passed_supported_beta_matrix`; `qualify:native` remains an opt-in non-attesting reproducer and cannot prove SSH-workspace support.
- Prior CR-03 is resolved. Native observations are explicitly non-attested and manual evidence always ends with `native_evidence_not_muxy_attested`.
- Prior WR-01 is resolved. The qualification runner's dependency-injected control-flow tests cover the behavioral branches that were previously only source-text assertions.
- Prior WR-03 is resolved. Authentication preserves bounded `relay_*` launch failures across login and WebSocket ticketing, with direct tests.
- The stop-confirmation warning from the preceding review is resolved. `requestConfirmedStop()` converts native-dialog rejections to a bounded result, checks the predicate both before and after the dialog, and calls `stop()` exactly once only after an affirmative, current predicate. The panel binds that predicate to controller identity, `runGeneration`, connection, pending-action, and active-status state; dedicated behavioral tests cover rejection, staleness, and success.
- Python bytecode and qualification receipts are ignored; the cleanup, host-key-pinning, credential-redaction, cancellation, session-rotation, model-stub, and screenshot checks remain sound in the reviewed code.

---

_Reviewed: 2026-08-20T20:25:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
