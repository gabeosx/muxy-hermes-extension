# Requirements: v1.1 Marketplace Beta Hardening

## Contract and Attack Surface

- [x] **CONT-01**: The published extension identity is `hermes-agent@0.1.0`, and the old development namespace is neither read nor migrated.
- [x] **CONT-02**: A user can sign in through a provider-advertised password flow and no password persists after the request completes.
- [x] **CONT-03**: A user presented with only OAuth/OIDC providers sees an explicit unsupported-provider state without an attempted fallback.
- [x] **CONT-04**: A verified Dashboard session persists only allowlisted cookies, accepts cookie rotation, and mints a fresh one-use ticket for every WebSocket connection attempt.
- [x] **CONT-05**: Expired sessions, missing optional plugins, permission denial, and malformed Dashboard responses fail safely with bounded sanitized troubleshooting states.
- [x] **CONT-06**: The production curl relay contains only authenticated Dashboard request behavior used by the current import graph and supplies secrets through stdin.
- [x] **CONT-07**: Production-dead bearer, SSE journal, capability-probe, recovery-evidence, fixtures, validators, and product evidence are removed after an import reachability proof.
- [x] **CONT-08**: DOM helpers cannot set dynamic HTML; static source-owned SVG icons remain supported through the icon module only.
- [x] **CONT-09**: The marketplace manifest requests only argv-form command execution, panel/tab control, and isolated storage authorities actually used by the product.
- [x] **CONT-10**: Release documentation defines the support matrix, tested tuple, password-auth warning, permissions, troubleshooting, privacy, limitations, and uninstall behavior.

## Deterministic Release Validation

- [x] **VAL-01**: One release validator covers the current Dashboard session/WebSocket architecture, manifest, marketplace assets, least privilege, secret scanning, import reachability, and distribution contents.
- [x] **VAL-02**: The clean-copy HTTPS timeout is eliminated with real Hermes and edge health checks, task-unique ports/names, cold-start budgets, and bounded sanitized failure diagnostics.
- [x] **VAL-03**: Two independent clean directories can run `npm ci`, execute the complete release gate twice without retries, and produce matching file inventories.
- [x] **VAL-04**: Two clean builds are byte-identical for deterministic files and equivalent for normalized manifest and listing assets.
- [x] **VAL-05**: The release gate passes on Node 20 and the current development Node, and `engines.node` declares a compatible range without runtime dependencies.
- [x] **VAL-06**: `npm audit` reports no high or critical findings; the bundle and repository release surface contain no credentials or forbidden secret material.
- [x] **VAL-07**: All current behavioral, security, UI, fixture, and contract tests pass twice with no retry masking.
- [x] **VAL-08**: Security review reports no open high-severity threat and no unaccepted medium-severity release finding.

## Docker and Native Qualification

- [x] **QUAL-01**: Hermes, SSH server, deterministic model fixture, and Cloudflare Tunnel images are pinned by version and digest.
- [x] **QUAL-02**: Every qualification run generates its password hash, HMAC secret, SSH key, and verifier challenges beneath a task-local mode-0700 temporary root and retains no raw credential evidence.
- [x] **QUAL-03**: One Compose network supplies the password-authenticated Hermes Dashboard, deterministic model, actual `sshd`, and disposable HTTPS/WebSocket Quick Tunnel edge.
- [x] **QUAL-04**: The host client qualifies Hermes through an actual `ssh -L` forward to the Docker network.
- [x] **QUAL-05**: The host WebKit client qualifies password login and WebSocket behavior through the short-lived trusted HTTPS tunnel using fixture-only data.
- [x] **QUAL-06**: Muxy SSH workspaces are explicitly unsupported in `0.1.0`, fail safely with actionable guidance, and remain covered by a non-release diagnostic reproducer.
- [x] **QUAL-07**: Kanban and schedules are seeded only through supported Hermes surfaces, and harmless scenarios cover text, tool activity, one-time approval, guidance, stop, cancellation, and completion.
- [x] **QUAL-08**: Every supported topology completes two fresh panel sessions and one Muxy restart across valid/invalid password, restore/rotation, ticket reuse prevention, reconnect, controls, operations, twelve-job expansion, and board create/move flows.
- [x] **QUAL-09**: Native UX for supported local-workspace connection shapes passes light/dark themes, Default/Large scale, narrow/wide panes, keyboard focus, accessibility labels, and reduced motion.
- [x] **QUAL-10**: Release evidence proves no workspace path, SSH key, tunnel credential, or qualification secret enters a Dashboard request, bundle, UI, screenshot, or retained receipt.
- [x] **QUAL-11**: Teardown proves the absence of owned containers, networks, volumes, tunnel/SSH processes, listeners, keys, secrets, and temporary directories; retained evidence contains only versions, categories, hashes, verdicts, and cleanup receipts.

## Marketplace Submission

- [ ] **MKT-01**: `muxy.marketplace` declares author Gabe, GitHub `gabeosx`, categories `developer-tools` and `productivity`, and valid listing asset paths.
- [ ] **MKT-02**: The package contains a compact SVG icon, one sanitized 1600×1000 marketplace hero, and three sanitized 1600×1000 feature screenshots for operations, active agent/approval, and project board surfaces.
- [ ] **MKT-03**: README documents features, setup, permissions and rationale, tested tuple, compatibility policy, limitations, security model, privacy, and uninstall behavior.
- [ ] **MKT-04**: Listing assets are copied into `dist/`, accepted by the local distribution allowlist, and pass upstream `validate.mjs` plus `pack.mjs --dry-run`.
- [ ] **MKT-05**: GSD code review, security audit, UI review, Nyquist validation, milestone verification, and final milestone audit have no blocker or unaccepted medium finding.
- [ ] **MKT-06**: A clean sparse-checkout marketplace contribution at `extensions/hermes-agent` excludes `dist/`, `.planning`, receipts, credentials, and generated qualification data and is submitted from the authenticated `gabeosx` fork.
- [ ] **MKT-07**: After merge, the signed store build passes clean-profile sign-in, agent-run, board, reconnect, and uninstall smoke tests.
- [ ] **MKT-08**: The release adds no telemetry, documents disable/uninstall rollback, and treats published `0.1.0` as immutable with fixes released as `0.1.1` or later.

## Future Requirements

- OAuth/OIDC authentication.
- Background run ownership and closed-panel approval handling.
- Workspace path mapping and validated per-run working directories.
- Broader version-matrix qualification and automated store-profile smoke infrastructure.
- Muxy SSH-workspace support after a valid Muxy remote executor passes the full native qualification matrix.

## Out of Scope

- Password authentication on unrestricted public endpoints.
- Telemetry or analytics.
- Infrastructure installation, management, or deployment detection by the extension.
- Multiple connection profiles or credential migration from the old extension ID.
- Muxy SSH workspaces in `0.1.0`; use a local Muxy workspace with an operator-owned `ssh -L` forward or trusted HTTPS.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 – CONT-10 | Phase 4 | Complete |
| VAL-01 – VAL-08 | Phase 5 | Complete |
| QUAL-01 – QUAL-11 | Phase 6 | Complete — SSH workspaces explicitly excluded from `0.1.0` |
| MKT-01 – MKT-08 | Phase 7 | Pending |

**Coverage:** 37/37 requirements mapped exactly once.
