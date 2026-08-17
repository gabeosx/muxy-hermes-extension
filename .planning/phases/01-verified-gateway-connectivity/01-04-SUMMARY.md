---
phase: 01-verified-gateway-connectivity
plan: 04
subsystem: gateway-transport
tags: [muxy, curl, sse, file-events, consent, redaction]
requires:
  - phase: 01-01
    provides: Publish-valid panel, connection state machine, and SSE parser
  - phase: 01-02
    provides: Secret-safe diagnostics and native panel contract
  - phase: 01-03
    provides: Redacted evidence and conservative verdict engine
provides:
  - Reproducible negative result for direct muxy-ext WebKit loopback transport
  - Consented argv-form curl request and streaming-journal relay
  - Bearer-via-stdin, bounded journal, and scrub-before-remove security boundary
affects: [01-05, 01-06, phase-2-run-control, phase-3-recovery]
actuals:
  tokens: 26000
  tasks: 2
  commits: 10
tech-stack:
  added: [/usr/bin/curl, Muxy file.changed, muxy.files]
  patterns: [one audited exec per stream, bearer only through stdin, bounded ephemeral workspace journal]
key-files:
  created: [src/curl-relay.js, test/curl-relay.test.js]
  modified: [src/gateway-client.js, src/probe.js, src/panel/app.js, package.json, scripts/validate-dist.mjs, RESEARCH.md]
key-decisions:
  - "Direct WKWebView transport is a recorded negative result and is no longer the v1 implementation path."
  - "One argv-form curl process owns each live stream; the panel reads its workspace journal through file.changed and muxy.files, never repeated exec calls."
  - "No Muxy/Hermes source change, provider registration, external daemon, public ingress, or hosted relay is authorized."
  - "Closed-panel rich notifications and event replay remain out of scope because background cannot read the journal and Hermes removes the queue after subscriber disconnect."
patterns-established:
  - "Secrets cross the Muxy subprocess boundary only through stdin; argv, URL, environment, journal, storage, diagnostics, and audit summaries are forbidden."
  - "Journal size fails closed at 4 MiB and content is overwritten before the extension-owned directory is moved to Trash."
requirements-completed: []
coverage:
  - id: D1
    description: "Curl request operations keep the bearer out of argv and parse only bounded structured responses."
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/curl-relay.test.js#requestJson uses argv-form curl, never puts the bearer in argv, and parses the terminal status marker"
        status: pass
    human_judgment: false
  - id: D2
    description: "One long-lived exec writes a bounded journal consumed through file.changed and muxy.files, then scrubbed before removal."
    requirement: CONN-02
    verification:
      - kind: unit
        ref: "test/curl-relay.test.js#streamJournal consumes file.changed through muxy.files without exec polling, then scrubs before removal"
        status: pass
      - kind: integration
        ref: "npm run build && node --test test/*.test.js && node scripts/validate-dist.mjs"
        status: pass
    human_judgment: true
    rationale: "The actual Muxy consent dialogs, file.changed delivery, and incremental journal rendering still require one real-panel verification."
  - id: D3
    description: "The manifest requests only the approved relay, journal, and panel authorities and declares no background/provider surface."
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "test/ui-contract.test.js#the manifest exposes the panel plus only the approved relay and journal permissions"
        status: pass
      - kind: integration
        ref: "node scripts/validate-dist.mjs"
        status: pass
    human_judgment: false
duration: 1d
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 04: Gateway Transport Qualification Summary

**The failed direct-WebKit experiment was replaced, with user approval, by a tested one-exec curl streaming relay that requires no Muxy or Hermes source change.**

## Performance

- **Duration:** 1 day across interactive qualification and architecture review
- **Started:** 2026-08-17T14:22:08Z
- **Completed:** 2026-08-17T20:10:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Resolved the latest stable Muxy 1.5.0 build 945 and Hermes v2026.8.16 / 0.20.2 identities and built an isolated qualification harness without changing either product.
- Reproduced the decisive boundary: an actual `muxy-ext://` panel request did not reach a controlled loopback listener, while Muxy's buffered/private-host HTTP bridge and non-streaming webview exec response could not supply the missing transport.
- Implemented the approved extension-only fallback: buffered JSON operations and one long-lived curl SSE process, bearer supplied only through stdin, a 4 MiB workspace journal read through `file.changed`/`muxy.files`, and scrub-before-remove cleanup.
- Updated the panel, failure taxonomy, manifest permissions, publish validator, and canonical research/planning contract to describe the actual consent and recovery limits.

## Task Commits

1. **Original qualification harness and exact-source investigation** — `5a4d179`, `28b97c2`, `401d751`, `ddfcb1a`, `3cfd18d`, `e9cf4a0`, `8935ba1`
2. **Approved architecture pivot and relay implementation** — `01bb8b0`, `b556348`, `e3ba7bd`

## Files Created/Modified

