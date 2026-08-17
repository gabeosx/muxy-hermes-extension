# Phase 3: Open-Panel Recovery Proof - Research

**Researched:** 2026-08-17  
**Domain:** Hermes Runs SSE recovery and Muxy panel lifecycle  
**Confidence:** HIGH for the present Hermes API contract and repository integration points; MEDIUM for unrun deployment fixtures.

## Summary

Phase 3 must distinguish two recovery situations.  While the *same panel* remains open, a broken `GET /v1/runs/{run_id}/events` subscription can make a bounded reattach attempt because the current Hermes Runs documentation explicitly describes the endpoint as attach/detach-friendly and retains only unconsumed event buffers for five minutes. This remains a best-effort transport operation: no reconnect outcome proves that every event, approval prompt, or assistant delta was delivered exactly once. `GET /v1/runs/{run_id}` is the authoritative source for status and final output after every interruption. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]

A recreated Muxy panel is a different lifecycle boundary. The existing project prohibits bearer persistence, background ownership, and storage-backed recovery. The user must reconnect with the URL and bearer token, enter the non-secret run ID, and receive a status-only reconciliation. The UI must say that prior streamed activity and approval detail are unavailable; it must not imply a durable subscriber, stored token, event replay, or a deployment-specific recovery path. This preserves the existing one-URL/one-token topology-neutral client contract. [VERIFIED: .planning/STATE.md] [VERIFIED: .planning/REQUIREMENTS.md]

**Primary recommendation:** Add a bounded, generation-guarded same-panel event observer with fixed backoff and guaranteed status reconciliation; add an explicit status-only "Recover a run" workflow after fresh token entry; record only safe recovery facts in versioned fixture evidence.

## Project Constraints (from AGENTS.md)

- Extension-only v1: do not modify Muxy or Hermes, add a sidecar, provider registration, deployment management, or topology detection. [VERIFIED: AGENTS.md]
- Keep bearer material only in panel/exec-stdin memory; never retain it in argv, URL, environment, journal, storage, diagnostics, fixtures, or evidence. [VERIFIED: AGENTS.md]
- Keep live status and approval ownership within the open panel; durable background ownership and closed-panel approvals are post-v1. [VERIFIED: AGENTS.md]
- Drive controls only from `/v1/capabilities`, use exact advertised controls, never auto-approve, and retain the existing manifest permission set unless a new call proves necessary. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
- Preserve Muxy native theme tokens, scale, keyboard focus/hover, and reduced-motion behavior. [VERIFIED: .agents/skills/muxy-extension/SKILL.md]
- Build output must include `package.json`; validate with `npm run build` before Muxy reload. [VERIFIED: .agents/skills/muxy-extension/SKILL.md]

## Phase Requirements

| ID | Description | Research support |
|---|---|---|
| RECV-01 | Bounded reconnect attempts with backoff while open | Same-panel observer retries a fixed number of times only after a stream ends/fails; show attempt state and stop after the bound. |
| RECV-02 | Reconciled status after an interruption | Invoke status reconciliation after every failed/closed observer and after retry exhaustion, independent of reattach outcome. |
| RECV-03 | Close/reopen token re-entry and supported recovery | Fresh connection clears the input token; status-only recovery accepts user-entered run ID and never assumes a retained subscriber. |
| RECV-04 | Distinguish failure classes in evidence without topology claims | Record observed fixture scenario IDs (`stream_interrupted`, `gateway_unreachable`, `proxy_buffered`, `panel_recreated`) separately from deployment labels. |
| RECV-05 | No lossless replay promise | Permanent recovery copy says buffered events are time-limited and may be incomplete; only status/final output are authoritative. |
| DEPL-02 | Host-native fixture | Run a disposable loopback fixture if available; otherwise retain a versioned `Unverified` record, not an inferred result. |
| DEPL-03 | Docker interruption/recovery fixture | Use the existing pinned compose Gateway as an external fixture, not as panel-managed infrastructure; test refused and interrupted conditions. |
| DEPL-04 | Simulated SSH loss/restoration | Keep the simulation `Unverified`; its signal is transport loss/restoration, never a detected tunnel type. |
| DEPL-05 | Simulated proxy/TLS/buffering | Keep local proxy evidence `Unverified` for direct remote HTTPS; record certificate/auth/buffering outcomes only. |
| DEPL-06 | Simulated remote workspace | Assert no workspace path crosses the Runs API; retain `Unverified` until a genuine remote Muxy workspace run. |
| EVID-01 | Versioned recovery evidence | Persist versions, capability shape/hash, safe event metadata/counts, control/status HTTP outcomes, observed recovery class, and cleanup result—never raw content or credentials. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| One same-panel SSE retry loop | Panel controller | Curl relay | The controller owns semantic run state; the relay only owns one temporary journal-backed stream. |
| Status reconciliation | Gateway API | Panel controller | Hermes status is authoritative and the controller translates it into UI state. |
| Panel recreation recovery | Panel UI | Gateway API | A newly constructed panel receives fresh user credentials and asks the Gateway for the named run's current status. |
| Failure classification evidence | Validation fixtures | Static evidence renderer | Fixtures establish observed conditions; the extension displays redacted summaries without classifying topology. |
| Secret lifecycle | Panel/controller | Curl stdin | Token survives only enough to operate the open-panel client and is cleared on release. |

