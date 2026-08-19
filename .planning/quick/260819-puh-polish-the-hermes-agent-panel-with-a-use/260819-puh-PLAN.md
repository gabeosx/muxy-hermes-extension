---
quick_id: 260819-puh
mode: quick
description: Turn the Hermes Agent panel into a compact operations and command surface
---

# Quick task 260819-puh

Make the signed-in Hermes panel useful at a glance and as an agent control surface while preserving its compact native-Muxy scale and current authentication/transport behavior.

## Task 1: Add a safe Dashboard operations projection

**Files:** `src/dashboard-operations.js`, `test/dashboard-operations.test.js`

**Action:** Read only the Dashboard fields needed for the panel: Gateway memory/disk health, Kanban status counts and oldest-ready age, active worker count, diagnostic count, and scheduled-job name/state/next/last outcome. Strictly normalize and bound every response, tolerate unavailable optional endpoints, and never retain prompts, scripts, paths, cookie values, or other server internals.

**Verify:** `node --test test/dashboard-operations.test.js`

**Done:** One authenticated refresh produces a bounded operational snapshot for attention, queue pressure, scheduled jobs, and Gateway health, with partial results when an optional Hermes surface is absent.

## Task 2: Redesign the signed-in panel around operations and agent work

**Files:** `src/panel/app.js`, `src/dashboard-agent.js`, `src/styles/global.css`, `test/dashboard-agent.test.js`, `test/ui-contract.test.js`

**Action:** Replace the empty signed-in form with a compact overview containing an attention queue, exact waiting/running counts with oldest-wait age, a scheduled-job watchlist, and health indicators. Anchor a strong multiline agent composer below it; during a run, show the user's request, Hermes response, activity, approvals, steering, and stop controls. Refresh operations transparently while the panel is open and on focus, preserve active input focus across data updates, and keep user copy free of implementation terminology.

**Verify:** `node --test test/dashboard-agent.test.js test/dashboard-operations.test.js test/ui-contract.test.js && npm run build`

**Done:** The idle panel answers “what needs me, what is waiting, what runs next, and is Hermes healthy?” while the composer remains one action away; active work retains every safety control.

## Task 3: Validate the native panel

**Files:** `dist/**`

**Action:** Run the complete suite and publish validators, reload the extension in Muxy, and inspect the signed-in panel at its real narrow width. Confirm live data from the local Hermes Dashboard, input focus stability, partial/unavailable states, light/dark theme tokens, and no horizontal overflow. Do not expose credentials or start a live run during visual inspection.

**Verify:** `npm test && npm run validate && node scripts/validate-dist.mjs`

**Done:** Automated gates pass and native Muxy inspection confirms a useful, balanced operational overview without internal terminology or secret-bearing fields.
