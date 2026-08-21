---
quick_id: 260821-k4x
verified: 2026-08-21T18:57:53Z
status: human_needed
score: 5/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "View the first carousel image at the real Muxy store thumbnail size after the draft upstream PR is available."
    expected: "The headline ‘Hermes, inside Muxy.’ and the supporting promise are immediately legible without opening the image; the hero reads as a product overview before the Operations, Approvals, and Kanban images."
    why_human: "The checked-in 442×276 downsample is visually strong, but final store CSS, image treatment, and device rendering cannot be proven from source or the local PNG alone."
---

# Quick Task 260821-k4x: Marketplace Submission Preparation Verification

**Task Goal:** Prepare the Hermes Agent marketplace submission with a store-first hero, release/versioning docs and bounded CI, exact package validation, while preserving untracked user files and stopping before external GitHub actions.

**Verified:** 2026-08-21T18:57:53Z  
**Status:** human_needed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The store carousel opens with a readable Hermes hero, then Operations, Approvals, and Kanban. | ⚠️ UNCERTAIN — human check | `package.json` and `dist/package.json` declare precisely `hero.png`, `operations.png`, `agent-approval.png`, `project-board.png` in that order. All are 1600×1000. The source hero was inspected at 1600×1000 and at a generated 442×276 downsample; the headline and product promise remain readable. Actual store rendering still needs inspection. |
| 2 | The manifest and deterministic package have one valid icon and exactly four sanitized listing PNGs without new permissions. | ✓ VERIFIED | `npm run validate:dist` rebuilt twice and passed with a deterministic 18-file inventory. Its validator checks source/dist manifest equality, the static self-contained icon, exact PNG dimensions, an allowlist, frozen ordering, and the unchanged five-permission list. |
| 3 | Maintainers have immutable-version release guidance with changelog, policy, rollback, and no npm publish path. | ✓ VERIFIED | `CHANGELOG.md` has `Unreleased` plus `0.1.0`; `RELEASING.md` makes `package.json` authoritative, requires lockfile parity, gives patch/minor rules, immutable corrections, `hermes-agent-vX.Y.Z` tags, rollback, and a draft-only/no-npm-publish boundary. README links both documents. |
| 4 | CI is pinned to Node 20 with read-only authority; topology qualification remains an explicit release gate. | ✓ VERIFIED | `.github/workflows/ci.yml` is the only workflow, has top-level `contents: read`, pinned 40-hex `actions/checkout` and `actions/setup-node` v4 refs, and runs `npm ci`, `npm test`, and `npm run validate`. Qualification is restricted to `workflow_dispatch`; no secrets, write permissions, publish, or deployment operation exists. |
| 5 | The local package is ready for the root agent's public-repo, sparse-copy, upstream-validation, and draft-PR-only handoff. | ✓ VERIFIED | `RELEASING.md` states exact source-copy exclusions and upstream commands. The current branch is four commits ahead of `origin/main`, with no release tag; `package.json` is private and has no npm publication lifecycle scripts. No external GitHub/store action is represented in the task commits. |
| 6 | Pre-existing user-owned untracked paths remain present and unstaged. | ✓ VERIFIED | All guarded paths exist and are listed as untracked only: `.agents/`, `.gsd/`, the debug/research files, and `skills-lock.json`. `git diff --cached --name-status` is empty. The four task commits modify only the plan's explicit files; none include protected paths. |

