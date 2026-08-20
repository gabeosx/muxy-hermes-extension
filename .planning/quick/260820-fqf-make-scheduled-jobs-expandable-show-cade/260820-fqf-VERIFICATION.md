---
quick_id: 260820-fqf
status: passed
verified: 2026-08-20
---

# Verification: expandable scheduled jobs

## Goal verdict

Passed. The scheduled-job watchlist is expandable, every row has a bounded human-facing cadence label or safe fallback, and the complete behavior was exercised against the live twelve-job Hermes response in Muxy.

## Must-have results

| Must-have | Result | Evidence |
|---|---|---|
| Four-row collapsed summary | Passed | Native panel rendered four rows and **Show all 12**. |
| Reveal all and collapse again in place | Passed | Native disclosure exposed all twelve jobs, changed to **Show fewer**, and returned to four without navigation. |
| Cadence on every job | Passed | Normalization tests cover interval, minute, hourly, daily, weekday, weekday-range, weekly, monthly, fallback, and missing schedules; native rows rendered cadence plus next-run/status copy. |
| Accessible disclosure | Passed | Source and UI contract tests require `aria-expanded` and `aria-controls`; Muxy AX exposed Expand/Collapse actions. |
| State survives refresh | Passed | A live manual operations refresh retained all twelve expanded rows and the expanded **Show fewer** control. |
| No secret or mutation expansion | Passed | The projection remains allowlisted, raw expressions are not rendered, and native verification issued read-only status requests only. |

## Automated evidence

- `node --test test/dashboard-operations.test.js test/ui-contract.test.js`: 14 passed, 0 failed.
- `npm test -- --test-reporter=dot`: 168 passed, 0 failed.
- `npm run build`: passed.
- `npm run validate`: passed.
- `node scripts/validate-dist.mjs`: passed.
- `git diff --check`: passed.

## Native evidence

- Muxy production extension build reloaded successfully.
- Saved Dashboard session restored against `http://127.0.0.1:9119`.
- Live response count: 12 scheduled jobs.
- Collapsed state: four visible jobs, **Show all 12**, AX collapsed/Expand.
- Expanded state: twelve visible jobs, **Show fewer**, AX expanded/Collapse.
- Refresh state: twelve jobs remained expanded after an authenticated live refresh.
- Collapse state: returned to four visible jobs.
- Credentials were not read or entered; no scheduled-job mutation was performed.
