# Phase 1: Verified Gateway Connectivity - Pattern Map

**Mapped:** 2026-08-16  
**Files analyzed:** 19 planned file groups  
**Analogs found:** 0 / 19 local source analogs

## Codebase Finding

This is a greenfield repository. The only non-planning files are `AGENTS.md`, `RESEARCH.md`, and `skills-lock.json`; there is no existing Muxy extension scaffold, production source, test suite, manifest, fixture, or build script. Therefore **no local code analog exists** and no local code excerpt is available to copy.

The approved references are external patterns only:

- Muxy's current vanilla TypeScript/Vite starter is the packaging/layout baseline. Generate it first, preserve its lockfile, and inspect its emitted filenames before committing to exact paths. (`01-RESEARCH.md:130`, `01-RESEARCH.md:419`)
- The project `muxy-extension` skill supplies the authoritative local conventions: panel surface, Muxy semantic tokens, native scale, `muxy.onFocus`, least privilege, no background script, and a build step that copies `package.json` into `dist/`.
- `01-RESEARCH.md:144-239` supplies the Phase 1 architecture, including direct `fetch()` with a `ReadableStream`/`TextDecoderStream`, a small chunk-safe SSE parser, evidence allowlists, and the explicit upstream stop gate.

## File Classification

Exact names below are recommended planning names under the discretion granted in `01-CONTEXT.md`. Do not claim any as already present.

| New/Modified File | Role | Data Flow | Closest Local Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch | — | none (generate Muxy starter) |
| `vite.config.ts` | config | transform | — | none (generate Muxy starter) |
| `index.html` | component / entry | request-response | — | none (generate Muxy starter) |
| `src/main.ts` | controller | event-driven, request-response | — | none |
| `src/styles.css` | component / presentation | transform | — | none |
| `src/gateway-client.ts` | service | request-response, streaming | — | none |
| `src/probe.ts` | service | request-response, streaming | — | none |
| `src/sse-parser.ts` | utility | streaming, transform | — | none |
| `src/url-policy.ts` | utility | transform | — | none |
| `src/types.ts` | model | transform | — | none |
| `src/evidence.ts` | service | batch, transform | — | none |
| `scripts/copy-manifest.mjs` | utility | file-I/O | — | none (starter pattern) |
| `scripts/validate-dist.mjs` | utility | file-I/O, batch | — | none |
| `scripts/run-validation.mjs` | service / CLI | batch | — | none |
| `fixtures/docker-compose.yml` | config | event-driven | — | none |
| `fixtures/*` | config / test fixture | streaming, batch | — | none |
| `test/gateway-client.test.ts` | test | request-response, streaming | — | none |
| `test/sse-parser.test.ts` | test | streaming, transform | — | none |
| `test/policy-evidence.test.ts` | test | transform, batch | — | none |

## Pattern Assignments

### `package.json`, `vite.config.ts`, `index.html`, and `scripts/copy-manifest.mjs` (config/entry/file-I/O)

**Local analog:** None.

**External starter pattern:** Start with Muxy's current vanilla extension starter, preserve its generated lockfile, then retain its entry layout and manifest object. The build must copy the manifest into the shipped output.

**Packaging pattern** (project `muxy-extension` skill):

```json
{
  "scripts": {
    "build": "vite build && node scripts/copy-manifest.mjs"
  }
}
```

The copy script must copy `package.json` to `dist/package.json`; build validation must assert both it and the configured panel entry exist. Do not add a background entry, `muxy.http`, or permissions for Docker, SSH, shell, Git, filesystem, storage, or process control. (`01-RESEARCH.md:252-274`, `01-RESEARCH.md:397-407`)

### `src/main.ts` and `src/styles.css` (panel controller/presentation; event-driven + request-response)

**Local analog:** None.

**External UI contract:** Implement the single scrollable panel in `01-UI-SPEC.md`, rather than introducing a component framework or deployment selector.

**Controller pattern to apply:** keep URL/token only in panel memory; validate locally before submitting; disable form controls during one in-flight probe; retain the previous verdict until the new result atomically replaces it; render only safe, normalized result fields. Wire `muxy.onFocus` to focus the URL input when idle. No token may appear in DOM text, copied reports, logs, fixtures, or evidence. (`01-UI-SPEC.md`, Interaction and Accessibility Contract)

**Style pattern to apply:** paint a panel body with `var(--muxy-background)`; use `var(--muxy-surface-solid)` and `var(--muxy-border)` for cards; use Muxy tokens exclusively; use 16px panel/card padding, 16px section gaps, 8px form gaps, 8px card radius, and 28px text controls. Honor reduced motion. (`01-UI-SPEC.md`, Design System/Layout/Spacing/Color; project skill)

### `src/gateway-client.ts` and `src/probe.ts` (service; request-response + streaming)

**Local analog:** None.

**External architecture pattern:** One topology-neutral direct browser `fetch()` client. Its inputs are only the user-supplied base URL and in-memory bearer. It calls `/v1/capabilities` and the pre-arranged harmless events target without topology detection or a native-HTTP fallback. (`01-RESEARCH.md:144-171`)

**Core stream pattern** (external research example, `01-RESEARCH.md:215-233`):

```ts
const controller = new AbortController();
const response = await fetch(eventsUrl, {
  headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
  signal: controller.signal,
});

if (!response.ok || response.body === null) throw new Error("stream-not-verified");

for await (const textChunk of response.body.pipeThrough(new TextDecoderStream())) {
  sseParser.push(textChunk);
}
```

