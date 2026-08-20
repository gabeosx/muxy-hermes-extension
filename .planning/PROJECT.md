# Hermes Agent Extension for Muxy

## What This Is

`hermes-agent` is a Muxy marketplace beta candidate for connecting to one existing Hermes Dashboard. It uses the Dashboard's advertised password provider, verified session cookies, fresh one-use WebSocket tickets, and panel-local JSON-RPC ownership to expose agent activity and controls, operations, schedules, and Kanban in native-feeling Muxy surfaces.

## Core Value

Give a user safe, authenticated Hermes control from Muxy across local, Docker, SSH-forwarded, trusted HTTPS, and Muxy SSH-workspace deployments without topology-specific client behavior or hidden credential exposure.

## Current State

- **v1.0 Development Proof shipped and archived:** 3 phases, 22 plans, 39/39 requirements, and all milestone verification gates passed.
- **Current implementation:** The post-v1.0 product migrated from the historical bearer/SSE Runs proof to Dashboard session authentication, one-use WebSocket tickets, JSON-RPC agent streaming, operations, schedules, and Kanban.
- **Current release status:** Not yet marketplace-ready. Marketplace metadata, release documentation, deterministic clean-copy validation, real topology qualification, and upstream submission remain active work.
- **Recorded tested tuple:** Muxy 1.5.0 (945) and Hermes 0.20.2. This is evidence, not a version lock or universal compatibility claim.

## Active Requirements

- Publish `hermes-agent@0.1.0` as a broad Muxy marketplace beta with accurate, frozen support claims.
- Support provider-advertised password login, saved Dashboard sessions and cookie rotation, fresh single-use WebSocket tickets, reconnect, agent streaming and controls, operations, schedules, and Kanban.
- Show OAuth/OIDC-only providers as unsupported and fail safely on incompatible Dashboard contracts.
- Remove production-dead bearer, SSE journal, capability-probe, recovery-evidence, and historical validation paths once import reachability proves they are unused.
- Prove reproducible clean builds, least privilege, secret safety, and deterministic release validation on Node 20 and the current development Node.
- Qualify local/Docker, real SSH forwarding, short-lived trusted HTTPS, and an actual Muxy SSH workspace with disposable, pinned infrastructure and verified cleanup.
- Satisfy local and upstream marketplace validation, dry-run packaging, review, security, UI, and Nyquist gates before submission.

## Out of Scope

- OAuth/OIDC login in the beta; those providers are displayed as unsupported.
- Password authentication on an unrestricted public endpoint. Direct HTTPS support is limited to trusted networks, VPNs, or operator-controlled access layers.
- Background run ownership, closed-panel approvals, notifications, or durable WebSocket ownership.
- Workspace path mapping, remote-workspace filesystem assumptions, or automatically passing a workspace path to Hermes.
- Universal Muxy/Hermes compatibility, inferred deployment detection, or topology-specific client branches.
- Telemetry, multiple connection profiles, infrastructure lifecycle management, or automatic Gateway installation/update.

## Constraints

- **Authentication:** Passwords remain transient. Only allowlisted Dashboard cookies may persist in Muxy's isolated per-extension storage; WebSocket tickets are one-use and transient.
- **Secrets:** Request secrets cross the curl boundary through stdin, never argv, URLs, workspace files, logs, receipts, diagnostics, screenshots, or bundles.
- **Transport:** Dashboard request/response calls use the minimum authenticated argv-form curl relay. Agent activity uses the Dashboard's WebSocket JSON-RPC contract with a fresh ticket for every connection attempt.
- **Lifecycle:** Live agent ownership is panel-local. Reopen/restart restores and verifies the Dashboard session, then mints a new ticket.
- **Compatibility:** Advertised provider and response contracts drive behavior. Incompatible or malformed contracts fail closed with bounded sanitized diagnostics.
- **Security:** No automatic approval. Password auth is documented only for trusted LAN/VPN/operator-controlled access. The Cloudflare Quick Tunnel is disposable qualification infrastructure, not deployment guidance.
- **UI:** Follow Muxy theme tokens, interface scale, control sizing, keyboard focus, accessibility labels, and reduced motion.
- **Packaging:** The extension ID is `hermes-agent`; the build copies `package.json`, README, icon, and listing screenshots into `dist/`.
- **Release:** Published versions are immutable. Rollback is disable/uninstall; corrections ship as `0.1.1` or later.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace the historical bearer/SSE proof with the shipped Dashboard session/JSON-RPC contract | The current Hermes Dashboard is the supported product surface and provides provider discovery, cookie sessions, and single-use WebSocket tickets | Implemented post-v1.0; marketplace cleanup now removes unreachable legacy paths |
| Publish under extension ID `hermes-agent` | The marketplace identity should be stable and product-facing | Fresh sign-in required; no cookie transfer from the old development namespace |
| Support password providers only in 0.1.0 | It closes a useful trusted-network beta without pretending OAuth support exists | OAuth/OIDC-only providers render as unsupported |
| Record, but do not enforce, Muxy 1.5.0 (945) and Hermes 0.20.2 | Exact evidence is useful; version gates would overstate what the evolving capability contract can guarantee | Incompatible contracts fail safely |
| Use a Docker-first disposable qualification lab | Reproducible pinned services, real SSH forwarding, and aggressive cleanup provide stronger release evidence than simulations | Quick Tunnel is fixture-only and contains no durable or sensitive data |
| Keep agent ownership panel-local | The Muxy background runtime is not the established WebSocket owner and closed-panel approvals are unsafe to imply | Reconnect and restart use authoritative session verification and fresh tickets |
| Request only command execution, panels/tabs, and isolated storage | These are the authorities used by the current product | No file, background, network-bridge, Docker, SSH, or telemetry authority in the marketplace manifest |

## Milestone History

- [v1.0 Development Proof](./milestones/v1.0-ROADMAP.md) — shipped 2026-08-20 with technical debt accepted for the post-phase Dashboard migration.
- **v1.1 Marketplace Beta Hardening** — active next milestone.

---
*Last updated: 2026-08-20 at the v1.0 milestone boundary.*
