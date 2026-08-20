# Roadmap: Hermes Agent Extension for Muxy

## Milestones

- [x] **v1.0 Development Proof** — Phases 1–3; shipped 2026-08-20. [Archived roadmap](./milestones/v1.0-ROADMAP.md)
- [ ] **v1.1 Marketplace Beta Hardening** — Phases 4–7.

## v1.1 Phases

- [ ] **Phase 4: Contract and Attack-Surface Cleanup** — Make the marketplace product match the shipped Dashboard contract and remove unused authority and legacy code.
- [ ] **Phase 5: Deterministic Release Validation** — Replace phase-era validation with a reproducible current-architecture release gate.
- [ ] **Phase 6: Docker and Native Qualification** — Qualify every claimed topology and UX state with real mechanisms and verified cleanup.
- [ ] **Phase 7: Marketplace Submission** — Complete listing assets, reviews, upstream validation, PR submission, and signed-build smoke verification.

## Phase Details

### Phase 4: Contract and Attack-Surface Cleanup

**Goal:** A reviewer can trace every shipped behavior and permission to the current password-session/WebSocket product contract, with no reachable historical bearer/SSE surface.

**Depends on:** v1.0 complete
**Requirements:** CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09, CONT-10

**Success Criteria:**

1. The `hermes-agent` namespace supports password-provider login, allowlisted rotating sessions, fresh one-use tickets, and explicit unsupported OAuth/OIDC states.
2. Incompatible or malformed contracts, expired sessions, denied permissions, and missing optional plugins produce bounded safe troubleshooting states.
3. Import analysis proves the marketplace bundle excludes historical bearer, SSE journal, capability-probe, recovery-evidence, and phase-era product paths.
4. The manifest contains only used command, panel/tab, and isolated-storage permissions; passwords and tickets never persist or enter argv.
5. Release documentation accurately freezes supported and excluded behavior, tested versions, security, privacy, and uninstall semantics.

### Phase 5: Deterministic Release Validation

**Goal:** One repeatable command can demonstrate from clean installs that the current marketplace source is secure, least-privileged, tested, and reproducibly packaged.

**Depends on:** Phase 4
**Requirements:** VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06, VAL-07, VAL-08

**Success Criteria:**

1. Two separate `npm ci` workspaces pass the complete release test suite twice without retries or path-sensitive HTTPS failures.
2. Node 20 and the current development Node both satisfy the declared engine range and produce equivalent distribution manifests, assets, and inventories.
3. The release validator proves import reachability, least privilege, secret safety, marketplace schema, asset shape, and deterministic distribution output.
4. `npm audit` has no high/critical findings and security review has no open high or unaccepted medium release threat.

### Phase 6: Docker and Native Qualification

**Goal:** Real local/Docker, SSH-forward, trusted HTTPS, and Muxy SSH-workspace paths repeatedly satisfy the frozen behavioral and safety claims with no fixture residue.

**Depends on:** Phase 5
**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, QUAL-09, QUAL-10, QUAL-11

**Success Criteria:**

1. A digest-pinned disposable Compose lab uses task-local mode-0700 credentials to serve Hermes, deterministic model behavior, actual SSH, and a short-lived HTTPS/WebSocket tunnel.
2. Actual `ssh -L`, trusted HTTPS/WebSocket, and a real Muxy SSH workspace each complete two panel sessions and one Muxy restart across authentication, ticketing, reconnect, agent controls, operations, schedules, and board flows.
3. Negative paths cover invalid password, expired session, permission denial, missing optional plugin, malformed response, interrupted tunnel/WebSocket, approval, stop, and authoritative cancellation.
4. Native UI passes the required theme, scale, pane, focus, accessibility, and reduced-motion matrix.
5. Receipts prove remote paths/secrets never cross the Dashboard boundary and teardown leaves no owned infrastructure, process, listener, key, secret, or temporary directory.

### Phase 7: Marketplace Submission

**Goal:** The exact reviewed source and listing package pass Muxy marketplace gates, are submitted upstream, and the signed store artifact passes clean-profile smoke testing.

**Depends on:** Phase 6
**Requirements:** MKT-01, MKT-02, MKT-03, MKT-04, MKT-05, MKT-06, MKT-07, MKT-08

**Success Criteria:**

1. Marketplace metadata, README, icon, and three sanitized exact-size screenshots are present in source and deterministic `dist/` output.
2. Local and upstream schema validation, dry-run packaging, bundle secret scan, and permission audit pass.
3. Code, security, UI, Nyquist, verification, and milestone audits have no blocker or unaccepted medium finding.
4. A clean `gabeosx` sparse-checkout contribution contains only allowed source under `extensions/hermes-agent` and is opened as an upstream PR.
5. After approval, the immutable signed `0.1.0` store build passes clean-profile sign-in, run, board, reconnect, and uninstall smoke tests; fixes require a new version.

## Progress

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 4. Contract and Attack-Surface Cleanup | 10 | In progress | — |
| 5. Deterministic Release Validation | 8 | Pending | — |
| 6. Docker and Native Qualification | 11 | Pending | — |
| 7. Marketplace Submission | 8 | Pending | — |

**Execution order:** 4 → 5 → 6 → 7
**Coverage:** 37/37 requirements mapped exactly once.
