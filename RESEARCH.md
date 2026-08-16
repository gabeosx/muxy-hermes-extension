# Hermes Agent Extension for Muxy

Research status: 2026-08-16

## Executive summary

A Hermes Agent integration for Muxy is viable now. The existing Hermes Gateway already provides most of the backend required for an embedded client: streamed responses, structured tool events, persistent conversations, approvals, steer, and run cancellation.

The long-term product is a Muxy panel backed by the Hermes Gateway, potentially accompanied by:

1. A small Hermes plugin that reports lifecycle and approval state to Muxy.
2. A small upstream Muxy provider registration so Hermes appears in agent-focused layouts and status indicators.
3. A deployment-neutral connection profile that works with host-native, Docker, tunneled, and remote Gateways.
4. A focused Hermes API addition for validated per-run working directories.

Those companion integrations are not part of v1. The approved v1 is an extension-only technical proof that answers the riskiest question first: can a Muxy panel securely connect to an authenticated Hermes Gateway, consume its run stream, and control a live run? It uses one development connection, keeps its bearer token in panel memory, and owns status and approvals only while the panel is open.

The extension must never assume how Hermes is deployed or attempt to manage Docker. The long-term design connects to an authenticated Gateway URL, discovers capabilities at runtime, and translates the active Muxy workspace path through user-configured mappings. The original concern that embedded chat would require a new agent backend was incorrect.

## Approved v1 scope

### Product slice

v1 is a development-only Muxy extension for a Hermes user who already has a reachable Gateway. Its one job is to prove that the user can open a Muxy panel, connect securely, start a Hermes run, observe it, and exercise the run controls exposed by that Gateway.

**Core value:** prove secure, authenticated, streamed Hermes run control inside a native-feeling Muxy panel before building the surrounding product.

### In scope

- Scaffold an npm/Vite Muxy extension whose build copies `package.json` into `dist/`.
- Prompt for one development Gateway URL and bearer token at panel load; never embed or persist the token.
- Fetch `/v1/capabilities` and enable only advertised run controls.
- Prove direct WebKit connectivity, record the actual request `Origin`, and establish a narrow CORS configuration.
- Start one run and render token, tool, approval, steer, completion, failure, and cancellation behavior supported by the connected Gateway.
- Respond to approvals and expose steer and stop only when capability discovery permits them.
- Reconnect to an active run within the Gateway's supported replay window and reconcile terminal state through the run-status endpoint.
- Capture versioned protocol fixtures: Muxy version, Hermes version/commit, `/v1/capabilities`, representative SSE frames, approval payloads, steer responses, and reconnect observations.
- Follow Muxy's native UI contract: `--muxy-*` theme tokens, the documented spacing/type/control scale, visible focus/hover states, reduced-motion support, and least-privilege permissions.

### Explicitly out of scope for v1

- Multiple connection profiles, profile CRUD, import/export, and persisted non-secret settings.
- Workspace path mapping, unmapped-workspace policies, or tool-capable execution in the active Muxy worktree.
- A Hermes `cwd` API change or any edits to the Hermes repository.
- A Hermes lifecycle plugin, Muxy provider registration, or other Muxy core changes.
- Durable background ownership of runs, topbar/status updates while the panel is closed, or approval notifications outside the open panel.
- Optional terminal/TUI launchers.
- Marketplace publication, production credential storage, remote Gateway production hardening, or a polished general-purpose chat client.

### v1 completion gate

v1 is complete when a user can load the unpacked extension against a pinned development Gateway, provide a token without persisting it, prove an exact safe origin policy, run a multi-tool prompt, handle an approval, steer or stop when advertised, observe the terminal result, close/reopen the panel during an active run, and document the precise recovery behavior. If direct authenticated streaming from the WebKit panel cannot be made safe, v1 succeeds by producing a reproducible failure report and the contract for the smallest required Muxy streaming bridge; it does not continue into product UI work.

## Repositories and documentation reviewed

