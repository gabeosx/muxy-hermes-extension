const CURL_PATH = "/usr/bin/curl";
const STATUS_MARKER = "__MUXY_HERMES_STATUS__:";
const RUNTIME_ROOT = ".muxy-hermes-runtime";

export const MAX_JOURNAL_BYTES = 4 * 1024 * 1024;
const MAX_SESSION_RESPONSE_BYTES = 1024 * 1024;
// Hermes uses the bare names on loopback HTTP, `__Secure-` behind a TLS
// prefix, and `__Host-` on a direct HTTPS origin. The provider cookie is a
// routing hint that must travel with the access and refresh cookies.
const SESSION_COOKIE = /^(?:(?:__Secure-|__Host-)?hermes_session_(?:at|rt|provider))$/;
const COOKIE_HEADER = /^(?:[A-Za-z0-9_-]+=[A-Za-z0-9._~+/%=-]+)(?:; [A-Za-z0-9_-]+=[A-Za-z0-9._~+/%=-]+)*$/;
const SESSION_COOKIE_VALUE = /^[A-Za-z0-9._~+/%=-]+$/;

function relayError(code) {
  return new Error(code);
}

export function buildBearerConfig(bearer) {
  if (typeof bearer !== "string" || !/^[A-Za-z0-9._~+/=-]+$/.test(bearer)) {
    throw new Error("Enter a bearer token using its original URL-safe characters.");
  }
  return `header = "Authorization: Bearer ${bearer}"\n`;
}

function curlConfigQuote(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
}

export function buildSessionConfig({ cookie = "", body = null } = {}) {
  const lines = [];
  if (cookie) {
    if (typeof cookie !== "string" || !COOKIE_HEADER.test(cookie)) {
      throw new Error("Enter a valid Hermes dashboard session cookie.");
    }
    lines.push(`header = "Cookie: ${cookie}"`);
  }
  if (body !== null) {
    const serialized = JSON.stringify(body);
    if (serialized === undefined || serialized.length > 64 * 1024) throw relayError("relay_request_too_large");
    lines.push('header = "Content-Type: application/json"');
    lines.push(`data-binary = "${curlConfigQuote(serialized)}"`);
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function commonArgv({ url, method, accept, timeoutSeconds }) {
  return [
    CURL_PATH,
    "--silent",
    "--show-error",
    "--no-buffer",
    "--config",
    "-",
    "--connect-timeout",
    "5",
    "--max-time",
    String(timeoutSeconds),
    "--request",
    method,
    "--header",
    `Accept: ${accept}`,
    url,
  ];
}

function parseStatusOutput(result) {
  if (!result || result.timedOut) throw relayError("relay_timeout");
  if (result.truncated) throw relayError("relay_response_too_large");
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const markerIndex = stdout.lastIndexOf(`\n${STATUS_MARKER}`);
  if (markerIndex < 0) throw relayError("relay_protocol_error");
  const statusText = stdout.slice(markerIndex + STATUS_MARKER.length + 1).trim();
  if (!/^\d{3}$/.test(statusText)) throw relayError("relay_protocol_error");
  if (result.exitCode !== 0 && statusText === "000") throw relayError("relay_request_failed");
  const rawBody = stdout.slice(0, markerIndex);
  let body = null;
  if (rawBody.trim()) {
    try { body = JSON.parse(rawBody); } catch { throw relayError("relay_protocol_error"); }
  }
  return { status: Number(statusText), body };
}

function streamStatus(result) {
  const stdout = typeof result?.stdout === "string" ? result.stdout : "";
  const match = stdout.match(new RegExp(`(?:^|\\n)${STATUS_MARKER}(\\d{3})\\s*$`));
  const status = match ? Number(match[1]) : null;
  return status && status >= 100 ? status : null;
}

function parseSessionStatus(result) {
  if (!result || result.timedOut) throw relayError("relay_timeout");
  if (result.truncated) throw relayError("relay_response_too_large");
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const match = stdout.match(new RegExp(`(?:^|\\n)${STATUS_MARKER}(\\d{3})\\s*$`));
  if (!match) throw relayError(result.exitCode === 0 ? "relay_protocol_error" : "relay_request_failed");
  if (result.exitCode !== 0 && match[1] === "000") throw relayError("relay_request_failed");
  return Number(match[1]);
}

function byteLength(value) {
  return new TextEncoder().encode(String(value ?? "")).byteLength;
}

/**
 * Curl writes the final response headers before the response body when both
 * `--dump-header -` and `--output -` are used. There may be informational
 * (1xx) header blocks before the final response, so keep consuming blocks
 * until the actual response header is found.
 */
function splitSessionResponse(raw) {
  let remaining = String(raw ?? "");
  for (let block = 0; block < 8; block += 1) {
    const separator = remaining.indexOf("\r\n\r\n") >= 0 ? "\r\n\r\n" : "\n\n";
    const separatorIndex = remaining.indexOf(separator);
    if (separatorIndex < 0) throw relayError("relay_protocol_error");
    const headers = remaining.slice(0, separatorIndex);
    const status = headers.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s|$)/i);
    if (!status) throw relayError("relay_protocol_error");
    remaining = remaining.slice(separatorIndex + separator.length);
    if (Number(status[1]) >= 200) return { headers, body: remaining };
  }
  throw relayError("relay_protocol_error");
}

