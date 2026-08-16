---
phase: 1
slug: verified-gateway-connectivity
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-16
reviewed: 2026-08-16
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for the deployment-neutral Gateway connectivity proof. This phase proves a safe URL/token connection and evidence surface; it does not implement chat, runs, approvals, deployment management, or Muxy-source integration.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — vanilla TypeScript and DOM APIs |
| Preset | not applicable |
| Component library | none |
| Icon library | SF Symbols through Muxy's supported icon mechanism; use 12–14px glyphs at weight 600 |
| Font | System UI; `SF Mono, Menlo, monospace` only for version identifiers, URLs after sanitization, and capability digests |

The panel paints `var(--muxy-background)` and uses Muxy's injected CSS variables exclusively. It has no custom topbar, sidebar, or deployment picker. Do not use shadcn, a registry block, hard-coded chrome colors, a background script, or a native HTTP escape hatch.

---

## Layout and Component Inventory

Use a single, scrollable panel column. Keep the connection form above the result because it is the only action the user performs in this phase. The same form applies to every Gateway topology; topology is neither selected nor inferred.

| Region | Contents | Behavior |
|--------|----------|----------|
| Connection header | Title `Hermes Gateway`, one-line purpose, `Panel-only credentials` footnote | Title is 14px semibold; footnote says the bearer token is cleared when the panel closes. |
| Connection form | Labeled `Gateway URL` text input; labeled `Bearer token` password input; `Test connection` primary button | Both fields are required. Never prefill, store, log, or echo the token. The button is disabled until both fields are non-empty and the URL passes local syntax/policy validation. |
| Trust note | Compact static note beneath the form | Say that literal loopback HTTP is evaluated only by the local transport proof and every non-loopback endpoint requires normally trusted HTTPS. Do not present it as a user-selectable security exception. |
| Connection verdict | One status card after a test | Shows a text status, timestamp, safe endpoint display, observed origin outcome, authentication outcome, and capability-discovery outcome. Do not show the token, request headers, raw server body, DNS address, workspace path, or inferred deployment type. |
| Diagnostic disclosure | Native-style `Details` disclosure inside the verdict card | Lists one normalized failure class at a time: URL, DNS, TLS, refusal, timeout, CORS/preflight, authentication, protocol, or streaming. Keep raw detail redacted and show a retry path. |
| Capability summary | Read-only compact list after a successful probe | Shows the protocol/fixture version and advertised capability names. State `Run controls appear in Phase 2`; never render start, stop, steer, approval, or chat controls in Phase 1. |
| Validation evidence | Read-only section below the current verdict | Renders fixture rows for Host-native loopback, Docker published loopback, SSH local forward, Direct remote HTTPS, and Remote Muxy workspace. Each row carries a text verdict—`Supported`, `Unsupported`, or `Unverified`—plus fixture version and a concise, secret-safe explanation. It is evidence, not a deployment selector. |
| Transport-stop alert | Critical non-dismissible card, only after a failed safety/streaming gate | Title: `Muxy change required`. It says Phase 1 is paused, no Muxy change has been made, and exposes `Copy failure report` and `View bridge contract` actions. It never offers to install a bridge, register an agent, or alter Muxy. |

Panel geometry: use 16px content padding on all sides, 16px section gaps, and 8px form-row gaps. Cards use a 1px `var(--muxy-border)` border, `var(--muxy-surface-solid)` fill, 8px radius, and 16px inner padding. Compact result rows use 8px padding. Full-height content scrolls vertically; do not create horizontal scrolling or a fixed footer.

---

## Spacing Scale

Use Muxy's native scale subset rather than a new 8-point system.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Adjacent icon buttons; badge internals |
| sm | 8px | Label-to-field gap, form row gap, icon-and-label gap |
| md | 16px | Card padding, section gaps, and panel content padding |
| lg | 24px | Major result/evidence separation and icon-only hit targets |
| xl | 32px | Reserved for an empty-panel vertical break |
| 2xl | 48px | Reserved for a deliberate major panel separation |
| 3xl | 64px | Reserved for a sparse empty-panel break only |

All layout spacing uses this scale. Native text-button and input height is 28px; borders are 1px and the focus ring is 2px, which are control geometry rather than layout spacing.

---

## Typography

Use exactly these four sizes and two weights. Do not introduce a display type scale for this proof panel.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Caption / validation metadata | 11px | 400 | 1.4 |
| Body / diagnostic detail | 12px | 400 | 1.5 |
| Control text / input value | 13px | 400 | 1.2 |
| Panel title / section label | 14px | 600 | 1.2 |

Use 11px semibold only for uppercase micro-labels where Muxy already uses them; no extra weight may be introduced. Long URL and fixture text use the monospace family at the same size as their surrounding role, wrap at word-break opportunities, and never overflow the card.

---

## Color

