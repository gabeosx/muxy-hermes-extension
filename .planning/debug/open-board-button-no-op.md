---
status: resolved
trigger: "the \"open board\" button doesn't seem to work"
created: 2026-08-20
updated: 2026-08-20
---

# Open board button does nothing

## Expected

Clicking **Open board** in the signed-in Hermes panel should open or focus the extension's Hermes Project Board tab. Clicking **Open board** in the authenticated board picker should load the selected board.

## Actual

The panel-header button produces no visible change. The board picker's button successfully loads the selected Default board.

## Errors

No error is surfaced in the panel.

## Timeline

Reported during native UAT after the authenticated board picker and Hermes operations panel were added.

## Reproduction

1. Open the signed-in Hermes Agent panel in Muxy.
2. Click **Open board** beside the signed-in account.
3. Observe that no tab opens or receives focus.

## Evidence

- Native Muxy reproduction: clicking the panel's **Open board** caused no accessibility-tree or tab change.
- Native control comparison: the manifest command **Hermes: Open Project Board** opened the Board tab, and the board picker's **Open board** loaded the 95-card Default board.
- `HermesGatewayPanel.openBoard()` sends `{ type: "hermes-project-board", singleton: true }`.
- Current Muxy `tabs.open` requires `{ kind: "extensionWebView", extension: { id, tabType, singleton } }`.

## Eliminated

- Dashboard authentication and saved session: the Board tab restores as signed in.
- Board catalog and selected board: Default is selected and loads successfully through the picker.
- Manifest tab declaration: the palette command opens the declared `hermes-project-board` tab type.

## Current Focus

- hypothesis: The panel uses an obsolete `tabs.open` request shape and does not surface the rejected Promise.
- test: Add a behavioral request-shape test, update the panel to the current extension-webview contract, build/reload, and repeat the native click.
- expecting: The panel button opens or focuses a singleton Hermes Project Board tab.
- next_action: complete
- reasoning_checkpoint: The failure is isolated to panel-to-tab dispatch; the board picker and backend path are healthy.
- tdd_checkpoint: GREEN — three request/delegation/error tests pass; the complete 167-test suite passes.

## Resolution

- root_cause: The panel called `muxy.tabs.open` with the obsolete `{ type, singleton }` request. Current Muxy requires an `extensionWebView` request containing the extension ID, tab type, and nested singleton flag. The rejected Promise was not handled, so the control appeared inert.
- fix: Added a tested project-board tab request helper, switched the panel to the current API contract, and show a native Muxy alert if tab opening is ever rejected again.
- verification: Focused tests pass; all 167 tests pass outside the loopback-restricted sandbox; `npm run build`, phase validation, and dist validation pass. After rebuilding/reloading Muxy, clicking the panel button from a Terminal tab focused the existing singleton `Hermes Board · default` tab and displayed its 95 cards.
- files_changed: `src/muxy-tabs.js`, `src/panel/app.js`, `test/muxy-tabs.test.js`, `test/ui-contract.test.js`, `.planning/debug/open-board-button-no-op.md`