function parseSessionOutput(result) {
  const status = parseSessionStatus(result);
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const markerIndex = stdout.lastIndexOf(`\n${STATUS_MARKER}`);
  if (markerIndex < 0) throw relayError("relay_protocol_error");
  const rawResponse = stdout.slice(0, markerIndex);
  if (byteLength(rawResponse) > MAX_SESSION_RESPONSE_BYTES) throw relayError("relay_response_too_large");
  const { headers, body } = splitSessionResponse(rawResponse);
  if (byteLength(headers) > MAX_SESSION_RESPONSE_BYTES || byteLength(body) > MAX_SESSION_RESPONSE_BYTES) {
    throw relayError("relay_response_too_large");
  }
  let responseBody = null;
  if (body.trim()) {
    try { responseBody = JSON.parse(body); } catch { throw relayError("relay_protocol_error"); }
  }
  return Object.freeze({ status, body: responseBody, setCookies: parseSessionCookies(headers) });
}

function parseSessionCookies(rawHeaders) {
  const cookies = [];
  for (const line of String(rawHeaders ?? "").split(/\r?\n/)) {
    const match = line.match(/^set-cookie:\s*([^=;\s]+)=([^;\r\n]*)(.*)$/i);
    if (!match || !SESSION_COOKIE.test(match[1])) continue;
    const rawValue = match[2];
    const quoted = rawValue.match(/^"([A-Za-z0-9._~+/%=-]+)"$/);
    const value = quoted ? quoted[1] : rawValue;
    if (value && !SESSION_COOKIE_VALUE.test(value)) throw relayError("relay_protocol_error");
    cookies.push(Object.freeze({
      name: match[1],
      value,
      expired: !value || /(?:^|;)\s*max-age=0(?:;|$)/i.test(match[3]),
    }));
  }
  return Object.freeze(cookies);
}

function curlExitClass(result, cancelled) {
  if (cancelled || result?.cancelled || result?.code === "cancelled") return "cancelled";
  if (result?.timedOut || result?.exitCode === 28) return "timeout";
  if (result?.exitCode === 6) return "dns";
  if (result?.exitCode === 7) return "connection_refused";
  if ([35, 51, 58, 59, 60].includes(result?.exitCode)) return "tls";
  return result?.exitCode === 0 ? "success" : "stream_failed";
}

function cancellation(error) {
  return error?.cancelled === true || error?.code === "cancelled";
}

function defaultBridge() {
  const muxy = globalThis.window?.muxy;
  if (!muxy?.exec) throw relayError("relay_unavailable");
  return muxy;
}

export class CurlRelay {
  constructor({ exec, execAsync, files, events, randomId } = {}) {
    const bridge = exec ? null : defaultBridge();
    this.exec = exec ?? bridge.exec.bind(bridge);
    this.execAsync = execAsync ?? bridge?.execAsync?.bind(bridge) ?? null;
    this.files = files ?? bridge?.files ?? null;
    this.events = events ?? bridge?.events ?? null;
    this.randomId = randomId ?? (() => globalThis.crypto.randomUUID());
    this.activeStream = null;
  }

  async cancelActiveStream() {
    const active = this.activeStream;
    if (!active) return null;
    if (!active.cancellable) {
      active.cancelled = true;
      return null;
    }
    if (!active.cancelPromise) {
      active.cancelled = true;
      active.cancelPromise = Promise.resolve().then(() => active.handle.cancel());
    }
    await active.cancelPromise;
    return active.completion;
  }

  async cleanupStaleJournals() {
    if (!this.files?.list) {
      throw relayError("journal_api_unavailable");
    }
    let entries;
    try {
      entries = await this.files.list(RUNTIME_ROOT);
    } catch (error) {
      if (error?.code === "ENOENT" || /(?:ENOENT|No such file|does not exist|no longer exists)/i.test(error?.message ?? "")) {
        return { cleaned: 0 };
      }
      throw relayError("journal_cleanup_failed");
    }
    if (entries.length > 0 && (!this.files.write || !this.files.delete)) {
      throw relayError("journal_api_unavailable");
    }
    let cleaned = 0;
    for (const entry of entries) {
      const expectedPath = `${RUNTIME_ROOT}/${entry?.name ?? ""}`;
      if (!entry?.isDirectory || entry.path !== expectedPath || !/^[A-Za-z0-9-]{8,64}$/.test(entry.name)) {
        throw relayError("journal_cleanup_unexpected_entry");
      }
      const children = await this.files.list(entry.path);
      if (children.length > 1) throw relayError("journal_cleanup_unexpected_entry");
      for (const child of children) {
        if (child?.isDirectory || child?.name !== "stream.sse" || child.path !== `${entry.path}/stream.sse`) {
          throw relayError("journal_cleanup_unexpected_entry");
        }
        await this.files.write(child.path, "");
      }
      await this.files.delete([entry.path]);
      cleaned += 1;
    }
    return { cleaned };
  }

