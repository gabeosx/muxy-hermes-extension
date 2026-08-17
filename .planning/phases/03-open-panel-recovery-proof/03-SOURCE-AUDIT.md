# Phase 3 Multi-Source Coverage Audit

| Source | ID | Feature / requirement | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Truthful, evidence-backed account of interrupted runs while the panel is open or recreated | 03-01, 03-02 | COVERED | Runtime behavior ships in Plan 01; inspectable proof ships in Plan 02. |
| REQ | RECV-01 | Bounded reconnect attempts with backoff while open | 03-01 | COVERED | Initial observer plus exactly two serialized reattach attempts. |
| REQ | RECV-02 | Status reconciliation after every interruption | 03-01 | COVERED | Status precedes every retry/terminal/exhaustion decision. |
| REQ | RECV-03 | Close/reopen guidance and pinned-Gateway recovery behavior | 03-01, 03-02 | COVERED | Fresh credentials + manual Run ID status recovery; native Docker/Muxy exercise. |
| REQ | RECV-04 | Distinguishable failure evidence without topology detection | 03-02 | COVERED | Named scenario and observed behavior are separate fields; remote analogues stay Unverified. |
| REQ | RECV-05 | Warn when event history cannot be recovered | 03-01, 03-02 | COVERED | Warning persists after success/failure and appears in runtime plus evidence UI. |
| REQ | DEPL-02 | Host-native loopback fixture | 03-02 | COVERED | Existing harness launches the explicit pinned temporary Hermes runtime with fresh HOME/workspace, native Muxy capability + incremental Runs proof, version capture, and verified cleanup; not-run does not complete the task. |
| REQ | DEPL-03 | Docker published loopback plus unreachable/interrupted behavior | 03-02 | COVERED | Native disposable Docker/Muxy run plus one-shot interruption proxy and refusal evidence. |
| REQ | DEPL-04 | Simulated SSH loss/restoration remains Unverified | 03-02 | COVERED | Scenario tests the observed transport signature only. |
| REQ | DEPL-05 | Simulated HTTPS/proxy auth/TLS/buffering remains Unverified | 03-02 | COVERED | Evidence names proxy behavior without a remote-HTTPS support claim. |
| REQ | DEPL-06 | Simulated remote workspace sends no workspace path | 03-02 | COVERED | Schema/request tests reject workspace paths and force Unverified. |
| REQ | EVID-01 | Versioned versions/capabilities/SSE/controls/recovery evidence | 03-02 | COVERED | Separate recovery schema preserves existing transport eligibility contract. |
| RESEARCH | — | Same-panel fresh parser observer with two reattach attempts | 03-01 | COVERED | Fixed delay sequence is injected and testable. |
| RESEARCH | — | Status-only recreated-panel recovery | 03-01 | COVERED | No automatic recreated-panel event subscription. |
| RESEARCH | — | One stream owner; await cleanup before reattach | 03-01 | COVERED | Serialized observer lifecycle with generation invalidation. |
| RESEARCH | — | Clear stale approval state after interruption | 03-01 | COVERED | Approval reappears only from a new event. |
| RESEARCH | — | Exact safe recovery evidence projection | 03-02 | COVERED | Dedicated schema rejects raw fields and high-entropy content. |
| RESEARCH | — | Native host + Docker proof plus forced-Unverified remote rows | 03-02 | COVERED | Both real loopback rows require actual native Muxy observations and cleanup; remote analogues remain simulated and nonpositive. |
| CONTEXT | — | No Phase 3 CONTEXT.md exists | — | EXCLUDED | Orchestrator-supplied fast-path decisions are incorporated directly in both plans; there are no D-XX decisions to cite. |

## Result

All goal, phase requirement, research, and available context items are planned. Deferred durable ownership, token persistence, background notifications, topology detection, Muxy/Hermes source changes, workspace path mapping, and lossless replay remain excluded by source scope.
