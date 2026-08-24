---
quick_id: 260823-cdh
mode: quick-full
phase: quick-260823-cdh
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
description: Fix per-project Hermes board mappings with global Dashboard authentication and explicit per-project mapping/view controls
entrypoint_only: true
files_modified: []
execution_slices:
  - id: 260823-cdh-01
    wave: 1
    depends_on: []
    tasks: [1]
    files_modified:
      - src/muxy-tabs.js
      - src/session-broker.js
      - src/board/app.js
      - test/session-broker.test.js
      - test/board-ui-contract.test.js
    estimate:
      tokens: 18000
      raw_tokens: 18000
      confidence: low
  - id: 260823-cdh-02
    wave: 2
    depends_on: [260823-cdh-01]
    tasks: [2, 3]
    files_modified:
      - src/panel/app.js
      - src/dashboard-operations.js
      - package.json
      - test/dashboard-operations.test.js
      - test/ui-contract.test.js
      - README.md
      - scripts/validate-dist.mjs
      - scripts/qualify-release.mjs
      - test/qualification-lab.test.js
      - assets/screenshots/screenshot-4.png
    estimate:
      tokens: 27000
      raw_tokens: 27000
      confidence: low
estimate:
  tokens: 45000
  raw_tokens: 45000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "Dashboard authentication is stored once in session.dashboard.v2 with no board field, while each stable active Muxy project ID owns an independent board.mapping.v1.<projectID> record (D-01, D-02)."
    - "Two Muxy projects can map different Hermes boards, restore them independently across tab closure and Muxy restart, and share a mapping across worktrees of the same project without project names or worktree paths becoming identities (D-02, D-03, D-11)."
    - "A user can view any available board without changing the active project's mapping; only the explicit Map to this project action replaces that project's mapping, and the board selector remains available while a board is open (D-06)."
    - "Mappings survive logout and session expiry, are restored only for the exact normalized Dashboard URL, and stale mapped boards are cleared with an explanatory return to the picker (D-05, D-07)."
    - "The Agent panel reads only the active project's mapping, refreshes it on focus, and with no mapping continues global health/schedule/agent work without requesting or showing queue, worker, or diagnostic data from a default or another project's board (D-08, D-09)."
    - "The marketplace package requests only the added projects:read authority, keeps version 0.1.0, documents the project-ID mapping privacy boundary, validates the new contract, and includes a sanitized current project-board capture (D-03, D-10, D-12)."
    - "No legacy mapping migration is implemented, no external marketplace pull request is updated, and every pre-existing unrelated untracked file remains untouched and unstaged (D-04, D-12, D-13)."
  artifacts:
    - path: "src/session-broker.js"
      provides: "Separated global Dashboard-session and validated per-project board-mapping storage interfaces"
    - path: "src/muxy-tabs.js"
      provides: "Validated active-project resolver based on the stable Muxy project ID"
    - path: "src/board/app.js"
      provides: "Persistent per-project mapping and session-only view controls in the board tab"
    - path: "src/dashboard-operations.js"
      provides: "Global-only operations request plan when no board is mapped"
    - path: "src/panel/app.js"
      provides: "Active-project mapping synchronization and unmapped-project panel state"
    - path: "package.json"
      provides: "Least-privilege projects:read manifest declaration with version 0.1.0 unchanged"
    - path: "scripts/qualify-release.mjs"
      provides: "Two-board native fixture and required two-project mapping observation"
    - path: "assets/screenshots/screenshot-4.png"
      provides: "Sanitized 1600x1000 native board capture showing the mapping controls"
  key_links:
    - from: "src/board/app.js"
      to: "src/muxy-tabs.js"
      via: "active-project resolution before any mapping read or write"
      pattern: "resolveActiveProject"
    - from: "src/board/app.js"
      to: "src/session-broker.js"
      via: "explicit mapping read/save/clear calls separated from Dashboard-session persistence"
      pattern: "(read|save|clear)BoardMapping"
    - from: "src/panel/app.js"
      to: "src/session-broker.js"
      via: "focus-time read for the current project and exact Dashboard URL"
      pattern: "readBoardMapping"
    - from: "src/panel/app.js"
      to: "src/dashboard-operations.js"
      via: "null board selection removes board-scoped requests and stale board projections"
      pattern: "setBoard"
    - from: "package.json"
      to: "scripts/validate-dist.mjs"
      via: "identical frozen least-privilege permission list in source and dist"
      pattern: "projects:read"