  async requestJson({ url, bearer, method = "GET", body = null, timeoutMs = 15_000 }) {
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const argv = commonArgv({ url, method, accept: "application/json", timeoutSeconds });
    if (body !== null) {
      argv.splice(argv.length - 1, 0, "--header", "Content-Type: application/json", "--data-binary", JSON.stringify(body));
    }
    argv.splice(argv.length - 1, 0, "--write-out", `\n${STATUS_MARKER}%{http_code}`);
    const result = await this.exec(argv, {
      stdin: buildBearerConfig(bearer),
      timeoutMs: timeoutMs + 2_000,
    });
    return parseStatusOutput(result);
  }

  async requestSessionJson({ url, cookie = "", method = "GET", body = null, timeoutMs = 15_000 }) {
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const argv = commonArgv({ url, method, accept: "application/json", timeoutSeconds });
    argv.splice(argv.length - 1, 0,
      "--dump-header", "-",
      "--output", "-",
      "--write-out", `\n${STATUS_MARKER}%{http_code}`,
    );
    const result = await this.exec(argv, {
      stdin: buildSessionConfig({ cookie, body }),
      timeoutMs: timeoutMs + 2_000,
    });
    return parseSessionOutput(result);
  }

  async streamJournal({ url, bearer, method = "GET", body = null, onChunk, timeoutMs = 60_000 }) {
    if (!this.exec || !this.files?.read || !this.files?.write || !this.files?.delete || !this.events?.subscribe) {
      throw relayError("journal_api_unavailable");
    }
    if (typeof onChunk !== "function") throw relayError("journal_consumer_required");
    const runDirectory = `${RUNTIME_ROOT}/${this.randomId()}`;
    const journalPath = `${runDirectory}/stream.sse`;
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const argv = commonArgv({ url, method, accept: "text/event-stream", timeoutSeconds });
    if (body !== null) {
      argv.splice(argv.length - 1, 0, "--header", "Content-Type: application/json", "--data-binary", JSON.stringify(body));
    }
    argv.splice(argv.length - 1, 0, "--create-dirs", "--output", journalPath, "--write-out", `\\n${STATUS_MARKER}%{http_code}`);

    let offset = 0;
    let bytes = 0;
    let journalFailure = null;
    let readQueue = Promise.resolve();
    const consume = async ({ optional = false } = {}) => {
      let file;
      try { file = await this.files.read(journalPath); } catch (error) {
        if (optional) return;
        throw error;
      }
      if (file.size > MAX_JOURNAL_BYTES) throw relayError("journal_limit_exceeded");
      if (file.content.length < offset) throw relayError("journal_truncated_unexpectedly");
      const chunk = file.content.slice(offset);
      offset = file.content.length;
      bytes = file.size;
      if (chunk) onChunk(chunk);
    };
    const queueRead = () => {
      readQueue = readQueue.then(() => consume()).catch((error) => { journalFailure ??= error; });
    };
    const unsubscribe = this.events.subscribe("file.changed", ({ path }) => {
      if (path === journalPath) queueRead();
    });

    let primaryFailure = null;
    const active = { handle: null, completion: null, cancelPromise: null, cancelled: false, cancellable: Boolean(this.execAsync) };
    this.activeStream = active;
    const complete = (async () => {
      try {
        const options = { stdin: buildBearerConfig(bearer), timeoutMs: timeoutMs + 2_000 };
        // Current Muxy webviews expose Promise-based exec but not the cancellable execAsync surface.
        const handle = this.execAsync
          ? this.execAsync(argv, options)
          : { id: null, result: Promise.resolve(this.exec(argv, options)), cancel() {} };
        if (!handle?.result || typeof handle.cancel !== "function") throw relayError("relay_async_unavailable");
        active.handle = handle;
        let result;
        try {
          result = await handle.result;
        } catch (error) {
          if (!active.cancelled && !cancellation(error)) throw relayError("relay_stream_failed");
          result = { cancelled: true, code: "cancelled", stdout: "", exitCode: null };
        }
        await readQueue;
        await consume({ optional: true });
        if (journalFailure) throw journalFailure;
        const cancelled = active.cancelled || cancellation(result);
        const exitClass = curlExitClass(result, cancelled);
        if (!cancelled && exitClass !== "success") throw relayError(`relay_${exitClass}`);
        return {
          executionId: handle.id ?? null,
          httpStatus: streamStatus(result),
          bytes,
          cancelled,
          curlExitClass: exitClass,
          journalOutcome: "scrubbed_removed",
        };
      } catch (error) {
        primaryFailure = error;
        throw error;
      } finally {
        unsubscribe?.();
        try {
          await this.files.write(journalPath, "");
          await this.files.delete([runDirectory]);
        } catch {
          if (!primaryFailure) throw relayError("journal_cleanup_failed");
        }
        if (this.activeStream === active) this.activeStream = null;
      }
    })();
    active.completion = complete;
    return complete;
  }
}
