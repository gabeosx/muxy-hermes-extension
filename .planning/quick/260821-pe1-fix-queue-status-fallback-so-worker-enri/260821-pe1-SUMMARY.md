---
id: 260821-pe1
title: Preserve queue stats when worker telemetry is unavailable
status: complete
completed: 2026-08-21
---

# Preserve queue stats when worker telemetry is unavailable

The operations panel now treats active-worker telemetry as optional enrichment. A valid Kanban stats response remains visible even when `/workers/active` is unavailable or rejects its response.

## Completed work

1. Added a regression test for valid queue stats paired with a `503` worker response.
2. Parsed worker telemetry best-effort without weakening the existing fail-closed behavior for invalid or unavailable queue stats.
3. Rebuilt and reloaded the unpacked extension in Muxy against the live Hermes Gateway. Queue pressure changed from “Queue status is unavailable” to `0 waiting`, `0 running`, while the existing `2 blocked tasks` warning remained visible.

## Commit

- `57a6f64` — `fix(operations): preserve queue stats without worker telemetry`

## Verification

- Focused operations tests — passed: 6 tests.
- `npm test` — passed: 82 tests.
- `npm run build && npm run validate:dist` — passed; deterministic 18-file marketplace distribution.
- `npm run validate` — passed; 15 product modules and zero high/critical audit findings.
- `git diff --check` — passed.
- Native Muxy reload against the live Gateway — passed.

## Scope

Pre-existing untracked agent metadata, debug notes, caches, and `skills-lock.json` were left untouched and unstaged.
