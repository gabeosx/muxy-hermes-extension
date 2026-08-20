---
quick_id: 260820-fqf
mode: quick
description: Make scheduled jobs expandable, show cadence, and integration-test the operations panel
must_haves:
  truths:
    - The collapsed Scheduled jobs card shows four jobs and a clear control when more jobs exist.
    - The user can reveal every returned job and collapse the list again without leaving the panel.
    - Every job shows a bounded, human-readable cadence alongside its next-run or status label.
    - Live Hermes data is exercised in Muxy, not only through source-level tests.
  artifacts:
    - src/dashboard-operations.js
    - src/panel/app.js
    - src/styles/global.css
    - test/dashboard-operations.test.js
    - test/ui-contract.test.js
  key_links:
    - Hermes schedule fields are normalized before the panel renders them.
    - The disclosure button controls the scheduled-job list with an accurate aria-expanded state.
---

# Quick task 260820-fqf

Make the Scheduled jobs card useful when Hermes returns more than four jobs, explain how often each job actually runs, and verify the behavior against the live signed-in operations panel.

## Task 1: Project a safe human-readable cadence

**Files:** `src/dashboard-operations.js`, `test/dashboard-operations.test.js`

**Action:** Extend the bounded scheduled-job projection with a cadence derived only from the allowlisted Hermes `schedule`/`schedule_display` fields. Translate common interval and five-field cron forms into compact user copy, retain no prompt/script/path data, and fall back to “Custom schedule” for unsupported or malformed expressions rather than exposing raw scheduler syntax.

**Verify:** `node --test test/dashboard-operations.test.js`

**Done:** Each projected job has a bounded, timezone-neutral cadence label such as “Every 15 minutes,” “Hourly,” “Daily,” or “Weekly,” while sensitive job fields and ambiguous server-clock times remain absent.

## Task 2: Add the inline job-list disclosure

**Files:** `src/panel/app.js`, `src/styles/global.css`, `test/ui-contract.test.js`

**Action:** Keep the first four scheduled jobs visible by default, add a native-feeling **Show all N** button when additional jobs exist, reveal the complete bounded list in place, and change the control to **Show fewer** while expanded. Preserve the state across status refreshes during the open panel session, expose `aria-expanded`/`aria-controls`, show cadence with next-run status, and use only Muxy tokens and existing control scale.

**Verify:** `node --test test/dashboard-operations.test.js test/ui-contract.test.js && npm run build`

**Done:** A keyboard- and pointer-accessible control expands and collapses the current job list without prompts, navigation, credentials, or horizontal overflow.

## Task 3: Verify the live operations workflow

**Files:** `dist/**`, `.planning/quick/260820-fqf-make-scheduled-jobs-expandable-show-cade/260820-fqf-VERIFICATION.md`

**Action:** Run focused and complete tests, packaging validators, and clean-build validation. Reload the extension in Muxy and use the saved signed-in session against `http://127.0.0.1:9119`; confirm four jobs plus **Show all 12**, expand to all twelve, verify cadence copy from live Hermes schedule data, collapse to four, and ensure periodic refresh does not lose the expanded state. Do not expose credentials or mutate any Hermes job.

**Verify:** `npm test && npm run build && npm run validate && node scripts/validate-dist.mjs`

**Done:** Automated gates pass and native Muxy inspection proves the real 12-job response expands, collapses, and labels cadence correctly.
