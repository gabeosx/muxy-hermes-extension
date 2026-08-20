# Phase 06 — UI Review

**Audited:** 2026-08-20 (final re-audit)

**Baseline:** Abstract 6-pillar standards and the repository's `muxy-extension` native scale (no Phase 06 UI-SPEC.md)
**Screenshots:** Current real Muxy captures reviewed. Their SHA-256 values match the updated trusted-HTTPS qualification record: operations `a33f0383…6943b`, agent approval `f2dac383…bf94c`, project board `4fda6e05…5aa37`.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Connection, error, approval, and actionable empty-state copy is specific and task-oriented. |
| 2. Visuals | 4/4 | The focused current captures present the panel and all eight board columns as clear native Muxy surfaces. |
| 3. Color | 4/4 | Only documented Muxy tokens are used; status dots now carry meaningful semantic states. |
| 4. Typography | 4/4 | The 10/11/12/13/14px Muxy scale is followed, with status-bearing job and health text at body size. |
| 5. Spacing | 4/4 | Both surfaces use the shared named native spacing and radius scale; compact empty columns improve board density. |
| 6. Experience Design | 4/4 | State coverage, global pending affordance, destructive confirmation, focus, and reduced-motion handling are complete for the audited flows. |

**Overall: 24/24**

---

## Top 3 Priority Fixes

1. **Keep the focused real-capture recipe** — `project-board.png` now fills the marketplace frame with the board while retaining real Muxy chrome. This is a maintenance guardrail, not an open defect.
2. **Keep the current semantic status-dot mapping** — Ready uses accent; Running/Done use success; Blocked uses error; Review uses hunk; neutral columns use muted foreground ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:267)). This is a maintenance guardrail, not an open defect.
3. **Preserve global mutation feedback and Stop confirmation** — Continue testing that all selects remain disabled while `aria-busy` is set and that Stop remains behind the native confirmation. This is a regression guardrail, not an open defect.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

- **Pass evidence:** Authentication and recovery messages remain concrete and actionable ([src/panel/app.js](/Users/gabe/muxy-hermes-extension/src/panel/app.js:42), [src/board/app.js](/Users/gabe/muxy-hermes-extension/src/board/app.js:18)). Empty columns name their state and direct the operator to add or move a card ([src/board/app.js](/Users/gabe/muxy-hermes-extension/src/board/app.js:254)).

### Pillar 2: Visuals (4/4)

- **Pass evidence:** The current project-board capture is a mechanically cropped/scaled region of the real Muxy capture and makes all eight columns immediately inspectable. It verifies compact actionable empty columns alongside usable populated columns. The source implements that distinction and stable scrollbar space ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:224), [src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:246)). The refreshed operations and approval frames confirm readable body-size job/health status and explicit approval hierarchy.

### Pillar 3: Color (4/4)

- **Pass evidence:** The expired-session state now uses the documented `--muxy-diff-remove` token ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:113)); no hard-coded hex/rgb colors were found. Status-dot mapping now reserves accent for Ready and uses semantic Muxy tokens for Running/Done, Blocked, and Review ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:267)).

### Pillar 4: Typography (4/4)

- **Pass evidence:** Both surfaces declare the repository-defined native scale: 10px caption, 11px footnote, 12px body, 13px controls, and 14px titles ([src/styles/global.css](/Users/gabe/muxy-hermes-extension/src/styles/global.css:14), [src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:13)). Job cadence and health chips use 12px foreground text ([src/styles/global.css](/Users/gabe/muxy-hermes-extension/src/styles/global.css:487), [src/styles/global.css](/Users/gabe/muxy-hermes-extension/src/styles/global.css:502)).

### Pillar 5: Spacing (4/4)

- **Pass evidence:** Board spacing and radii now derive from the shared named native scale ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:3)). Empty columns intentionally collapse to a compact basis while populated columns retain a usable range ([src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:235), [src/styles/board.css](/Users/gabe/muxy-hermes-extension/src/styles/board.css:246)).

### Pillar 6: Experience Design (4/4)

- **Pass evidence:** The board exposes global busy state and disables every card status select while a mutation is pending ([src/board/app.js](/Users/gabe/muxy-hermes-extension/src/board/app.js:243), [src/board/app.js](/Users/gabe/muxy-hermes-extension/src/board/app.js:262)). Stop requires a native Muxy confirmation before calling `agent.stop()` ([src/panel/app.js](/Users/gabe/muxy-hermes-extension/src/panel/app.js:614), [src/panel/app.js](/Users/gabe/muxy-hermes-extension/src/panel/app.js:866)). Loading, unavailable, empty, error-alert, focus, and reduced-motion states remain covered.

---

## Files Audited

- `.planning/phases/06-docker-and-native-qualification/06-01-PLAN.md`
- `.planning/phases/06-docker-and-native-qualification/06-01-SUMMARY.md`
- `.planning/phases/06-docker-and-native-qualification/06-NATIVE-QUALIFICATION.md`
- `src/panel/app.js`
- `src/styles/global.css`
- `src/board/app.js`
- `src/styles/board.css`
- `src/lib/dom.js`
- `test/ui-contract.test.js`
- `assets/screenshots/operations.png`
- `assets/screenshots/agent-approval.png`
- `assets/screenshots/project-board.png`

Registry audit: skipped — `components.json` is absent, so shadcn and third-party registries are not initialized.

## Remaining Severity

- **BLOCKER:** None in the UI audit. The documented Muxy SSH `ENOENT` remains a separate release-qualification blocker, not a visual defect.
- **WARNING:** None. No remaining medium UI implementation or evidence finding was found.
