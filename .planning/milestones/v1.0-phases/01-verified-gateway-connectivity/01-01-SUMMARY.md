---
phase: 01-verified-gateway-connectivity
plan: "01"
subsystem: extension-panel
tags: [muxy, vite, hermes, sse, webkit, manifest-validation]
requires: []
provides:
  - "A panel-local, bearer-authenticated capabilities and qualification-stream tracer."
  - "A panel-only Muxy publish artifact with deterministic dist validation."
affects: [01-02, 01-03, 01-04, 01-05, 01-06]
actuals:
  tokens: 23198
  tasks: 3
  commits: 3
tech-stack:
  added: [Vite, Tailwind, Node test]
  patterns: ["Direct fetch-backed SSE parsing", "structural dist manifest validation"]
key-files:
  created: [src/gateway-client.js, src/sse-parser.js, scripts/validate-dist.mjs, test/transport-tracer.test.js]
  modified: [package.json, panel/index.html, src/panel/app.js, src/styles/global.css]
key-decisions:
  - "Keep the Gateway bearer in an in-memory probe closure and use direct panel fetch only."
  - "A missing controlled real-panel fixture leaves streaming Not verified and qualification Unverified."
  - "Ship one declarative panel with no permissions, commands, topbar item, or background entry."
patterns-established:
  - "Manifest checks parse source and dist JSON rather than scan text."
  - "Qualification claims fail closed until the Plan 01-04 controlled fixture records real Muxy evidence."
requirements-completed: [EXT-01, EXT-02, CONN-01, CONN-02, CONN-03, CONN-04, DEPL-01, SEC-01, SEC-02, SEC-04, SEC-05]
coverage:
  - id: D1
    description: "Direct panel URL/token tracer safely reads capabilities and consumes the qualification SSE stream."
    requirement: CONN-01
    verification:
      - kind: unit
        ref: "node --test test/transport-tracer.test.js"
        status: pass
    human_judgment: true
    rationale: "Real Muxy WebKit origin and controlled Hermes fixture evidence are unavailable until Plan 01-04."
  - id: D2
    description: "Publish output carries an identical, permissionless one-panel manifest and its configured entry assets."
    requirement: EXT-02
    verification:
      - kind: integration
        ref: "node scripts/validate-dist.mjs"
        status: pass
    human_judgment: false
status: complete
---

# Phase 01 Plan 01: Verified Gateway Connectivity Summary

**Direct bearer-authenticated Hermes capabilities and SSE tracer in a permissionless Muxy panel, with deterministic publish-output validation.**

## Performance

- **Completed:** 2026-08-17
- **Tasks:** 3/3
- **Files modified:** 15 implementation/build files
- **Verification:** build, dist validation across two clean builds, and four tracer tests passed

## Accomplishments

- Audited the current Muxy starter and captured its approved lockfile before dependency installation.
- Added a memory-only bearer client, direct `fetch()` capability read, incremental SSE parser, and a safe panel result surface without run controls.
- Reduced the manifest to one declarative panel with no permissions, command, topbar, header-button, or background surface; the validator proves source/dist parity and entry assets.

## Task Commits

1. **Task 1: Verify the generated Muxy starter supply chain before installation** — `c2bf48e` (chore)
2. **Task 2: Prove one panel-to-Hermes capability and incremental SSE path** — `2f25ea3` (feat)
3. **Task 3: Make the walking skeleton publish-valid and permission-minimal** — `6fba1f8` (chore)

## Files Created/Modified

- `src/gateway-client.js` — direct URL-policy, bearer-header, capability, and qualification-stream client.
- `src/sse-parser.js` — chunk-safe, metadata-only SSE parser.
- `src/panel/app.js` — open-panel URL/token connection form and safe observed-stage renderer.
- `scripts/validate-dist.mjs` — structural manifest, entry-asset, and repeat-build validator.
- `package.json` — one panel contribution with no requested Muxy permissions.

## Decisions Made

- Preserve the controlled-fixture fallback: without the Plan 01-04 qualification fixture, the stream stage is **Not verified** and the qualification is **Unverified**. No Supported verdict or synthetic evidence was created.
- Do not alter Muxy or Hermes source, add a helper/background, or grant extra authority to compensate for the unavailable fixture.

## Deviations from Plan

### Execution-time starter adaptation

**1. Current Muxy starter is Vanilla JS + Tailwind, not the plan's illustrative TypeScript layout.**
- **Found during:** Task 1
- **Resolution:** Preserved the generated JavaScript/Vite layout and applied the planned client, parser, UI, and tests to those actual paths.
- **Impact:** No runtime framework was added and all Task 2/3 checks pass.

**2. The generated starter intentionally omitted a lockfile.**
- **Found during:** Task 1
- **Resolution:** Added and audited the generated `package-lock.json` before installing dependencies.
- **Impact:** The supply-chain checkpoint remains recorded in `c2bf48e`.

**Total deviations:** 0 auto-fixed. The two starter adaptations were required to preserve the current Muxy-generated scaffold.

## Issues Encountered

- The isolated deterministic Hermes qualification fixture and real Muxy panel observation are formally introduced by Plan 01-04. Per the authorized fallback, no arbitrary tool-capable Gateway was used. The current stream stage remains **Not verified** and the deployment qualification remains **Unverified**.

## Known Stubs

None. The input's `placeholder` attribute is an intentional URL example, not rendered data or an unwired state.

## Next Phase Readiness

- Plans 01-02 and 01-03 can build on the client and artifact contracts.
- Plan 01-04 must supply the controlled fixture and real Muxy observation before any real-path qualification or Supported claim.

## Self-Check

PASSED — required client/parser/validator/test files, built manifest/panel entry, summary, and all three task commits exist.
