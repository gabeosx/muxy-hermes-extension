---
phase: 06-docker-and-native-qualification
validated: 2026-08-20
status: validated
nyquist_compliant: true
wave_0_complete: true
score: 11/11
---

# Phase 06 Validation

## Verdict

**VALIDATED — 11 of 11 revised beta requirements are covered.** The host, SSH-forward, trusted-HTTPS, native UI, fixture, safe-unsupported-state, and cleanup gates are green. Muxy SSH workspaces are explicitly excluded from `0.1.0` and tracked as Later rather than silently claimed compatible.

## Requirement Coverage

| Requirement | Status | Evidence |
|---|---|---|
| QUAL-01 | Green | Qualification tests enforce version-and-digest-pinned Compose images. |
| QUAL-02 | Green | Tests cover task-local mode-0700 secrets, mode-0600 files, and sanitized receipts. |
| QUAL-03 | Green | Compose topology tests and the sanitized real-lab receipt cover Hermes, the deterministic model, `sshd`, and the tunnel edge on one network. |
| QUAL-04 | Green | Actual `ssh -L` forwarding completed in the disposable lab, with strict task-owned host-key verification. |
| QUAL-05 | Green | Host WebKit completed password login and WebSocket behavior through the disposable HTTPS tunnel. |
| QUAL-06 | Green | The real failure is documented, both shipped surfaces show bounded unsupported guidance, and the opt-in native reproducer cannot mint support evidence. |
| QUAL-07 | Green | Tests and real-lab evidence cover supported Kanban/schedule seeding and harmless agent/control categories. |
| QUAL-08 | Green | Every supported topology completed the session/restart behavior matrix; the unsupported topology is not counted. |
| QUAL-09 | Green | Real Muxy screenshots and the native UI review score 24/24 across the supported local-workspace surfaces. |
| QUAL-10 | Green | Bundle, UI, screenshot, request, and receipt checks exclude workspace paths, SSH keys, tunnel credentials, and qualification secrets. |
| QUAL-11 | Green | Cleanup tests and receipts prove removal of owned Docker resources, processes, listeners, keys, secrets, and task roots. |

## Automated Evidence

- `node --test test/qualification-lab.test.js`: 11/11 passed.
- Focused Dashboard, UI, operations, and Kanban contracts: 40/40 passed.
- `npm test`: 77/77 passed twice with no retries.
- `npm run validate` passed on Node v26.5.0 and Node v20.20.2 with the identical clean-copy digest `b1752be8bb233b32f9928b9ed639c948d82a4b7e1adab10de9ef53da66dce9ef` and zero high or critical audit findings.
- Qualification control-flow tests cover supported-matrix passage, manual-native non-attestation, setup-failure cleanup, and cleanup-proof failure.
- Fresh real supported-matrix receipt `81cae6d7136f` records `passed_supported_beta_matrix` with complete cleanup proof.

## Deferred Work

1. Obtain a valid Muxy build whose native remote executor can spawn `/usr/bin/ssh`.
2. Repeat the full real Muxy SSH-workspace matrix before adding that topology to a future support contract.
3. Close the tracked issue only when the integrated native qualification gate passes.

No manual observation or locally authored JSON may convert the deferred SSH-workspace topology into a supported claim.
