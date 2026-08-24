---
quick_id: 260824-nwg
mode: quick
phase: quick-260824-nwg
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
description: Accept Copilot stop confirmation safety defaults
files_modified:
  - src/stop-confirmation.js
  - test/stop-confirmation.test.js
---

<objective>
Make the native stop-run confirmation explicitly default to the safe, non-destructive choice for both Return and Escape, and present it with warning styling.
</objective>

<context>
@AGENTS.md
@.agents/skills/muxy-extension/SKILL.md
@src/stop-confirmation.js
@test/stop-confirmation.test.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Make stop confirmation defaults explicit</name>
  <files>src/stop-confirmation.js, test/stop-confirmation.test.js</files>
  <action>Add `default: "Keep running"`, `cancel: "Keep running"`, and `style: "warning"` to the native confirmation options. Add a regression test that captures and asserts the complete options object while proving the safe choice does not invoke stop.</action>
  <verify>node --test test/stop-confirmation.test.js &amp;&amp; npm run build</verify>
  <done>Return and Escape are explicitly mapped to keeping the run active, the dialog reads as a warning, and the contract is covered by an executable test.</done>
</task>

</tasks>
