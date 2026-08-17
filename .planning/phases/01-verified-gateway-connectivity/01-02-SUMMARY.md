---
phase: 01-verified-gateway-connectivity
plan: 02
subsystem: ui
tags: [muxy, hermes, fetch, diagnostics, capabilities, accessibility]
requires:
  - phase: 01-01
    provides: Direct Gateway fetch/SSE tracer and publish-valid Muxy panel scaffold
provides:
  - Immutable, fact-first direct Gateway probe snapshots with safe retest semantics
  - Read-only capability, validation-evidence, and transport-stop panel state shells
  - Native Muxy semantic-token styling and accessibility contract coverage
affects: [01-03, 01-04, 01-05, 01-06, run-control]
actuals:
  tokens: 9279
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: ["Immutable safe probe snapshots", "Conservative capability normalization", "Semantic-token native panel states"]
key-files:
  created: [src/probe.js, src/capabilities.js, test/probe-state.test.js, test/ui-contract.test.js]
  modified: [src/gateway-client.js, src/panel/app.js, src/styles/global.css]
key-decisions:
  - "Keep browser-origin outcomes Not verified unless controlled evidence proves an exact origin."
  - "Render capability names strictly as read-only data; no capability creates a Phase 1 control."
  - "Adapt stale TypeScript plan paths to the existing JavaScript panel scaffold."
patterns-established:
  - "ConnectionProbe owns one AbortController and ignores stale attempt completions."
  - "Untrusted Gateway metadata crosses the renderer only through compact normalized summaries."
requirements-completed: [CONN-02, CONN-03, CONN-05, SEC-01, SEC-02, SEC-05]
coverage:
  - id: D1
    description: Fact-first probe diagnostics with immutable retest carryover and redacted snapshots
    requirement: CONN-02
    verification:
      - kind: unit
        ref: test/probe-state.test.js
        status: pass
      - kind: integration
        ref: npm run build && node --test test/transport-tracer.test.js test/probe-state.test.js test/ui-contract.test.js
        status: pass
    human_judgment: false
  - id: D2
    description: Conservative read-only capabilities plus native panel state contract
    requirement: CONN-03
    verification:
      - kind: unit
        ref: test/ui-contract.test.js
        status: pass
      - kind: integration
        ref: npm run build && node --test test/transport-tracer.test.js test/probe-state.test.js test/ui-contract.test.js
        status: pass
    human_judgment: true
    rationale: Current Muxy theme, interface-scale, keyboard, narrow-layout, and reduced-motion inspection still requires host visual judgment.
duration: 3h 3m
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 02: Fact-First Diagnostics and Native Panel State Summary

**Immutable direct-Gateway diagnostics, conservative capability presentation, and accessible native Muxy panel states without creating run controls.**

## Performance

- **Duration:** 3h 3m
- **Started:** 2026-08-17T10:03:02-04:00
- **Completed:** 2026-08-17T14:06:26Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Added a single-owner connection probe with immutable, redacted verdicts, safe retries, and stale-completion protection.
- Classified only observed URL, browser-request, authentication, capability, and streaming outcomes; exact CORS origin remains unverified without controlled evidence.
- Rendered read-only capabilities, validation-evidence placeholders, and a dormant transport-stop shell with Muxy semantic tokens, keyboard focus, vertical wrapping, and reduced-motion support.

## Task Commits

1. **Task 1: Make connection and retest diagnostics fact-first and atomic** — `047af8a` (test RED), `f923842` (feat GREEN)
2. **Task 2: Render conservative capabilities and the complete native panel state contract** — `0771c9e` (test RED), `f6e3eec` (feat GREEN)

## Files Created/Modified

- `src/probe.js` — Immutable attempt coordinator and safe diagnostic projection.
- `src/gateway-client.js` — Supports the probe-owned abort signal and distinct auth/capability results.
- `src/capabilities.js` — Sanitizes capability metadata into read-only summaries.
- `src/panel/app.js` — Connection verdict, capabilities, evidence, and transport-stop UI shells.
- `src/styles/global.css` — Native semantic-token styles, focus/hover, wrapping, and reduced-motion rules.
- `test/probe-state.test.js` — Probe snapshot and retest race coverage.
- `test/ui-contract.test.js` — Capability and static UI contract coverage.

## Decisions Made

- Retain `Not verified` for browser-origin facts unless a controlled fixture can establish an exact stable origin.
- Show capabilities as normalized names only; Phase 1 creates no start, stop, steer, approval, chat, or topology controls.
- Use the live JavaScript scaffold paths (`src/panel/app.js`, `src/styles/global.css`) instead of stale `.ts` plan paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Disabled browser autocomplete for the bearer-token field**
- **Found during:** Task 2
- **Issue:** The existing input used `autocomplete="new-password"`, which did not meet the plan's explicit non-persistence contract.
- **Fix:** Set the password input to `autocomplete="off"` and added static contract coverage.
- **Files modified:** `src/panel/app.js`, `test/ui-contract.test.js`
- **Verification:** Full build and nine-test automated gate passed.
- **Committed in:** `f6e3eec`

**2. [Rule 3 - Plan drift] Adapted stale TypeScript paths to the JavaScript scaffold**
- **Found during:** Tasks 1 and 2
- **Issue:** The plan named `src/main.ts`, `src/styles.css`, and `.ts` tests, while the audited project uses `src/panel/app.js`, `src/styles/global.css`, and Node `.js` tests.
- **Fix:** Implemented the same artifacts in the existing JavaScript locations without adding a second application path.
- **Files modified:** `src/probe.js`, `src/capabilities.js`, `src/panel/app.js`, `src/styles/global.css`, test files
- **Verification:** `npm run build` and all Plan 02 tests passed.
- **Committed in:** `f923842`, `f6e3eec`

**Total deviations:** 2 auto-fixed (Rule 2: 1, Rule 3: 1). No scope expansion.

## Issues Encountered

The repository index required explicit approval for main-branch commits. The user approved the Task 1 commit, and subsequent in-scope Task 2 TDD commits were completed under the continuation authorization.

`REQUIREMENTS.md` also contained pre-existing deployment-condition edits. Plan 02 completion marks were applied in the working tree but the file is deliberately excluded from this metadata commit so those user-owned edits are not bundled; orchestration should reconcile and commit the combined requirements update separately.

## Known Stubs

None. The validation-evidence and transport-stop regions intentionally render fixed, non-actionable Phase 1 placeholders until later plans supply fixture evidence and stop-gate activation.

## Manual Verification Outstanding

Inspect the completed panel in Muxy for initial, invalid, loading/retest, success, partial, generic-error, and narrow-panel states in both themes, two interface scales, keyboard-only navigation, and Reduce Motion. This host-specific visual check is required by Task 2 and was not run in this terminal environment.

## Next Phase Readiness

Plan 01-03 can attach versioned fixture evidence to the safe state model. Real Muxy/WebKit origin and streaming qualification remain intentionally unverified pending later controlled fixtures.

## Self-Check: PASSED

- Confirmed all six implementation/test artifacts exist.
- Confirmed all four Task 1/Task 2 TDD commits exist in Git history.
- Re-ran the build and complete nine-test Plan 02 gate successfully.
