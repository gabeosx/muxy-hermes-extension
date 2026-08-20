---
phase: 06-docker-and-native-qualification
date: 2026-08-20
status: blocked
task: a7c2ee1f6051
tested_tuple:
  muxy: 1.5.0 (945)
  hermes: 0.20.2
---

# Native Qualification Result

## Verdict

**BLOCKED — do not submit `0.1.0` to the marketplace.**

The disposable automated topology lab completed successfully, and the real Muxy host-WebKit flows below were exercised. The required Muxy SSH-workspace flow failed before Hermes was contacted: Muxy allowed the extension command, then its internal remote command runner failed to `posix_spawn` `/usr/bin/ssh` with `ENOENT`.

## Native evidence completed

- Confirmed Muxy version `1.5.0 (945)`.
- Removed the old development extension ID and loaded `hermes-agent` with a fresh storage namespace and fresh sign-in.
- Granted only the argv-form `/usr/bin/curl` command rule.
- Completed trusted-HTTPS password sign-in, saved-session restore, cookie rotation, operations expansion to twelve jobs, project-board restore, one-time approval, tool activity, completion, and Muxy restarts.
- Exercised Default and Large interface scale, reduced motion on/off, and accessible labels.
- Captured three real Muxy screenshots and mechanically cropped/resized them to 1600×1000 without generated UI:
  - operations: `a33f038308c7735c4896eb7f3c0d949e6f7fb180b96e315bc61daa00d8d6943b`
  - agent approval: `f2dac38384dbcd46737dbbf12d042f886d882108d75f20981c48dd5115abf94c`
  - project board: `4fda6e05f5e2c3a0fec02bb8a80977e91c02b458d0e0a47dd343e546b905aa37`

### UI-fix recapture

Task `55f7dbfddb60` repeated the real host-WebKit trusted-HTTPS sign-in, restored the shared session into the panel, rendered the revised compact board, loaded all twelve operations jobs, and entered the harmless manual approval state. The captures above come from that updated Muxy session. The task remained release-blocked because it did not and could not replace the failed SSH-workspace gate. Its task-owned containers, network, volumes, listeners, temporary root, active marker, tunnel, and key material were verified absent after capture; the sanitized ignored receipt records only the screenshot hashes, bounded categories, verdict, and cleanup counts.

## Blocking evidence

- The actual Muxy SSH project opened and its terminal connected to the disposable `sshd` fixture.
- The extension restored the saved identity, but every Dashboard request was rejected before command output existed.
- Muxy's extension audit recorded the calls as `allow`, proving this was not a consent denial.
- Bounded extension diagnostics classified the native error as `relay_launch_spawn_missing`.
- Muxy 1.5.0 public source resolves remote extension commands through `/usr/bin/ssh`; `/usr/bin/ssh` exists and is executable on the qualification host.
- The official `Muxy-1.5.0-arm64.dmg` matched its published SHA-256 (`fa6c591131c6c1d798e1c235c8ddc69c1607db67a32db514e79bcb7fa280f664`) but failed strict code-signature verification. Its entitlements blob is invalid and ignored by macOS. The installed copy has the identical failure.

No extension-side workaround is accepted. Moving cookies or request bodies into argv, disabling TLS checks, or claiming raw `ssh` validation as Muxy validation would violate the release contract.

## Cleanup proof

After the blocked run:

- owned containers: `0`
- owned networks: `0`
- owned volumes: `0`
- qualification listeners: closed
- SSH forward process: stopped
- task-local root, password, HMAC secret, SSH keys, verifier files, tunnel, mounted DMG, downloaded DMG, and active lab file: absent
- disposable Muxy remote device: removed
- macOS appearance and reduced-motion preferences: restored

The sanitized receipt is `.qualification/receipts/a7c2ee1f6051.json` and is excluded from the marketplace package.

## Unblock criteria

1. Obtain a corrected, validly signed Muxy build whose remote extension `muxy.exec` can launch SSH.
2. Re-run the entire native qualification from a fresh task root.
3. Require the real Muxy SSH-workspace panel to complete sign-in restore, ticket minting, WebSocket connect/reconnect, agent controls, operations, board, restart, and non-leak checks.
4. Run code, security, UI, Nyquist, phase, milestone, and marketplace gates again before submission.
