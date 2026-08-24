---
quick_id: 260823-cdh
verified: 2026-08-23T13:02:00-04:00
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/7
  gaps_closed:
    - "Same-URL interactive re-login restores the active project's mapped board."
    - "Persistent mapping state is rendered and screenshot-4 is a legible mapping-control capture."
  gaps_remaining: []
  regressions: []
---

# Quick Task 260823-cdh: Per-Project Board Mapping Verification

**Goal:** Fix per-project Hermes board mappings with global Dashboard authentication and explicit per-project mapping/view controls.

**Status:** passed
**Re-verification:** Yes — after gap closure

## Goal Achievement

| # | Must-have truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Dashboard auth is board-free global state; mappings are independent stable-project records. | ✓ VERIFIED | `session.dashboard.v2` is validated without a board field; `board.mapping.v1.<projectID>` validates normalized `{ baseUrl, board }`. Storage tests prove clone/isolation/validation. |
| 2 | Two projects can retain independent boards through restore lifecycle; names/worktree paths are not identities. | ✓ VERIFIED | Resolver returns only active `{ id, name }`; storage uses only ID. Tests prove A/B key isolation, and retained native Muxy observation includes `per_project_board_mapping` and `muxy_restart`. |
| 3 | Viewing does not map; explicit Map is the only mapping write; selector remains available. | ✓ VERIFIED | `openBoard()` changes only viewed state; `mapViewedBoard()` is the sole save call; ready board UI renders selector, **View board**, and **Map to this project**. Native record covers per-project mapping behavior. |
| 4 | Logout/session expiry retain mappings; same normalized URL restores them, alternate URL does not, stale board clears safely. | ✓ VERIFIED | `signIn()` and saved-session restoration both call `restoreProjectMapping()`. New direct tests cover same-URL restore, alternate-URL non-restore/non-deletion, and active-project-only stale clearing. |
| 5 | Panel uses only active-project mapping and unmapped state makes no Kanban calls. | ✓ VERIFIED | Focus path resets projection, re-resolves project, exact-URL reads mapping, then calls `setBoard`; direct request test proves null board issues only `/api/status` and cron jobs, with no Kanban URL. |
| 6 | Package/docs/validator/screenshot use the bounded project-mapping contract. | ✓ VERIFIED | Version remains `0.1.0`; frozen permissions add only `projects:read`; README documents project-ID privacy boundary; screenshot is 1600x1000, hash-verified in the new native receipt, and visibly renders project, mapped board, selector, View, and Map controls. |
| 7 | No migration, marketplace mutation, or unrelated-user-file change occurred. | ✓ VERIFIED | Legacy v1 is deleted/ignored, never migrated. Post-task local history contains only scoped commits; original unrelated untracked paths remain unstaged. |

**Score:** 7/7 truths verified.

## Required Artifacts and Key Links

| Artifact / link | Status | Evidence |
| --- | --- | --- |
| `src/session-broker.js` | ✓ VERIFIED | Substantive separate session/mapping API, validation, cloning, and exact URL boundary; called by both board and panel. |
| `src/muxy-tabs.js` → board/panel | ✓ VERIFIED | Sole-active-project resolver is imported and called before mapping access. |
| `src/board/app.js` → `mapping-restore.js` → broker | ✓ VERIFIED | Interactive sign-in and saved restore both call `restoreProjectMapping`; helper reads exact URL mapping, detects catalog staleness, and clears only the active key. |
| `src/panel/app.js` → `dashboard-operations.js` | ✓ VERIFIED | Focus synchronization clears the prior projection, re-reads mapping, and `setBoard(null)` limits the next load to global operations. |
| `package.json` → `validate-dist.mjs` | ✓ VERIFIED | Source and dist permissions/version are frozen identically; release validation passed. |
| `scripts/qualify-release.mjs` + native record | ✓ VERIFIED | Fixture seeds `marketplace-beta` and `marketplace-secondary`; native categories require `per_project_board_mapping`. |
| `assets/screenshots/screenshot-4.png` | ✓ VERIFIED | 1600x1000 PNG; SHA-256 `9d2f5f99e928246d4a5ed9154f76b179a07e73401b92e50dc79621abfeb74306` matches receipt `e0b7f678d277`; visual inspection confirms legible mapping state and controls. |

## Behavioral and Native Evidence

- `test/board-mapping-restore.test.js` passes all three direct mapping scenarios: same-Dashboard re-login restoration, alternate-URL isolation, and stale mapping clearing without affecting another project.
- The latest retained native record, `.qualification/receipts/e0b7f678d277.json`, records Muxy `1.5.0 (945)`, the required `per_project_board_mapping` category, and the current screenshot hash.
- The native receipt deliberately labels manual Muxy evidence as not marketplace-attested. That is a release-governance boundary, not a missing quick-task requirement; no marketplace action was authorized or performed.

## Automated Checks

| Check | Result |
| --- | --- |
| Focused mapping/UI/operations/qualification tests | ✓ 33/33 passed. |
| `npm test` | ✓ 89/89 passed. |
| `npm run build` | ✓ Passed. |
| `npm run validate` | ✓ Passed; clean-copy digest `28b297b7175cdc953faf2b1f4fbc54fc66ef74b9561c040dd0cb6d725ce38cba`. |
| `git diff --check 12e55f4^..HEAD` | ✓ Passed. |
| Screenshot inspection | ✓ Passed. |

## Anti-Patterns

No unreferenced `TBD`, `FIXME`, or `XXX` markers were found in changed production files. Null returns are bounded validation/empty-state behavior, not stubs.

## Final Verdict

All must-haves now have code, wiring, behavior evidence, and current visual/native evidence. The phase goal is achieved.

_Verified: 2026-08-23T13:02:00-04:00_
_Verifier: gsd-verifier_