## Existing Integration Points

| Area | Current behavior | Phase 3 action |
|---|---|---|
| `src/run-client.js` | `start()` submits then creates one `RunEventParser` and one `streamJournal` request. | Extract a reusable observer/attach method that creates a fresh parser per subscription and keeps fixed endpoint validation. |
| `src/run-controller.js` | `#streamEnded()` closes then reconciles once; `release()` invalidates generation and clears bearer. | Add fixed retry budget/backoff, generation cancellation, explicit observer/recovery state, and reconciliation after each interruption. |
| `src/curl-relay.js` | Owns one active SSE journal at a time and safely scrubs/removes it; current webview fallback is not cancellable. | Do not add concurrent streams. Await end/cleanup before a reattach attempt; release remains terminal for all retries. |
| `src/panel/app.js` | Creates a controller after success and clears visible token; panel release disconnects it. | Show run ID and recovery state; add an accessible user-entered run-ID recovery form after a fresh successful connection. |
| `src/evidence.js` / `src/stop-gate.js` | Durable evidence projects safe version/stage/frame facts, while UI matrix remains a strict five-row schema. | Extend the evidence contract only with allowlisted recovery observations, preserving safe fields and forced-Unverified remote rows. |
| Existing fixture files | Docker compose provides a pinned Gateway and deterministic model stub; scenario matrix has interruption/restoration entries. | Add recovery-focused scenario metadata/runner assertions, never panel Docker control. |

## Standard Stack

| Component | Use | Why |
|---|---|---|
| Existing `RunClient` + `RunEventParser` | Reopen the fixed `/events` route with a new parser on each attempt | Maintains the authenticated, allowlisted, run-ID-scoped contract already covered by tests. [VERIFIED: src/run-client.js] [VERIFIED: src/run-events.js] |
| Existing `CurlRelay.streamJournal` | One journal-backed request at a time | It retains no durable stream content after cleanup and keeps bearer only in curl stdin. [VERIFIED: src/curl-relay.js] |
| Existing `RunController` generation counter | Cancel stale callbacks/retries on release or a new run | Prevents a closed/replaced panel from publishing old stream results. [VERIFIED: src/run-controller.js] |
| Node built-in test runner | Unit/integration state-machine tests | Already configured as `node --test test/*.test.js`; no package installation is warranted. [VERIFIED: package.json] |
| Existing pinned Docker fixture | Disposable factual recovery test | Docker is installed locally; it is test tooling, not extension authority. [VERIFIED: fixtures/simulations/docker-compose.yml] [VERIFIED: local `docker --version`] |

**No packages are required.** Adding a reconnect, EventSource, background, storage, proxy, or retry package would either duplicate the established small state machine or expand authority without a Phase 3 need.

## Architecture Pattern

