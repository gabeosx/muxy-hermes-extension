---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-08-17T18:00:16.601Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/gateway-client.js |  | Real Muxy controlled-fixture streaming check remains Not verified until Plan 01-04. | open |  | 2026-08-17T13:50:41.267Z |  |
| 2 | 01 | unrun-verify | .planning/phases/01-verified-gateway-connectivity/01-02-PLAN.md |  | Task 2 Muxy visual inspection across themes, scales, keyboard navigation, narrow layout, and reduced motion remains outstanding. | open |  | 2026-08-17T14:07:48.415Z |  |
| 3 | 01 | unrun-verify | src/panel/app.js |  | Real Muxy panel verification of five-row evidence rendering, focus, copy/view actions, and final dist remains required. | open |  | 2026-08-17T18:00:16.601Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/gateway-client.js",
    "line": null,
    "description": "Real Muxy controlled-fixture streaming check remains Not verified until Plan 01-04.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T13:50:41.267Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-verified-gateway-connectivity/01-02-PLAN.md",
    "line": null,
    "description": "Task 2 Muxy visual inspection across themes, scales, keyboard navigation, narrow layout, and reduced motion remains outstanding.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T14:07:48.415Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/panel/app.js",
    "line": null,
    "description": "Real Muxy panel verification of five-row evidence rendering, focus, copy/view actions, and final dist remains required.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T18:00:16.601Z",
    "resolved_at": null
  }
]
````