---

<objective>
Make the Hermes board relationship belong to the active Muxy project instead of the extension globally.

Purpose: A project board is project context, while Dashboard authentication is extension-wide context. Separating those lifetimes prevents one project's board choice from overwriting or leaking into another project and keeps the Agent panel truthful when a project has not been mapped.

Output: Validated active-project resolution, separated storage interfaces, explicit view/map board controls, unmapped panel behavior, least-privilege packaging/docs updates, automated coverage, a two-board native fixture, and a real two-project Muxy acceptance record (D-01 through D-13).

Execution: Run Slice `260823-cdh-01` first and commit its focused, passing project-board mapping capability. Run Slice `260823-cdh-02` only from that commit; it consumes the new resolver/broker interfaces, adds the strictly scoped panel and release-facing changes, then runs the complete release and native gates. Both slices live in this primary quick artifact because the quick workflow materializes and dispatches `260823-cdh-PLAN.md` only; no subordinate PLAN files are created.
</objective>

<execution_context>
@/Users/gabe/.codex/gsd-core/workflows/execute-plan.md
@/Users/gabe/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@.agents/skills/muxy-extension/SKILL.md
@.planning/PROJECT.md
@.planning/STATE.md
@package.json
@src/muxy-tabs.js
@src/session-broker.js
@src/board/app.js
@src/panel/app.js
@src/dashboard-operations.js
@test/session-broker.test.js
@test/board-ui-contract.test.js
@test/dashboard-operations.test.js
@test/ui-contract.test.js
@scripts/validate-dist.mjs
@scripts/qualify-release.mjs
@test/qualification-lab.test.js
@README.md

<decisions>
- D-01: Store the one global Dashboard URL and authenticated cookie session in `session.dashboard.v2`; `readDashboard()` and `saveDashboard()` contain authentication only and never a board.
- D-02: Store each mapping in `board.mapping.v1.<projectID>` as validated `{ baseUrl, board }`, keyed by the stable active Muxy project ID.
- D-03: Resolve the active project through `window.muxy.projects.list()` and add only `projects:read`; project renames and worktree switches reuse the stable project ID and therefore the same mapping.
- D-04: Do not migrate `session.dashboard.v1` or its board. The obsolete record is ignored and may be deleted; no backward-compatibility path is required.
- D-05: Clearing, expiring, or logging out the Dashboard session does not clear board mappings. A mapping is usable only when its normalized `baseUrl` exactly equals the authenticated Dashboard URL; a mismatch returns no mapping without deleting the other Dashboard's record.
- D-06: Keep current viewed board separate from mapped board. Selection and `View board` are session-only; `Map to this project` alone writes/replaces the active project's mapping; the selector remains reachable while viewing a board.
- D-07: If the mapped slug is absent from a freshly authenticated catalog, clear that project's mapping and return to the picker with explanatory copy. Apply the same recovery after a mapped board disappears while open.
- D-08: The Agent panel reads only the active project's mapping. When unmapped it keeps agent connectivity plus global health and scheduled jobs, skips Kanban stats/workers/diagnostics requests, and presents `Choose project board` instead of board data.
- D-09: Keep focus-time panel synchronization: re-resolve the active project, re-read its exact-URL mapping, clear any prior project projection immediately, and refresh applicable operations without restarting Muxy.
- D-10: Update permission/package validation, README Permissions/Privacy/Kanban copy, native qualification contracts, and the real marketplace project-board screenshot.
- D-11: Prove independent Project A/Alpha and Project B/Beta mappings across close/reopen, Muxy restart, rename, and worktree switch; prove temporary viewing and explicit remapping affect only the intended project.
- D-12: Keep `hermes-agent` at version `0.1.0` and do not create, update, push, merge, or publish an external marketplace pull request.
- D-13: Preserve all unrelated untracked files and stage/commit only explicit plan files.
</decisions>

