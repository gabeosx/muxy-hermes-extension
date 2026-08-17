import { clear, h } from "@/lib/dom";
import { KANBAN_STATUSES, KanbanClient, KanbanClientError, normalizeBoardSlug, normalizeHermesDashboardUrl } from "@/kanban-client";

const STATUS_LABELS = Object.freeze({
  triage: "Triage",
  todo: "Todo",
  scheduled: "Scheduled",
  ready: "Ready",
  running: "Running",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
});

function errorCopy(error) {
  if (error instanceof KanbanClientError && error.code === "dashboard_authentication_failed") {
    return "The Hermes dashboard rejected this session token. Copy the current token printed when the dashboard starts.";
  }
  if (error instanceof KanbanClientError && error.code === "kanban_not_available") {
    return "Kanban is not available at this backend. Enable the Hermes Kanban dashboard plugin; the Runs Gateway API alone does not provide boards.";
  }
  if (error?.message === "kanban_contract_mismatch" || error?.code === "kanban_contract_mismatch") {
    return "The backend responded, but its Kanban contract is not compatible with this extension.";
  }
  if (/^(Enter|Use|Board slug|Task title|Invalid)/.test(error?.message ?? "")) return error.message;
  return "The Hermes board could not be reached. Check the dashboard URL, tunnel, session token, and board slug.";
}

export class HermesProjectBoard {
  constructor(root) {
    this.root = root;
    this.urlValue = "";
    this.tokenValue = "";
    this.boardValue = "default";
    this.createTitle = "";
    this.createInTriage = true;
    this.state = "disconnected";
    this.message = "";
    this.board = null;
    this.client = null;
    this.pendingTaskId = null;
  }

  start() {
    this.render();
    window.muxy?.onFocus?.((focused) => {
      if (focused && this.state === "disconnected") this.urlInput?.focus();
    });
    window.muxy?.lifecycle?.onBeforeClose?.(async () => this.release());
    window.addEventListener("pagehide", () => this.release(), { once: true });
  }

  release() {
    this.client?.release();
    this.client = null;
    this.tokenValue = "";
    if (this.tokenInput) this.tokenInput.value = "";
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.syncForms();
  }

  view() {
    return h("main", { class: "board-app" },
      h("header", { class: "board-topbar" },
        h("div", { class: "board-title-group" },
          h("h1", null, "Hermes Project Board"),
          h("span", { class: `board-connection board-connection-${this.state}` }, this.state === "ready" ? this.boardValue : this.state),
        ),
        this.state === "ready" ? h("div", { class: "board-topbar-actions" },
          h("button", { class: "board-button board-button-secondary", type: "button", disabled: this.state === "loading", onclick: () => void this.refresh() }, "Refresh"),
          h("button", { class: "board-button board-button-secondary", type: "button", onclick: () => this.disconnect() }, "Disconnect"),
        ) : null,
      ),
      this.connectionView(),
      this.state === "ready" ? this.boardView() : null,
    );
  }

