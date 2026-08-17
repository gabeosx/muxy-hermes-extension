---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-17T13:50:41.267Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/gateway-client.js |  | Real Muxy controlled-fixture streaming check remains Not verified until Plan 01-04. | open |  | 2026-08-17T13:50:41.267Z |  |

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
  }
]
````
