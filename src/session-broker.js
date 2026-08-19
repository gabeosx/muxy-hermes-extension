const REQUEST_EVENT = "extension.hermes.session.request";
const RESPONSE_EVENT = "extension.hermes.session.response";
const GATEWAY_STORAGE_KEY = "session.gateway.v1";
const DASHBOARD_STORAGE_KEY = "session.dashboard.v1";
const TOKEN = /^[A-Za-z0-9._~+/=-]{1,4096}$/;
const COOKIE_NAME = /^(?:__Secure-)?hermes_session_(?:at|rt)$/;
const COOKIE_VALUE = /^[A-Za-z0-9._~+/%=-]{1,4096}$/;
const PROVIDER = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const SESSION_EVENTS = Object.freeze({ request: REQUEST_EVENT, response: RESPONSE_EVENT });

function safeText(value, max = 256) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function baseUrl(value) {
  let parsed;
  try { parsed = new URL(String(value ?? "").trim()); } catch { return null; }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  if (parsed.pathname !== "/" && parsed.pathname !== "") return null;
  return parsed.toString().replace(/\/$/, "");
}

function boardSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug) ? slug : null;
}

function outcome(value) {
  return value?.state === "passed" ? { state: "passed" } : { state: "not_verified" };
}

function gatewayResult(value, endpoint) {
  if (!value || value.status !== "success" || value.endpoint !== endpoint) return null;
  const capabilityNames = [...new Set((Array.isArray(value.capabilityNames) ? value.capabilityNames : [])
    .filter((name) => typeof name === "string" && /^[a-z0-9_-]{1,128}$/i.test(name)))].sort();
  return {
    status: "success",
    startedAt: safeText(value.startedAt, 64),
    finishedAt: safeText(value.finishedAt, 64),
    endpoint,
    endpointTrustClass: value.endpointTrustClass === "loopback_http" ? "loopback_http" : "https",
    url: outcome(value.url),
    relayOutcome: outcome(value.relayOutcome),
    authenticationOutcome: outcome(value.authenticationOutcome),
    capabilityOutcome: outcome(value.capabilityOutcome),
    streamOutcome: outcome(value.streamOutcome),
    failureClass: null,
    retryable: true,
    capabilityNames,
    capabilityVersion: typeof value.capabilityVersion === "string" ? safeText(value.capabilityVersion, 128) : null,
    streamEventCount: Number.isSafeInteger(value.streamEventCount) ? value.streamEventCount : null,
    previousResult: null,
  };
}

function gatewaySession(value) {
  const url = baseUrl(value?.url);
  if (!url || !TOKEN.test(value?.bearer ?? "")) return null;
  const result = gatewayResult(value?.result, url);
  return result ? { url, bearer: value.bearer, result } : null;
}

function provider(value) {
  const name = safeText(value?.name, 64);
  if (!PROVIDER.test(name)) return null;
  return { name, displayName: safeText(value?.displayName, 128) || name, supportsPassword: value.supportsPassword === true };
}

function identity(value) {
  const userId = safeText(value?.userId, 256);
  const providerName = safeText(value?.provider, 64);
  if (!userId || !PROVIDER.test(providerName) || !Number.isSafeInteger(value?.expiresAt) || value.expiresAt <= 0) return null;
  return {
    userId,
    email: safeText(value.email, 320),
    displayName: safeText(value.displayName, 256),
    organizationId: safeText(value.organizationId, 256),
    provider: providerName,
    expiresAt: value.expiresAt,
  };
}

function dashboardSession(value) {
  const dashboardUrl = baseUrl(value?.baseUrl);
  const board = boardSlug(value?.board);
  const auth = value?.auth;
  if (!dashboardUrl || !board || !auth || auth.version !== 1 || !Array.isArray(auth.cookies) || !Array.isArray(auth.providers)) return null;
  const providers = auth.providers.map(provider).filter(Boolean);
  const user = identity(auth.identity);
  const cookies = [];
  for (const entry of auth.cookies) {
    if (!Array.isArray(entry) || entry.length !== 2 || !COOKIE_NAME.test(entry[0]) || !COOKIE_VALUE.test(entry[1])) return null;
    cookies.push([entry[0], entry[1]]);
  }
  if (!providers.length || !user || !cookies.some(([name]) => name.endsWith("hermes_session_at"))) return null;
  return { baseUrl: dashboardUrl, board, auth: { version: 1, providers, identity: user, cookies } };
}

