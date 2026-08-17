import { GatewayClient, normalizeGatewayUrl } from "./gateway-client.js";

export const ProbeState = Object.freeze({
  IDLE: "idle",
  TESTING: "testing",
  SUCCESS: "success",
  PARTIAL: "partial",
  FAILURE: "failure",
});

export const FailureClass = Object.freeze({
  URL: "url",
  RELAY: "relay",
  GATEWAY_DNS: "gateway_dns",
  GATEWAY_TLS: "gateway_tls",
  GATEWAY_REFUSED: "gateway_refused",
  GATEWAY_UNREACHABLE: "gateway_unreachable",
  GATEWAY_TIMEOUT: "gateway_timeout",
  AUTHENTICATION: "authentication",
  CAPABILITY_PROTOCOL: "capability_protocol",
  PROTOCOL: "protocol",
  JOURNAL_LIMIT: "journal_limit",
  STREAMING: "streaming",
});

function observed(state) {
  return state === "passed" ? "passed" : state === "failed" ? "failed" : "not_verified";
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function stage(state) {
  return freeze({ state: observed(state) });
}

function safeNames(names) {
  if (!Array.isArray(names)) return [];
  return [...new Set(names.filter((name) => typeof name === "string" && name.length > 0 && name.length <= 128))].sort();
}

function safeVersion(version) {
  return typeof version === "string" && version.length > 0 && version.length <= 128 ? version : null;
}

export function toSafeVerdict(result, { endpoint, startedAt, finishedAt }) {
  const relayOutcome = stage(result?.relay?.state ?? result?.request?.state);
  const authenticationOutcome = stage(result?.authentication?.state);
  const capabilityOutcome = stage(result?.capabilities?.state);
  const streamOutcome = stage(result?.stream?.state);
  const relayReason = result?.relay?.reason ?? result?.request?.reason;
  const streamReason = result?.stream?.reason;
  let failureClass = null;
  if (relayOutcome.state === "failed" && relayReason === "gateway_dns") failureClass = FailureClass.GATEWAY_DNS;
  else if (relayOutcome.state === "failed" && relayReason === "gateway_tls") failureClass = FailureClass.GATEWAY_TLS;
  else if (relayOutcome.state === "failed" && relayReason === "gateway_refused") failureClass = FailureClass.GATEWAY_REFUSED;
  else if (relayOutcome.state === "failed" && relayReason === "gateway_unreachable") failureClass = FailureClass.GATEWAY_UNREACHABLE;
  else if (relayOutcome.state === "failed" && relayReason === "gateway_timeout") failureClass = FailureClass.GATEWAY_TIMEOUT;
  else if (relayOutcome.state === "failed" && relayReason === "journal_limit") failureClass = FailureClass.JOURNAL_LIMIT;
  else if (relayOutcome.state === "failed" && relayReason === "protocol") failureClass = FailureClass.PROTOCOL;
  else if (relayOutcome.state === "failed") failureClass = FailureClass.RELAY;
  else if (authenticationOutcome.state === "failed") failureClass = FailureClass.AUTHENTICATION;
  else if (capabilityOutcome.state === "failed") failureClass = FailureClass.CAPABILITY_PROTOCOL;
  else if (streamOutcome.state === "failed" && streamReason === "protocol") failureClass = FailureClass.PROTOCOL;
  else if (streamOutcome.state === "failed") failureClass = FailureClass.STREAMING;
  else if (capabilityOutcome.state === "passed" && streamOutcome.state === "not_verified" && streamReason !== "cancelled") failureClass = FailureClass.STREAMING;

  const allObserved = [relayOutcome, authenticationOutcome, capabilityOutcome, streamOutcome]
    .every((outcome) => outcome.state === "passed");
  return freeze({
    status: failureClass ? ProbeState.FAILURE : allObserved ? ProbeState.SUCCESS : ProbeState.PARTIAL,
    startedAt,
    finishedAt,
    endpoint,
    endpointTrustClass: endpoint.startsWith("http://127.0.0.1") || endpoint.startsWith("http://[::1]") ? "loopback_http" : "https",
    url: stage(result?.url?.state),
    relayOutcome,
    authenticationOutcome,
    capabilityOutcome,
    streamOutcome,
    failureClass,
    retryable: true,
    capabilityNames: safeNames(result?.capabilities?.names),
    capabilityVersion: safeVersion(result?.capabilities?.version),
    streamEventCount: Number.isInteger(result?.stream?.eventCount) ? result.stream.eventCount : null,
    previousResult: null,
  });
}

export class ConnectionProbe {
  #client;
  #now;
  #attempt = 0;
  #controller = null;
  #abortPromise = Promise.resolve();
  #listeners = new Set();
  #snapshot = freeze({ status: ProbeState.IDLE, previousResult: null });

  constructor({ client = new GatewayClient(), now = () => new Date().toISOString() } = {}) {
    this.#client = client;
    this.#now = now;
  }

  get snapshot() { return this.#snapshot; }

  prepare() {
    return this.#client.prepare?.() ?? Promise.resolve();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  abort() {
    const controller = this.#controller;
    if (!controller) return null;
    this.#attempt += 1;
    controller.abort();
    this.#controller = null;
    this.#abortPromise = Promise.resolve(this.#client.teardown?.());
    return this.#abortPromise;
  }

  async start({ url, token }) {
    const release = this.abort();
    if (release) await release;
    const attempt = ++this.#attempt;
    const startedAt = this.#now();
    let endpoint;
    try {
      endpoint = normalizeGatewayUrl(url);
    } catch (error) {
      const failure = freeze({
        status: ProbeState.FAILURE, startedAt, finishedAt: this.#now(), endpoint: null,
        endpointTrustClass: null, url: stage("failed"), relayOutcome: stage("not_verified"),
        authenticationOutcome: stage("not_verified"),
        capabilityOutcome: stage("not_verified"), streamOutcome: stage("not_verified"),
        failureClass: FailureClass.URL, retryable: true, capabilityNames: [], capabilityVersion: null,
        streamEventCount: null, previousResult: null,
      });
      if (attempt === this.#attempt) this.#publish(failure);
      return failure;
    }
    const prior = this.#snapshot.status === ProbeState.IDLE ? null : this.#snapshot;
    const controller = new AbortController();
    this.#controller = controller;
    this.#publish(freeze({
      status: ProbeState.TESTING, startedAt, finishedAt: null, endpoint, endpointTrustClass: endpoint.startsWith("http://") ? "loopback_http" : "https",
      url: stage("passed"), relayOutcome: stage("not_verified"),
      authenticationOutcome: stage("not_verified"), capabilityOutcome: stage("not_verified"), streamOutcome: stage("not_verified"),
      failureClass: null, retryable: false, capabilityNames: [], capabilityVersion: null, streamEventCount: null,
      previousResult: prior,
    }));
    try {
      const result = await this.#client.probe(endpoint, token, { signal: controller.signal });
      const verdict = toSafeVerdict(result, { endpoint, startedAt, finishedAt: this.#now() });
      if (attempt !== this.#attempt || controller.signal.aborted) return this.#snapshot;
      this.#publish(verdict);
      return verdict;
    } catch {
      if (attempt !== this.#attempt || controller.signal.aborted) return this.#snapshot;
      const verdict = toSafeVerdict({
        url: { state: "passed" }, request: { state: "failed" }, relay: { state: "failed" }, authentication: { state: "not_verified" },
        capabilities: { state: "not_verified" }, stream: { state: "not_verified" },
      }, { endpoint, startedAt, finishedAt: this.#now() });
      this.#publish(verdict);
      return verdict;
    } finally {
      if (attempt === this.#attempt && this.#controller === controller) this.#controller = null;
      token = null;
    }
  }

  #publish(snapshot) {
    this.#snapshot = freeze(snapshot);
    for (const listener of this.#listeners) listener(this.#snapshot);
  }
}