**Error pattern to apply:** model stages independently as `passed`, `failed`, or `not_verified`; preserve only browser-observable facts. A rejected cross-origin fetch is not proof of DNS, TLS, or CORS. HTTP 401/403 is an observed authentication failure. Non-loopback HTTP fails local policy; ordinary WebKit TLS validation remains in force. (`01-RESEARCH.md:190-207`, `01-RESEARCH.md:275-287`)

### `src/sse-parser.ts` and `src/types.ts` (utility/model; streaming + transform)

**Local analog:** None.

**External architecture pattern:** Incrementally accumulate decoded text, retain incomplete lines/frames across arbitrary network chunk boundaries, recognize `event:`, `data:`, `id:`, comments, and dispatch only at a blank-line frame delimiter. The parser must never log or persist decoded event payloads. (`01-RESEARCH.md:208-239`)

**Testable contract:** inputs can split anywhere; comments/keepalives do not create content events; multiple `data:` lines preserve framing semantics; terminal/incomplete data remains unverified rather than fabricated. The panel consumes sanitized event metadata only.

### `src/url-policy.ts` (utility; transform)

**Local analog:** None.

**External architecture pattern:** parse/canonicalize locally. Permit literal loopback HTTP only for the real local transport proof; require trusted HTTPS for every non-loopback endpoint; do not expose certificate bypasses or security exceptions. Do not infer Docker/SSH/remote workspace classification from the URL. (`01-RESEARCH.md:190-207`; `01-UI-SPEC.md`, Connection form and Copywriting Contract)

### `src/evidence.ts`, `scripts/run-validation.mjs`, `fixtures/docker-compose.yml`, and `fixtures/*` (service/CLI/config; batch + transform)

**Local analog:** None.

**External architecture pattern:** Harness-only fixtures may own process and Compose lifecycle; the panel must not. Each attempt derives a schema-versioned, deterministic allowlisted JSON record plus Markdown report and updates an evidence index. Store condition/trust class/verdict/stages/resolved versions/timing/origin verdict/capability digest/safe event metadata only. Exclude hostnames, IPs, paths/queries, bearer values, authorization headers, workspace paths, raw bodies, and content-bearing event fields. (`01-CONTEXT.md`, D-05 through D-15; `01-RESEARCH.md:234-239`)

**Verdict pattern:** `Supported` requires a real path, every required check, a real authenticated incremental SSE route, and two fresh panel-session successes. Simulated SSH, HTTPS, and remote-workspace cases are always `Unverified`; a reproducible required-check failure is `Unsupported`. (`01-CONTEXT.md`, D-01 through D-08)

### `scripts/validate-dist.mjs` and `test/*.test.ts` (utility/tests; file-I/O, streaming, transform, batch)

**Local analog:** None.

**External test pattern:** Use Node's built-in `node:test` after the starter establishes its TypeScript boundary. Cover pure URL policy, stage projection, capability normalization, parser chunk boundaries, redaction/schema validation, verdict rules, dist manifest/entry assertion, and static absence of forbidden transport/permissions. (`01-RESEARCH.md:386-421`)

## Shared Patterns

### Secret Boundary

**Apply to:** panel controller, Gateway client, probe, evidence, fixtures, tests, and scripts.

Bearer material is open-panel memory only and is sent exclusively as `Authorization: Bearer`. Never put it in a URL, storage, manifest settings, DOM text, console, copied report, test fixture, or committed evidence. Use sentinel scans over build/evidence/test/report output. (`01-RESEARCH.md:288-300`; `01-UI-SPEC.md`, Interaction and Accessibility Contract)

### Transport and Authentication

**Apply to:** `src/gateway-client.ts`, `src/probe.ts`, tests.

Direct WebKit `fetch()` is the only Phase 1 Gateway path. Set `Authorization` and consume `response.body` incrementally. Do not use `EventSource` (no arbitrary auth headers) or `muxy.http.fetch` (private-host block and buffered body). Exact observed origin is a Gateway-side allowlist requirement; wildcard, `null`, and reflected origins never pass. (`01-RESEARCH.md:208-239`, `01-RESEARCH.md:246-274`)

### Evidence Redaction

**Apply to:** evidence writer, report renderer, fixture log adapter, tests.

Adopt allowlist-first transformation, deterministic shape hashing, schema versioning, paired JSON/Markdown reports, and a latest index. Raw data is ephemeral harness input only. (`01-CONTEXT.md`, D-12 through D-15)

### Muxy-Change Stop Gate

**Apply to:** probe coordinator, panel alert, report renderer, validation runner.

If exact-origin authenticated incremental streaming cannot be proven, emit the redacted failure report and minimum bridge contract, render `Muxy change required`, and stop. This authorizes no Muxy source change, provider registration, native bridge, helper, background process, or permission expansion. (`01-RESEARCH.md:241-252`; `01-UI-SPEC.md`, Phase Boundary and Upstream Change Gate)

## No Local Analog Found

All Phase 1 implementation files have no local analog because the extension scaffold does not yet exist. The planner should use the current Muxy vanilla starter only after its human-verification checkpoint, then apply the external architecture/UI contracts cited above. It must not characterize starter code as existing repository precedent.

## Metadata

**Analog search scope:** repository root excluding `.git` and planning artifacts; project instructions and `.agents/skills/muxy-extension/SKILL.md`  
**Source files scanned:** 3 non-planning root files; 0 implementation/test files  
**Pattern extraction date:** 2026-08-16