  connectionView() {
    if (this.state === "ready") return null;
    const url = h("input", {
      id: "dashboard-url", class: "board-input", type: "url", autocomplete: "off", spellcheck: "false",
      placeholder: "https://hermes.example or http://127.0.0.1:8639",
      oninput: (event) => { this.urlValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    url.value = this.urlValue;
    const token = h("input", {
      id: "dashboard-token", class: "board-input", type: "password", autocomplete: "off", spellcheck: "false",
      oninput: (event) => { this.tokenValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    token.value = this.tokenValue;
    const board = h("input", {
      id: "board-slug", class: "board-input", type: "text", autocomplete: "off", spellcheck: "false", maxlength: "64",
      oninput: (event) => { this.boardValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    board.value = this.boardValue;
    const submit = h("button", { class: "board-button board-button-primary", type: "submit" }, this.state === "loading" ? "Connecting…" : "Open board");
    this.urlInput = url;
    this.tokenInput = token;
    this.boardInput = board;
    this.connectButton = submit;
    return h("section", { class: "board-connect-shell" },
      h("div", { class: "board-connect-copy" },
        h("p", { class: "board-eyebrow" }, "Explicit project mapping"),
        h("h2", null, "Map this Muxy project to a Hermes board"),
        h("p", null, "Muxy and Hermes may be on different machines. Enter the dashboard endpoint and board slug explicitly; no workspace path is sent or compared."),
      ),
      h("form", { class: "board-connect-form", onsubmit: (event) => void this.connect(event) },
        h("label", { for: "dashboard-url" }, "Hermes dashboard URL"), url,
        h("p", { class: "board-help" }, "Use HTTPS remotely, or point at a loopback SSH tunnel."),
        h("label", { for: "dashboard-token" }, "Dashboard session token"), token,
        h("p", { class: "board-help" }, "Kept only in this open tab and cleared when it closes."),
        h("label", { for: "board-slug" }, "Hermes board slug"), board,
        submit,
        h("p", { class: "board-message", role: this.message ? "alert" : null, "aria-live": "polite" }, this.message),
      ),
    );
  }

  boardView() {
    const title = h("input", {
      id: "new-card-title", class: "board-input", type: "text", maxlength: "1000", placeholder: "Add a task…",
      oninput: (event) => { this.createTitle = event.target.value; this.syncForms(); },
    });
    title.value = this.createTitle;
    const triage = h("select", { id: "new-card-column", class: "board-select", onchange: (event) => { this.createInTriage = event.target.value === "triage"; } },
      h("option", { value: "triage", selected: this.createInTriage }, "Triage"),
      h("option", { value: "todo", selected: !this.createInTriage }, "Todo"),
    );
    const submit = h("button", { class: "board-button board-button-primary", type: "submit" }, "Add card");
    this.createInput = title;
    this.createButton = submit;
    const total = this.board.columns.reduce((sum, column) => sum + column.tasks.length, 0);
    return h("section", { class: "board-workspace" },
      h("div", { class: "board-toolbar" },
        h("div", null, h("strong", null, `${total} ${total === 1 ? "card" : "cards"}`), h("span", null, "Gateway status and board state remain separate authorities.")),
        h("form", { class: "board-create-form", onsubmit: (event) => void this.createCard(event) }, title, triage, submit),
      ),
      h("p", { class: "board-message", role: this.message ? "alert" : null, "aria-live": "polite" }, this.message),
      h("div", { class: "board-columns", "aria-label": "Hermes Kanban board" }, this.board.columns.map((column) => this.columnView(column))),
    );
  }

  columnView(column) {
    return h("section", { class: `board-column board-column-${column.name}`, "aria-labelledby": `column-${column.name}` },
      h("header", { class: "board-column-header" },
        h("h2", { id: `column-${column.name}` }, h("span", { class: "board-status-dot" }), STATUS_LABELS[column.name] ?? column.name),
        h("span", { class: "board-count" }, column.tasks.length),
      ),
      h("div", { class: "board-card-list" },
        column.tasks.length ? column.tasks.map((task) => this.cardView(task)) : h("p", { class: "board-empty" }, "No cards"),
      ),
    );
  }

  cardView(task) {
    const status = h("select", {
      class: "board-select board-card-status", "aria-label": `Move ${task.title}`,
      disabled: this.pendingTaskId === task.id,
      onchange: (event) => void this.moveCard(task, event.target.value),
    }, KANBAN_STATUSES.map((name) => h("option", { value: name, selected: name === task.status }, STATUS_LABELS[name])));
    const chips = [
      task.assignee ? h("span", { class: "board-chip" }, task.assignee) : null,
      task.tenant ? h("span", { class: "board-chip" }, task.tenant) : null,
      task.priority ? h("span", { class: "board-chip" }, `P${task.priority}`) : null,
      task.progress ? h("span", { class: "board-chip" }, `${task.progress.done}/${task.progress.total}`) : null,
      task.commentCount ? h("span", { class: "board-chip" }, `${task.commentCount} comments`) : null,
    ];
    return h("article", { class: "board-card" },
      h("h3", null, task.title),
      task.summary ? h("p", { class: "board-card-summary" }, task.summary) : null,
      h("div", { class: "board-card-meta" }, chips),
      status,
    );
  }

  syncForms() {
    if (this.connectButton) {
      let valid = false;
      try { normalizeHermesDashboardUrl(this.urlValue); normalizeBoardSlug(this.boardValue); valid = true; } catch { /* rendered on submit */ }
      this.connectButton.disabled = this.state === "loading" || !valid || !this.tokenValue;
    }
    if (this.createButton) this.createButton.disabled = !this.createTitle.trim() || Boolean(this.pendingTaskId);
  }

  async connect(event) {
    event.preventDefault();
    if (this.state === "loading") return;
    this.state = "loading";
    this.message = "Connecting to the Hermes Kanban dashboard…";
    this.render();
    try {
      const client = new KanbanClient({ baseUrl: this.urlValue, bearer: this.tokenValue, board: this.boardValue });
      const board = await client.loadBoard();
      this.client?.release();
      this.client = client;
      this.board = board;
      this.boardValue = normalizeBoardSlug(this.boardValue);
      this.tokenValue = "";
      this.state = "ready";
      this.message = "";
      await window.muxy?.tabs?.setTitle?.(`Hermes Board · ${this.boardValue}`);
    } catch (error) {
      this.client?.release();
      this.client = null;
      this.state = "disconnected";
      this.message = errorCopy(error);
    }
    this.render();
  }

  disconnect() {
    this.release();
    this.board = null;
    this.state = "disconnected";
    this.message = "";
    void window.muxy?.tabs?.setTitle?.("");
    this.render();
  }

  async refresh() {
    if (!this.client || this.pendingTaskId) return;
    this.message = "Refreshing…";
    this.render();
    try {
      this.board = await this.client.loadBoard();
      this.message = "";
    } catch (error) {
      this.message = errorCopy(error);
    }
    this.render();
  }

  async createCard(event) {
    event.preventDefault();
    if (!this.client || !this.createTitle.trim() || this.pendingTaskId) return;
    this.pendingTaskId = "creating";
    this.message = "Creating card…";
    this.render();
    try {
      await this.client.createTask({
        title: this.createTitle,
        triage: this.createInTriage,
        idempotencyKey: `muxy-${globalThis.crypto.randomUUID()}`,
      });
      this.createTitle = "";
      this.board = await this.client.loadBoard();
      this.message = "Card created.";
    } catch (error) {
      this.message = errorCopy(error);
    }
    this.pendingTaskId = null;
    this.render();
  }

  async moveCard(task, nextStatus) {
    if (!this.client || this.pendingTaskId || nextStatus === task.status) return;
    if (["blocked", "done"].includes(nextStatus)) {
      const confirmed = await window.muxy?.dialog?.confirm?.({
        title: `Move card to ${STATUS_LABELS[nextStatus]}?`,
        message: task.title,
        buttons: ["Cancel", "Move"],
      });
      if (confirmed !== "Move") {
        this.render();
        return;
      }
    }
    this.pendingTaskId = task.id;
    this.message = `Moving card to ${STATUS_LABELS[nextStatus]}…`;
    this.render();
    try {
      await this.client.updateStatus(task.id, nextStatus);
      this.board = await this.client.loadBoard();
      this.message = "Card moved.";
    } catch (error) {
      this.message = errorCopy(error);
    }
    this.pendingTaskId = null;
    this.render();
  }
}