```text
same open panel
  active relay SSE ends/fails
        |
        v
  controller marks interruption + reconciles GET /runs/{id}
        |
        +--> terminal status -> render authoritative final status/output + recovery warning
        |
        +--> still active AND retry budget remains
                 |
                 v
             wait fixed backoff -> new single relay SSE observer -> reconcile again
        |
        +--> budget exhausted -> render disconnected warning + refreshable authoritative status

recreated panel
  URL + bearer re-entered -> capability probe -> user enters run ID
        |
        v
  GET /runs/{id} only -> render current status/output and explicit no-history/no-approval-replay warning
```

### Same-panel observer rules

1. The initial SSE subscription is attempt zero. Use a small fixed budget (for example, two reattach attempts) and fixed, test-injected backoff delays; do not use unbounded exponential retry or background timers. [ASSUMED: exact count/delays are project discretion]
2. End or failure always causes status reconciliation before the next reattach decision. A terminal status ends observation; a nonterminal status can advance the bounded retry sequence. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]
3. Start each retry only after the previous relay promise has settled and journal cleanup has run. `CurlRelay` permits one active stream, so concurrent reattach streams would violate the current ownership boundary. [VERIFIED: src/curl-relay.js]
4. Reconnect copy must state “attempting to resume live updates” rather than “replaying history.” After any interruption, keep a visible warning that some events or approval details may be absent or duplicated. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]
5. `release()` increments generation before awaiting teardown. No delayed timer, reattach promise, or status result may update released state. [VERIFIED: src/run-controller.js]

### Recreated-panel recovery rules

1. Do not persist bearer, run ID, activity, approval choices, or event cursor. The panel starts without a run owner. [VERIFIED: AGENTS.md] [VERIFIED: src/panel/app.js]
2. After a new successful token-backed probe, provide a `Run ID` input and a status recovery action. Validate against the existing safe run-ID grammar and call only the fixed status endpoint. [VERIFIED: src/run-events.js] [VERIFIED: src/run-client.js]
3. Render the `output` supplied by status as current/final output; leave assistant activity and pending approval empty. Status polling is documented as the post-navigation recovery path and terminal state is retained briefly, but neither fact is a replay guarantee. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]
4. Do not automatically attach a recreated panel to `/events` in this phase. The UI may later offer fresh observation only after a dedicated fixture establishes the desired semantics; current Phase 3 acceptance needs truthful status recovery, not durable event ownership. [ASSUMED: conservative product choice resolving ambiguous roadmap wording]

## Don't Hand-Roll

| Problem | Do not build | Use instead | Why |
|---|---|---|---|
| Stream protocol parsing | A second ad-hoc parser or `EventSource` path | Existing `RunEventParser` through the curl relay | Keeps bearer out of URLs and preserves allowlisted framing. |
| Background run ownership | `background.js`, daemon, subprocess, or storage journal | Open-panel controller plus Gateway status endpoint | Closed-panel durable state is explicitly deferred. |
| Deployment detection | Docker/SSH/proxy/workspace heuristics | Observed failure-class fixtures | A URL/transport error cannot establish topology. |
| Event replay guarantee | Cursor database or synthetic transcript merge | Hermes attachment attempt plus status reconciliation | Hermes limits unconsumed buffers to five minutes and makes no exact-once promise. |
| Secret persistence | `muxy.storage`, local/session storage, manifest config | Fresh bearer entry after recreation | Storage is not an approved credential boundary. |

## Common Pitfalls

### Treating a stream close as a terminal run

The existing controller treats a stream ending as a one-shot reconciliation. Phase 3 must preserve that reconciliation but treat nonterminal status as an interruption, not completion. A stream may disappear because of relay timeout, gateway loss, proxy behavior, or panel lifecycle, while the run continues. [VERIFIED: src/run-controller.js] [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]

### Retrying after panel release

The current Promise-based webview `exec` fallback cannot actively cancel a command. Retrying before it settles would create a second stream owner; retrying after `release()` could expose stale UI state. The generation guard and `release()` check must be tested with deferred promises. [VERIFIED: src/curl-relay.js] [VERIFIED: src/run-controller.js]

### Confusing reattach with lossless replay

