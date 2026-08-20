---
phase: 01-verified-gateway-connectivity
verified: 2026-08-17T20:29:00Z
status: passed
score: 5/5 fast-path success criteria verified
behavior_unverified: 0
overrides_applied: 1
gaps: []
---

# Phase 1: Verified Gateway Connectivity — Fast-Path Verification

**Phase Goal:** As a Hermes Gateway user, build and load a Muxy panel and safely prove one authenticated Gateway connection through the consented deployment-neutral relay.

**Verdict:** PASSED for the user-approved Phase 1 fast path.

## Scope Override

The original qualification expansion in Plans 10–15 was superseded after Plan 10 exposed an incompatible failure-receipt contract. The user explicitly selected the fast path: prove the working connection slice against one disposable Gateway, inspect the native panel, keep every other deployment row `Unverified`, and proceed to run control.

This report does not claim that Plans 10–15 ran. Their summaries are marked `superseded`, and broader host, remote, fault, recovery, and stop-alert qualification is deferred.

## Goal Achievement

| # | Fast-path truth | Evidence | Status |
|---|---|---|---|
| 1 | The publish-valid extension builds, loads in Muxy, accepts a URL/token, and keeps bearer material out of argv and persisted output. | Final `dist/` loaded as the Hermes Gateway panel; relay tests enforce stdin-only bearer transfer; native audit inspection exposed no token. | PASS |
| 2 | One live deployment-neutral URL/token flow reaches capabilities and an incremental terminal stream. | Native Muxy panel against the disposable Docker Gateway displayed `Connection verified` with Relay, Authentication, Capabilities, and Streaming all `Observed`. | PASS |
| 3 | Diagnostics and URL policy are based on observed safe facts. | Consolidated validator covers malformed URL, relay, DNS, TLS, refusal, timeout, auth, protocol, journal-limit, stream, and cancellation mappings. | PASS |
| 4 | The evidence surface does not overclaim untested deployments. | The final panel rendered all five rows; host-native, SSH-forward, direct HTTPS, and remote-workspace remained `Unverified`. | PASS |
| 5 | Extension authority remains limited to the consented curl relay, journal, and panel. | Manifest/phase-boundary validation passed; no Docker, SSH, lifecycle, source, Git-write, terminal, or provider control is exposed by the extension. | PASS |

## Live Disposable-Gateway Proof

- Gateway image: `nousresearch/hermes-agent:v2026.8.16@sha256:f8f548d87d16634d1ad9e3777280f3f577ba2358703f04e18e74007ffd3621bf`.
- Runtime: loopback-only disposable Docker fixture with a deterministic model stub and transient token.
- Native result: connection verified; relay, bearer authentication, capabilities, and incremental SSE streaming observed in the Muxy panel.
- Secret boundary: token traveled through exec stdin, was not displayed, and did not appear in the reviewed command audit.
- Cleanup: container, network, temporary token material, relay journal, and other fixture files were removed; the panel was closed after the proof.

The live proof establishes the retained Phase 1 slice. It does not establish Docker fault/recovery qualification or support for any other deployment class.

## Native Muxy Checklist

| Check | Result |
|---|---|
| Final built panel | Loaded from final `dist/`; URL, secure token input, connection action, and five evidence rows exposed in the accessibility tree. |
| Themes | Muxy dark and Muxy Light both rendered readable cards, controls, and evidence rows; original dark theme restored. |
| Interface size | Default and Large kept the narrow right panel readable without horizontal clipping; original Default size restored. |
| Keyboard/focus | Tab order reached Gateway URL and then the secure bearer input; the active control had a visible focus ring. |
| Narrow layout | Five evidence cards wrapped vertically and stayed readable in the approximately 300-pixel panel. |
| Reduced motion | Styles enforce `prefers-reduced-motion: reduce` by disabling animation and transitions; no nonessential animation was observed in the inspected native states. |
| Stop copy/view actions | Not claimed. The current-pair failure fixture depends on superseded Plans 10–15 and is recorded as an explicit ledger waiver. |

## Automated Verification

`npm run validate` passed outside the restricted sandbox so the host-fixture suite could bind disposable loopback ports. It completed the build, tests, evidence/redaction checks, manifest packaging checks, and authority-boundary validation.

The unprivileged attempt failed only because four host-fixture tests received `listen EPERM` on `127.0.0.1`; the same consolidated command passed with loopback binding permitted.

## Deferred, Still Unverified

- Host-native two-session qualification.
- Docker refusal, mid-stream interruption, recovery, and evidence publication.
- SSH-forward, direct remote HTTPS, and remote Muxy workspace real-path qualification.
- Current-pair failure classification and the native stop alert's copy/view actions.
- Versioned control and recovery evidence, which belongs with later run-control/recovery work.

These items were remapped to later compatibility/recovery work and remain visibly unverified. They do not block the narrower Phase 1 transport proof the user approved.

## Broken Windows

- Fixed: native controlled-fixture streaming.
- Fixed: theme, interface-size, keyboard/focus, narrow-layout, and reduced-motion contract checks.
- Waived with reason: staged current-pair stop copy/view actions.
- Open windows: **0**.

---

_Verified: 2026-08-17T20:29:00Z_
_Verification mode: user-approved fast path_
