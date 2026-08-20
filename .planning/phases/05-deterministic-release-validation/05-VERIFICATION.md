---
phase: 05-deterministic-release-validation
verified: 2026-08-20T20:15:51Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 5: Deterministic Release Validation Verification Report

**Phase Goal:** One repeatable command can demonstrate from clean installs that the current marketplace source is secure, least-privileged, tested, and reproducibly packaged.
**Verified:** 2026-08-20T20:15:51Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

`05-01-PLAN.md` has no `must_haves` frontmatter, so this report uses all four non-negotiable Roadmap success criteria. The verifier did not rely on the phase summary: it re-ran the complete release command on both required Node versions.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Two separate `npm ci` workspaces pass the complete release test suite twice without retries or path-sensitive HTTPS failures. | ✓ VERIFIED | `npm run validate` completed its canonical two no-retry test passes plus two isolated copied `npm ci` workspaces, each with two no-retry suites; the current narrowed-contract package returned clean-copy digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef`. The initial restricted-sandbox attempt failed only at loopback binding; the complete loopback-authorized run passed. |
| 2 | Node 20 and the current development Node satisfy the engine range and produce equivalent distribution manifests, assets, and inventories. | ✓ VERIFIED | Full gate passed under Node `v26.5.0` and Node `v20.20.2`, each returning the same digest. `package.json` and `dist/package.json` both declare `engines.node: ">=20"`; `validate-dist.mjs` compares both builds byte-for-byte and asserts source/dist manifest identity. |
| 3 | The release validator proves import reachability, least privilege, secret safety, marketplace schema, asset shape, and deterministic distribution output. | ✓ VERIFIED | The current full gate completed import-graph equality, bounded secret scans of source and `dist/`, manifest/permission allowlists, static-SVG checks, exact 1600×1000 screenshot checks, complete distribution allowlist checks, and two-build hash equality. Structural mode independently passed with 15 reachable product modules. |
| 4 | `npm audit` has no high/critical findings and security review has no open high or unaccepted medium release threat. | ✓ VERIFIED | Both full validator runs returned audit `{ high: 0, critical: 0 }`. The current STRIDE review in `06-SECURITY.md` records 12/12 threats closed, `threats_open: 0`, and no accepted risks; the deep current-source review confirms no extension-owned critical or warning remains. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `scripts/validate-release.mjs` | Current-architecture release command | ✓ VERIFIED | 216 substantive lines. Runs version/engine and runtime-dependency checks, reachability, source/dist secret scans, high/critical audit enforcement, two canonical tests, deterministic `dist`, two clean `npm ci` copies, and cleanup proof. Executed directly through `npm run validate`. |
| `scripts/validate-dist.mjs` | Marketplace-package and deterministic-build verifier | ✓ VERIFIED | 185 substantive lines. Builds twice; checks exact manifest allowlists and permissions, listing metadata, README, static icon, exact PNG dimensions, reachable emitted assets, and complete `dist` inventory/hash equality. Called by the release validator. |
| `test/release-validator.test.js` | Unit regression coverage for import graph, scanner, and cleanup diagnostics | ✓ VERIFIED | 43 substantive lines, discovered by `node --test test/*.test.js`; the final full suite passed 77/77 twice. Its source-inspection checks supplement—not replace—the direct full-gate execution above. |
| `package.json` / `package-lock.json` | Node-20-compatible executable entry and locked dependency graph | ✓ VERIFIED | `validate` invokes `scripts/validate-release.mjs`; the declared `>=20` range and zero runtime dependencies are validated in both source and built manifest. Lockfile v3 repeats the root engine declaration. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `scripts/validate-release.mjs` | `npm run validate` | ✓ WIRED | Script maps exactly to `node scripts/validate-release.mjs`; both Node 26 and Node 20 invocations passed. |
| `scripts/validate-release.mjs` | `scripts/validate-dist.mjs` | direct `validateDist()` import/call | ✓ WIRED | Validator imports at line 10 and calls at line 199 before scanning the built output and comparing clean copies. |
| `scripts/validate-release.mjs` | clean copied installs | `cp` → `npm ci` → two `npm test` passes → dist digest comparison | ✓ WIRED | `validateCleanCopies()` creates two task-unique copies, compares files and SHA-256 maps, and proves temporary-root deletion in `finally`; executed successfully twice across the two Node versions. |
| `scripts/validate-dist.mjs` | `dist/` marketplace payload | `npm run build` plus source/dist asset and manifest checks | ✓ WIRED | Current emitted package contains only the declared panel/tab assets, `README.md`, manifest, icon, and the three required PNGs. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `scripts/validate-release.mjs` | `cleanCopies` / `distribution` | Real filesystem copies, `npm ci`, test processes, and SHA-256 reads | Yes — both live runs returned the same non-static digest | ✓ FLOWING |
| `scripts/validate-dist.mjs` | emitted inventory and digests | Actual Vite `dist/` files and built manifest/assets | Yes — current `dist/` has 13 declared files and three 1600×1000 PNGs | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Current full behavioral/security/UI/fixture/contract suite | `npm test` (with loopback fixture binding allowed) | 77 passed, 0 failed, twice with no retries | ✓ PASS |
| Structural release checks | `npm run validate -- --structural` | Node `v26.5.0`; 15 modules; audit high/critical 0 | ✓ PASS |
| Full current-Node clean-copy gate | `npm run validate` (with loopback fixture binding allowed) | Node `v26.5.0`; digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef` | ✓ PASS |
| Full Node-20 clean-copy gate | `npx --yes --package node@20 node scripts/validate-release.mjs` (with loopback fixture binding allowed) | Node `v20.20.2`; same digest | ✓ PASS |

### Probe Execution

No phase-declared or conventional `probe-*.sh` files apply to this validation phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| VAL-01 | 05-01 | Current Dashboard release validator covers architecture, manifest/assets, least privilege, secrets, reachability, and contents. | ✓ SATISFIED | Direct full release run plus 15-module reachability and `validate-dist` manifest/asset checks. |
| VAL-02 | 05-01 | Clean-copy HTTPS timeouts are eliminated through real health checks, budgets, unique resources, and bounded diagnostics. | ✓ SATISFIED | `scripts/qualify-release.mjs` uses bounded `waitHttp`, `waitHealthy`, DNS/edge checks, generated task roots/ports/project names, and sanitized errors; qualification tests run within the full suite and exercise bounded child termination. |
| VAL-03 | 05-01 | Two independent clean installs run the complete no-retry release gate and match inventories. | ✓ SATISFIED | Direct Node 26 and Node 20 full gates each completed two `npm ci` copies and two suites per copy. |
| VAL-04 | 05-01 | Two clean builds have identical deterministic files and equivalent normalized manifest/listing assets. | ✓ SATISFIED | `validateDist()` builds twice and compares exact SHA-256 maps; full gate also compares clean-copy maps. |
| VAL-05 | 05-01 | Node 20/current Node pass, with a compatible engine declaration and no runtime dependencies. | ✓ SATISFIED | Direct Node 20 and Node 26 successful results; `engines.node` is `>=20`; validator rejects runtime dependencies. |
| VAL-06 | 05-01 | Audit and release scan have no high/critical or forbidden secret material. | ✓ SATISFIED | Both full runs reported high/critical 0; source and built payload secret scans passed. |
| VAL-07 | 05-01 | Behavioral, security, UI, fixture, and contract tests pass twice without retries. | ✓ SATISFIED | Full gate ran canonical suite twice and copied-suite tests twice per clean copy; the final direct suite was 77/77 twice. |
| VAL-08 | 05-01 | Security review has no open high or unaccepted medium release finding. | ✓ SATISFIED | Current security register: 12 closed, 0 open, no accepted risks; deep code review has no extension-owned critical/warning. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No `TBD`, `FIXME`, `XXX`, placeholder implementation, or empty user-visible validator path found in the Phase 5 artifacts. | ℹ️ Info | No auditable completion-debt marker. |

### Disconfirmation Pass

- The dedicated release-validator unit test contains source-text assertions for cleanup and diagnostics; by itself that would not prove execution. This is not a gap because the verifier independently ran the complete clean-copy command on both Node versions.
- The current Muxy SSH-workspace failure is a Phase 6 external qualification blocker, not a Phase 5 release-validator failure. It cannot be deferred or silently absorbed into a marketplace-ready claim, but it does not break this phase's deterministic packaging gate.
- A direct `npm audit` attempt inside the restricted network sandbox could not resolve the registry; the actual full validator runs were repeated with authorized network/loopback execution and both returned zero high/critical findings. The environmental sandbox failure is therefore not a product finding.

### Human Verification Required

None for this phase. The marketplace submission and signed-store smoke flow remain later Phase 7 gates; Phase 6's real Muxy SSH-workspace blocker remains independently open.

---

_Verified: 2026-08-20T20:15:51Z_
_Verifier: the agent (gsd-verifier)_
