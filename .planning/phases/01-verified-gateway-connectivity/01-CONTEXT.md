# Phase 1: Verified Gateway Connectivity - Context

**Gathered:** 2026-08-16
**Status:** Requirements alignment required before planning

<domain>
## Phase Boundary

Build and validate the extension-only connection proof: a publish-valid Muxy panel accepts one runtime Gateway URL and bearer token, proves exact-origin authenticated WebKit streaming, reports secret-safe diagnostics, and records compatibility evidence. The extension does not manage deployments, persist credentials, expose run-control UI, modify Muxy, or register Hermes as a provider.

The discussion intentionally narrows the real v1 support claim. Host-native and local Docker receive real end-to-end validation. SSH-forwarded, direct remote HTTPS, and remote-Muxy-workspace conditions are simulated locally and remain `Unverified` until later real infrastructure testing. This conflicts with the current wording of DEPL-04, DEPL-05, DEPL-06 and the Phase 1 roadmap claim; those planning artifacts must be aligned before Phase 1 planning starts.

</domain>

<decisions>
## Implementation Decisions

### Proof Standard
- **D-01:** A deployment class may be marked `Supported` only after the actual Muxy panel completes real end-to-end validation through that class's real path. Simulators may supplement negative-path coverage but cannot establish support.
- **D-02:** `Supported` requires every required check to pass. `Unsupported` requires a reproducible required-check failure. Missing infrastructure, partial execution, or inconclusive evidence remains `Unverified`.
- **D-03:** `Supported` requires two complete successful probes from fresh panel sessions against the same fixture and resolved version pair.
- **D-04:** Every supported fixture must prove incremental delivery through a real authenticated Hermes SSE route using a controlled harmless fixture. Phase 1 does not add Phase 2 run-control UI.

### Fixture Ownership
- **D-05:** The repository owns validation tooling and reproducible recipes for all modeled conditions.
- **D-06:** The validation harness may launch and stop a pinned host-native Hermes process. This process authority belongs only to test tooling and must never enter the extension panel.
- **D-07:** The repository owns a Docker Compose fixture with a resolved Hermes image or revision and a loopback-only published port; the validation runner starts and tears it down.
- **D-08:** V1 does not require real remote infrastructure. SSH-forwarded, direct HTTPS, and remote-workspace conditions are simulated locally with Docker and must remain `Unverified`; real end-to-end qualification is deferred. — **Reversibility:** costly — reversing this decision adds remote infrastructure, credentials, and real-path acceptance work to the v1 milestone.

### Version Policy
- **D-09:** Validation continuously resolves the latest stable Muxy and Hermes releases rather than maintaining a permanently pinned project pair. Each run records the exact resolved Muxy version, Hermes version and commit or image digest, and test date.
- **D-10:** When newer stable releases appear, the most recent `Supported` verdict carries forward until a regression is observed. The exact last-verified versions remain visible in details without a prominent freshness warning.
- **D-11:** A reproducible required-check failure on the latest stable pair takes precedence and marks that deployment class `Unsupported`; earlier passing results remain historical evidence.

### Evidence Artifacts
- **D-12:** Every validation run emits both a human-readable Markdown report and a schema-versioned JSON record.
- **D-13:** Redacted results are committed in a versioned repository directory. Historical version-pair evidence is retained and an index identifies the latest run.
- **D-14:** Committed evidence uses strict redaction. It may retain deployment class, loopback/non-loopback trust class, protocol, resolved versions, timing, and outcomes. It must omit hostnames, IP addresses, URL paths and queries, tokens, authorization headers, workspace paths, and raw response bodies.
- **D-15:** Representative SSE evidence uses an allowlist: event name, ID behavior, ordering, timing, schema shape, byte counts, and stable hashes. Prompt text, assistant output, tool arguments/results, and other payload contents are never committed.

### the agent's Discretion
- Validation framework and test-library selection.
- Exact repository directory names, run identifiers, and JSON field names, provided they preserve D-12 through D-15.
- Hash algorithm and canonicalization rules for sanitized SSE evidence.
- Probe-stage sequencing and implementation details, provided observed checks remain visible and unobserved checks remain `Not verified`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope and Requirements
- `RESEARCH.md` — Authoritative transport-first scope, deployment model, security constraints, and delivery phases.
- `.planning/PROJECT.md` — Core value, extension-only boundary, Muxy-change stop gate, and active requirements.
- `.planning/REQUIREMENTS.md` — Requirement IDs and traceability; DEPL-04 through DEPL-06 require alignment with D-08 before planning.
- `.planning/ROADMAP.md` — Phase boundary and success criteria; its all-class real-validation wording requires alignment with D-08.

### Technical Research
- `.planning/research/SUMMARY.md` — Deployment trust classes, architecture, sequencing, and open transport risks.
- `.planning/research/STACK.md` — Vanilla TypeScript/Vite choice, direct WebKit `fetch()` transport, manual SSE parser, and forbidden alternatives.

### UI Contract
- `.planning/phases/01-verified-gateway-connectivity/01-UI-SPEC.md` — Approved Phase 1 layout, copy, states, design tokens, evidence matrix, and Muxy-change alert behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/phases/01-verified-gateway-connectivity/01-UI-SPEC.md`: Complete, verified contract for the Phase 1 panel and all user-visible states.
- `.agents/skills/muxy-extension/SKILL.md`: Local Muxy-native theming, sizing, surface, and interaction guidance.
- `.planning/research/STACK.md`: Concrete transport and packaging decisions suitable for direct use by the researcher and planner.

### Established Patterns
- The repository is greenfield: there is no extension scaffold or production source to preserve.
- The approved stack is a minimal vanilla TypeScript/Vite Muxy extension using DOM `fetch()`, `ReadableStream`, and an in-repo SSE parser.
- Planning artifacts consistently enforce one deployment-neutral URL/token contract and an extension-only v1.

### Integration Points
- New extension manifest and Vite build output, including copying `package.json` into `dist/`.
- Muxy panel `WKWebView` for direct browser fetch, observed origin capture, native theme variables, focus, and panel lifecycle.
- Existing user-operated or harness-managed Hermes Gateway `/v1/capabilities`, run-event SSE, and version metadata.

</code_context>

<specifics>
## Specific Ideas

- Treat validation as a moving latest-stable lane: resolve current stable Muxy and Hermes versions for each run, while recording exact immutable evidence for that run.
- Use the real Hermes SSE route with a harmless controlled fixture instead of a synthetic stream when assigning `Supported`.
- Use Docker to simulate remote HTTPS, tunnel interruption, and workspace-namespace conditions without claiming those real remote classes are supported.
- Preserve compatibility history in Git as paired Markdown and JSON, with a latest-result index and strict content allowlists.

</specifics>

<deferred>
## Deferred Ideas

- Real end-to-end qualification of SSH-forwarded Hermes, direct remote HTTPS, and remote Muxy workspace deployments. These stay `Unverified` in v1 until exercised through their actual paths.

</deferred>

---

*Phase: 01-verified-gateway-connectivity*
*Context gathered: 2026-08-16*
