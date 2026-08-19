import { clear, h } from "@/lib/dom";
import { DashboardAuthError, DashboardAuthSession } from "@/dashboard-auth";
import { KANBAN_STATUSES, KanbanClient, KanbanClientError, normalizeBoardSlug, normalizeHermesDashboardUrl } from "@/kanban-client";
import { SessionBrokerClient } from "@/session-broker";

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
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function errorCopy(error) {
  if (error instanceof DashboardAuthError && error.code === "invalid_credentials") return "Hermes rejected those credentials. Check the username and password, then try again.";
  if (error instanceof DashboardAuthError && error.code === "login_rate_limited") return "Hermes temporarily limited sign-in attempts. Wait a moment, then try again.";
  if (error instanceof DashboardAuthError && error.code === "session_expired") return "Your sign-in expired. Sign in again to open this board.";
  if (error instanceof DashboardAuthError && error.code === "password_login_not_supported") return "This Dashboard needs a sign-in method this extension cannot open yet.";
  if (error instanceof DashboardAuthError && error.code === "auth_contract_mismatch") return "This Dashboard’s sign-in setup is not supported by this extension.";
  if (error instanceof DashboardAuthError && error.code === "login_response_unreadable") return "Hermes accepted the sign-in, but the extension could not use the returned session. Try again after updating the extension.";
  if (error instanceof DashboardAuthError && error.code === "session_check_failed") return "Hermes could not verify your sign-in. Try again when the Dashboard is reachable.";
  if (error instanceof KanbanClientError && error.code === "kanban_not_available") {
    return "Boards are not enabled for this Hermes Dashboard. Ask its administrator to enable them.";
  }
  if (error?.message === "kanban_contract_mismatch" || error?.code === "kanban_contract_mismatch") {
    return "This Dashboard returned an unsupported board response.";
  }
  if (/^(Enter|Use|Board slug|Task title|Invalid)/.test(error?.message ?? "")) return error.message;
  return "The Hermes board could not be reached. Check the Dashboard address, sign-in, and board name.";
}

export class HermesProjectBoard {
  constructor(root) {
    this.root = root;
    this.sessionBroker = new SessionBrokerClient();
    this.urlValue = "";
    this.boardValue = "default";
    this.providerValue = "";
    this.usernameValue = "";
    this.passwordValue = "";
    this.createTitle = "";
    this.createInTriage = true;
    this.state = "disconnected";
    this.authSnapshot = Object.freeze({ state: "disconnected", providers: [], identity: null, label: "" });
    this.message = "";
    this.board = null;
    this.client = null;
    this.authSession = null;
    this.pendingTaskId = null;
    this.sessionCheckInFlight = false;
    this.lastSessionCheckAt = 0;
    this.sessionCheckTimer = null;
  }

  start() {
    this.render();
    void this.restoreSavedSession();
    this.sessionCheckTimer = globalThis.setInterval(() => { void this.verifySavedSession(); }, SESSION_CHECK_INTERVAL_MS);
    window.muxy?.onFocus?.((focused) => {
      if (focused && Date.now() - this.lastSessionCheckAt >= SESSION_CHECK_INTERVAL_MS) void this.verifySavedSession();
      if (focused && this.state === "disconnected") this.urlInput?.focus();
    });
    window.muxy?.lifecycle?.onBeforeClose?.(async () => this.release());
    window.addEventListener("pagehide", () => this.release(), { once: true });
  }

  release() {
    this.client?.release();
    this.client = null;
    if (this.sessionCheckTimer) globalThis.clearInterval(this.sessionCheckTimer);
    this.sessionCheckTimer = null;
    this.usernameValue = "";
    this.passwordValue = "";
    if (this.usernameInput) this.usernameInput.value = "";
    if (this.passwordInput) this.passwordInput.value = "";
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.syncForms();
  }

