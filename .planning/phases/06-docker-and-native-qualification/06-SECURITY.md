---
phase: 06
slug: docker-and-native-qualification
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-20
---

# Phase 06 — Security

> Retroactive STRIDE verification of the disposable qualification lab, Dashboard relay boundary, native-evidence gate, and teardown path.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Extension → Muxy command bridge | Fixed argv launches `/usr/bin/curl`; cookie and request body arrive on stdin | Dashboard session cookies and bounded JSON |
| Host → disposable Docker network | Loopback-published Hermes and SSH ports plus a task-owned SSH forward | Password-session traffic and fixture-only model data |
| Docker network → Quick Tunnel | Short-lived HTTPS/WebSocket edge to the disposable Hermes service | Fixture-only Dashboard traffic |
| Host → SSH fixture | Task-generated client key and pinned task-owned host key | SSH authentication and port-forward control |
| Qualification runner → retained receipt | Raw runtime state is reduced to versions, categories, hashes, verdict, and cleanup counts | Non-secret evidence only |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T06-01 | Information disclosure | Fixture state and receipts | high | mitigate | Mode-0700 root, mode-0600 files, CSPRNG secrets, stdin password hashing, endpoint digests only | closed |
| T06-02 | Tampering | Container dependencies | medium | mitigate | Hermes, OpenSSH, and cloudflared images are pinned by digest | closed |
| T06-03 | Spoofing / elevation of privilege | Lab network and SSH exposure | high | mitigate | Loopback-only published ports, password SSH disabled, forwarding restricted to Hermes | closed |
| T06-04 | Elevation of privilege | Agent tool approval | high | mitigate | Manual approval mode and allowlisted user-selected approval choices | closed |
| T06-05 | Information disclosure | Curl command and extension storage | high | mitigate | Fixed argv; cookie/body on stdin; entered password cleared; tickets never persisted | closed |
| T06-06 | Tampering | Dashboard session restore | high | mitigate | Exact cookie-family/value allowlists, expiry rejection, validated storage writes | closed |
| T06-07 | Information disclosure | Remote command failures | medium | mitigate | Raw failures are reduced to bounded `relay_*` categories and fixed UI copy | closed |
| T06-08 | Repudiation / tampering | Native qualification evidence | high | mitigate | Automated-only and self-authored observation paths are explicitly non-release-passing | closed |
| T06-09 | Information disclosure / elevation of privilege | Lab teardown | high | mitigate | Owned-process termination, Compose down, resource absence queries, listener checks, root removal | closed |
| T06-10 | Tampering / XSS | Dashboard URL and rendered response data | high | mitigate | HTTPS-or-loopback URL normalization and DOM text-node rendering | closed |
| T06-11 | Denial of service | Model and relay payloads | medium | mitigate | 1 MiB model/response caps and 64 KiB request cap | closed |
| T06-12 | Spoofing | SSH fixture host identity | medium | mitigate | Exact task-owned Ed25519 known-host entry with `StrictHostKeyChecking=yes` | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-20 | 12 | 12 | 0 | GSD security auditor |

## Sign-Off

- [x] All threats have a disposition.
- [x] No accepted risks remain undocumented.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-08-20

The Muxy 1.5.0 SSH `ENOENT` failure remains a deferred compatibility issue, not an extension security vulnerability. Muxy SSH workspaces are explicitly unsupported in `0.1.0`.
