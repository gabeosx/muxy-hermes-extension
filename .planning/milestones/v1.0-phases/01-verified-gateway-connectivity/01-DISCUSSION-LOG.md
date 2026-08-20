# Phase 1: Verified Gateway Connectivity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-16
**Phase:** 01-verified-gateway-connectivity
**Areas discussed:** Proof standard, Fixture ownership, Version policy, Evidence artifacts

---

## Proof Standard

### Evidence required for `Supported`

| Option | Description | Selected |
|--------|-------------|----------|
| Real end-to-end proof | Actual Muxy panel uses the deployment's real path; simulations supplement negative paths only | ✓ |
| Protocol harness | A conforming local simulator may establish support | |
| Operator evidence | Logs or attestation may establish support | |

### Verdict assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Strict three-state rules | All checks pass for Supported; reproducible failure for Unsupported; incomplete stays Unverified | ✓ |
| Partial support | Core connectivity may count despite incomplete checks | |
| Per-check only | No overall fixture verdict | |

### Repeatability

| Option | Description | Selected |
|--------|-------------|----------|
| Two clean runs | Two fresh-panel probes against the same fixture and version pair | ✓ |
| One recorded run | One passing run is enough | |
| Ongoing sample | Require repeated runs over launches or days | |

### Streaming proof

| Option | Description | Selected |
|--------|-------------|----------|
| Real Hermes SSE route | Authenticated real event route with a harmless controlled fixture | ✓ |
| Capabilities only | Postpone streaming proof to Phase 2 | |
| Synthetic SSE | Test-server stream substitutes for Hermes | |

**User's choice:** Strict real-path qualification with two clean runs and a real Hermes SSE route.
**Notes:** User asked the agent to choose whether further questions were necessary; the agent moved on because the proof standard was complete.

---

## Fixture Ownership

### Infrastructure ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Split ownership | Repository owns tooling/recipes and local fixtures; operators supply remote infrastructure | ✓ initially |
| Repository provisions everything | Project creates local and remote infrastructure | |
| User supplies everything | Probe only; all fixtures are manual | |

### Host-native lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Attach only | Operator starts Hermes | |
| Runner launches Hermes | Validation harness starts/stops the pinned process | ✓ |
| Substitute Docker | No distinct native fixture | |

### Docker lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Repository Compose fixture | Pinned image/revision, loopback port, runner teardown | ✓ |
| User container | Attach to an existing container | |
| Both | Maintain automated and attach modes | |

### Remote conditions

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow v1 claim | Simulate remote conditions locally and keep them Unverified | ✓ |
| Real remote fixtures | Use operator-supplied or hosted real paths | |
| Simulation counts as support | Treat Docker simulation as remote proof | |

**User's choice:** Repository tooling manages pinned native and Docker fixtures. Remote conditions are simulated in Docker and remain Unverified.
**Notes:** User initially referenced a shared hosted fixture, then clarified that real remote validation is not a concern and chose to narrow v1. This conflicts with current DEPL-04/05/06 wording and is flagged for artifact alignment.

---

## Version Policy

### Version target

| Option | Description | Selected |
|--------|-------------|----------|
| Exact permanent pair | Freeze one stable pair for v1 | |
| Installed versions | Use whatever the operator has | |
| Multi-version matrix | Maintain several pairs | |
| Continuous latest stable | Resolve current stable versions for every validation run | ✓ |

### New release behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Revalidation required | Prior result becomes historical immediately | |
| Carry support forward | Keep Supported until a regression is observed | ✓ |
| Keep two pairs | Support latest and previous | |

### Freshness presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent freshness warning | Show latest versions are unverified | |
| No prominent warning | Keep version/date in details | ✓ |
| Historical label | Change the visible verdict | |

### Latest regression

| Option | Description | Selected |
|--------|-------------|----------|
| Latest result wins | Latest reproducible failure marks class Unsupported | ✓ |
| Keep overall support | Preserve prior verdict and show regression in details | |
| Two failed runs | Delay override until failure repeats twice | |

**User's choice:** Continuously validate latest stable releases, carry prior support without a prominent warning, and let a reproducible latest-version failure override it.
**Notes:** Every run still records exact resolved versions, commit/image digest, and date.

---

## Evidence Artifacts

### Formats

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown and JSON | Human report plus schema-versioned structured record | ✓ |
| Markdown only | Human-readable evidence only | |
| JSON only | Generate views later | |

### Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Committed history | Versioned redacted results plus latest index | ✓ |
| Local only | Commit summary only | |
| CI only | External automation artifacts | |

### Endpoint redaction

| Option | Description | Selected |
|--------|-------------|----------|
| Strict redaction | Retain classes/outcomes; omit endpoint identity and secrets | ✓ |
| Full non-secret URL | Commit base URL | |
| Operator-selected | Per-run redaction choices | |

### SSE evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Normalized allowlist | Metadata, ordering, shape, sizes, and stable hashes only | ✓ |
| Redacted raw frames | Preserve full frames after filtering | |
| Schema summary | No representative instances | |

**User's choice:** Commit paired Markdown/JSON evidence with strict endpoint redaction and normalized SSE metadata.
**Notes:** Prompts, outputs, tool payloads, tokens, headers, paths, hostnames, IPs, and raw bodies are prohibited from committed evidence.

## the agent's Discretion

- The agent chose to end proof-standard questioning after four decisions when the user delegated that transition.
- Validation framework, artifact directory naming, run identifiers, JSON field names, stable-hash algorithm, and probe-stage implementation remain flexible within the locked contracts.

## Deferred Ideas

- Real end-to-end qualification for SSH-forwarded, direct remote HTTPS, and remote Muxy workspace deployment classes.
