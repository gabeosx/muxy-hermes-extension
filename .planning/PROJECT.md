# Hermes Agent Extension for Muxy

## What This Is

A development-only Muxy extension that proves a user with an existing Hermes Gateway can securely connect from a native-feeling Muxy panel, start a run, observe its streamed activity, and use the run controls the Gateway advertises. The same client contract must work across host-native, local Docker, SSH-forwarded, direct HTTPS, and remote-Muxy-workspace deployments. V1 is a transport and control-surface proof, not a polished general-purpose chat client or a multi-repository integration project.

## Core Value

Prove secure, authenticated, streamed Hermes run control across representative Hermes deployment shapes inside a native-feeling Muxy panel before building the surrounding product.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] A publish-valid npm/Vite Muxy extension can be built and loaded unpacked.
- [ ] A user can provide one development Gateway URL and bearer token at panel load without the token being embedded or persisted.
- [ ] The same URL/token client contract works without topology-specific branches for host-native, Docker-published, SSH-forwarded, and direct HTTPS Gateways; a remote Muxy workspace changes only workspace identity, not transport.
- [ ] The panel can prove direct authenticated WebKit connectivity with an exact, non-wildcard CORS origin.
- [ ] Connection diagnostics distinguish malformed URL, reachability, DNS, TLS, CORS, authentication, timeout, stream interruption, and protocol failures using observed facts without claiming to detect or manage a deployment.
- [ ] The panel discovers `/v1/capabilities` and exposes only run controls advertised by the connected Gateway.
- [ ] A user can start a run and observe streamed token, tool, approval, and terminal lifecycle events emitted by the pinned Gateway.
- [ ] A user can answer an approval and can steer or stop the run when those capabilities are advertised.
- [ ] A user can close and reopen the panel during an active run and receive documented replay, polling-reconciliation, and token re-entry behavior.
- [ ] The proof captures versioned Muxy/Hermes protocol fixtures and produces an explicit supported, unsupported, or unverified verdict for host-native, local Docker, SSH local-forward, direct remote HTTPS, and remote-workspace cases.
- [ ] The panel follows Muxy's native theme, sizing, focus, reduced-motion, and least-privilege conventions.

### Out of Scope

- Multiple connection profiles, profile CRUD, import/export, and persisted settings — defer until direct transport is proven.
- Workspace path mapping and active-worktree execution — depend on a later validated per-run `cwd` contract.
- Hermes repository changes — v1 is extension-only.
- Any Muxy source-code change, including agent/provider registration — v1 is extension-only; registration is reconsidered only if later native Agent Focused status actually requires it.
- Durable background run ownership, closed-panel status, and out-of-panel approval notifications — require a transport owner the current Muxy background runtime does not provide.
- Terminal/TUI launchers — not required to validate embedded Gateway transport.
- Marketplace publication, production credential storage, and infrastructure lifecycle management — premature for a development proof.
- A polished general-purpose chat client — v1 validates feasibility and control semantics only.

## Context

Hermes Gateway already exposes the essential backend surfaces: bearer-authenticated capability discovery, run submission and status, SSE run events, approvals, steer, stop, persistent response/session primitives, skills, and toolsets. The remaining existential question is whether Muxy's `WKWebView` extension panel can safely make an authenticated streaming connection to a local or otherwise reachable Gateway. Muxy's native `muxy.http.fetch` blocks loopback/private hosts and buffers response bodies, so it cannot carry a normal local SSE stream.

The panel may be recreated when projects switch, and Muxy's long-lived extension background runtime does not expose native HTTP streaming. V1 therefore owns run state, the bearer token, status, and approvals only while the panel is open. Reopening requires token re-entry and explicit reconciliation against the Gateway.

The long-term product may later add connection profiles, workspace mappings, validated per-run `cwd`, durable background status, a Hermes lifecycle plugin, Muxy provider registration, secret storage, or a local-service streaming bridge. None of those may expand v1 before the deployment validation verdicts. Deployment variety itself is not deferred: v1 must test the single contract across the supported classes even though profile persistence and infrastructure management remain out of scope.

If direct authenticated panel streaming cannot be made safe, v1 still succeeds by producing a reproducible failure report and the contract for the smallest required Muxy streaming bridge. It stops there instead of building configuration or product UI on an invalid architecture.

## Constraints

- **Scope**: Extension-only development proof — prevents early multi-repository work and isolates the riskiest assumption.
- **Dependency**: One pinned, user-operated Hermes development Gateway at a time, with representative fixtures across the validation matrix — the extension never starts, stops, updates, or infers the Gateway's deployment.
- **Deployment contract**: Host-native, Docker, tunnel, and HTTPS endpoints share one protocol path; remote Muxy workspaces are a separate namespace/lifecycle test — topology-specific client behavior is prohibited.
- **Security**: Bearer token remains in panel memory; use an exact CORS origin; never use `*`; never auto-approve — the Gateway exposes terminal and file tools.
- **Transport**: Prove direct WebKit streaming before surrounding product work — Muxy's native HTTP bridge cannot serve the local SSE use case.
- **Lifecycle**: Live status and approvals exist only while the panel is open — durable background ownership is post-v1.
- **Capability compatibility**: Drive controls from `/v1/capabilities` and captured protocol fixtures — Hermes and Muxy interfaces are evolving.
- **UI**: Follow Muxy theme tokens, interface scale, control sizing, keyboard focus, and reduced-motion behavior — the proof must read as a native Muxy surface.
- **Packaging**: The build must copy `package.json` into `dist/` — Muxy's publishing and validation path ships the build output.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Make v1 a transport-first, extension-only proof | Direct authenticated WebKit streaming is the existential assumption; everything else risks becoming throwaway work until it is proven | — Pending |
| Use one runtime-supplied development connection | Profile management does not reduce transport risk and can wait | — Pending |
| Validate representative deployment classes in v1 | A deployment-neutral architecture is only credible if loopback, container-published, tunneled, HTTPS, and remote-workspace conditions are exercised | — Pending |
| Diagnose observed transport facts, never deployment labels | URLs cannot reliably identify topology and the extension does not own Docker, SSH, DNS, certificates, or Gateway lifecycle | — Pending |
| Keep the bearer token only in panel memory | Muxy has no extension keychain/secret setting and `muxy.storage` is not secret storage | — Pending |
| Limit run ownership to the open panel | The background runtime cannot own native HTTP streaming and panels are recreated across project lifecycle events | — Pending |
| Stop with a bridge contract if direct transport is unsafe | A reproducible negative result resolves the v1 question without silently expanding into Muxy core work | — Pending |
| Stop and alert before any Muxy source change | The user authorizes an extension-only v1 and is comfortable considering agent registration only if a later native integration proves it necessary | — Pending |
| Defer `cwd`, path mapping, plugins, provider registration, and marketplace work | These belong to later milestones after the embedded transport is validated | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-16 after initialization*