- [Muxy](https://github.com/muxy-app/muxy)
- [Muxy extension documentation](https://muxy.app/docs/extensions/get-started)
- [Muxy extension-authoring skill](https://raw.githubusercontent.com/muxy-app/muxy/main/Muxy/Resources/skills/muxy-extension/SKILL.md)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent)
- [Hermes API server documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md)
- [Hermes hook documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/hooks.md)

## Muxy extension framework

Muxy extensions are npm/Vite projects. Muxy loads their built `dist/` directory and reads contributions from the `muxy` object in `package.json`.

Available UI and runtime surfaces include:

- Tabs, panels, popovers, sidebars, topbar items, and status-bar items
- Palette commands and short-lived `runScript` actions
- A longer-lived out-of-process `background.js`
- Extension-local and workspace events
- Storage, dialogs, notifications, Git, files, browser automation, panes, tabs, projects, worktrees, and remote mobile methods

The extension core landed on May 26, 2026 and has continued changing frequently. It is capable enough for this project, but the integration should remain thin and be tested against pinned Muxy releases.

### Permission model

Muxy combines manifest permissions with runtime consent. Subprocess execution, terminal access, Git and file writes, external HTTP calls, and remote methods can prompt the user and are written to an audit log.

Important details:

- A terminal tab opened with a startup command prompts for the exact command.
- Remembered argv-based `exec` permission covers the executable's base command and is broader.
- Muxy's native `muxy.http.fetch` blocks loopback and private hosts.
- Unidentified `muxy` CLI callers are not covered by extension permission gates.
- Extension settings are stored in `UserDefaults`; there is no secret/keychain setting type.

Sources: [permissions](https://muxy.app/docs/extensions/permissions), [HTTP](https://muxy.app/docs/extensions/http), [settings](https://muxy.app/docs/extensions/settings).

## Hermes Gateway capabilities

The Hermes API server already exposes the essential backend for a Muxy client.

### OpenAI-compatible interfaces

- `POST /v1/chat/completions`
- `POST /v1/responses`
- SSE token streaming
- Tool-progress events
- Stored response chains using `previous_response_id`
- Named conversations

### Runs interface

- `POST /v1/runs` starts a run and immediately returns a `run_id`.
- `GET /v1/runs/{run_id}` returns pollable run status.
- `GET /v1/runs/{run_id}/events` streams token deltas, tool activity, reasoning availability, completion, and failure events.
- `POST /v1/runs/{run_id}/approval` resolves an approval with `once`, `session`, `always`, or `deny`.
- `POST /v1/runs/{run_id}/steer` injects guidance into an active run.
- `POST /v1/runs/{run_id}/stop` interrupts the agent.

The API server supports bearer authentication and explicit browser CORS origins. CORS is disabled by default, which is appropriate because the API grants access to the full Hermes toolset, including terminal execution.

The configured Docker Gateway inspected on 2026-08-16 advertises all of the capabilities above, plus session create/list/read/update/delete, message history, session chat streaming, session fork, model selection, skills, and toolsets. Approval and steer are therefore existing capabilities, not proposed API work.

## Deployment-neutral connection model

The extension should model Hermes as a service, not as a local executable. Host-native Hermes, Docker, an SSH tunnel, a remote Linux host, and a private HTTPS deployment are variations of the same contract:

```text
Muxy extension -> authenticated Gateway URL -> capability discovery -> session/run APIs
```

The core Gateway integration must not:

- Require or automatically discover/execute `docker`, `docker compose`, or a user-specific wrapper.
- Assume that `hermes` is installed on the Mac host.
- Assume that Muxy and Hermes see the same filesystem paths.
- Infer deployment type from the URL or filesystem.
- Start, stop, restart, update, or reconfigure the user's Gateway.

An optional terminal launcher is separate from the Gateway connection. It may execute only a command that the user explicitly configures, through Muxy's normal command-consent path. It is never required for embedded chat or run control.

### Post-v1 connection profiles

Users may define one or more named connection profiles. Each profile represents an independently reachable Hermes Gateway and its workspace namespace.

```json
{
  "version": 1,
  "activeConnectionID": "local-docker",
  "connections": [
    {
      "id": "local-docker",
      "label": "Local Docker",
      "baseURL": "http://127.0.0.1:8642",
      "auth": {
        "type": "bearer",
        "tokenSource": "session"
      },
      "workspaceMappings": [
        {
          "muxyRoot": "/Users/gabe/hermes/workspace",
          "hermesRoot": "/workspace"
        }
      ],
      "unmappedWorkspaceBehavior": "prompt",
      "connectTimeoutMs": 3000,
      "requestTimeoutMs": 30000,
      "reconnect": {
        "enabled": true,
        "initialDelayMs": 500,
        "maxDelayMs": 10000
      }
    }
  ]
}
```

### Post-v1 tunable configuration

| Setting | Type | Default | Purpose |
| --- | --- | --- | --- |
| `baseURL` | URL | `http://127.0.0.1:8642` | Gateway API origin; may be local, tunneled, or remote HTTPS. |
| `auth.type` | enum | `bearer` | Authentication contract. `none` is allowed only for loopback development. |
| `auth.tokenSource` | enum | `session` | `session`, future `keychain`, or explicit insecure opt-in storage. |
| `workspaceMappings` | array | `[]` | Ordered Muxy-root to Hermes-root mappings. |
| `unmappedWorkspaceBehavior` | enum | `prompt` | `prompt`, `gatewayDefault`, `chatOnly`, or `block`. |
| `connectTimeoutMs` | number | `3000` | Health/capability negotiation timeout. |
| `requestTimeoutMs` | number | `30000` | Non-streaming request timeout. SSE runs have separate idle handling. |
| `reconnect.enabled` | bool | `true` | Reconnect interrupted event streams while a run remains active. |
| `reconnect.initialDelayMs` | number | `500` | Initial retry delay. |
| `reconnect.maxDelayMs` | number | `10000` | Maximum exponential-backoff delay. |
| `autoConnect` | bool | `true` | Connect when the panel opens. |
| `defaultModel` | string/null | `null` | Optional advertised Hermes model/profile override. |
| `defaultInstructions` | string | empty | Optional per-connection instruction layer. |
| `showToolActivity` | bool | `true` | Render tool lifecycle cards. |
| `showReasoningAvailable` | bool | `true` | Show availability without exposing hidden reasoning. |
| `notifyOnApproval` | bool | `true` | Raise Muxy attention UI for approval events. |
| `notifyOnCompletion` | bool | `false` | Optional completion notification. |
| `approvalPersistenceChoices` | array | all server choices | UI restriction only; never auto-approves. |
| `launcher.enabled` | bool | `false` | Enables an optional terminal/TUI fallback; unrelated to Gateway connectivity. |
| `launcher.command` | string/null | `null` | Exact user-supplied command, such as `hermes --tui` or `/Users/alice/hermes/hermes --tui`. No deployment-specific default. |
| `launcher.cwdMode` | enum | `muxyWorkspace` | Launch from `muxyWorkspace`, `muxyProject`, or an explicitly configured directory. |

Capability flags such as approval, steer, sessions, and streaming must not be user settings. The extension reads `/v1/capabilities` and enables only what the connected Gateway advertises.

### Post-v1 workspace path mapping

Path mapping is the abstraction that supports both native and containerized Hermes:

```text
Host-native:
  /Users/alice/code/project -> /Users/alice/code/project

Docker:
  /Users/alice/hermes/workspace/project -> /workspace/project

Remote Gateway:
  Muxy remote path /home/alice/code/project -> Hermes path /srv/workspaces/project
```

When several mappings match, the longest normalized `muxyRoot` prefix wins. The extension must reject `..` traversal, preserve path-component boundaries, and show the translated path before starting a tool-capable run. An unmapped project follows the profile's explicit `unmappedWorkspaceBehavior`; it must never silently guess.

The Gateway still needs a validated per-run `cwd` field to enforce the translated path. Until that exists, a connection can provide chat and planning, but tool-capable workspace execution should be marked experimental or restricted to the Gateway's configured default directory.

### Example profiles

```json
{
  "id": "host-native",
  "label": "Hermes on this Mac",
  "baseURL": "http://127.0.0.1:8642",
  "workspaceMappings": [
    { "muxyRoot": "/Users/alice/code", "hermesRoot": "/Users/alice/code" }
  ]
}
```

```json
{
  "id": "docker",
  "label": "Hermes in Docker",
  "baseURL": "http://127.0.0.1:8642",
  "workspaceMappings": [
    { "muxyRoot": "/Users/alice/hermes/workspace", "hermesRoot": "/workspace" }
  ]
}
```

```json
{
  "id": "remote",
  "label": "Hermes VPS",
  "baseURL": "https://hermes.example.com",
  "workspaceMappings": [
    { "muxyRoot": "/home/alice/code", "hermesRoot": "/srv/hermes/workspaces" }
  ]
}
```

### Post-v1 configuration storage and UI

Muxy's manifest settings currently support only scalar strings, booleans, and numbers, and their runtime API is not exposed directly to extension webviews. Connection profiles and path mappings therefore belong in a dedicated Hermes settings panel backed by `muxy.storage`.

`muxy.storage` supports JSON objects and arrays and is appropriate for non-secret preferences. It requires `storage:read` and `storage:write`. Bearer tokens must not be stored there by default because the store is a private JSON file, not a keychain. Until Muxy offers secret storage, the safe default is to request the token whenever a panel instance is created and retain it only in that panel's memory.

The settings UI should provide:

- Connection list with Add, Duplicate, Delete, and Set Active actions.
- Gateway URL, authentication mode, and token-source controls.
- Test Connection, displaying health, version, auth, CORS reachability, and advertised capabilities.
- Editable workspace-mapping rows with a live current-project translation preview.
- Timeouts, reconnect policy, notifications, model default, and display preferences.
- Optional terminal launcher command and working-directory policy, disabled by default.
- Import/export of non-secret configuration with tokens always omitted.

## Long-term product capabilities supported by the current platform

### Embedded Hermes panel

A panel can provide:

- Prompt composer and response transcript
- Token-by-token assistant output
- Tool-start and tool-completion cards
- Reasoning-available indicator
- Stop button
- Multi-turn conversation continuity
- Connection and Gateway health status
- Profile or endpoint selection

Suggested flow:

```text
Muxy panel
  -> POST /v1/runs
  <- { run_id }
  -> GET /v1/runs/{run_id}/events
  <- SSE: message.delta, tool.started, tool.completed, run.completed/failed
  -> POST /v1/runs/{run_id}/stop when requested
```

### Post-v1 optional terminal launcher

The extension may also open a visible terminal using an exact command supplied by the user. It must not select a native or Docker command on the user's behalf. Example user configurations include:

```text
Host-native: hermes --tui
Docker wrapper: /Users/alice/hermes/hermes --tui
Remote: ssh hermes-host hermes --tui
```

This remains useful as an optional full-TUI fallback. Muxy should launch it through its normal command-consent flow and set the configured Muxy-side working directory. Whether that directory is meaningful inside Docker or on a remote host is the user's launcher contract; it must not be conflated with the Gateway workspace mapping used for embedded runs.

### Post-v1 native Muxy lifecycle status

Muxy exports the following environment values into terminal panes:

- `MUXY_PANE_ID`
- `MUXY_PROJECT_ID`
- `MUXY_WORKTREE_ID`
- `MUXY_SOCKET_PATH`
- `MUXY_HOOK_BIN`
- `MUXY_HOOK_SCRIPT`

A Hermes plugin can map Hermes hooks to Muxy lifecycle events:

| Hermes hook | Muxy state |
| --- | --- |
| `pre_llm_call` | working |
| `pre_tool_call` | working |
| `pre_approval_request` | waiting / needs attention |
| `post_llm_call` | finished |
| `on_session_end` | finished or failed |

Muxy currently drops lifecycle events from providers not registered in its Swift `AIProviderRegistry`. A small Muxy contribution should add `HermesProvider` with executable `hermes`, socket type `hermes_hook`, a launch command, display name, and icon.

Sources: [Muxy provider registry](https://github.com/muxy-app/muxy/blob/main/Muxy/Services/AI/AIProviderIntegration.swift), [terminal environment](https://github.com/muxy-app/muxy/blob/main/Muxy/Services/Terminal/TerminalEnvVarBuilder.swift), [event mapper](https://github.com/muxy-app/muxy/blob/main/MuxyHookKit/AgentHookEventMapper.swift).

## Integration gaps

### 1. Local webview transport

Muxy's native HTTP bridge cannot call `localhost` or private addresses and does not expose a streaming response body. It therefore cannot connect to a normal local Hermes Gateway SSE stream.

A Muxy panel is a `WKWebView`, however, so it can potentially use ordinary browser `fetch()` directly against `http://127.0.0.1:8642`. Hermes supports explicit CORS allowlists and includes authorization headers in preflight handling.

The first technical spike should determine how WebKit serializes the origin of Muxy's custom `muxy-ext://<extension-id>` scheme:

- If WebKit sends a precise origin, Hermes can allow only that extension origin.
- If WebKit sends `Origin: null`, permitting it would be too broad. Muxy should then add an identified, consent-gated local-service streaming bridge.

Do not configure CORS as `*` for a Hermes Gateway.

### 2. Authentication secret storage

The panel should use a bearer token even for a loopback Gateway. Muxy currently has no secret/keychain-backed extension setting.

Post-v1 approaches:

- Keep the token in panel memory and request it whenever the panel instance is created.
- Add a Muxy Keychain-backed secret setting type.
- Add a local pairing flow that exchanges a short-lived code for a scoped token.

Plain `UserDefaults` or extension-local JavaScript storage should not be treated as secure secret storage.

### 3. Per-run working directory

The Runs API does not currently accept a working directory. An API run uses the Gateway process's configured execution environment, which may be a Docker-mounted directory unrelated to the active Muxy worktree.

Proposed Hermes addition:

```json
{
  "input": "Run the tests",
  "cwd": "/validated/path/to/current/worktree"
}
```

The Gateway must validate the path against an allowlist or configured workspace roots. Remote Muxy workspaces require the chosen Gateway to see the mapped remote path or use an explicitly designed remote execution adapter.

### 4. Native Muxy lifecycle integration across deployments

The embedded panel can always derive its own working, waiting, completed, and failed states from the Gateway event stream. Muxy's built-in Agent Focused status is a separate concern: a host-native Hermes process can see Muxy's pane environment and hook binary, while a container or remote Gateway normally cannot.

The v1 proof keeps working, waiting, completed, and failed state inside the open panel. It does not promise durable topbar/status state or approval attention after the panel closes or is recreated. A later milestone may add a long-lived, consent-gated transport owner or a Muxy local-service streaming bridge before enabling background notifications. Native Muxy provider status remains a separate optional integration through a generic identified provider/event API, not through Docker mounts or assumptions about host executables.

## Recommended architecture

```text
v1: Muxy Hermes extension only
  - Open-panel development control surface
  - Direct authenticated Gateway transport experiment
  - Capability-driven Runs API client
  - In-memory token and panel-local lifecycle state

existing dependency: Hermes Gateway
  - Responses/Runs APIs
  - SSE token, tool, approval, and lifecycle events
  - Approval, steer, stop, and run status

post-v1 candidates
  - Connection profiles and workspace mapping
  - Durable transport owner and background notifications
  - Validated per-run cwd in Hermes
  - Hermes lifecycle plugin
  - Muxy provider registration, secret storage, or local-service streaming bridge
```

## Security requirements

- Bind the Gateway to loopback unless remote access is deliberately configured.
- Require a bearer token and use an exact CORS origin.
- Never use CORS `*` for the Hermes API.
- Require HTTPS for non-loopback direct connections; tunnels may terminate at loopback.
- Never auto-approve a Hermes approval event.
- Do not launch embedded work using Hermes' noninteractive approval-bypass mode.
- Preserve Hermes' hardline command blocklist and normal approval behavior.
- Do not put the Gateway token in the extension bundle or source-controlled files.
- Do not export bearer tokens with connection-profile configuration.
- Do not execute a launcher command unless the user explicitly enabled and configured it; show the exact command in Muxy's command-consent UI.
- Treat per-run `cwd` as untrusted input and validate it server-side.
- Keep Muxy CLI workspace controls read-only by default; require approval for sending keys, closing panes, or executing commands.

## V1 transport-first proof

Build a development-only Muxy panel with the following acceptance criteria, in this order:

1. Scaffold the smallest publish-valid Muxy extension and load its panel unpacked.
2. Prompt at runtime for one development Gateway URL and bearer token; keep the token only in panel memory.
3. Record the actual WebKit `Origin` and prove an exact CORS allowlist without `*`.
4. Fetch `/v1/capabilities`, record the versioned payload, and drive controls from it.
5. Start a run and parse the authenticated SSE stream with representative event fixtures.
6. Render token, tool, approval, completion, failure, and cancellation behavior actually emitted by the pinned Gateway.
7. Respond to one approval and exercise steer and stop when advertised.
8. Close and reopen the panel during a run; document replay, polling reconciliation, and token re-entry behavior.
9. Verify that closing the panel ends v1's live ownership and that no background-status promise is implied.
10. Demonstrate the panel in light and dark themes, at more than one interface scale, with keyboard focus and reduced motion respected.

The proof should use one pinned development Gateway. Whether that Gateway is host-native or containerized is deliberately irrelevant to the extension contract at this stage. It must not publish to the Muxy extension marketplace. Its purpose is to validate WebKit transport, CORS, authentication, capability negotiation, panel lifetime, approvals, and run controls before profiles, workspace execution, or product polish begin.

## Suggested delivery phases

### Phase 1: Transport feasibility

- Publish-valid Muxy extension scaffold and unpacked loading
- Runtime-only development URL and bearer-token prompt
- WebKit origin capture and exact CORS proof
- Capability and SSE protocol fixtures pinned to Muxy and Hermes versions
- A fail-fast decision on direct transport versus a required upstream streaming bridge

### Phase 2: Panel-local run control

- Native-feeling panel UI using Muxy theme and sizing contracts
- Capability-driven run submission and SSE rendering
- Approval, steer, stop, terminal-state reconciliation, and bounded reconnect
- Explicit panel-open lifecycle and token re-entry behavior
- v1 validation report and captured protocol fixtures

### Post-v1 milestone: Product configuration and durability

- Multiple connection profiles and non-secret import/export
- Secure credential storage or pairing
- A durable transport owner for background status and approval notifications
- Host-native, Docker, tunneled, and remote Gateway contract tests

### Post-v1 milestone: Workspace execution

- Validated per-run `cwd` in Hermes
- Workspace path-mapping engine
- Workspace-root allowlisting
- Native and Docker E2E path-mapping tests
- Defined behavior for unmapped and remote workspaces

### Post-v1 milestone: Optional native Muxy integration

- Hermes lifecycle plugin
- `HermesProvider` Muxy contribution
- Agent status indicators and notifications
- Secure credential storage or pairing
- Generic provider/event bridge that also works for containers and remote Gateways

## Current conclusion

The Hermes Gateway means that an embedded Hermes client for Muxy does not require a new agent backend. A credible extension-only proof can be built with the current APIs, including approvals and steer, but direct authenticated WebKit streaming must be proven before any surrounding product surface is built. V1 therefore ends at a panel-local, capability-driven run-control proof with versioned fixtures and an explicit transport verdict. Connection profiles, durable background state, workspace translation, validated per-run `cwd`, Hermes plugins, and Muxy core integration are post-v1 work. For later tool-capable workspace execution, validated per-run `cwd` remains the material Hermes API gap identified so far.