All colors are Muxy semantic tokens and automatically follow the host light/dark theme.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--muxy-background)` and `var(--muxy-foreground)` | Panel canvas and primary text |
| Secondary (30%) | `var(--muxy-surface-solid)`, `var(--muxy-surface)`, `var(--muxy-border)`, `var(--muxy-foreground-muted)` | Cards, inputs, separators, supporting text |
| Accent (10%) | `var(--muxy-accent)` with `var(--muxy-accent-foreground)` | `Test connection` fill and keyboard focus ring only |
| Semantic success / blocking | `var(--muxy-diff-add)` / `var(--muxy-diff-remove)` | Text-plus-icon status markers and a blocked transport-gate alert; never as the only signal |

Accent is reserved for the enabled `Test connection` button and the visible focus indicator. Normal links, evidence rows, secondary actions, and passive success states do not consume the accent. There is no destructive operation in this phase; `--muxy-diff-remove` communicates a blocked security or transport verdict only, never a destructive button.

---

## Interaction and Accessibility Contract

- On panel focus, call `muxy.onFocus` and place focus in `Gateway URL` when no test is in progress. Do not refocus or clear either field after a failed test.
- Tab order is URL → bearer token → Test connection → Details disclosure → evidence rows/actions. Every control has an always-visible label; placeholders are examples only.
- The bearer-token field uses password masking, disables browser autocomplete where supported, and has no reveal, copy, save, or persistence control in v1. Values must never reach DOM text, console output, fixture files, or copied reports.
- Pressing Enter in either valid field submits `Test connection`; invalid submission focuses the first invalid field and shows its inline message. Escape performs no destructive action and does not clear credentials.
- While a request is in flight, replace button text with `Testing connection…`, disable the form and repeat submit, and announce the state through a polite live region. The progress indication is text-plus-inline spinner; it has no looping decorative animation.
- A successful verdict uses an icon, a text label, and a concise explanation. A failed verdict uses an icon, a text label, the normalized failure class, and a `Test connection again` path. Blocking safety failures are announced assertively and move focus to the alert heading.
- `Details` is a semantic button with `aria-expanded`; it preserves its open state for the current result only. Copy actions copy a redacted report, then announce `Redacted report copied` without rendering its contents in a toast.
- Evidence rows are keyboard reachable. Long explanations wrap to multiple lines; the list scrolls vertically inside the panel rather than truncating a safety verdict.
- Hover state is `var(--muxy-hover)` plus a border-color change; focus is a 2px `var(--muxy-accent)` ring with offset. Never signal interaction by lowering whole-control opacity.
- Honor `prefers-reduced-motion`: use no animated card entrance, progress sweep, status transition, or automatic disclosure. The spinner becomes a static `Testing` indicator under reduced motion.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Test connection` |
| Initial/empty state heading | `Connect a Hermes Gateway` |
| Initial/empty state body | `Enter the Gateway URL and bearer token for this panel session. Your token is cleared when the panel closes.` |
| Validation: missing URL | `Enter a Gateway URL.` |
| Validation: non-loopback HTTP | `Use HTTPS for a non-loopback Gateway. Certificate bypass is not supported.` |
| Loading state | `Testing connection…` |
| Retest carryover | `Previous result` — remains visible until the new verdict atomically replaces it. |
| Success state | `Connection verified` — `Authentication, exact-origin access, and capability discovery succeeded.` |
| Generic error state | `Connection not verified` — `Check the Gateway URL and token, confirm its exact Muxy origin is allowed, then test the connection again.` |
| CORS error state | `The Gateway did not allow this Muxy panel origin.` — `Allow the exact observed origin on the Gateway; wildcard, null, and reflected origins are not accepted.` |
| Streaming error state | `The Gateway connected, but live streaming was not verified.` — `Review the redacted failure report before claiming this deployment is supported.` |
| Capability loading | `Discovering capabilities…` |
| Capability empty | `No capabilities advertised` — `This Gateway did not advertise any controls for this client.` |
| Capability partial | `Partially verified` — valid capability names may be shown, but unsupported controls are never inferred. |
| Empty evidence row | `Unverified` — `No versioned fixture result has been recorded for this deployment condition.` |
| Transport-stop alert | `Muxy change required` — `Phase 1 is paused. No Muxy change has been made. Review the failure report and minimum bridge contract before expanding scope.` |
| Stop-alert action progress | `Copying report…` / `Loading bridge contract…` |
| Stop-alert action failure | `Could not copy the failure report.` / `Could not load the bridge contract.` — retain the alert and offer the same action again. |
| Destructive confirmation | None. Phase 1 has no destructive actions and must not clear credentials except when the panel closes. |

Never say a deployment is selected, detected, secure, repaired, or permanently supported. Use the evidence terms `Supported`, `Unsupported`, and `Unverified` exactly; show the fact behind the verdict.

---

## UI Considerations