<working_tree_guard>
At planning time the following user-owned paths were untracked: `.agents/`, `.gsd/`, `.planning/debug/cron-next-run-accuracy.md`, `.planning/research/.cache/6ff98be1089b1a6d49a4632efa7aba1b0039997367c4fae0f57b8ca08729baf2.json`, and `skills-lock.json`. Do not edit, remove, stage, or commit them. Re-check `git status --short` before each atomic commit and use explicit pathspecs per D-13.
</working_tree_guard>
</context>

<execution_slices>

<slice id="260823-cdh-01" wave="1">
  <objective>Deliver and focus-verify active-project identity, separated global-auth/per-project-mapping storage, and the complete board-tab view-versus-map behavior before any panel or release-package consumer changes.</objective>
  <depends_on>None.</depends_on>
  <tasks>Task 1 only.</tasks>
  <files_modified>src/muxy-tabs.js, src/session-broker.js, src/board/app.js, test/session-broker.test.js, test/board-ui-contract.test.js</files_modified>
  <verification>Task 1's focused Node tests and production build must pass, then commit only these five files. A failed focused gate blocks Slice 02.</verification>
</slice>

<slice id="260823-cdh-02" wave="2">
  <objective>Consume Slice 01's stable resolver/storage interfaces in the panel, enforce null-board request scoping, and finish the manifest, validators, documentation, two-board native proof, screenshot, and full release gates.</objective>
  <depends_on>260823-cdh-01 must be committed with its focused verification passing.</depends_on>
  <tasks>Tasks 2 and 3, committed atomically in that order.</tasks>
  <files_modified>src/panel/app.js, src/dashboard-operations.js, package.json, test/dashboard-operations.test.js, test/ui-contract.test.js, README.md, scripts/validate-dist.mjs, scripts/qualify-release.mjs, test/qualification-lab.test.js, assets/screenshots/screenshot-4.png</files_modified>
  <verification>Task 2's focused/full Node and build gates must pass before Task 3; Task 3 then owns `npm run validate`, automated qualification, native two-project acceptance, screenshot inspection, and cleanup proof.</verification>
</slice>

</execution_slices>

<tasks>

<task type="tracer" tdd="true" slice="260823-cdh-01">
  <name>Task 1: Map one active Muxy project without coupling its temporary board view</name>
  <files>src/muxy-tabs.js, src/session-broker.js, src/board/app.js, test/session-broker.test.js, test/board-ui-contract.test.js</files>
  <behavior>
    - Test 1: `resolveActiveProject` awaits `muxy.projects.list()`, returns one bounded `{ id, name }` for the sole `isActive === true` entry, and fails closed for an unavailable bridge, malformed list, invalid ID, or ambiguous/no active project; a rename or worktree change with the same ID preserves identity per D-03.
    - Test 2: Dashboard auth round-trips through `session.dashboard.v2` without a board, and an obsolete `session.dashboard.v1` value is never restored or promoted per D-01 and D-04.
    - Test 3: Project A and Project B can concurrently save/read distinct `{ baseUrl, board }` values, mutation of returned objects cannot alter storage, invalid IDs/URLs/slugs are rejected, clearing A leaves B intact, and a URL mismatch returns null without deleting A's stored mapping per D-02 and D-05.
    - Test 4: The board source exposes `View board` and `Map to this project`, keeps the selector available in picker and ready states, and selection/view actions contain no mapping write while the explicit mapping action writes the currently viewed slug per D-06.
    - Test 5: A mapped catalog slug opens on restore; no mapping stops at the picker; a stale mapping is cleared with explanatory copy rather than falling back and silently remapping to Hermes's current/first board per D-07.
  </behavior>
  <action>Write the failing broker/project/UI contract tests first. Add a `resolveActiveProject(muxy)` export beside the existing project-board tab helpers: await `projects.list()`, accept only one active entry, validate a nonempty bounded stable identifier and bounded display name, and return only `{ id, name }`; never key by name, workspace, worktree, or path. Split `PersistentSessionBroker` storage into the exact D-01/D-02 keys and shapes, using normalized Dashboard URLs and board slugs at the boundary. Add `readBoardMapping({ projectID, baseUrl })`, `saveBoardMapping({ projectID, baseUrl, board })`, and `clearBoardMapping({ projectID })` to `SessionBrokerClient`; keep mapping records independent and clone all stored/returned values. `dashboard.clear` deletes only global auth, while obsolete combined storage is ignored and best-effort deleted without migration per D-04. Refactor `HermesProjectBoard` to resolve the project before mapping access and maintain separate selected, viewed, and mapped slugs. An exact-URL valid mapping auto-opens after verified session/catalog restore; an unmapped project shows the complete picker. Keep the selector and `View board` reachable while ready, make viewing session-only, and make `Map to this project` the only path that saves/replaces the mapping for the resolved project. Persist rotated auth separately after authenticated requests. On a stale saved slug or a mapped-board 404 followed by a fresh catalog that no longer includes it, clear only that project's mapping and return to the picker with `That mapped board is no longer available. Choose another board.` Preserve mappings on logout/session expiry and leave them inaccessible, not deleted, on a different Dashboard URL (D-01 through D-07, D-13).</action>
  <verify>
    <automated>node --test test/session-broker.test.js test/board-ui-contract.test.js &amp;&amp; npm run build</automated>
  </verify>
  <done>One project can restore its mapped board end to end, browse another board without changing the mapping, explicitly remap itself, and recover safely from a stale mapping; project identity, auth, and mapping storage contracts are behavior-tested and no other project key is touched (D-01 through D-07, D-13).</done>
