# Muxy Extension Development Resources

This is the resource list that proved most useful while researching and building the Hermes Agent extension. It is organized for general Muxy extension authors; the final networking section highlights material that was especially relevant to the Hermes transport proof.

## Start here

- [Muxy extension quick start](https://muxy.app/docs/extensions/get-started) — Create, build, reload, and run a first extension.
- [Extensions overview](https://muxy.app/docs/extensions/overview) — Understand extension architecture, surfaces, lifecycle, events, and the permission model.
- [LLM-friendly documentation index](https://muxy.app/llms.txt) — The fastest map of the Muxy extension documentation and its raw source material.
- [Muxy extension-authoring skill](https://raw.githubusercontent.com/muxy-app/muxy/main/Muxy/Resources/skills/muxy-extension/SKILL.md) — Companion design guidance for native surfaces, theme tokens, sizing, focus behavior, and reduced motion.
- [This repository's extension-authoring skill](.agents/skills/muxy-extension/SKILL.md) — The portable project-local copy used when building this extension.

Appending `/plain` to a Muxy documentation URL returns raw Markdown—for example, [the manifest documentation in raw Markdown](https://muxy.app/docs/extensions/manifest/plain).

## Manifest, packaging, and publishing

- [Manifest reference](https://muxy.app/docs/extensions/manifest) — Define the `muxy` object in `package.json`, including contributions and entry points.
- [Manifest JSON Schema](https://raw.githubusercontent.com/muxy-app/muxy/main/docs/extensions/schema/manifest.schema.json) — Add editor validation or CI checks for manifest structure.
- [Permissions](https://muxy.app/docs/extensions/permissions) — Choose only the permissions required for calls the extension actually makes.
- [Contributing an extension](https://muxy.app/docs/extensions/contributing) — Follow the marketplace submission, listing assets, validation, and dry-run packaging workflow.
- [Muxy extensions repository](https://github.com/muxy-app/extensions) — Inspect published extensions and the shared packaging and validation conventions.
- [Muxy Store](https://muxy.app/store) — See how extensions are presented to end users.

The easy-to-miss packaging contract: only `dist/` ships. The build must therefore copy `package.json` into `dist/`; the manifest is needed at the installed extension root even though Vite does not copy it by itself.

## Starter kits and working examples

- [Official vanilla starter](https://github.com/muxy-app/muxy/tree/main/Muxy/Resources/starter-kits/vanilla) — The leanest reference for Vite, a panel, commands, theme use, and manifest copying.
- [Official Git extension](https://github.com/muxy-app/extensions/tree/main/extensions/git) — A substantial reference for panels, status items, Git APIs, remote workspaces, and tests.
- [All published extension sources](https://github.com/muxy-app/extensions/tree/main/extensions) — Find an existing pattern close to the feature you need before creating a new one.
- [Main Muxy repository](https://github.com/muxy-app/muxy) — Consult host implementation details when the docs leave a behavior unclear.
- [Muxy releases](https://github.com/muxy-app/muxy/releases) — Pin the Muxy version used for qualification because extension APIs can evolve.

## UI surfaces

- [Home Views](https://muxy.app/docs/extensions/home-views) — Full-window destinations outside project tab restoration.
- [Panels](https://muxy.app/docs/extensions/panels) — Persistent workspace control surfaces that can dock or float.
- [Tabs](https://muxy.app/docs/extensions/tabs) — Workspace pages, dynamic titles/icons, data delivery, and file opening.
- [Popovers](https://muxy.app/docs/extensions/popovers) — Small transient views anchored to topbar or status-bar items.
- [Sidebars](https://muxy.app/docs/extensions/sidebars) — Full-height replacement navigation or control surfaces.
- [Modal](https://muxy.app/docs/extensions/modal) — Native searchable pickers and custom webview modals.
- [Dialogs](https://muxy.app/docs/extensions/dialogs) — Prompts, confirmations, alerts, and folder pickers.
- [Topbar](https://muxy.app/docs/extensions/topbar) — Commands, icons, status, and live topbar state.
- [Status bar](https://muxy.app/docs/extensions/statusbar) — Lightweight status indicators, text, and popover anchors.
- [Palette commands](https://muxy.app/docs/extensions/palette-commands) — Commands, shortcuts, actions, and runtime bindings.

Use the extension-authoring skill alongside these mechanics references. It explains how to follow Muxy's theme tokens and UI scale, keep keyboard focus natural, and honor reduced-motion preferences.

## Workspace and host APIs

- [Events](https://muxy.app/docs/extensions/events) — Subscribe to workspace activity and coordinate extension surfaces.
- [Lifecycle](https://muxy.app/docs/extensions/lifecycle) — Handle close interception, teardown, and session boundaries.
- [Files](https://muxy.app/docs/extensions/files) — Perform sandboxed workspace file operations.
- [Git](https://muxy.app/docs/extensions/git) — Use structured repository, worktree, diff, and pull-request operations instead of shelling out.
- [GitHub](https://muxy.app/docs/extensions/gh) — Read the signed-in GitHub identity through the host integration.
- [Browser](https://muxy.app/docs/extensions/browser) — Open, inspect, and automate Muxy's built-in browser.
- [Scripts](https://muxy.app/docs/extensions/scripts) — Run short commands, cancellable work, and remote-workspace commands appropriately.
- [Remote methods](https://muxy.app/docs/extensions/remote-methods) — Work with operations that involve remote Muxy workspaces.
- [Settings](https://muxy.app/docs/extensions/settings) — Add extension-defined configuration.
- [Storage](https://muxy.app/docs/extensions/storage) — Persist extension-isolated JSON state shared by the extension's surfaces.
- [HTTP](https://muxy.app/docs/extensions/http) — Make consented native, buffered requests to public hosts; it does not cover private/loopback destinations or incremental live-streaming use cases.
- [Extension logs](https://muxy.app/docs/extensions/logs) — Inspect captured background output while debugging.

Favor the least-privilege path: declare a permission only for a host API call that the extension actually needs, and use structured host APIs where available.

## Localization

- [Localizations](https://muxy.app/docs/extensions/localizations) — Build localization providers and resource-only bundles, preserve format placeholders, package them into `dist/`, and make them discoverable through the marketplace.

## Build tooling

- [Vite](https://vite.dev) — Build the extension's web assets into `dist/`.
- [Node.js API documentation](https://nodejs.org/docs/latest/api/) — Write build helpers, manifest-copy scripts, and development tooling.
- [Node test runner](https://nodejs.org/api/test.html) — A lightweight built-in option for testing vanilla extension code.
- [TypeScript](https://www.typescriptlang.org/docs/) — Type DOM code, manifest-driven data, and host API integrations.

## WebView networking and streaming

These references were especially useful for the Hermes transport work, but are broadly useful whenever a Muxy webview connects to an external service.

- [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) — Issue webview requests and consume response bodies.
- [MDN Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) — Process readable response data incrementally.
- [MDN `Response.body`](https://developer.mozilla.org/en-US/docs/Web/API/Response/body) — Work directly with a fetch response's readable stream.
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) — Understand browser-origin rules, preflight requests, and authorization headers.
- [Server-sent events specification](https://html.spec.whatwg.org/multipage/server-sent-events.html) — Implement event-stream framing and reconnection semantics correctly.
- [MDN EventSource constructor](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource) — Note the API's bearer-auth limitation: it has no arbitrary request-header option, so it cannot send an `Authorization: Bearer ...` header.
- [Apple App Transport Security](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity) — Evaluate HTTP and TLS constraints affecting WebKit-based clients.
- [Apple `WKURLSchemeHandler`](https://developer.apple.com/documentation/webkit/wkurlschemehandler) — Understand custom WebKit URL-scheme handling and its boundaries.
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — Review token handling, CORS, storage, and untrusted-content practices.

## Project-specific distilled references

- [Research and final architecture](RESEARCH.md) — The project’s consolidated architecture and transport decision.
- [Research summary](.planning/research/SUMMARY.md) — A short synthesis of the research work.
- [Stack and transport comparison](.planning/research/STACK.md) — Technologies considered and the deployment/transport trade-offs.
- [Architecture analysis](.planning/research/ARCHITECTURE.md) — System boundary and component analysis.
- [Pitfalls and security concerns](.planning/research/PITFALLS.md) — Risks, anti-patterns, and constraints discovered during research.
- [Product guide](README.md) — What the Hermes Agent extension does and how to use it.
- [Release procedure](RELEASING.md) — Release governance and validation expectations.
- [Qualification guide](qualification/README.md) — Reproducible evidence and compatibility qualification steps.

## Five essential bookmarks

If you keep only five links close at hand, use these:

1. [Muxy extension quick start](https://muxy.app/docs/extensions/get-started)
2. [Extensions overview](https://muxy.app/docs/extensions/overview)
3. [Muxy extension-authoring skill](https://raw.githubusercontent.com/muxy-app/muxy/main/Muxy/Resources/skills/muxy-extension/SKILL.md)
4. [Official vanilla starter](https://github.com/muxy-app/muxy/tree/main/Muxy/Resources/starter-kits/vanilla)
5. [Published extensions repository](https://github.com/muxy-app/extensions)
