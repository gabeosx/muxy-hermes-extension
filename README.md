# Hermes Agent for Muxy

Hermes Agent is a Muxy marketplace beta for using an existing [Hermes](https://github.com/NousResearch/hermes-agent) Dashboard from native-feeling Muxy panels. Sign in once, monitor operations, run and guide an agent, handle explicit approvals, manage scheduled work, and open Hermes project boards without turning the extension into an infrastructure manager.

## Beta support contract

The beta supports one user-operated Hermes Dashboard at a time through the same client contract:

| Connection shape | Support claim | Operator responsibility |
|------------------|---------------|-------------------------|
| Host-native or Docker on loopback | Beta | Run Hermes Dashboard and make its address reachable from Muxy |
| SSH local forward | Beta | Own and maintain the `ssh -L` tunnel |
| Direct HTTPS | Beta on trusted networks only | Use trusted TLS plus a VPN, private network, or operator-controlled access layer |
| Muxy SSH workspace | Beta | Make the same HTTPS Dashboard URL reachable from host WebKit and remote command execution |

The recorded qualification tuple is **Muxy 1.5.0 (945)** with **Hermes 0.20.2**. The extension does not enforce those versions. It uses advertised providers and validated response contracts, and fails closed when an evolving API is incompatible. Other versions and environments are best-effort, not silently claimed compatible.

### Included

- Provider-advertised password login
- Saved, verified Dashboard sessions with allowlisted cookie rotation
- A fresh one-use WebSocket ticket for every connection and reconnect
- Streamed assistant text, tool activity, explicit approvals, guidance, stop, cancellation, and completion
- Operations status, scheduled-job expansion, and Hermes project boards
- Automatic reconnect while the panel is open

### Not included

- OAuth or OIDC login; OAuth/OIDC-only providers are shown as unsupported
- Background run ownership or approvals after the panel closes
- Workspace path mapping or assumptions that Hermes shares the Muxy workspace filesystem
- Multiple connection profiles, Gateway installation, deployment detection, or telemetry
- A promise of universal compatibility across untested Muxy or Hermes versions

## Security warning

Hermes advises against basic/password authentication on an unrestricted public endpoint. Use password sign-in only on loopback, a trusted LAN, a VPN, or an operator-controlled access layer. Any Cloudflare Quick Tunnel mentioned in qualification evidence is short-lived, contains disposable fixture data only, and is not deployment guidance.

The extension never auto-approves an agent action. Review every approval before choosing a response.

## Setup

1. Install Hermes Agent from the Muxy marketplace.
2. Run an existing Hermes Dashboard with a password-capable authentication provider.
3. In Muxy, run **Hermes: Toggle Agent Panel**.
4. Enter the Dashboard address you normally open, choose the advertised password provider, and sign in.
5. Use **Hermes: Open Project Board** when you want the Kanban surface.

Changing from the pre-marketplace development extension to `hermes-agent` creates a new isolated storage namespace. Remove the old development installation and sign in once; credentials and cookies are intentionally not transferred.

## Permissions

| Permission | Why it is required |
|------------|--------------------|
| `commands:exec` | Runs `/usr/bin/curl` in argv form for bounded Dashboard JSON requests. Cookies and request bodies are supplied through stdin, never command arguments. |
| `panels:write` | Opens and controls the Hermes Agent side panel. |
| `tabs:write` | Opens the singleton Hermes Project Board tab. |
| `storage:read`, `storage:write` | Stores only the Dashboard URL, allowlisted Hermes session cookies, identity projection, provider metadata, and selected board in Muxy's isolated extension namespace. |

The extension requests no workspace-file, shell-script, background-process, Docker, SSH, or telemetry permission.

## Data and privacy

- Passwords exist only in the sign-in form and one transient request body, then are cleared.
- WebSocket tickets are single-use, short-lived, and discarded immediately after socket construction.
- Only `hermes_session_at`, `hermes_session_rt`, and `hermes_session_provider` cookie families (including secure prefixes) may persist.
- Workspace paths, remote secrets, prompt/script bodies from schedules, detailed diagnostics, worker identities, and raw resource measurements are not added to stored sessions, UI receipts, screenshots, or release evidence.
- No analytics or telemetry is collected or transmitted by the extension.
- Hermes itself receives the prompts and controls you intentionally send to your configured Dashboard; its own data practices are controlled by your Hermes operator.

## Troubleshooting

| State | Meaning | What to do |
|-------|---------|------------|
| Invalid password | Hermes rejected the supplied credentials | Verify the selected provider and password, then retry |
| OAuth/OIDC not supported | The Dashboard advertises no password-capable provider | Use Hermes directly or wait for a later extension release with OAuth support |
| Sign-in expired | The saved session was rejected or expired | Sign in again; stale cookies are removed |
| Permission denied | Muxy did not authorize the curl request or panel/tab action | Review the extension permission prompt and retry only if expected |
| Agent connection offline | The WebSocket or tunnel was interrupted | Keep the panel open; it reconnects with a fresh one-use ticket |
| Sign-in unavailable / incompatible response | Hermes returned a missing or malformed required contract | Confirm Hermes is healthy and record its version; do not weaken authentication or TLS to bypass the check |
| Some status is unavailable | An optional Hermes operations surface or plugin is absent | Agent and board features remain available when their own contracts pass |

## Uninstall and rollback

Disable or uninstall Hermes Agent in Muxy to roll back. Uninstalling removes access to the extension's isolated storage namespace; it does not stop Hermes, delete Hermes data, or change its deployment. Published marketplace versions are immutable: a correction to `0.1.0` ships as `0.1.1` rather than replacing the existing artifact.

## Development and validation

Node 20 or newer is required.

```sh
npm ci
npm test
npm run build
npm run validate
```

The build copies `package.json`, this README, the icon, and listing screenshots into `dist/`. Release validation checks the current production import graph, least privilege, secret safety, asset dimensions, deterministic output, and clean-copy behavior.
