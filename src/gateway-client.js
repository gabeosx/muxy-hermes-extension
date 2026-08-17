import { SseParser } from "./sse-parser.js";
import { CurlRelay } from "./curl-relay.js";

const QUALIFICATION_BODY = {
  model: "hermes-agent",
  messages: [{ role: "user", content: "HERMES_STREAM_QUALIFICATION_V1" }],
  stream: true,
};

function stage(state, extra = {}) {
  return { state, ...extra };
}

export function normalizeGatewayUrl(value) {
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid Gateway URL.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("Use a Gateway base URL without credentials, paths, queries, or fragments.");
  }
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]" || parsed.hostname === "::1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new Error("Use HTTPS for a non-loopback Gateway. Certificate bypass is not supported.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function endpoint(baseUrl, path) {
  return `${baseUrl}${path}`;
}

function normalizeCapabilities(payload) {
  const features = payload && typeof payload.features === "object" && payload.features ? payload.features : {};
  const names = Object.entries(features)
    .filter(([name, enabled]) => typeof name === "string" && name.length <= 128 && Boolean(enabled))
    .map(([name]) => name)
    .sort();
  const version = typeof payload?.version === "string" && payload.version.length <= 128 ? payload.version : null;
  return { names, version, chatCompletions: features.chat_completions === true };
}

function relayFailureReason(error) {
  if (error?.message === "relay_unavailable") return "relay_unavailable";
  if (error?.message === "relay_request_failed") return "gateway_unreachable";
  if (error?.message === "relay_timeout") return "gateway_timeout";
  return "relay_request_rejected";
}

export class GatewayClient {
  #relay;
  #generation = 0;
  #inFlight = false;
  #prepared = null;

  constructor({ relay = new CurlRelay() } = {}) {
    this.#relay = relay;
  }

  get inFlight() {
    return this.#inFlight;
  }

  prepare() {
    if (!this.#prepared) {
      this.#prepared = Promise.resolve(this.#relay.cleanupStaleJournals?.()).catch((error) => {
        this.#prepared = null;
        throw error;
      });
    }
    return this.#prepared;
  }

  teardown() {
    this.#generation += 1;
  }

  async probe(rawUrl, bearer, { signal = null } = {}) {
    if (this.#inFlight) throw new Error("A connection test is already in progress.");
    if (!bearer) throw new Error("Enter a bearer token.");
    const baseUrl = normalizeGatewayUrl(rawUrl);
    this.#inFlight = true;
    const generation = ++this.#generation;
    try {
      await this.prepare();
      const capabilitiesResponse = await this.#relay.requestJson({
        url: endpoint(baseUrl, "/v1/capabilities"),
        bearer,
      });
      if (generation !== this.#generation || signal?.aborted) return this.#failed("aborted");
      if (capabilitiesResponse.status === 401 || capabilitiesResponse.status === 403) {
        return this.#authenticationFailed();
      }
      if (capabilitiesResponse.status < 200 || capabilitiesResponse.status >= 300) return this.#capabilitiesFailed();
      const capabilities = normalizeCapabilities(capabilitiesResponse.body);
      const baseResult = {
        url: stage("passed"),
        request: stage("passed"),
        authentication: stage("passed"),
        relay: stage("passed"),
        capabilities: { state: "passed", names: capabilities.names, version: capabilities.version },
      };
      if (!capabilities.chatCompletions) {
        return { ...baseResult, stream: stage("not_verified", { reason: "chat_completions_not_advertised" }) };
      }
      return { ...baseResult, stream: await this.#qualifyStream(baseUrl, bearer) };
    } catch (error) {
      if (signal?.aborted || generation !== this.#generation) return this.#failed("aborted");
      return this.#failed(relayFailureReason(error));
    } finally {
      bearer = null;
      this.#inFlight = false;
    }
  }

  #failed(reason) {
    return {
      url: stage("passed"),
      request: stage("failed", { reason }),
      relay: stage("failed", { reason }),
      authentication: stage("not_verified"),
      capabilities: { state: "not_verified", names: [], version: null },
      stream: stage("not_verified", { reason }),
    };
  }

  #authenticationFailed() {
    return {
      url: stage("passed"),
      request: stage("passed"),
      relay: stage("passed"),
      authentication: stage("failed"),
      capabilities: { state: "not_verified", names: [], version: null },
      stream: stage("not_verified"),
    };
  }

  #capabilitiesFailed() {
    return {
      url: stage("passed"),
      request: stage("passed"),
      relay: stage("passed"),
      authentication: stage("not_verified"),
      capabilities: { state: "failed", names: [], version: null },
      stream: stage("not_verified"),
    };
  }

  async #qualifyStream(baseUrl, bearer) {
    const parser = new SseParser();
    const startedAt = performance.now();
    let firstChunkMs = null;
    let eventCount = 0;
    let firstDelta = false;
    let secondDelta = false;
    let terminal = false;
    let toolShape = false;
    await this.#relay.streamJournal({
      url: endpoint(baseUrl, "/v1/chat/completions"),
      bearer,
      method: "POST",
      body: QUALIFICATION_BODY,
      onChunk: (text) => {
        for (const frame of parser.push(text)) {
          eventCount += 1;
          toolShape ||= frame.toolShape;
          if (frame.hasDelta) {
            if (!firstDelta) {
              firstDelta = true;
              firstChunkMs = Math.round(performance.now() - startedAt);
            } else {
              secondDelta = true;
            }
          }
          terminal ||= frame.terminal || frame.done;
        }
      },
    });
    const passed = firstDelta && secondDelta && terminal && !toolShape;
    return stage(passed ? "passed" : "not_verified", {
      reason: passed ? null : "qualification_sequence_unproved",
      firstChunkMs,
      eventCount,
      terminal,
      toolShape,
    });
  }
}