</task>

<task type="auto" tdd="true" slice="260823-cdh-02">
  <name>Task 2: Scope Agent-panel operations to the active project's mapped board</name>
  <files>src/panel/app.js, src/dashboard-operations.js, package.json, test/dashboard-operations.test.js, test/ui-contract.test.js</files>
  <precondition>Slice 260823-cdh-01 is committed and its focused tests/build pass; `resolveActiveProject` plus the Dashboard/mapping broker methods are available with the exact D-01 through D-07 contracts.</precondition>
  <behavior>
    - Test 1: `DashboardOperationsClient({ board: null }).load()` requests only `/api/status` and `/api/cron/jobs?profile=all`; no URL under `/api/plugins/kanban` is constructed or requested and global successes produce a ready/partial result based only on applicable requests per D-08.
    - Test 2: Setting a valid board enables stats, active-worker enrichment, and diagnostics with that explicit `board=` query; setting the board back to null removes all three request classes on the next load and cannot retain the previous queue/diagnostic projection per D-08.
    - Test 3: Panel restore and login resolve the current project and read only its exact-URL mapping while Dashboard auth/agent connectivity remain global; logout and expiry clear auth only per D-01, D-05, and D-08.
    - Test 4: Focus synchronization re-resolves project identity, applies that project's mapping or null, resets the operations snapshot before refresh, and never flashes the prior project's queue data per D-09.
    - Test 5: An unmapped signed-in panel still renders health, scheduled jobs, and the agent composer, replaces queue/diagnostic content with a `Choose project board` action, and never labels deliberately unrequested board status as a network failure per D-08.
    - Test 6: The manifest remains version 0.1.0 with the existing permission set plus `projects:read` only; it gains no project-write, worktree, workspace, file, event, background, dependency, or telemetry authority per D-03 and D-12.
  </behavior>
  <action>Write the failing operations and UI/manifest contract cases first. Make `DashboardOperationsClient.load()` build its sequential request list dynamically: health and scheduled jobs always apply, while queue stats, optional workers, and diagnostics exist only when `this.board` is a validated non-null slug. Calculate ready/partial/unavailable from the applicable surfaces so the intentional global-only state is truthful. In `HermesGatewayPanel`, resolve and retain the current `{ id, name }`, read `readBoardMapping({ projectID, baseUrl })` after session restore/login, and construct/update operations with only that mapped board. Keep the Dashboard gateway, agent controller, health, schedules, and composer independent of mapping. When no mapping exists, render a project-aware empty queue area with a `Choose project board` button that opens the existing project board tab; omit board attention/diagnostic counts and preserve global job/health attention. On focus, re-resolve the project, re-read its mapping, reset stale board-derived snapshot data before calling `setBoard(mapped?.board ?? null)`, then refresh. Change Dashboard persistence calls to `{ baseUrl, auth }` only and ensure logout/session-expiry paths never clear mappings. Add `projects:read` to `package.json` and its frozen UI contract expectation in the established permission order, with no other manifest or version change (D-01, D-03, D-05, D-08, D-09, D-12, D-13).</action>
  <verify>
    <automated>node --test test/dashboard-operations.test.js test/ui-contract.test.js &amp;&amp; npm test &amp;&amp; npm run build</automated>
  </verify>
  <done>The Agent panel stays globally authenticated and useful in every project, but only the active project's exact mapping can activate board operations; unmapped projects issue zero Kanban operations requests and display no stale/default/foreign board data (D-03, D-05, D-08, D-09, D-12, D-13).</done>
