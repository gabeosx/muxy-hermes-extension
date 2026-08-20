const CURL_PATH = "/usr/bin/curl";
const STATUS_MARKER = "__MUXY_HERMES_STATUS__:";
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;

// Hermes changes the prefix according to transport security. The provider
// cookie is an allowlisted routing hint and travels with the access/refresh
// pair. No other cookie crosses the extension boundary.
const SESSION_COOKIE = /^(?:(?:__Secure-|__Host-)?hermes_session_(?:at|rt|provider))$/;
const COOKIE_HEADER = /^(?:[A-Za-z0-9_-]+=[A-Za-z0-9._~+/%=-]+)(?:; [A-Za-z0-9_-]+=[A-Za-z0-9._~+/%=-]+)*$/;
const SESSION_COOKIE_VALUE = /^[A-Za-z0-9._~+/%=-]+$/;

function relayError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
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
    if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > MAX_REQUEST_BYTES) {
      throw relayError("relay_request_too_large");
    }
    lines.push('header = "Content-Type: application/json"');
    lines.push(`data-binary = "${curlConfigQuote(serialized)}"`);
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function byteLength(value) {
  return new TextEncoder().encode(String(value ?? "")).byteLength;
}

function splitResponse(raw) {
  let remaining = String(raw ?? "");
  for (let block = 0; block < 8; block += 1) {
    const separator = remaining.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
    const index = remaining.indexOf(separator);
    if (index < 0) throw relayError("relay_protocol_error");
    const headers = remaining.slice(0, index);
    const status = headers.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s|$)/i);
    if (!status) throw relayError("relay_protocol_error");
    remaining = remaining.slice(index + separator.length);
    if (Number(status[1]) >= 200) return { headers, body: remaining };
  }
  throw relayError("relay_protocol_error");
}

function parseCookies(rawHeaders) {
  const cookies = [];
  for (const line of String(rawHeaders ?? "").split(/\r?\n/)) {
    const match = line.match(/^set-cookie:\s*([^=;\s]+)=([^;\r\n]*)(.*)$/i);
    if (!match || !SESSION_COOKIE.test(match[1])) continue;
    const quoted = match[2].match(/^"([A-Za-z0-9._~+/%=-]+)"$/);
    const value = quoted ? quoted[1] : match[2];
    if (value && !SESSION_COOKIE_VALUE.test(value)) throw relayError("relay_protocol_error");
    cookies.push(Object.freeze({
      name: match[1],
      value,
      expired: !value || /(?:^|;)\s*max-age=0(?:;|$)/i.test(match[3]),
    }));
  }
  return Object.freeze(cookies);
}

function parseResponse(result) {
  if (!result || result.timedOut || result.exitCode === 28) throw relayError("relay_timeout");
  if (result.truncated) throw relayError("relay_response_too_large");
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const markerIndex = stdout.lastIndexOf(`\n${STATUS_MARKER}`);
  if (markerIndex < 0) throw relayError(result.exitCode === 0 ? "relay_protocol_error" : "relay_request_failed");
  const statusText = stdout.slice(markerIndex + STATUS_MARKER.length + 1).trim();
  if (!/^\d{3}$/.test(statusText) || (result.exitCode !== 0 && statusText === "000")) {
    throw relayError("relay_request_failed");
  }
  const rawResponse = stdout.slice(0, markerIndex);
  if (byteLength(rawResponse) > MAX_RESPONSE_BYTES) throw relayError("relay_response_too_large");
  const { headers, body } = splitResponse(rawResponse);
  if (byteLength(headers) > MAX_RESPONSE_BYTES || byteLength(body) > MAX_RESPONSE_BYTES) {
    throw relayError("relay_response_too_large");
  }
  let responseBody = null;
  if (body.trim()) {
    try { responseBody = JSON.parse(body); } catch { throw relayError("relay_protocol_error"); }
  }
  return Object.freeze({ status: Number(statusText), body: responseBody, setCookies: parseCookies(headers) });
}

function defaultExec() {
  const muxy = globalThis.window?.muxy;
  if (!muxy?.exec) throw relayError("relay_unavailable");
  return muxy.exec.bind(muxy);
}

export class CurlRelay {
  constructor({ exec } = {}) {
    this.exec = exec ?? defaultExec();
  }

  async requestSessionJson({ url, cookie = "", method = "GET", body = null, timeoutMs = 15_000 }) {
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const argv = [
      CURL_PATH,
      "--silent",
      "--show-error",
      "--config",
      "-",
      "--connect-timeout",
      "5",
      "--max-time",
      String(timeoutSeconds),
      "--request",
      method,
      "--header",
      "Accept: application/json",
      "--dump-header",
      "-",
      "--output",
      "-",
      "--write-out",
      `\n${STATUS_MARKER}%{http_code}`,
      url,
    ];
    const result = await this.exec(argv, {
      stdin: buildSessionConfig({ cookie, body }),
      timeoutMs: timeoutMs + 2_000,
    });
    return parseResponse(result);
  }
}
