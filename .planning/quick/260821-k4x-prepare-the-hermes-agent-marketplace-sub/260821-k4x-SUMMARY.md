---
id: 260821-k4x
title: Prepare the Hermes Agent marketplace submission
status: complete
completed: 2026-08-21
---

# Prepare the Hermes Agent marketplace submission

Hermes Agent now has a legible, deterministic marketplace hero; four verified listing screenshots; immutable release guidance; and a bounded local CI/release governance gate.

## Completed work

1. Added an editable 1600×1000 SVG hero and checked-in PNG, with the exact store promise and a sanitized vector treatment of the Hermes work surface. The listing order is now hero, Operations, Approval, and Kanban; source and dist contracts enforce all four images at 1600×1000.
2. Added `CHANGELOG.md` and `RELEASING.md`, linked them from the Development section, and documented pre-1.0 version selection, immutable correction releases, draft-only marketplace submission, post-merge tagging, rollback, and sparse-copy exclusions.
3. Added TDD-proven release governance: version/lockfile parity, private/no-npm-publish assertions, release-document coverage, clean-copy exclusion of runtime `.qualification` evidence and `skills-lock.json`, and one read-only CI workflow. The workflow pins `actions/checkout` and `actions/setup-node` to full SHA v4 references and permits qualification only by manual dispatch.
4. Updated `MKT-02` to record the approved hero plus three feature-image decision.

## Commits

- `ff27c39` — `feat(marketplace): add legible listing hero`
- `7baf9cf` — `docs(release): define marketplace versioning handoff`
- `0043a32` — `test(marketplace): add failing release governance contract` (TDD RED)
- `9ffbaa1` — `feat(release): enforce bounded marketplace governance` (TDD GREEN)

## Verification

- `node --test test/ui-contract.test.js` — passed.
- `npm run validate:dist` — passed; deterministic 18-file marketplace distribution.
- `node --test test/ui-contract.test.js test/release-validator.test.js` — passed.
- `npm test` — passed: 80 tests.
- `npm run validate` — passed; clean-copy digest `57c67be781809a97b3624e41a57f7b347be5c50f37b2477054f17ca5dc330795`.
- `npm run qualify` — passed with receipt `.qualification/receipts/dd1c66d58a9a.json`; cleanup proved zero containers, networks, and volumes plus closed listeners, removed task root, and stopped SSH forward.
- Inspected the marketplace hero at 1600×1000 and at a 442×276 downsample; the product identity and headline remain immediate at thumbnail scale.

## External handoff

The coordinating agent must still perform the explicitly reserved external work: re-run the secret scan before public visibility, make the source repository public, create or refresh the `gabeosx/extensions` fork and sparse checkout, copy only the allowlisted source, run Muxy's upstream validation and dry-run pack, complete the required audits, and open a draft-only upstream PR. No npm publishing, store publication, merge, tag, or release was performed here.

## Deviations

The first exact sparse-copy rehearsal exposed two missing review inputs: `fixtures/kanban/board.json` and the nested read-only CI workflow required by the governance test. The allowlist and release guide were corrected before any marketplace branch was pushed. A byte-for-byte comparison then exposed Tailwind's repository-wide automatic source detection: the same extension produced different CSS when copied into the upstream repository. Both stylesheets now disable automatic detection and declare only product source paths, with a regression contract protecting sparse-copy reproducibility. The full suite also first encountered a sandbox-only loopback bind denial; rerunning the same unchanged tests with local loopback networking enabled passed. No runtime product defect was found.