export class PersistentSessionBroker {
  constructor({ storage = globalThis.muxy?.storage } = {}) {
    this.storage = storage;
  }

  async #read(key, validate) {
    if (!this.storage?.get) return null;
    const stored = await Promise.resolve(this.storage.get(key));
    if (stored == null) return null;
    const value = validate(stored);
    if (value) return clone(value);
    await Promise.resolve(this.storage.delete?.(key));
    return null;
  }

  async #save(key, value) {
    if (!this.storage?.set) return false;
    await Promise.resolve(this.storage.set(key, clone(value)));
    return true;
  }

  async #clear(key) {
    if (!this.storage?.delete) return false;
    await Promise.resolve(this.storage.delete(key));
    return true;
  }

  async handle(request) {
    const requestId = typeof request?.requestId === "string" ? request.requestId : "";
    if (!requestId) return { requestId, ok: false, data: null };
    switch (request.action) {
      case "gateway.read": return { requestId, ok: true, data: await this.#read(GATEWAY_STORAGE_KEY, gatewaySession) };
      case "gateway.save": {
        const value = gatewaySession(request.data);
        if (!value) return { requestId, ok: false, data: null };
        return { requestId, ok: await this.#save(GATEWAY_STORAGE_KEY, value), data: null };
      }
      case "gateway.clear":
        return { requestId, ok: await this.#clear(GATEWAY_STORAGE_KEY), data: null };
      case "dashboard.read": return { requestId, ok: true, data: await this.#read(DASHBOARD_STORAGE_KEY, dashboardSession) };
      case "dashboard.save": {
        const value = dashboardSession(request.data);
        if (!value) return { requestId, ok: false, data: null };
        return { requestId, ok: await this.#save(DASHBOARD_STORAGE_KEY, value), data: null };
      }
      case "dashboard.clear":
        return { requestId, ok: await this.#clear(DASHBOARD_STORAGE_KEY), data: null };
      default: return { requestId, ok: false, data: null };
    }
  }
}

export function installSessionBroker({ events = globalThis.muxy?.events, broker = new PersistentSessionBroker() } = {}) {
  if (!events?.subscribe || !events?.emit) return null;
  events.subscribe(REQUEST_EVENT, (request) => {
    const requestId = typeof request?.requestId === "string" ? request.requestId : "";
    void Promise.resolve(broker.handle(request))
      .catch(() => ({ requestId, ok: false, data: null }))
      .then((response) => events.emit(RESPONSE_EVENT, response));
  });
  return broker;
}

export class SessionBrokerClient {
  constructor({ events = globalThis.window?.muxy?.events ?? globalThis.muxy?.events, timeoutMs = 1_500, randomId = () => globalThis.crypto.randomUUID() } = {}) {
    this.events = events;
    this.timeoutMs = timeoutMs;
    this.randomId = randomId;
  }

  async readGateway() { return this.#request("gateway.read"); }
  async saveGateway(data) { return this.#request("gateway.save", data); }
  async clearGateway() { return this.#request("gateway.clear"); }
  async readDashboard() { return this.#request("dashboard.read"); }
  async saveDashboard(data) { return this.#request("dashboard.save", data); }
  async clearDashboard() { return this.#request("dashboard.clear"); }

  #request(action, data = null) {
    if (!this.events?.subscribe || !this.events?.emit) return Promise.resolve(null);
    const requestId = this.randomId();
    return new Promise((resolve) => {
      let settled = false;
      let unsubscribe = null;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { unsubscribe?.(); } catch { /* Muxy may already have removed the listener. */ }
        resolve(value);
      };
      const timeout = setTimeout(() => finish(null), this.timeoutMs);
      try {
        unsubscribe = this.events.subscribe(RESPONSE_EVENT, (response) => {
          if (response?.requestId !== requestId) return;
          finish(response.ok === true ? clone(response.data) : null);
        });
        Promise.resolve(this.events.emit(REQUEST_EVENT, { requestId, action, data })).catch(() => finish(null));
      } catch {
        finish(null);
      }
    });
  }
}