Applicable state considerations resolved: 33 closed — 32 explicit, 1 dismissed, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Connection form | ✅ covered | Before the first test, render the documented `Connect a Hermes Gateway` copy and an empty required URL/token form. |
| loading | Connection form | ✅ covered | During a probe, disable both fields and repeat submission, label the action `Testing connection…`, and announce progress politely. |
| error | Connection form | ✅ covered | Invalid submission preserves both fields, focuses the first invalid field, and shows its inline recovery message. |
| partial | Connection form | ✅ covered | If either field is missing or the URL fails local policy validation, submission remains disabled and no verdict is created. |
| long-text | Connection form | ✅ covered | Inputs remain single-line and scroll internally; any sanitized URL rendered outside a field wraps without horizontal panel overflow. |
| empty | Connection verdict | ✅ covered | Do not render a verdict card before the first test; the form owns the initial state. |
| loading | Connection verdict | ✅ covered | During a retest, preserve the last card with `Previous result` until the new result atomically replaces it. |
| error | Connection verdict | ✅ covered | Render one normalized failure class, redacted explanation, and `Test connection again` without raw response or secret data. |
| populated | Connection verdict | ✅ covered | A verified card shows text status, timestamp, safe endpoint, origin, authentication, and capability-discovery outcomes. |
| partial | Connection verdict | ✅ covered | Show observed outcomes and label unobserved checks `Not verified`; never upgrade the overall verdict. |
| overflow | Connection verdict | ✅ covered | Rows and redacted diagnostics wrap vertically and rely on panel scrolling; safety details are never clipped. |
| zero-one-many | Connection verdict | ⛔ dismissed | Exactly one current verdict exists; repeated tests replace it rather than create a collection. |
| long-text | Connection verdict | ✅ covered | Long safe endpoints and diagnostics wrap without exposing headers, tokens, or raw server bodies. |
| empty | Capability summary | ✅ covered | A successful empty payload renders `No capabilities advertised` and keeps all run controls absent. |
| loading | Capability summary | ✅ covered | While discovery is active, show `Discovering capabilities…` beneath the in-flight connection status. |
| error | Capability summary | ✅ covered | On discovery failure, omit the list, mark discovery `Not verified`, and offer `Test connection again`. |
| populated | Capability summary | ✅ covered | Show the protocol or fixture version and every valid advertised capability name in a compact read-only list. |
| partial | Capability summary | ✅ covered | Render valid names, label the summary `Partially verified`, and make no unsupported control claims. |
| overflow | Capability summary | ✅ covered | Rows wrap within the panel and extend vertical scrolling; do not add a horizontal scroller. |
| zero-one-many | Capability summary | ✅ covered | Zero uses empty copy; one or many use the same stacked row treatment with 8px gaps. |
| long-text | Capability summary | ✅ covered | Long capability names wrap or break within their row and never widen the panel. |
| empty | Validation evidence | ✅ covered | With no result, render `Unverified` and the documented no-versioned-result explanation. |
| loading | Validation evidence | ✅ covered | Show `Loading validation evidence…` while preserving already verified rows. |
| error | Validation evidence | ✅ covered | Preserve the current verdict and show `Validation evidence is unavailable` with retry. |
| populated | Validation evidence | ✅ covered | Each row shows condition, textual verdict, fixture version, and secret-safe explanation. |
| partial | Validation evidence | ✅ covered | Missing fixture fields render `Not recorded` and force the row to remain `Unverified`. |
| overflow | Validation evidence | ✅ covered | Rows and reports wrap and the panel scrolls vertically; no safety explanation is clipped. |
| zero-one-many | Validation evidence | ✅ covered | Zero uses empty copy, one remains full width, and many stack with 8px gaps. |
| long-text | Validation evidence | ✅ covered | Long versions and explanations wrap safely without exposing secrets or creating horizontal scrolling. |
| loading | Transport-stop alert | ✅ covered | Report and contract actions expose independent pending labels and never dismiss or replace the alert. |
| error | Transport-stop alert | ✅ covered | Action failure shows an inline action-specific error and retry while Phase 1 remains paused. |
| overflow | Transport-stop alert | ✅ covered | The alert and actions wrap vertically and remain reachable through panel scrolling at narrow widths. |
| long-text | Transport-stop alert | ✅ covered | Long explanations wrap before actions without clipping or reducing control targets. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | none | not applicable — no shadcn initialization and no third-party registry |

---

## Phase Boundary and Upstream Change Gate

This UI must not expose Docker, SSH, process, terminal, filesystem, Git, workspace-path, agent-registration, bridge-installation, certificate-bypass, token-storage, or deployment-detection controls. It requests only the Muxy permission proven necessary to render the panel; the intended Phase 1 implementation requires no Muxy permission for these controls.

If direct authenticated WebKit streaming cannot safely satisfy the exact-origin and incremental-delivery proof for a claimed fixture, render the documented transport-stop alert and produce the redacted failure report plus minimum bridge contract. That is an explicit stop condition: do not modify Muxy, register Hermes as a provider, or present an upstream-change confirmation in the extension.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-16
