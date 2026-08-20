# v1.0 Development Proof Retrospective

**Shipped:** 2026-08-20
**Scope:** 3 phases, 22 plans, 27 tasks, 39 requirements

## What Shipped

The milestone established that Muxy could authenticate to Hermes, present streamed agent activity and controls, recover truthfully from lifecycle interruptions, and maintain a native-feeling panel. It also produced an important architecture result: the early bearer/SSE Runs proof was superseded after the milestone phases by Hermes Dashboard password authentication, allowlisted session-cookie persistence, fresh one-use WebSocket tickets, JSON-RPC agent control, an operations surface, schedules, and Kanban.

## What Worked

- Security boundaries were explicit from the start: credentials were kept out of argv, URLs, workspace files, diagnostics, and evidence.
- Fail-closed evidence rules prevented SSH, HTTPS, and remote-workspace simulations from becoming unsupported product claims.
- Disposable host and Docker fixtures exposed lifecycle and cleanup problems early.
- Native Muxy checks shaped focus, theme, scale, and panel-density behavior instead of treating UI validation as a final cosmetic pass.
- The final codebase reached 168 passing automated tests with no npm audit findings at the milestone boundary.

## What Was Inefficient

- The original direct-WebKit and bearer/SSE architecture generated substantial validators, fixtures, evidence formats, and recovery code that became production-dead after the Dashboard migration.
- Phase-era validators coupled release confidence to historical evidence rather than the current production import graph.
- Simulated SSH/HTTPS/remote-workspace rows were useful for falsifying unsafe claims, but they did not qualify those real deployment paths.
- Product documentation and the authoritative planning contract lagged the post-phase Dashboard migration.

## Lessons Applied to v1.1

- Validate the architecture that ships, not every architecture the project explored.
- Freeze narrow support claims around exact tested behavior and recorded versions without enforcing versions or implying universal compatibility.
- Make clean-copy reproducibility, least privilege, import reachability, secret scanning, and cleanup receipts first-class release gates.
- Use real mechanisms for topology claims: actual `ssh -L`, a trusted HTTPS/WebSocket edge, and an actual Muxy SSH workspace.
- Treat password auth as a trusted-network feature and make OAuth-only providers visibly unsupported.
- Keep marketplace assets, README content, manifest metadata, and distribution allowlists under the same deterministic validator as code.

## Technical Debt Accepted at Archive

- Historical v1.0 evidence and plans describe the bearer/SSE proof and remain preserved for auditability.
- The marketplace product still contains unreachable legacy Runs/SSE modules, tests, fixtures, and validators pending import-graph-backed deletion.
- Real direct HTTPS, SSH-forward, and Muxy SSH-workspace qualification remain release blockers for v1.1 rather than claims of v1.0.

## Next Milestone

Marketplace Beta Hardening: contract cleanup, deterministic release validation, Docker/native qualification, and marketplace submission.