Current Hermes documentation allows attach/detach and a five-minute unconsumed buffer, but it also bounds that buffer. A reconnecting client cannot know which bytes were accepted by the journal/UI at the point of interruption. Never invent a resume cursor, never label a recovered approval as current unless a new event supplies it, and keep the warning after a successful reattach. [CITED: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md]

### Persisting a convenience recovery token

Preserving token, run ID, or stream transcript in browser or Muxy storage would change the security/lifecycle model. The recovery UI must demand fresh token entry and the user-provided run ID; it can display a currently active run ID for manual copy without storing it. [VERIFIED: AGENTS.md] [VERIFIED: src/panel/app.js]

### Claiming an observed fault identifies a deployment

Tunnel loss, a gateway restart, and proxy buffering can all appear as an interrupted/timeout stream. Evidence must name the fixture scenario and observed request/status outcomes, while deployment matrix verdicts for simulated SSH/HTTPS/remote workspace stay `Unverified`. [VERIFIED: fixtures/simulations/scenarios.json] [VERIFIED: src/stop-gate.js]

## Evidence Design

### Safe recovery projection

Persist exactly the existing safe version tuple plus an allowlisted recovery object:

```js
{
  scenario: "stream_interrupted",       // fixture scenario, not inferred topology
  panelLifecycle: "same_panel",         // or "panel_recreated"
  observerAttempts: 3,
  reattached: false,
  statusOutcome: "running",             // Gateway's normalized status
  eventHistory: "not_verified",         // never "complete" without a fixture predicate
  approvalDetail: "not_recovered",
}
```

`scenario`, lifecycle enum values, attempts, normalized status, and boolean result are safe structural facts. Do not store raw error text, timestamps tied to endpoint identity, event payloads, output, approval command/choice, bearer, URL, workspace path, or journal bytes. [ASSUMED: exact schema field names are planner discretion; redaction boundary follows existing evidence contract]

### Fixture matrix

| Fixture scenario | Required observation | Matrix claim |
|---|---|---|
| Host-native loopback | authenticated status plus incremental Runs stream; interruption/reconnect only if actually run | `Supported` only after fresh real-panel evidence, otherwise `Unverified` |
| Docker published loopback | normal run, refusal, stream interruption, reattach/reconciliation, panel recreation status recovery | real-path evidence for the tested facts only |
| Simulated SSH local forward | interrupted and restored relay against local simulation | `Unverified`; wording never says “tunnel detected” |
| Local HTTPS/reverse proxy | auth/TLS refusal and deliberately buffered or interrupted stream | `Unverified` for direct remote HTTPS |
| Simulated remote Muxy workspace | request has no workspace path and recovery contract is unchanged | `Unverified` until actual remote-workspace Muxy run |

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---:|---|---|
| Node.js | existing tests/build | Yes | v26.5.0 | — |
| npm | existing tests/build | Yes | 11.17.0 | — |
| Docker + Compose | disposable Docker recovery fixture | Yes | Docker 29.7.2 / Compose v5.3.1 | deterministic relay/controller tests if native fixture cannot run |
| Muxy desktop panel | native lifecycle proof | Not established in this research session | — | mark native lifecycle evidence `Unverified`; automated behavior remains required |
| Pinned Hermes fixture image | Docker recovery proof | Not probed here | pinned in compose | no support claim until fixture starts successfully |

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Node built-in test runner |
| Config file | none |
| Quick command | `node --test test/run-client.test.js test/run-controller.test.js test/ui-contract.test.js` |
| Full command | `npm run validate` |

### Phase Requirements → Test Map

| Requirement | Behavior | Test type | Automated command | File status |
|---|---|---|---|---|
| RECV-01 | retries are bounded, ordered, and expose backoff state | unit | `node --test test/run-controller.test.js` | extend existing |
| RECV-02 | every stream interruption reconciles status even after retry failure | unit | `node --test test/run-controller.test.js` | extend existing |
| RECV-03 | status-only recovery after fresh connection; no persisted token/transcript | unit/UI contract | `node --test test/run-client.test.js test/ui-contract.test.js` | extend existing |
| RECV-04 | fixture scenarios classify observations without topology detection | integration | `node --test test/simulated-relay.test.js test/evidence*.test.js` | extend existing |
| RECV-05 | UI warns about incomplete history; evidence lacks raw data | UI/security | `node --test test/ui-contract.test.js test/evidence*.test.js` | extend existing |
| DEPL-02..06 | fixture matrix stays truthful | integration/manual | `npm run validate` plus explicit fixture runner | runner/evidence gap |
| EVID-01 | safe recovery projection has versioned validation | unit/integration | `node --test test/evidence*.test.js` | extend existing |

