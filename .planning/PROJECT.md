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
- [ ] The panel can prove authenticated Hermes connectivity through one explicitly consented argv-form curl relay without placing the bearer in argv, URLs, files, storage, diagnostics, or audit output.
- [ ] Connection diagnostics distinguish malformed URL, relay denial/unavailability, reachability, DNS, TLS, authentication, timeout, stream interruption, journal limits, and protocol failures using observed facts without claiming to detect or manage a deployment.
- [ ] The panel discovers `/v1/capabilities` and exposes only run controls advertised by the connected Gateway.
- [ ] A user can start a run and observe streamed token, tool, approval, and terminal lifecycle events emitted by the pinned Gateway.
- [ ] A user can answer an approval and can steer or stop the run when those capabilities are advertised.
- [ ] A user can close and reopen the panel during an active run, re-enter the token, and receive status/final-output reconciliation plus an explicit warning that missed SSE and approval details are not recoverable.
- [ ] The proof captures versioned Muxy/Hermes protocol fixtures and produces an explicit supported, unsupported, or unverified verdict for host-native, local Docker, SSH local-forward, direct remote HTTPS, and remote-workspace cases.
- [ ] The panel follows Muxy's native theme, sizing, focus, reduced-motion, and least-privilege conventions.

### Out of Scope

- Multiple connection profiles, profile CRUD, import/export, and persisted settings — defer until the relay proof is complete.
- Workspace path mapping and active-worktree execution — depend on a later validated per-run `cwd` contract.
- Hermes repository changes — v1 is extension-only.
- Any Muxy source-code change, including agent/provider registration — v1 is extension-only; registration is reconsidered only if later native Agent Focused status actually requires it.
- Durable background run ownership, closed-panel status, and out-of-panel approval notifications — require a transport owner the current Muxy background runtime does not provide.
- Terminal/TUI launchers — not required to validate embedded Gateway transport.
- Marketplace publication, production credential storage, and infrastructure lifecycle management — premature for a development proof.
- A polished general-purpose chat client — v1 validates feasibility and control semantics only.

## Context

Hermes Gateway already exposes the essential backend surfaces: bearer-authenticated capability discovery, run submission and status, SSE run events, approvals, steer, stop, persistent response/session primitives, skills, and toolsets. Muxy's `WKWebView` panel did not deliver a controlled loopback request, while `muxy.http.fetch` blocks loopback/private hosts and buffers response bodies. V1 therefore uses one consented curl process per SSE stream and a bounded workspace journal consumed through `muxy.files`.

The panel may be recreated when projects switch, and Muxy's background runtime cannot read the private stream journal. V1 therefore owns the bearer token, journal cursor, rich activity, and approvals only while the panel is open. Reopening requires token re-entry and explicit status/final-output reconciliation against the Gateway; missed SSE detail is disclosed as unavailable.

The long-term product may later add connection profiles, workspace mappings, validated per-run `cwd`, durable background status, a Hermes lifecycle plugin, Muxy provider registration, secret storage, or a local-service streaming bridge. None of those may expand v1 before the deployment validation verdicts. Deployment variety itself is not deferred: v1 must test the single contract across the supported classes even though profile persistence and infrastructure management remain out of scope.

The direct authenticated panel-streaming experiment has produced its negative result. The approved fallback stays extension-only: a consented curl relay plus a bounded ephemeral workspace journal. If that relay is denied or unavailable, v1 stops with a reproducible report rather than changing Muxy or Hermes.

## Constraints

- **Scope**: Extension-only development proof — prevents early multi-repository work and isolates the riskiest assumption.
- **Dependency**: One pinned, user-operated Hermes development Gateway at a time, with representative fixtures across the validation matrix — the extension never starts, stops, updates, or infers the Gateway's deployment.
- **Deployment contract**: Host-native, Docker, tunnel, and HTTPS endpoints share one protocol path; remote Muxy workspaces are a separate namespace/lifecycle test — topology-specific client behavior is prohibited.
- **Security**: Bearer token remains only in transient panel/exec-stdin memory; never place it in argv, URLs, environment, files, storage, diagnostics, or audit output; never auto-approve.
- **Transport**: Use one audited argv-form curl process per SSE stream and read its bounded workspace journal with `muxy.files`; repeated exec-based journal polling is prohibited.
- **Lifecycle**: Live status and approvals exist only while the panel is open — durable background ownership is post-v1.
- **Capability compatibility**: Drive controls from `/v1/capabilities` and captured protocol fixtures — Hermes and Muxy interfaces are evolving.
- **UI**: Follow Muxy theme tokens, interface scale, control sizing, keyboard focus, and reduced-motion behavior — the proof must read as a native Muxy surface.
- **Packaging**: The build must copy `package.json` into `dist/` — Muxy's publishing and validation path ships the build output.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use a consented curl relay after the direct WebKit negative result | Current Muxy cannot deliver the required local authenticated SSE directly; one audited stream plus file events is the feasible extension-only seam | 2026-08-17 |
| Use one runtime-supplied development connection | Profile management does not reduce transport risk and can wait | — Pending |
| Validate representative deployment classes in v1 | A deployment-neutral architecture is only credible if loopback, container-published, tunneled, HTTPS, and remote-workspace conditions are exercised | — Pending |
| Diagnose observed transport facts, never deployment labels | URLs cannot reliably identify topology and the extension does not own Docker, SSH, DNS, certificates, or Gateway lifecycle | — Pending |
| Keep the bearer token only in transient panel/exec-stdin memory | Muxy has no extension keychain/secret setting; stdin is omitted from Muxy's consent/audit summary while argv is recorded | 2026-08-17 |
| Limit rich run ownership to the open panel | The background runtime cannot read the workspace journal and panels are recreated across project lifecycle events | 2026-08-17 |
| Keep rich stream ownership panel-local | Muxy background cannot read the journal; closed-panel rich alerts and replay remain deferred | 2026-08-17 |
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
