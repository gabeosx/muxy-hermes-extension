export const KANBAN_STATUSES = Object.freeze([
  "triage",
  "todo",
  "scheduled",
  "ready",
  "running",
  "blocked",
  "review",
  "done",
]);

const MAX_COLUMNS = 12;
const MAX_TASKS_PER_COLUMN = 2_000;

export function normalizeHermesDashboardUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value ?? "").trim());
  } catch {
    throw new Error("Enter a valid Hermes dashboard URL.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("Use a dashboard base URL without credentials, paths, queries, or fragments.");
  }
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]" || parsed.hostname === "::1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new Error("Use HTTPS for a remote dashboard, or a loopback HTTP URL for a local or SSH-forwarded dashboard.");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function normalizeBoardSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug)) {
    throw new Error("Board slug must be 1–64 lowercase letters, numbers, hyphens, or underscores.");
  }
  return slug;
}

function safeString(value, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function safeInteger(value) {
  return Number.isSafeInteger(value) ? value : 0;
}

function normalizeTask(value, fallbackStatus) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = safeString(value.id, 128);
  const title = safeString(value.title, 1_000);
  if (!id || !title) return null;
  const status = KANBAN_STATUSES.includes(value.status) ? value.status : fallbackStatus;
  const progress = value.progress && Number.isSafeInteger(value.progress.done) && Number.isSafeInteger(value.progress.total)
    ? { done: value.progress.done, total: value.progress.total }
    : null;
  return Object.freeze({
    id,
    title,
    status,
    assignee: safeString(value.assignee, 128),
    tenant: safeString(value.tenant, 128),
    priority: safeInteger(value.priority),
    commentCount: safeInteger(value.comment_count),
    summary: safeString(value.latest_summary, 200),
    progress,
  });
}

export function normalizeBoard(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.columns)) {
    throw new Error("kanban_contract_mismatch");
  }
  const columns = [];
  for (const candidate of payload.columns.slice(0, MAX_COLUMNS)) {
    const name = safeString(candidate?.name, 32);
    if (!KANBAN_STATUSES.includes(name) || !Array.isArray(candidate.tasks)) continue;
    columns.push(Object.freeze({
      name,
      tasks: Object.freeze(candidate.tasks.slice(0, MAX_TASKS_PER_COLUMN).map((task) => normalizeTask(task, name)).filter(Boolean)),
    }));
  }
  if (!columns.length) throw new Error("kanban_contract_mismatch");
  return Object.freeze({
    columns: Object.freeze(columns),
    assignees: Object.freeze(Array.isArray(payload.assignees) ? payload.assignees.map((value) => safeString(value, 128)).filter(Boolean).slice(0, 500) : []),
    tenants: Object.freeze(Array.isArray(payload.tenants) ? payload.tenants.map((value) => safeString(value, 128)).filter(Boolean).slice(0, 500) : []),
  });
}

export class KanbanClientError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = "KanbanClientError";
    this.code = code;
    this.status = status;
  }
}

function classifyResponse(response) {
  if (response.status === 401 || response.status === 403) throw new KanbanClientError("dashboard_authentication_failed", response.status);
  if (response.status === 404) throw new KanbanClientError("kanban_not_available", response.status);
  if (response.status < 200 || response.status >= 300) throw new KanbanClientError("kanban_request_failed", response.status);
  return response.body;
}

function taskPath(taskId) {
  if (typeof taskId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) throw new Error("Invalid task ID.");
  return `/tasks/${encodeURIComponent(taskId)}`;
}

export class KanbanClient {
  constructor({ baseUrl, session, board }) {
    this.baseUrl = normalizeHermesDashboardUrl(baseUrl);
    if (!session || typeof session.requestJson !== "function") throw new Error("Sign in to the Hermes dashboard first.");
    this.session = session;
    this.board = normalizeBoardSlug(board);
  }

  endpoint(path) {
    return `${this.baseUrl}/api/plugins/kanban${path}${path.includes("?") ? "&" : "?"}board=${encodeURIComponent(this.board)}`;
  }

  async loadBoard() {
    const response = await this.session.requestJson({
      url: this.endpoint("/board"),
    });
    return normalizeBoard(classifyResponse(response));
  }

  async createTask({ title, triage = false, idempotencyKey }) {
    const normalizedTitle = String(title ?? "").trim();
    if (!normalizedTitle || normalizedTitle.length > 1_000) throw new Error("Task title must be 1–1,000 characters.");
    const response = await this.session.requestJson({
      url: this.endpoint("/tasks"),
      method: "POST",
      body: {
        title: normalizedTitle,
        triage: Boolean(triage),
        workspace_kind: "scratch",
        idempotency_key: typeof idempotencyKey === "string" ? idempotencyKey.slice(0, 128) : null,
      },
    });
    const payload = classifyResponse(response);
    const task = normalizeTask(payload?.task, triage ? "triage" : "todo");
    if (!task) throw new KanbanClientError("kanban_contract_mismatch", response.status);
    return task;
  }

  async updateStatus(taskId, status) {
    if (!KANBAN_STATUSES.includes(status)) throw new Error("Invalid task status.");
    const response = await this.session.requestJson({
      url: this.endpoint(taskPath(taskId)),
      method: "PATCH",
      body: { status },
    });
    classifyResponse(response);
  }

  release() {
    this.session = null;
  }
}
