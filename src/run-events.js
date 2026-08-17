const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TOOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const APPROVAL_CHOICES = new Set(["once", "session", "always", "deny"]);

export const MAX_RUN_FRAME_CHARS = 256 * 1024;
export const MAX_RUN_TEXT_CHARS = 64 * 1024;

export function isSafeRunId(value) {
  return typeof value === "string" && RUN_ID_PATTERN.test(value);
}

function text(value, limit = MAX_RUN_TEXT_CHARS) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function tool(value) {
  return typeof value === "string" && TOOL_PATTERN.test(value) ? value : "tool";
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeRunEvent(payload, expectedRunId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.run_id !== undefined && payload.run_id !== expectedRunId) return null;

  switch (payload.event) {
    case "message.delta": {
      const delta = text(payload.delta);
      return delta ? Object.freeze({ type: "message.delta", delta }) : null;
    }
    case "tool.started":
      return Object.freeze({ type: "tool.started", tool: tool(payload.tool), preview: text(payload.preview, 2048) });
    case "tool.completed":
      return Object.freeze({
        type: "tool.completed",
        tool: tool(payload.tool),
        duration: finite(payload.duration),
        error: payload.error === true,
      });
    case "reasoning.available":
      return Object.freeze({ type: "reasoning.available", text: text(payload.text, 4096) });
    case "subagent.start":
    case "subagent.complete":
      return Object.freeze({ type: payload.event, preview: text(payload.preview ?? payload.summary, 2048) });
    case "approval.request": {
      const choices = Array.isArray(payload.choices)
        ? [...new Set(payload.choices.filter((choice) => APPROVAL_CHOICES.has(choice)))]
        : [];
      if (choices.length === 0) return null;
      return Object.freeze({
        type: "approval.request",
        command: text(payload.command, 4096),
        choices: Object.freeze(choices),
      });
    }
    case "approval.responded":
      return Object.freeze({ type: "approval.responded" });
    case "run.steered":
      return Object.freeze({ type: "run.steered" });
    case "run.completed":
    case "run.failed":
    case "run.cancelled":
      return Object.freeze({ type: payload.event });
    default:
      return null;
  }
}

/** Incremental SSE parser for one Hermes run. Raw frames are discarded. */
export class RunEventParser {
  #buffer = "";
  #lines = [];
  #runId;

  constructor(runId) {
    if (!isSafeRunId(runId)) throw new Error("invalid_run_id");
    this.#runId = runId;
  }

  push(chunk) {
    if (typeof chunk !== "string") throw new Error("invalid_run_stream_chunk");
    this.#buffer += chunk;
    if (this.#buffer.length > MAX_RUN_FRAME_CHARS) throw new Error("run_event_too_large");
    const events = [];
    let newline;
    while ((newline = this.#buffer.indexOf("\n")) !== -1) {
      const rawLine = this.#buffer.slice(0, newline);
      this.#buffer = this.#buffer.slice(newline + 1);
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line === "") {
        const event = this.#finishFrame();
        if (event) events.push(event);
      } else if (!line.startsWith(":")) {
        this.#lines.push(line);
        if (this.#lines.reduce((size, item) => size + item.length, 0) > MAX_RUN_FRAME_CHARS) {
          throw new Error("run_event_too_large");
        }
      }
    }
    return events;
  }

  #finishFrame() {
    if (this.#lines.length === 0) return null;
    const data = [];
    for (const line of this.#lines) {
      const separator = line.indexOf(":");
      const field = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
      if (field === "data") data.push(value);
    }
    this.#lines = [];
    if (data.length === 0) return null;
    try {
      return normalizeRunEvent(JSON.parse(data.join("\n")), this.#runId);
    } catch {
      return null;
    }
  }
}
