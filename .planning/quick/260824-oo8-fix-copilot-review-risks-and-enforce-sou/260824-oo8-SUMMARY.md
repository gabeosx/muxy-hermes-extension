---
quick_id: 260824-oo8
status: complete
completed: 2026-08-24
commits:
  - 2aa09a7
  - c6bebb7
  - 2a1aaf4
actuals:
  tasks: 3
  commits: 3
---

# Copilot review hardening and source-first release flow

The extension now prevents old-project operations from reaching a newly active project, preserves the specific missing-board recovery state, uses explicit safe defaults for consequential card moves, and rejects project IDs that would exceed Muxy's storage-key limit. The release guide and validator now require the source PR to merge before any marketplace-fork update.

## Completed work

- Serialized authenticated operations refreshes behind a generation-aware queue, discarding stale project/board results while retaining the Dashboard cookie-rotation boundary.
- Added a delayed Project A → Project B regression covering the unmapped fail-closed interval and final mapped refresh.
- Made stale-board recovery report whether it handled the failure so generic error copy cannot overwrite the recovery guidance.
- Added explicit `default: "Cancel"`, `cancel: "Cancel"`, and `style: "warning"` to Blocked/Done move confirmations.
- Derived the 239-character project-ID maximum from Muxy's 256-character storage-key limit and used it in both active-project and broker validation.
- Documented and validator-enforced the source-repository-first, exact-merged-commit, fork-only marketplace workflow.

## Verification

- Focused new regressions: passed, 9/9.
- `npm test`: passed, 94/94, including the loopback Kanban fixture.
- `npm run build`: passed.
- `npm run validate`: passed; high/critical audit counts are zero and clean-copy digest is `94caa4dc2b1c3287552a15ff488acc158f0389f6c31c79eeef6f1abeded1ce5a`.
- `npm run qualify:automated`: `passed_supported_beta_matrix`; disposable cleanup proved zero containers, networks, and volumes, with listeners, SSH process, and temporary root removed.
- `git diff --check`: passed for every changed source and governance file.

## Deviations from Plan

- The operations refresh uses a serialized generation-aware queue rather than concurrent per-project requests. This preserves the existing authenticated cookie-rotation guarantee while still ensuring the current project refreshes immediately after stale work drains.
- Release governance tests and `scripts/validate-release.mjs` were added to Task 3 after the full suite showed that the new process needed executable enforcement, not documentation alone.

## Self-Check: PASSED

- All three implementation commits exist.
- Every must-have has direct code or governance-test coverage.
- Existing unrelated untracked files remain untouched and unstaged.
