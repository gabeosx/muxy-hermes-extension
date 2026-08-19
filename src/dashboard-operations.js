import { normalizeBoardSlug, normalizeHermesDashboardUrl } from "./kanban-client.js";

const MAX_JOBS = 500;
const MAX_JOB_NAME = 160;
const MAX_STATUS = 48;
const PRESSURE_STATES = new Set(["ok", "elevated", "critical", "unknown"]);
const TASK_STATUSES = Object.freeze(["triage", "todo", "scheduled", "ready", "running", "blocked", "review", "done"]);

export class DashboardOperationsError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = "DashboardOperationsError";
    this.code = code;
    this.status = status;
  }
}

function safeText(value, max = 256) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function nonNegativeInteger(value, max = 1_000_000) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
}

function optionalNonNegativeInteger(value, max = 365 * 24 * 60 * 60) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : null;
}

function safeTimestamp(value) {
  const text = safeText(value, 64);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function pressure(value) {
  const normalized = safeText(value, 16).toLowerCase();
  return PRESSURE_STATES.has(normalized) ? normalized : "unknown";
}

function responseBody(response, code) {
  if (!response || !Number.isSafeInteger(response.status)) throw new DashboardOperationsError(code);
  if (response.status === 404) throw new DashboardOperationsError(`${code}_unavailable`, 404);
  if (response.status < 200 || response.status >= 300) throw new DashboardOperationsError(code, response.status);
  return response.body;
}

export function normalizeGatewayHealth(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new DashboardOperationsError("status_contract_mismatch");
  return Object.freeze({
    gateway: payload.gateway_running === true ? "ok" : payload.gateway_running === false ? "degraded" : "unknown",
    memory: pressure(payload.memory?.pressure),
    disk: pressure(payload.disk?.pressure),
  });
}

export function normalizeQueueStats(payload, workersPayload = null) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || !payload.by_status || typeof payload.by_status !== "object" || Array.isArray(payload.by_status)) {
    throw new DashboardOperationsError("queue_contract_mismatch");
  }
  const byStatus = {};
  for (const status of TASK_STATUSES) byStatus[status] = nonNegativeInteger(payload.by_status[status]);
  return Object.freeze({
    byStatus: Object.freeze(byStatus),
    waiting: byStatus.ready,
    running: byStatus.running,
    blocked: byStatus.blocked,
    review: byStatus.review,
    oldestWaitingSeconds: optionalNonNegativeInteger(payload.oldest_ready_age_seconds),
    activeWorkers: nonNegativeInteger(workersPayload?.count),
  });
}

function cronFailed(job) {
  const outcome = safeText(job?.last_status, MAX_STATUS).toLowerCase();
  return ["failed", "error", "timed_out", "timeout"].includes(outcome)
    || Boolean(safeText(job?.last_error, 1))
    || Boolean(safeText(job?.last_delivery_error, 1))
    || Boolean(safeText(job?.last_fire_error?.detail, 1));
}

export function normalizeScheduledJobs(payload) {
  if (!Array.isArray(payload)) throw new DashboardOperationsError("cron_contract_mismatch");
  const jobs = [];
  const seen = new Set();
  for (const candidate of payload.slice(0, MAX_JOBS)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const id = safeText(candidate.id, 128);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const enabled = candidate.enabled === true;
    const failed = cronFailed(candidate);
    jobs.push(Object.freeze({
      id,
      name: safeText(candidate.name, MAX_JOB_NAME) || "Scheduled job",
      enabled,
      state: enabled ? (safeText(candidate.state, MAX_STATUS).toLowerCase() || "scheduled") : "paused",
      failed,
      lastStatus: safeText(candidate.last_status, MAX_STATUS).toLowerCase() || null,
      lastRunAt: safeTimestamp(candidate.last_run_at),
      nextRunAt: safeTimestamp(candidate.next_run_at),
    }));
  }
  jobs.sort((a, b) => {
    if (a.failed !== b.failed) return a.failed ? -1 : 1;
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    const aNext = a.nextRunAt ? Date.parse(a.nextRunAt) : Number.POSITIVE_INFINITY;
    const bNext = b.nextRunAt ? Date.parse(b.nextRunAt) : Number.POSITIVE_INFINITY;
    return aNext - bNext || a.name.localeCompare(b.name);
  });
  return Object.freeze(jobs);
}

