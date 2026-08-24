---
quick_id: 260824-nwg
status: complete
completed: 2026-08-24
commits:
  - b2510ef
actuals:
  tasks: 1
  commits: 1
---

# Explicitly safe stop confirmation

The Hermes stop-run dialog now makes **Keep running** the explicit default and cancel action, including Escape dismissal, and uses Muxy's native warning presentation.

## Completed work

- Added explicit `default`, `cancel`, and `style` fields to the stop confirmation request.
- Added regression coverage for the complete native dialog options object and the non-destructive dismissal path.

## Verification

- `node --test test/stop-confirmation.test.js`: passed, 4/4 tests.
- `npm run build`: passed.
- `npm test`: passed, 90/90 tests, including the disposable loopback fixture with local-listener permission.
- `git diff --check`: passed.

## Deviations from Plan

None.

## Self-Check: PASSED

- Code commit `b2510ef` exists.
- The focused test, production build, and full test suite pass.
