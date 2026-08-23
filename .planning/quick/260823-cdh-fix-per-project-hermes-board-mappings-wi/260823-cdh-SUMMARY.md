---
quick_id: 260823-cdh
status: complete
completed: 2026-08-23
commits:
  - 12e55f4
  - aaaaf85
  - 6319a8b
  - 0b526d4
actuals:
  tokens: 67624
  tasks: 3
  commits: 4
---

# Per-project Hermes board mappings

Dashboard authentication is now global while each stable Muxy project owns its own validated Hermes board mapping. A user can temporarily view any board without replacing the project mapping, and the Agent panel makes no board-specific requests until the active project has been mapped.

## Completed work

- Added a validated active-project resolver using the Muxy project ID and introduced `board.mapping.v1.<projectID>` storage scoped to the exact Dashboard URL.
- Removed legacy combined Dashboard/mapping restoration; the global `session.dashboard.v2` record now persists only Dashboard authentication.
- Kept the board picker available while viewing a board, with an explicit **Map to this project** action; stale mappings clear back to the picker.
- Synchronized the Agent panel to the active project on focus, retaining global health and schedules while unmapped and skipping queue, worker, and diagnostic endpoints.
- Declared only `projects:read`, froze the privacy/README contract, expanded native fixtures to two sanitized boards, and refreshed the 1600x1000 native board screenshot.

## Verification

- Focused mapping, UI, operations, and qualification tests: passed (30 tests).
- Full `npm test`: passed (86 tests).
- `npm run build`: passed.
- `npm run validate`: passed, including deterministic package/dist and permission checks.
- `npm run qualify`: passed with `passed_supported_beta_matrix`; cleanup reported zero containers, networks, and volumes, closed listeners, removed its task root, and stopped SSH.
- Native Muxy 1.5.0 (945): mapped local project A to `marketplace-beta` and project B to `marketplace-secondary`; confirmed independent restoration after tab close/reopen, repeated project switching, and a Muxy restart. A temporary Secondary view in A reopened to its Beta mapping. The screenshot was inspected at 1600x1000 with mapping controls visible and no credentials or paths retained.

## Verifier follow-up

- Restored an available mapping after a fresh same-Dashboard password sign-in, using the same exact-URL and stale-mapping recovery path as saved-session restoration.
- Added executable regression coverage for logout → same-URL mapped-board restoration, alternate-URL non-restoration, and stale-mapping isolation.
- Added a persistent project/mapped-board status to both picker and board views; an unmapped project explicitly says so.
- Native Muxy recheck: an alternate Dashboard URL displayed the unmapped state; after mapping Beta, logout and same-URL sign-in automatically reopened Beta. The replacement 1600x1000 image was visually inspected and now clearly shows the project mapping, selector, View board, and Map to this project controls.

## Decisions

- Use stable project IDs, not names, worktree identifiers, or workspace paths, as board-mapping identities.
- Preserve mappings across logout but apply them only when the authenticated Dashboard URL is an exact match.
- Treat an unmapped Agent panel as global-only rather than allowing Hermes to select a default board.

## Deviations from Plan

None - plan executed as written. The native source display was 1844x768, so the captured native board area was center-cropped and padded with the surrounding Muxy dark theme to meet the required 1600x1000 marketplace asset dimensions without synthesizing product UI.

## Known Stubs

None.

## Self-Check: PASSED

- All three task commits exist and the required 1600x1000 screenshot is present.