- `src/curl-relay.js` — Argv-form curl operations, stdin bearer config, status framing, bounded journal reader, and cleanup boundary.
- `src/gateway-client.js` — Uses the consented relay for capabilities and the controlled streaming qualification.
- `src/probe.js` — Replaces browser-origin failure state with observed relay state.
- `src/panel/app.js` — Discloses curl and temporary-worktree-journal consent and renders relay diagnostics.
- `package.json` — Declares `commands:exec`, `files:read`, `files:write`, `panels:write`, and `file.changed` only.
- `scripts/validate-dist.mjs` — Enforces the new manifest boundary in source and published output.
- `test/curl-relay.test.js` — Proves stdin-only bearer handling, single-exec streaming, no exec polling, cap enforcement, and scrub-before-remove order.
- `RESEARCH.md` and Phase 1 planning artifacts — Record the authoritative no-Muxy-change architecture.

## Decisions Made

- The workspace journal is acceptable only for this development proof and only with explicit disclosure, a hard size cap, ignored runtime path, and cleanup. It is not presented as an extension-private secret store.
- Status polling is reconciliation, not an event substitute. It can recover current status and final output but not the missing approval payload or incremental transcript after SSE disconnect.
- Agent/provider registration is unnecessary. Rich background alerts remain deferred rather than hidden behind OS notifications or an unapproved Muxy patch.

## Deviations from Plan

### User-approved architectural change

**1. [Rule 4 - Architecture] Replaced direct WebKit/CORS transport with the consented curl relay**
- **Found during:** Task 1 real-panel origin capture
- **Issue:** The panel emitted no observable loopback request. Exact Muxy source also showed that `muxy.http.fetch` blocks the required destinations, webview `muxy.exec` buffers output until completion, every exec is audited, and a private `/tmp` spool is unreadable through `muxy.files`.
- **Decision:** The user explicitly approved finalizing and proceeding with a no-Muxy-change fallback.
- **Fix:** Added one audited curl process per stream plus the bounded active-workspace journal read through native file events.
- **Files modified:** Canonical research/planning files, manifest, client/probe/panel, validator, and relay tests.
- **Verification:** Full build, 31/31 tests, and deterministic dist validation pass.
- **Committed in:** `01bb8b0`, `b556348`, `e3ba7bd`

### Auto-fixed issues

**2. [Rule 2 - Missing Critical] Prevented secrets from entering Muxy consent/audit payloads**
- **Found during:** Relay contract design
- **Issue:** Muxy records full argv for every exec; placing the bearer in a curl header argument would persist it in the audit log.
- **Fix:** Curl reads its Authorization header from stdin config; token validation rejects config-line injection characters.
- **Verification:** Dedicated sentinel tests prove the token is present in stdin and absent from argv/results.
- **Committed in:** `b556348`, `e3ba7bd`

**3. [Rule 2 - Missing Critical] Bounded and scrubbed the workspace journal**
- **Found during:** Relay contract design
- **Issue:** `muxy.files.read` rejects files above 5 MiB and deletion moves files to Trash, so deleting a content-bearing journal would preserve it there.
- **Fix:** Fail closed at 4 MiB, overwrite the journal with an empty string, then remove the extension-owned directory.
- **Verification:** Unit tests assert limit failure and write-before-delete ordering.
- **Committed in:** `b556348`, `e3ba7bd`

---

**Total deviations:** 1 user-approved architecture change and 2 missing-critical security fixes.
**Impact on plan:** The original direct-WebKit and exact-origin acceptance path is superseded. The new path preserves the extension-only/no-infrastructure constraint but adds explicit curl and workspace-journal authority.

## Issues Encountered

- The original exact-origin fixture code remains as reproducible negative-path evidence and still has passing tests, but it is no longer the product transport.
- The actual Muxy relay flow has not yet received human sign-off; it remains the next blocking verification before either host-native or Docker can be marked `Supported`.
- An interrupted or force-destroyed panel cannot synchronously scrub its active journal. V1 must add startup stale-journal cleanup and truthful UI before handling real user transcript content.

## User Setup Required

- Rebuild and reload `dist/` in Muxy because the manifest permission set changed.
- During the next real-panel test, inspect the displayed curl argv, choose whether to allow it, and separately authorize the journal scrub/remove operations.

## Next Phase Readiness

- Plan 01-05 should first perform the real-panel relay tracer against the isolated host fixture, including audit-log sentinel checks and incremental `file.changed` delivery.
- Do not proceed to real user run content until startup stale-journal cleanup is implemented and verified.
- Docker and simulated remote conditions can then use the identical URL/token/relay code path; remote-workspace execution remains `Unverified` and is not a v1 blocker.

## Self-Check

PASSED — relay and manifest files exist; architecture/TDD/implementation commits are present; `npm run build`, all 31 tests, and `node scripts/validate-dist.mjs` pass.

---
*Phase: 01-verified-gateway-connectivity*
*Completed: 2026-08-17*
