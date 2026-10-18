# Release review — 0.2.0

Reviewed the complete product diff from source main through the Muxy 2 improvements and release preparation inline; no subagents or external reviewer were used.

No release-blocking findings in the reviewed changes. Focused regression tests cover native handle cancellation, bounded error mapping, no fallback after consent denial, unchanged stdin-only credential transport, legacy executor isolation, rejection of queued/late responses, cookie/identity invalidation, logout revocation, and surface-close restoration guards. Manifest permissions and the absence of background ownership remain unchanged. The patched dependency is build-only.

Native evidence on Muxy 2.1.0 (1143) / Hermes 0.22.0: user sign-in reached Connected; operations/schedules loaded; a no-tools smoke request transitioned Working → Complete with the exact expected response; the board reused the authenticated session and loaded; panel close/reopen restored Connected without logging out. No real board/card/schedule mutations or tool approvals were performed.

Support boundaries remain explicit: macOS Muxy 2.1+, pinned 0.20.2 automated protocol matrix, 2.2 bridge-source contract checks only, and no Muxy SSH-workspace or Linux qualification. No personal account screenshots or credentials are added to public release material.

Publication requires an upstream marketplace maintainer because this account has READ access there. The account has ADMIN access to the source repository, allowing a source PR merge after CI passes under the user's explicit publication authorization.