  view() {
    const sessionLabel = this.authSnapshot.state === "logged_in"
      ? `Signed in as ${this.authSnapshot.label}`
      : this.authSnapshot.state === "session_expired" ? "Sign-in expired"
        : this.state === "restoring" || this.authSnapshot.state === "checking" ? "Opening your board"
          : "Not signed in";
    return h("main", { class: "board-app" },
      h("header", { class: "board-topbar" },
        h("div", { class: "board-title-group" },
          h("h1", null, "Hermes Project Board"),
          h("span", { class: `board-connection board-connection-${this.state}` }, this.state === "ready" ? this.boardValue : this.state.replaceAll("_", " ")),
          h("span", { class: `board-session board-session-${this.authSnapshot.state}`, role: "status" }, sessionLabel),
        ),
        this.state === "ready" ? h("div", { class: "board-topbar-actions" },
          h("button", { class: "board-button board-button-secondary", type: "button", disabled: this.state === "loading", onclick: () => void this.refresh() }, "Refresh"),
          h("button", { class: "board-button board-button-secondary", type: "button", onclick: () => void this.logout() }, "Log out"),
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
      placeholder: "https://hermes.example",
      oninput: (event) => { this.urlValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    url.value = this.urlValue;
    const board = h("input", {
      id: "board-slug", class: "board-input", type: "text", autocomplete: "off", spellcheck: "false", maxlength: "64",
      oninput: (event) => { this.boardValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    board.value = this.boardValue;
    this.urlInput = url;
    this.boardInput = board;
    const discovering = ["discovering", "authenticating", "restoring"].includes(this.state);
    const check = h("button", { class: "board-button board-button-primary", type: "submit" }, discovering ? "Checking…" : "Check sign-in");
    this.checkButton = check;

    let authForm = null;
    if (["logged_out", "session_expired"].includes(this.authSnapshot.state) && this.authSnapshot.providers.some((provider) => provider.supportsPassword)) {
      const providers = this.authSnapshot.providers.filter((provider) => provider.supportsPassword);
      if (!providers.some((provider) => provider.name === this.providerValue)) this.providerValue = providers[0].name;
      const provider = h("select", {
        id: "dashboard-provider", class: "board-select",
        onchange: (event) => { this.providerValue = event.target.value; this.message = ""; },
      }, providers.map((candidate) => h("option", { value: candidate.name, selected: candidate.name === this.providerValue }, candidate.displayName)));
      const username = h("input", {
        id: "dashboard-username", class: "board-input", type: "text", autocomplete: "username", spellcheck: "false", maxlength: "256",
        oninput: (event) => { this.usernameValue = event.target.value; this.message = ""; this.syncForms(); },
      });
      username.value = this.usernameValue;
      const password = h("input", {
        id: "dashboard-password", class: "board-input", type: "password", autocomplete: "current-password", maxlength: "4096",
        oninput: (event) => { this.passwordValue = event.target.value; this.message = ""; this.syncForms(); },
      });
      password.value = this.passwordValue;
      const signIn = h("button", { class: "board-button board-button-primary", type: "submit" }, this.state === "authenticating" ? "Signing in…" : "Sign in and open board");
      this.providerInput = provider;
      this.usernameInput = username;
      this.passwordInput = password;
      this.signInButton = signIn;
      authForm = h("form", { class: "board-connect-form", onsubmit: (event) => void this.signIn(event) },
        h("p", { class: "board-auth-state", role: "status" }, this.authSnapshot.state === "session_expired" ? "Sign-in expired" : "Sign in"),
        h("label", { for: "dashboard-provider" }, "Sign-in provider"), provider,
        h("label", { for: "dashboard-username" }, "Username"), username,
        h("label", { for: "dashboard-password" }, "Password"), password,
        h("p", { class: "board-help" }, "You’ll stay signed in on this Mac until you log out."),
        signIn,
      );
    } else if (this.authSnapshot.state === "oauth_required") {
      authForm = h("section", { class: "board-connect-form" },
        h("p", { class: "board-auth-state", role: "status" }, "Sign in required"),
        h("strong", null, "Sign in in your browser"),
        h("p", { class: "board-help" }, "This Dashboard requires a browser sign-in. It can’t be opened from this extension yet."),
      );
    } else if (this.authSnapshot.state === "auth_unavailable") {
      authForm = h("section", { class: "board-connect-form" },
        h("p", { class: "board-auth-state", role: "status" }, "Sign in unavailable"),
        h("p", { class: "board-help" }, "This Dashboard does not offer a sign-in method this extension can use."),
      );
    }
    return h("section", { class: "board-connect-shell" },
      h("div", { class: "board-connect-copy" },
        h("p", { class: "board-eyebrow" }, "Hermes board"),
        h("h2", null, "Open a Hermes board"),
        h("p", null, "Choose the Dashboard and board you want to work with."),
      ),
      h("div", { class: "board-auth-stack" },
      h("form", { class: "board-connect-form", onsubmit: (event) => void this.checkAuthentication(event) },
        h("label", { for: "dashboard-url" }, "Dashboard address"), url,
        h("p", { class: "board-help" }, "Use the address your team uses for Hermes."),
        h("label", { for: "board-slug" }, "Board name"), board,
        check,
      ),
      authForm,
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
        h("div", null, h("strong", null, `${total} ${total === 1 ? "card" : "cards"}`)),
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
    if (this.checkButton) {
      let valid = false;
      try { normalizeHermesDashboardUrl(this.urlValue); normalizeBoardSlug(this.boardValue); valid = true; } catch { /* rendered on submit */ }
      this.checkButton.disabled = ["discovering", "authenticating", "restoring"].includes(this.state) || !valid;
    }
    if (this.signInButton) this.signInButton.disabled = this.state === "authenticating" || !this.usernameValue.trim() || !this.passwordValue;
    if (this.createButton) this.createButton.disabled = !this.createTitle.trim() || Boolean(this.pendingTaskId);
  }

  async checkAuthentication(event) {
    event.preventDefault();
    if (["discovering", "authenticating", "restoring"].includes(this.state)) return;
    this.state = "discovering";
    this.message = "Checking sign-in options…";
    this.client?.release();
    this.client = null;
    this.board = null;
    this.authSession?.release();
    this.authSession = null;
    this.render();
    try {
      const auth = new DashboardAuthSession({ baseUrl: this.urlValue });
      this.authSnapshot = await auth.discover();
      this.authSession = auth;
      this.boardValue = normalizeBoardSlug(this.boardValue);
      this.providerValue = this.authSnapshot.providers.find((provider) => provider.supportsPassword)?.name ?? "";
      this.state = this.authSnapshot.state;
      this.message = this.authSnapshot.state === "logged_out" ? "Sign in to continue." : "";
    } catch (error) {
      this.authSession?.release();
      this.authSession = null;
      this.authSnapshot = Object.freeze({ state: "disconnected", providers: [], identity: null, label: "" });
      this.state = "disconnected";
      this.message = errorCopy(error);
    }
    this.render();
  }

  async signIn(event) {
    event.preventDefault();
    if (!this.authSession || this.state === "authenticating") return;
    this.state = "authenticating";
    this.message = "Signing in…";
    this.render();
    const username = this.usernameValue;
    const password = this.passwordValue;
    this.usernameValue = "";
    this.passwordValue = "";
    try {
      this.authSnapshot = await this.authSession.login({ provider: this.providerValue, username, password });
      const client = new KanbanClient({ baseUrl: this.urlValue, session: this.authSession, board: this.boardValue });
      const board = await client.loadBoard();
      this.client?.release();
      this.client = client;
      this.board = board;
      this.state = "ready";
      this.message = "";
      await this.persistSession();
      await window.muxy?.tabs?.setTitle?.(`Hermes Board · ${this.boardValue}`);
    } catch (error) {
      this.client?.release();
      this.client = null;
      this.board = null;
      this.authSnapshot = this.authSession.snapshot;
      this.state = this.authSnapshot.state === "session_expired" ? "session_expired" : "logged_out";
      this.message = errorCopy(error);
    } finally {
      this.usernameValue = "";
      this.passwordValue = "";
    }
    this.render();
  }

  async logout() {
    this.client?.release();
    this.client = null;
    this.board = null;
    try {
      if (this.authSession) this.authSnapshot = await this.authSession.logout();
    } catch {
      this.authSession?.release();
      this.authSnapshot = this.authSession?.snapshot ?? Object.freeze({ state: "logged_out", providers: [], identity: null, label: "" });
    }
    this.usernameValue = "";
    this.passwordValue = "";
    this.state = "logged_out";
    this.message = "Logged out.";
    await this.sessionBroker.clearDashboard();
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
      await this.persistSession();
    } catch (error) {
      this.handleActionError(error);
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
      await this.persistSession();
    } catch (error) {
      this.handleActionError(error);
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
      await this.persistSession();
    } catch (error) {
      this.handleActionError(error);
    }
    this.pendingTaskId = null;
    this.render();
  }

  handleActionError(error) {
    if (error instanceof DashboardAuthError && error.code === "session_expired") {
      this.client?.release();
      this.client = null;
      this.board = null;
      this.authSnapshot = this.authSession?.snapshot ?? Object.freeze({ state: "session_expired", providers: [], identity: null, label: "" });
      this.state = "session_expired";
      void this.sessionBroker.clearDashboard();
      void window.muxy?.tabs?.setTitle?.("");
    }
    this.message = errorCopy(error);
  }

  async restoreSavedSession() {
    const saved = await this.sessionBroker.readDashboard();
    if (!saved || this.state === "ready") return;
    this.urlValue = saved.baseUrl;
    this.boardValue = saved.board;
    this.state = "restoring";
    this.message = "";
    this.render();
    try {
      const auth = DashboardAuthSession.fromSession({ baseUrl: saved.baseUrl, session: saved.auth });
      this.authSession = auth;
      this.authSnapshot = await auth.verify();
      this.lastSessionCheckAt = Date.now();
      this.providerValue = this.authSnapshot.providers.find((provider) => provider.supportsPassword)?.name ?? "";
      const client = new KanbanClient({ baseUrl: saved.baseUrl, session: auth, board: saved.board });
      this.board = await client.loadBoard();
      this.client?.release();
      this.client = client;
      this.state = "ready";
      await this.persistSession();
      await window.muxy?.tabs?.setTitle?.(`Hermes Board · ${this.boardValue}`);
    } catch (error) {
      this.client?.release();
      this.client = null;
      this.board = null;
      this.authSnapshot = this.authSession?.snapshot ?? Object.freeze({ state: "session_expired", providers: [], identity: null, label: "" });
      this.state = this.authSnapshot.state === "session_expired" ? "session_expired" : "disconnected";
      this.message = errorCopy(error);
      if (this.state === "session_expired") await this.sessionBroker.clearDashboard();
    }
    this.render();
  }

  async persistSession() {
    const auth = this.authSession?.exportSession();
    if (!auth || !this.urlValue || !this.boardValue) return;
    await this.sessionBroker.saveDashboard({ baseUrl: this.urlValue, board: this.boardValue, auth });
  }

  async verifySavedSession() {
    if (this.state !== "ready" || !this.authSession || this.sessionCheckInFlight || this.pendingTaskId) return;
    this.sessionCheckInFlight = true;
    try {
      this.authSnapshot = await this.authSession.verify();
      this.lastSessionCheckAt = Date.now();
      await this.persistSession();
    } catch (error) {
      this.lastSessionCheckAt = Date.now();
      this.handleActionError(error);
    } finally {
      this.sessionCheckInFlight = false;
      this.render();
    }
  }
}