</task>

<task type="auto" slice="260823-cdh-02">
  <name>Task 3: Freeze the per-project contract in docs, packaging, native qualification, and screenshots</name>
  <files>README.md, scripts/validate-dist.mjs, scripts/qualify-release.mjs, test/qualification-lab.test.js, assets/screenshots/screenshot-4.png</files>
  <precondition>Task 2's focused tests, complete `npm test`, and production build pass with only `projects:read` added and null-board operations proven request-free.</precondition>
  <action>Update README Kanban/install copy to explain that each Muxy project explicitly maps one Hermes board, `View board` is temporary, `Map to this project` is persistent, and worktrees share the parent project's mapping. In Permissions, disclose read-only access to the active project's stable ID/name; in Privacy, state that auth is global while the extension stores the stable project ID, Dashboard URL, and board slug for each mapping, and never reads or stores project/worktree paths or workspace files. Update `REQUIRED_PERMISSIONS` in `validate-dist.mjs` to the exact manifest list including `projects:read`, retaining version 0.1.0 and every deterministic source/dist assertion. Extend the disposable native fixture to create two sanitized boards, `marketplace-beta` and `marketplace-secondary`, and add `per_project_board_mapping` to `REQUIRED_NATIVE_CATEGORIES`; update the qualification test so missing that category or either fixture board fails. Run the native hold against Muxy 1.5.0 (945), prove D-11 with two local Muxy projects, and replace `assets/screenshots/screenshot-4.png` with a real sanitized 1600x1000 Muxy capture that visibly includes the board selector, current project mapping state, and explicit mapping action while preserving native theme/scale/focus conventions. Do not synthesize product UI, expose fixture credentials/paths, alter the other listing images, change the version, or touch the external marketplace PR (D-03, D-10, D-11, D-12, D-13).</action>
  <verify>
    <automated>node --test test/qualification-lab.test.js &amp;&amp; npm test &amp;&amp; npm run validate &amp;&amp; npm run qualify</automated>
    <human-check>Run `npm run qualify:native` and wait for `.qualification/active.json`. Build/reload the extension in Muxy 1.5.0 (945), accepting only the new read-only project permission. Against the held Dashboard, map local Project A to `marketplace-beta` and Project B to `marketplace-secondary`; close/reopen each board tab, switch A/B repeatedly, and restart Muxy to confirm each restores only its own board. In A, view the secondary board and confirm reopening still restores beta; explicitly remap A to secondary and confirm B is unchanged. Rename A and switch its worktree, confirming the mapping follows the stable project. Log out and back into the same Dashboard, confirming both mappings return; use a different Dashboard URL and confirm neither mapping is applied. Verify an unmapped project shows health/schedules plus `Choose project board` and makes no Kanban requests. Record `per_project_board_mapping` with the other required observations in `.qualification/native-observations.json`, run `npm run qualify:native:complete`, allow the native hold to finish and clean up, then inspect the new screenshot at 1600x1000 for legible controls, native Muxy appearance, and absence of private data.</human-check>
  </verify>
  <done>The documented and packaged extension declares exactly the authority and persistence it uses, the deterministic release gate passes, the real board screenshot reflects explicit mapping, and native evidence proves two projects retain independent mappings across all approved lifecycle cases without any marketplace publication action (D-03, D-10, D-11, D-12, D-13).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Muxy project registry to extension webview | Project entries and active markers identify which mapping may be read or changed; names and paths must not become authorization keys. |
