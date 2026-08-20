---
quick_id: 260820-fqf
status: complete
completed: 2026-08-20
commits:
  - 76958b0
  - 2ea39d2
  - eab3fc3
---

# Expandable scheduled jobs with cadence

The operations panel now keeps its compact four-job summary while giving the user an obvious, accessible way to reveal every scheduled job. Each job also explains its cadence without exposing raw cron syntax or ambiguous server-clock times.

## Completed work

- Added bounded cadence normalization for Hermes interval and common five-field cron schedules.
- Added timezone-neutral labels including **Every 15 minutes**, **Hourly**, **Daily**, **Weekdays**, named weekday ranges, selected weekdays, and monthly schedules.
- Kept unsupported or malformed expressions behind the user-facing **Custom schedule** fallback and retained no raw schedule expression in the operations snapshot.
- Replaced the passive “more scheduled” note with **Show all N** / **Show fewer** controls.
- Kept four jobs visible by default, reveals the complete bounded list in place, and preserves expansion across open-panel status refreshes.
- Added `aria-expanded` and `aria-controls`; native Muxy exposes the button as a standard collapsed/expanded disclosure.
- Preserved the existing saved Dashboard session, read-only operations requests, Muxy theme tokens, and compact control scale.

## Verification

- Focused operations/UI contract tests: 14/14 passed.
- Full repository suite: 168/168 passed outside the sandbox, including loopback and HTTPS integration fixtures.
- `npm run build`: passed.
- `npm run validate`: passed (`Phase 3 recovery proof validation passed`).
- `node scripts/validate-dist.mjs`: passed across two clean builds.
- `git diff --check`: passed.

## Native Muxy proof

Muxy reloaded the production build and restored the saved `http://127.0.0.1:9119` Dashboard session without credentials or user action. The live panel showed four jobs and **Show all 12**, revealed all twelve jobs, retained the expanded list through a real status refresh, and returned to four rows through **Show fewer**. Live labels included **Every 12 hours**, **Hourly**, **Every 6 hours**, **Daily**, **Every Tuesday and Friday**, **Every Monday**, and **Every 15 minutes**. One unsupported live schedule remained the intentional **Custom schedule** fallback rather than exposing scheduler syntax. No job was run, paused, changed, or deleted.

## Integration-test conclusion

Native integration checks remain necessary for this surface. Previous failures occurred at evolving Muxy and Hermes boundaries that unit tests cannot fully represent, so release checks should retain both the deterministic suites and a short signed-in Muxy smoke test with a multi-job Hermes response.
