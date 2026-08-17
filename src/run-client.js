import { CurlRelay } from "./curl-relay.js";
import { normalizeGatewayUrl } from "./gateway-client.js";
import { isSafeRunId, RunEventParser } from "./run-events.js";

export const RUN_FEATURES = Object.freeze({
  submit: "run_submission",
  status: "run_status",
  events: "run_events_sse",
  stop: "run_stop",
  steer: "run_steer",
  approval: "run_approval_response",
});

export const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
const RUN_STATUSES = new Set(["queued", "started", "running", "waiting_for_approval", "stopping", ...TERMINAL_RUN_STATUSES]);
const APPROVAL_CHOICES = new Set(["once", "session", "always", "deny"]);

function runEndpoint(baseUrl, runId, suffix = "") {
  if (!isSafeRunId(runId)) throw new Error("invalid_run_id");
  return `${baseUrl}/v1/runs/${encodeURIComponent(runId)}${suffix}`;
}

function accepted(response, expected = null) {
  if (!response || response.status < 200 || response.status >= 300) throw new Error("run_request_rejected");
  if (expected && response.status !== expected) throw new Error("run_protocol_error");
  return response.body;
}

function safeStatus(payload, expectedRunId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("run_protocol_error");
  const runId = payload.run_id ?? expectedRunId;
  if (runId !== expectedRunId || !RUN_STATUSES.has(payload.status)) throw new Error("run_protocol_error");
  return Object.freeze({
    runId,
    status: payload.status,
    output: typeof payload.output === "string" ? payload.output.slice(0, 128 * 1024) : "",
  });
}

export function supportsCoreRun(capabilities) {
  const names = new Set(capabilities ?? []);
  return [RUN_FEATURES.submit, RUN_FEATURES.status, RUN_FEATURES.events].every((name) => names.has(name));
}

export class RunClient {
  #relay;

  constructor({ relay = new CurlRelay() } = {}) {
    this.#relay = relay;
  }

  async start({ baseUrl: rawBaseUrl, bearer, input, onEvent }) {
    const baseUrl = normalizeGatewayUrl(rawBaseUrl);
    const prompt = typeof input === "string" ? input.trim() : "";
    if (!prompt || prompt.length > 64 * 1024) throw new Error("invalid_run_input");
    if (typeof onEvent !== "function") throw new Error("run_event_consumer_required");

    const payload = accepted(await this.#relay.requestJson({
      url: `${baseUrl}/v1/runs`, bearer, method: "POST", body: { input: prompt },
    }), 202);
    if (!isSafeRunId(payload?.run_id)) throw new Error("run_protocol_error");
    const runId = payload.run_id;
    const parser = new RunEventParser(runId);
    const stream = this.#relay.streamJournal({
      url: runEndpoint(baseUrl, runId, "/events"),
      bearer,
      onChunk: (chunk) => {
        for (const event of parser.push(chunk)) onEvent(event);
      },
    });
    return Object.freeze({ runId, stream });
  }

  async status({ baseUrl: rawBaseUrl, bearer, runId }) {
    const baseUrl = normalizeGatewayUrl(rawBaseUrl);
    const body = accepted(await this.#relay.requestJson({ url: runEndpoint(baseUrl, runId), bearer }));
    return safeStatus(body, runId);
  }

  async approve({ baseUrl: rawBaseUrl, bearer, runId, choice }) {
    if (!APPROVAL_CHOICES.has(choice)) throw new Error("invalid_approval_choice");
    const baseUrl = normalizeGatewayUrl(rawBaseUrl);
    accepted(await this.#relay.requestJson({
      url: runEndpoint(baseUrl, runId, "/approval"), bearer, method: "POST", body: { choice },
    }));
  }

  async steer({ baseUrl: rawBaseUrl, bearer, runId, input }) {
    const guidance = typeof input === "string" ? input.trim() : "";
    if (!guidance || guidance.length > 64 * 1024) throw new Error("invalid_steer_input");
    const baseUrl = normalizeGatewayUrl(rawBaseUrl);
    accepted(await this.#relay.requestJson({
      url: runEndpoint(baseUrl, runId, "/steer"), bearer, method: "POST", body: { input: guidance },
    }));
  }

  async stop({ baseUrl: rawBaseUrl, bearer, runId }) {
    const baseUrl = normalizeGatewayUrl(rawBaseUrl);
    accepted(await this.#relay.requestJson({
      url: runEndpoint(baseUrl, runId, "/stop"), bearer, method: "POST", body: {},
    }));
  }

  teardown() {
    return this.#relay.cancelActiveStream?.() ?? Promise.resolve();
  }
}
