const SAFE_EVENTS = new Set(["chat.completion.chunk", "message"]);

/**
 * Incrementally parses an SSE response while returning only non-content metadata.
 * Decoded payload text never leaves this instance.
 */
export class SseParser {
  #buffer = "";
  #lines = [];

  push(chunk) {
    this.#buffer += chunk;
    const frames = [];
    let newline;
    while ((newline = this.#buffer.indexOf("\n")) !== -1) {
      const rawLine = this.#buffer.slice(0, newline);
      this.#buffer = this.#buffer.slice(newline + 1);
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line === "") {
        const frame = this.#finishFrame();
        if (frame) frames.push(frame);
      } else if (!line.startsWith(":")) {
        this.#lines.push(line);
      }
    }
    return frames;
  }

  #finishFrame() {
    if (this.#lines.length === 0) return null;
    let event = "message";
    let id = null;
    const data = [];
    for (const line of this.#lines) {
      const separator = line.indexOf(":");
      const field = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
      if (field === "event") event = value;
      if (field === "id") id = value || null;
      if (field === "data") data.push(value);
    }
    this.#lines = [];
    const payload = data.join("\n");
    const done = payload === "[DONE]";
    let hasDelta = false;
    let terminal = false;
    let toolShape = /(?:tool_calls|tool_call|hermes\.tool\.progress)/i.test(event);
    if (!done && payload) {
      try {
        const parsed = JSON.parse(payload);
        const choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
        hasDelta = choices.some((choice) => typeof choice?.delta?.content === "string" && choice.delta.content.length > 0);
        terminal = choices.some((choice) => choice?.finish_reason === "stop");
        toolShape ||= choices.some((choice) => Boolean(choice?.delta?.tool_calls || choice?.message?.tool_calls));
      } catch {
        // Unknown payload shape remains a metadata-only non-match.
      }
    }
    return {
      event: SAFE_EVENTS.has(event) ? event : "other",
      id: id && id.length <= 128 ? id : null,
      dataBytes: new TextEncoder().encode(payload).byteLength,
      done,
      hasDelta,
      terminal,
      toolShape,
    };
  }
}
