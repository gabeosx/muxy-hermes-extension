import { SseParser } from "./sse-parser.js";

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

export class GatewayClient {
  #fetch;
  #controller = null;
  #inFlight = false;

  constructor({ fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("Browser fetch is unavailable.");
    this.#fetch = fetchImpl;
  }

  get inFlight() {
    return this.#inFlight;
  }

  teardown() {
    this.#controller?.abort();
    this.#controller = null;
  }

  async probe(rawUrl, bearer) {
    if (this.#inFlight) throw new Error("A connection test is already in progress.");
    if (!bearer) throw new Error("Enter a bearer token.");
    const baseUrl = normalizeGatewayUrl(rawUrl);
    this.#inFlight = true;
    const controller = new AbortController();
    this.#controller = controller;
    let authorization = `Bearer ${bearer}`;
    try {
      const capabilitiesResponse = await this.#fetch(endpoint(baseUrl, "/v1/capabilities"), {
        method: "GET",
        headers: { Authorization: authorization, Accept: "application/json" },
        signal: controller.signal,
      });
      if (capabilitiesResponse.status === 401 || capabilitiesResponse.status === 403) {
        return this.#failed("authentication");
      }
      if (!capabilitiesResponse.ok) return this.#failed("capabilities");
      const capabilities = normalizeCapabilities(await capabilitiesResponse.json());
      const baseResult = {
        url: stage("passed"),
        request: stage("passed"),
        authentication: stage("passed"),
        origin: stage("not_verified"),
        capabilities: { state: "passed", names: capabilities.names, version: capabilities.version },
      };
      if (!capabilities.chatCompletions) {
        return { ...baseResult, stream: stage("not_verified", { reason: "chat_completions_not_advertised" }) };
      }
      return { ...baseResult, stream: await this.#qualifyStream(baseUrl, authorization, controller.signal) };
    } catch (error) {
      if (error?.name === "AbortError") return this.#failed("aborted");
      return this.#failed("browser_request_rejected");
    } finally {
      authorization = null;
      bearer = null;
      if (this.#controller === controller) this.#controller = null;
      this.#inFlight = false;
    }
  }

  #failed(reason) {
    return {
      url: stage("passed"),
      request: stage("failed", { reason }),
      authentication: stage("not_verified"),
      origin: stage("not_verified"),
      capabilities: { state: "not_verified", names: [], version: null },
      stream: stage("not_verified", { reason }),
    };
  }

  async #qualifyStream(baseUrl, authorization, signal) {
    const response = await this.#fetch(endpoint(baseUrl, "/v1/chat/completions"), {
      method: "POST",
      headers: { Authorization: authorization, Accept: "text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify(QUALIFICATION_BODY),
      signal,
    });
    if (!response.ok || response.body === null) return stage("not_verified", { reason: "stream_unavailable" });
    const parser = new SseParser();
    const startedAt = performance.now();
    let firstChunkMs = null;
    let eventCount = 0;
    let firstDelta = false;
    let secondDelta = false;
    let terminal = false;
    let toolShape = false;
    for await (const text of response.body.pipeThrough(new TextDecoderStream())) {
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
    }
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