**Score:** 5/6 truths verified (0 present, behavior-unverified)

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `artwork/marketplace-hero.svg` | Editable store hero source | ✓ VERIFIED | 73-line static 1600×1000 SVG with no script, external resource, credential, endpoint, or personal-data reference; visible composition matches the PNG hero. |
| `assets/screenshots/hero.png` | First exact-size listing image | ✓ VERIFIED | PNG is 1600×1000; manually inspected at native and 442×276 sizes. |
| `package.json` | Four-image ordered listing and `0.1.0` identity | ✓ VERIFIED | Source and generated `dist/package.json` are byte-equal; version `0.1.0`, `private: true`, no runtime dependencies, frozen permissions, and required carousel order are enforced. |
| `scripts/validate-dist.mjs` | Source/dist listing contract | ✓ VERIFIED | Builds twice, validates icon safety and all listing/README dimensions, compares manifests, constrains the emitted allowlist, and compares file digests. |
| `CHANGELOG.md` | Unreleased and initial history | ✓ VERIFIED | Contains an empty `Unreleased` section and dated `0.1.0` marketplace-beta entry. |
| `RELEASING.md` | Versioning and release handoff | ✓ VERIFIED | Provides selection, validation, sparse-copy, upstream-check, draft-only, post-merge, and rollback instructions. |
| `.github/workflows/ci.yml` | Bounded CI | ✓ VERIFIED | One workflow, static top-level read-only permission, SHA-pinned action refs, Node 20, no secret/write/publish/deploy syntax. |
| `scripts/validate-release.mjs` | Release-governance and clean-copy enforcement | ✓ VERIFIED | `validateReleaseGovernance()` checks versions, documents, workflow constraints, and no publish lifecycle; clean copies exclude `.qualification`, agent/planning metadata, lockfile metadata, build output, and logs. |

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `assets/screenshots/hero.png` | `muxy.marketplace.screenshots[0]` | ✓ WIRED | Exact first entry in both source and dist manifests. |
| `scripts/copy-manifest.mjs` | `dist/assets/screenshots/hero.png` | recursive `assets` copy during build | ✓ WIRED | The copy script recursively copies `assets`; generated dist includes `assets/screenshots/hero.png` and the other three ordered files. |
| `scripts/validate-dist.mjs` | `package.json` | frozen required screenshot list and source/dist equality | ✓ WIRED | `REQUIRED_SCREENSHOTS` exactly matches the manifest; `npm run validate:dist` passed. |
| `.github/workflows/ci.yml` | `scripts/validate-release.mjs` | `npm run validate` after `npm ci` | ✓ WIRED | The workflow invokes the `validate` package script, which executes `scripts/validate-release.mjs`. |
| `scripts/validate-release.mjs` | changelog, release guide, manifest, lockfile | `validateReleaseGovernance()` | ✓ WIRED | The function reads and asserts all four files, and `validateRelease()` calls it before structural/full release validation. |

## Data-Flow Trace

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| Marketplace listing | `muxy.marketplace.screenshots` | Source manifest → copied `dist/package.json` → build inventory | Exact static package data, not runtime data | ✓ FLOWING |
| Release CI | package scripts | Workflow → `npm ci` → `npm test` / `npm run validate` | Commands resolve from committed `package.json` | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full code and governance test suite | `npm test` | 80 passed, 0 failed | ✓ PASS |
| Deterministic exact distribution | `npm run validate:dist` | Rebuilt twice; validated deterministic 18-file distribution | ✓ PASS |
| Full release validation | `npm run validate` | Node v26.5.0; 15 product modules; 0 high/critical audit findings; clean-copy digest `57c67be781809a97b3624e41a57f7b347be5c50f37b2477054f17ca5dc330795` | ✓ PASS |
| Supported topology qualification and cleanup | `npm run qualify` | Receipt `.qualification/receipts/79b799ecac8c.json` records `passed_supported_beta_matrix`, zero containers/networks/volumes, closed listeners, removed task root, and stopped SSH forward | ✓ PASS |

## Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| --- | --- | --- | --- |
| MKT-01 | Quick plan | ✓ SATISFIED | Frozen marketplace author, GitHub owner, categories, icon, and paths pass the manifest contract. |
| MKT-02 | Quick plan | ⚠️ HUMAN CHECK | Requirement now specifies the hero plus three 1600×1000 feature images. Package/order/dimensions are verified; actual store-scale readability needs the carousel inspection below. |
| MKT-03 | Quick plan | ✓ SATISFIED | README retains required product/security content and links the release/changelog documentation. |
| MKT-04 | Quick plan | ✓ LOCAL GATE SATISFIED | The copy/build/local allowlist passes. Muxy's upstream `validate.mjs` and dry-run pack are intentionally reserved for the root agent's sparse-checkout handoff and were not falsely claimed as complete. |
| MKT-08 | Quick plan | ✓ SATISFIED | The local validator and receipt show release preparation/cleanup evidence while `RELEASING.md` stops before publishing. |

## Anti-Patterns Found

No blocker or warning anti-patterns found in the task files. Scans found no `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder, npm publish, deployment, secret, or external-release implementation marker.

## Human Verification Required

### 1. Real Muxy carousel thumbnail

**Test:** Once the root agent has created the upstream draft PR, view the first image in Muxy's extension-store presentation at its normal thumbnail size.

**Expected:** The headline and support line are readable without expanding the image, and the first image communicates the product before the three specific feature images.

**Why human:** Local file inspection confirms the source image and a 442×276 downsample, but only Muxy's final rendering proves the store presentation.

## Gaps Summary

No implementation gaps found. The only remaining item is the required human visual check; the planned external handoff (public repository, sparse checkout, upstream validator/pack, and draft PR) has correctly not occurred in this local quick task.

---

_Verified: 2026-08-21T18:57:53Z_  
_Verifier: gsd-verifier_