| Extension webviews to `muxy.storage` | Global Dashboard cookies and per-project board metadata share an extension namespace but require separate keys, validation, and deletion lifecycles. |
| Project mapping to Hermes Kanban endpoints | A wrong, absent, or stale mapping could disclose another project's queue state or mutate the wrong board. |
| Native fixture and screenshot to public marketplace package | Test credentials, project paths, worktree names, and private board data must not enter retained evidence or listing assets. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-CDH-01 | Information Disclosure | `HermesGatewayPanel` / `DashboardOperationsClient` | high | mitigate | Fail closed to null when no exact active-project mapping exists, issue no Kanban request, reset prior projections before refresh, and test the complete request URL list. |
| T-CDH-02 | Spoofing | `resolveActiveProject` | medium | mitigate | Require exactly one valid active entry from `muxy.projects.list()`, key only by stable ID, and ignore mutable name/worktree/workspace/path fields. |
| T-CDH-03 | Tampering | `PersistentSessionBroker` mapping actions | high | mitigate | Validate and bound project IDs, normalized Dashboard URLs, and board slugs; derive one mapping key per project; deep-clone inputs/outputs; test concurrent and cross-key isolation. |
| T-CDH-04 | Information Disclosure | Dashboard logout/session expiry | high | mitigate | Clear allowlisted cookies only from the global session key, retain mapping metadata without auth material, and require exact base-URL equality before reuse. |
| T-CDH-05 | Repudiation | Board selector and map action | medium | mitigate | Keep viewing and mapping as separately labeled controls, display the active project/mapped state, and write only on the explicit mapping action. |
| T-CDH-06 | Tampering | `package.json` to `dist/package.json` | medium | mitigate | Freeze the exact permission list/version, require source/dist manifest equality and deterministic builds, and add no package dependency or background/event authority. |
| T-CDH-07 | Information Disclosure | Native qualification and screenshot | medium | mitigate | Use disposable sanitized board fixtures, retain only required observation categories and screenshot hashes, visually inspect the exact PNG, and preserve existing secret/path scans. |
</threat_model>

<verification>
1. `git status --short` shows every path in `<working_tree_guard>` still present and unstaged; only explicit plan files are modified or added.
2. `node --test test/session-broker.test.js test/board-ui-contract.test.js test/dashboard-operations.test.js test/ui-contract.test.js test/qualification-lab.test.js`
3. `npm test`
4. `npm run build`
5. `npm run validate` proves package version 0.1.0, source/dist manifest equality, the exact permission list, import reachability, secret safety, deterministic double-builds, and clean-copy parity.
6. `npm run qualify` ends with `passed_supported_beta_matrix` and cleanup proof, retaining no active marker, secret, listener, container, network, volume, SSH process, or task root.
7. Complete Task 3's native two-project human check and `view_image` inspection; missing `per_project_board_mapping`, either fixture board, or the required screenshot blocks completion.
8. `git diff --check --` passes for explicit modified text files. Confirm `git diff -- package.json package-lock.json` changes only the permission entry in `package.json` and leaves both version fields at `0.1.0`.
9. Do not run marketplace sparse-checkout, fork, push, PR, merge, tag, release, or publish commands per D-12.
</verification>

<source_audit>
## Multi-Source Coverage Audit