### Wave 0 gaps

- [ ] Add controller tests for retry success, retry exhaustion, stale generation/release, and status-reconcile failure.
- [ ] Add RunClient test proving fresh parser/endpoint per reattach and run-ID validation for status-only recovery.
- [ ] Add UI contract tests for fresh token entry, Run ID recovery input, no history/approval replay copy, and no storage/background permission.
- [ ] Add evidence schema/fixture tests for recovery observations and forced-Unverified simulated rows.
- [ ] Add a repeatable native/Docker checklist that captures only allowlisted recovery facts and cleanup.

## Security Domain

| ASVS category | Applies | Standard control |
|---|---|---|
| V2 Authentication | Yes | Bearer remains only in private controller memory and curl stdin; recovery requires fresh entry. |
| V3 Session Management | Yes | Generation invalidation and bounded same-panel observer; no session/token persistence. |
| V4 Access Control | Yes | Advertised-only stop/steer/approval controls remain capability gated after recovery. |
| V5 Input Validation | Yes | Existing safe run-ID grammar; fixed endpoints; bounded prompt/steer values. |
| V6 Cryptography | Yes for remote destinations | Preserve normal TLS validation; do not add bypasses or a proxy trust exception. |

## Assumptions Log

| # | Claim | Risk if wrong |
|---|---|---|
| A1 | Two reattach attempts after the initial observer are a sufficient UX bound. | Low: tune a constant/test expectation without protocol or security impact. |
| A2 | Recreated panels should be status-only rather than automatically reattach. | Medium: this is the conservative interpretation of the lifecycle boundary; a future proven attach mode needs explicit UX/evidence work. |
| A3 | Recovery evidence can add the proposed structural fields to the current schema/index path. | Medium: implementation must preserve exact schema/version validators and safe projection rules. |

## Open Questions

1. **Does the exact pinned Hermes image replay the desired event types to a second subscriber after a mid-stream disconnect?**
   - Current official documentation supports attach/detach with a five-minute unconsumed buffer.
   - The existing Phase 1 D-20 decision was based on a prior tested release and says it was not reconnectable.
   - **Resolution:** run the disposable pinned fixture. Until it passes, use status reconciliation as truth and phrase reattach only as a best-effort attempt.
2. **Can the current Muxy webview's Promise-only `exec` termination be observed promptly enough for a native interruption test?**
   - Current relay cannot cancel that fallback actively.
   - **Resolution:** unit-test controller generation behavior; native proof should use an externally interrupted fixture and wait for the existing relay timeout/settlement rather than claim immediate cancellation.

## Sources

- [Hermes API Server documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) — current primary source checked 2026-08-17; capabilities, Runs status, attach/detach event endpoint, five-minute unconsumed buffer, and stop semantics.
- [Muxy extension guide](../../.agents/skills/muxy-extension/SKILL.md) — local project guidance; panel session lifecycle, native UX, least privilege, and build contract.
- In-repository primary sources: `src/run-client.js`, `src/run-controller.js`, `src/curl-relay.js`, `src/panel/app.js`, `src/evidence.js`, `src/stop-gate.js`, `fixtures/simulations/scenarios.json`, `package.json`, and `.planning/REQUIREMENTS.md`.

## Metadata

- Standard stack: **HIGH** — no new package or authority is needed.
- Architecture: **HIGH** — current code has a single controller/relay seam and Hermes documents the status/attachment behavior.
- Deployment qualification: **MEDIUM** — only a fresh named fixture can turn an observation into a claim.
- Valid until: 2026-09-16, except re-check Hermes API documentation before changing recovery semantics.