export function normalizeDiagnosticCount(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new DashboardOperationsError("diagnostics_contract_mismatch");
  return nonNegativeInteger(payload.count);
}

export function emptyOperationsSnapshot() {
  return Object.freeze({
    state: "idle",
    updatedAt: null,
    queue: null,
    jobs: Object.freeze([]),
    diagnostics: 0,
    health: null,
    attention: Object.freeze({ blocked: 0, review: 0, diagnostics: 0, failedJobs: 0, total: 0 }),
    available: Object.freeze({ queue: false, jobs: false, health: false, diagnostics: false }),
  });
}

export class DashboardOperationsClient {
  constructor({ baseUrl, session, board = null, now = () => Date.now() } = {}) {
    this.baseUrl = normalizeHermesDashboardUrl(baseUrl);
    if (!session || typeof session.requestJson !== "function") throw new Error("dashboard_session_required");
    this.session = session;
    this.board = board == null || board === "" ? null : normalizeBoardSlug(board);
    this.now = now;
  }

  setBoard(board) {
    this.board = board == null || board === "" ? null : normalizeBoardSlug(board);
  }

  #pluginUrl(path) {
    const query = this.board ? `?board=${encodeURIComponent(this.board)}` : "";
    return `${this.baseUrl}/api/plugins/kanban${path}${query}`;
  }

  async load() {
    if (!this.session) throw new Error("dashboard_session_required");
    // Keep authenticated reads sequential. Hermes may rotate Dashboard cookies
    // during any request near expiry; parallel refresh attempts could race and
    // leave the extension persisting an older member of the cookie family.
    const requests = Object.freeze([
      ["health", { url: `${this.baseUrl}/api/status` }],
      ["jobs", { url: `${this.baseUrl}/api/cron/jobs?profile=all` }],
      ["queue", { url: this.#pluginUrl("/stats") }],
      ["workers", { url: this.#pluginUrl("/workers/active") }],
      ["diagnostics", { url: this.#pluginUrl("/diagnostics") }],
    ]);
    const results = {};
    for (const [key, request] of requests) {
      try {
        results[key] = { status: "fulfilled", value: await this.session.requestJson(request) };
      } catch (reason) {
        if (reason?.code === "session_expired") throw reason;
        results[key] = { status: "rejected", reason };
      }
    }

    const available = { queue: false, jobs: false, health: false, diagnostics: false };
    let health = null;
    let jobs = Object.freeze([]);
    let queue = null;
    let diagnostics = 0;

    try {
      if (results.health.status === "fulfilled") {
        health = normalizeGatewayHealth(responseBody(results.health.value, "status_request_failed"));
        available.health = true;
      }
    } catch { /* health remains unavailable without blocking the other cards */ }

    try {
      if (results.jobs.status === "fulfilled") {
        jobs = normalizeScheduledJobs(responseBody(results.jobs.value, "cron_request_failed"));
        available.jobs = true;
      }
    } catch { /* cron is optional on older or reduced Dashboard builds */ }

    try {
      if (results.queue.status === "fulfilled") {
        const workers = results.workers.status === "fulfilled"
          ? responseBody(results.workers.value, "workers_request_failed")
          : null;
        queue = normalizeQueueStats(responseBody(results.queue.value, "queue_request_failed"), workers);
        available.queue = true;
      }
    } catch { /* Kanban is an optional Dashboard plugin */ }

    try {
      if (results.diagnostics.status === "fulfilled") {
        diagnostics = normalizeDiagnosticCount(responseBody(results.diagnostics.value, "diagnostics_request_failed"));
        available.diagnostics = true;
      }
    } catch { /* diagnostics are optional even when basic board stats work */ }

    const failedJobs = jobs.filter((job) => job.failed).length;
    const attention = Object.freeze({
      blocked: queue?.blocked ?? 0,
      review: queue?.review ?? 0,
      diagnostics,
      failedJobs,
      total: (queue?.blocked ?? 0) + (queue?.review ?? 0) + diagnostics + failedJobs,
    });
    const availableCount = Object.values(available).filter(Boolean).length;
    return Object.freeze({
      state: availableCount === 0 ? "unavailable" : availableCount === Object.keys(available).length ? "ready" : "partial",
      updatedAt: this.now(),
      queue,
      jobs,
      diagnostics,
      health,
      attention,
      available: Object.freeze(available),
    });
  }

  release() {
    this.session = null;
  }
}