| SOURCE | ID | Feature / Requirement | Plan coverage | Status | Notes |
|--------|----|-----------------------|---------------|--------|-------|
| GOAL | quick | Per-project Hermes board mappings with global Dashboard authentication | Tasks 1-3 | COVERED | Storage, both surfaces, packaging, and native proof are included. |
| REQ | none | ROADMAP/REQUIREMENTS assignment | none | EXCLUDED | This is an approved ad-hoc quick task and has no phase requirement IDs; it does not alter Phase 7 marketplace-submission requirements. |
| RESEARCH | Muxy storage | Extension storage is shared across surfaces and survives restarts | Task 1 | COVERED | Separate global and project-scoped keys use the existing isolated store. |
| RESEARCH | Muxy lifecycle | Panels/webviews are recreated on project switches; durable project state must be persisted | Tasks 1-2 | COVERED | Stable project ID mappings restore and focus-time synchronization clears stale projections. |
| RESEARCH | Muxy permissions | Declare only APIs actually used | Tasks 2-3 | COVERED | `projects:read` is the sole added authority and is frozen by validators. |
| RESEARCH | Packaging | Build output must contain the source-identical manifest and assets | Task 3 | COVERED | Existing deterministic dist/clean-copy gates remain mandatory. |
| CONTEXT | D-01 | Global auth in session.dashboard.v2 without board | Tasks 1-2 | COVERED | Broker plus both persistence consumers change together. |
| CONTEXT | D-02 | board.mapping.v1.<projectID> values | Task 1 | COVERED | Independent keys and exact `{ baseUrl, board }` validation are tested. |
| CONTEXT | D-03 | Stable active project ID; projects:read only; worktrees share mapping | Tasks 1-3 | COVERED | Resolver, manifest, docs, and native lifecycle proof cover it. |
| CONTEXT | D-04 | No legacy migration | Task 1 | COVERED | Obsolete storage is ignored/deleted, never promoted. |
| CONTEXT | D-05 | Mapping survives auth clearing; exact Dashboard URL scope | Tasks 1-3 | COVERED | Automated cross-URL/logout tests plus native same/different URL check. |
| CONTEXT | D-06 | Temporary viewing separate from explicit mapping; selector retained | Task 1 | COVERED | Separate state and labeled actions are implemented/tested. |
| CONTEXT | D-07 | Stale mapped board clears to picker | Task 1 | COVERED | Catalog restore and runtime disappearance paths are specified. |
| CONTEXT | D-08 | Panel uses mapped board only; unmapped skips Kanban | Task 2 | COVERED | Request construction and UI projections are behavior-tested. |
| CONTEXT | D-09 | Focus-time panel mapping sync | Task 2 | COVERED | Re-resolve/read/reset/refresh sequence is explicit. |
| CONTEXT | D-10 | Permissions, docs/privacy, validation, screenshot | Tasks 2-3 | COVERED | All named surfaces are explicit files and gates. |
| CONTEXT | D-11 | Tests and native two-project acceptance | Tasks 1-3 | COVERED | Automated isolation plus required native observation. |
| CONTEXT | D-12 | Version 0.1.0; no external marketplace PR | Tasks 2-3 and verification | COVERED | Frozen validators and mutation boundary prohibit external work. |
| CONTEXT | D-13 | Preserve unrelated untracked files | All tasks | COVERED | Working-tree guard and explicit pathspec discipline apply throughout. |
| CONTEXT | deferred | Legacy mapping migration/backward compatibility | none | EXCLUDED | The user explicitly removed this requirement because the extension has no users yet. |
| CONTEXT | deferred | External marketplace PR update/publication | none | EXCLUDED | Requires separate authorization and is expressly outside this quick task. |
</source_audit>

<success_criteria>
1. Project A and Project B retain different boards under distinct stable-ID keys; project rename/worktree changes do not change the key, while temporary board viewing never changes either mapping.
2. Dashboard auth contains no board and clears independently; mappings survive logout/session expiry but do not cross Dashboard URLs or silently fall back when stale.
3. The board tab always offers an available-board selector, separates `View board` from `Map to this project`, opens a valid mapping on restore, and returns stale mappings to an explanatory picker.
4. The Agent panel never requests or displays Kanban data without the active project's mapping, yet global health, schedules, live agent work, and the board-selection action remain available.
5. `projects:read` is the only permission added; version remains 0.1.0; docs, privacy copy, deterministic validation, two-board qualification fixture, and the real 1600x1000 board screenshot match the implemented behavior.
6. Focused tests, the full test/build/validate/qualify gates, native two-project acceptance, screenshot inspection, and cleanup proof all pass; unrelated user files remain untouched and no external marketplace mutation occurs.
</success_criteria>

<output>
Create `.planning/quick/260823-cdh-fix-per-project-hermes-board-mappings-wi/260823-cdh-SUMMARY.md` when execution and verification complete.
</output>
