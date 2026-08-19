import { clear, h } from "@/lib/dom";
import { DashboardAgentController } from "@/dashboard-agent";
import { DashboardAuthError, DashboardAuthSession } from "@/dashboard-auth";
import { DashboardGatewayClient } from "@/dashboard-gateway";
import { normalizeHermesDashboardUrl } from "@/kanban-client";
import { SessionBrokerClient } from "@/session-broker";

const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_AGENT_STATES = new Set(["running", "waiting_for_approval", "stopping"]);

function emptyAuthSnapshot() {
  return Object.freeze({ state: "disconnected", providers: Object.freeze([]), identity: null, label: "" });
}

function emptyAgentSnapshot() {
  return Object.freeze({
    status: "idle",
    connectionState: "disconnected",
    assistant: "",
    activity: Object.freeze([]),
    pendingApproval: null,
    error: "",
    actionPending: false,
  });
}

function authErrorCopy(error) {
  if (error instanceof DashboardAuthError && error.code === "invalid_credentials") return "Hermes rejected those credentials. Check them and try again.";
  if (error instanceof DashboardAuthError && error.code === "login_rate_limited") return "Too many sign-in attempts. Wait a moment, then try again.";
  if (error instanceof DashboardAuthError && error.code === "session_expired") return "Your Hermes sign-in expired. Sign in again to continue.";
  if (error instanceof DashboardAuthError && error.code === "password_login_not_supported") return "This Hermes sign-in method is not available here yet.";
  if (error instanceof DashboardAuthError && error.code === "auth_contract_mismatch") return "This Hermes sign-in setup is not supported by this extension.";
  if (error instanceof DashboardAuthError && error.code === "login_response_unreadable") return "Hermes accepted the sign-in, but the returned session could not be used.";
  if (error instanceof DashboardAuthError && error.code === "session_check_failed") return "Hermes could not verify your sign-in. Try again when it is reachable.";
  if (/^(Enter|Use)/.test(error?.message ?? "")) return error.message;
  return "Hermes could not be reached. Check the address and try again.";
}

function connectionPresentation(snapshot) {
  switch (snapshot?.state) {
    case "connected": return { label: "Connected", busy: false };
    case "connecting": return { label: "Connecting…", busy: true };
    case "reconnecting": return { label: "Reconnecting…", busy: true };
    case "offline": return { label: "Offline — retrying", busy: true };
    case "signed_out": return { label: "Signed out", busy: false };
    default: return { label: "Disconnected", busy: false };
  }
}

function runStatusLabel(status) {
  if (status === "waiting_for_approval") return "Needs approval";
  if (status === "stopping") return "Stopping…";
  if (status === "completed") return "Complete";
  if (status === "failed") return "Needs attention";
  if (status === "running") return "Working";
  return "Ready";
}

function reconnectCopy(snapshot) {
  if (snapshot.reason === "websocket_ticket_failed") return "Hermes couldn’t prepare the agent connection. We’ll keep trying automatically.";
  if (snapshot.reason === "connection_timeout") return "Hermes isn’t responding to agent connections yet. We’ll keep trying automatically.";
  if (snapshot.reason === "connection_auth_rejected") return "Hermes rejected the agent connection. We’ll keep trying with a new connection.";
  if (snapshot.reason === "connection_not_allowed") return "This Hermes server isn’t accepting agent connections from Muxy yet.";
  if (snapshot.state === "offline" && snapshot.attempt >= 3) return "Hermes isn’t accepting agent connections yet. We’ll keep trying automatically.";
  return "Trying to reconnect automatically. No action is needed.";
}

export class HermesGatewayPanel {
  constructor(root) {
    this.root = root;
    this.sessionBroker = new SessionBrokerClient();
    this.urlValue = "";
    this.boardValue = null;
    this.providerValue = "";
    this.usernameValue = "";
    this.passwordValue = "";
    this.promptValue = "";
    this.steerValue = "";
    this.state = "restoring";
    this.message = "";
    this.authSession = null;
    this.authSnapshot = emptyAuthSnapshot();
    this.gateway = null;
    this.connectionSnapshot = Object.freeze({ state: "disconnected", attempt: 0, retryInMs: null, reason: null });
    this.agent = null;
    this.agentSnapshot = emptyAgentSnapshot();
    this.unsubscribeConnection = null;
    this.unsubscribeAgent = null;
    this.sessionCheckTimer = null;
    this.sessionCheckInFlight = false;
    this.sessionInvalidating = false;
    this.lastSessionCheckAt = 0;
    this.restorePromise = null;
    this.connectionGeneration = 0;
  }

  start() {
    this.render();
    void this.sessionBroker.clearGateway();
    void this.restoreSavedSession();
    this.sessionCheckTimer = globalThis.setInterval(() => { void this.verifyPrimarySession(); }, SESSION_CHECK_INTERVAL_MS);
    window.muxy?.onFocus?.((focused) => {
      if (!focused) return;
      if (!this.authSession) void this.restoreSavedSession();
      else if (Date.now() - this.lastSessionCheckAt >= SESSION_CHECK_INTERVAL_MS) void this.verifyPrimarySession();
      if (["offline", "disconnected"].includes(this.connectionSnapshot.state)) void this.gateway?.reconnectNow().catch(() => {});
      if (this.authSnapshot.state !== "logged_in") this.urlInput?.focus();
      else if (!ACTIVE_AGENT_STATES.has(this.agentSnapshot.status)) this.promptInput?.focus();
    });
    window.muxy?.lifecycle?.onBeforeClose?.(async () => this.release());
    window.addEventListener("pagehide", () => { void this.release(); }, { once: true });
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.syncForms();
  }

  view() {
    return h("main", { class: "gateway-panel" },
      this.header(),
      this.authSnapshot.state === "logged_in" ? this.agentView() : this.connectionView(),
    );
  }

  header() {
    const connection = connectionPresentation(this.connectionSnapshot);
    return h("header", { class: "gateway-header" },
      h("div", { class: "gateway-title-row" },
        h("div", { class: "gateway-title-group" },
          h("h1", { class: "gateway-title" }, "Hermes"),
          this.authSnapshot.state === "logged_in"
            ? h("span", { class: `gateway-connection gateway-connection-${this.connectionSnapshot.state}`, role: "status", "aria-live": "polite" },
              connection.busy ? h("span", { class: "gateway-reconnect-icon", "aria-hidden": "true" }, "↔") : h("span", { class: "gateway-connection-dot", "aria-hidden": "true" }),
              connection.label,
            )
            : h("span", { class: "gateway-connection gateway-connection-signed_out", role: "status" }, "Signed out"),
        ),
        this.authSnapshot.state === "logged_in" ? h("button", { class: "gateway-link-button", type: "button", onclick: () => void this.logout() }, "Log out") : null,
      ),
      this.authSnapshot.state === "logged_in" ? h("div", { class: "gateway-account-row" },
        h("span", { class: "gateway-account" }, `Signed in as ${this.authSnapshot.label}`),
        h("button", { class: "gateway-secondary", type: "button", onclick: () => void this.openBoard() }, "Open board"),
      ) : h("p", { class: "gateway-purpose" }, "Sign in once to use Hermes and your project boards."),
    );
  }

  connectionView() {
    const url = h("input", {
      id: "dashboard-url",
      class: "gateway-input",
      type: "url",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: "http://127.0.0.1:9119",
      oninput: (event) => { this.urlValue = event.target.value; this.message = ""; this.syncForms(); },
    });
    url.value = this.urlValue;
    this.urlInput = url;
    const checking = ["restoring", "discovering", "authenticating"].includes(this.state);
    const check = h("button", { class: "gateway-submit", type: "submit" }, checking ? "Checking…" : "Continue");
    this.checkButton = check;

    let authForm = null;
    if (["logged_out", "session_expired"].includes(this.authSnapshot.state)
      && this.authSnapshot.providers.some((provider) => provider.supportsPassword)) {
      const providers = this.authSnapshot.providers.filter((provider) => provider.supportsPassword);
      if (!providers.some((provider) => provider.name === this.providerValue)) this.providerValue = providers[0].name;
      const provider = h("select", {
        id: "dashboard-provider",
        class: "gateway-select",
        onchange: (event) => { this.providerValue = event.target.value; this.message = ""; },
      }, providers.map((candidate) => h("option", { value: candidate.name, selected: candidate.name === this.providerValue }, candidate.displayName)));
      const username = h("input", {
        id: "dashboard-username",
        class: "gateway-input",
        type: "text",
        autocomplete: "username",
        spellcheck: "false",
        maxlength: "256",
        oninput: (event) => { this.usernameValue = event.target.value; this.message = ""; this.syncForms(); },
      });
      username.value = this.usernameValue;
      const password = h("input", {
        id: "dashboard-password",
        class: "gateway-input",
        type: "password",
        autocomplete: "current-password",
        maxlength: "4096",
        oninput: (event) => { this.passwordValue = event.target.value; this.message = ""; this.syncForms(); },
      });
      password.value = this.passwordValue;
      const signIn = h("button", { class: "gateway-submit", type: "submit" }, this.state === "authenticating" ? "Signing in…" : "Sign in");
      this.providerInput = provider;
      this.usernameInput = username;
      this.passwordInput = password;
      this.signInButton = signIn;
      authForm = h("form", { class: "gateway-form gateway-card", onsubmit: (event) => void this.signIn(event) },
        h("h2", null, this.authSnapshot.state === "session_expired" ? "Sign in again" : "Sign in"),
        h("label", { class: "gateway-label", for: "dashboard-provider" }, "Sign-in method"), provider,
        h("label", { class: "gateway-label", for: "dashboard-username" }, "Username"), username,
        h("label", { class: "gateway-label", for: "dashboard-password" }, "Password"), password,
        h("p", { class: "gateway-footnote" }, "You’ll stay signed in on this Mac until you log out."),
        signIn,
      );
    } else if (this.authSnapshot.state === "oauth_required") {
      authForm = h("section", { class: "gateway-card gateway-form" },
        h("h2", null, "Browser sign-in required"),
        h("p", null, "This Hermes server uses a browser sign-in that the extension cannot open yet."),
      );
    } else if (this.authSnapshot.state === "auth_unavailable") {
      authForm = h("section", { class: "gateway-card gateway-form" },
        h("h2", null, "Sign-in unavailable"),
        h("p", null, "This Hermes server does not offer a supported sign-in method."),
      );
    }

    return h("section", { class: "gateway-connect" },
      h("form", { class: "gateway-form gateway-card", onsubmit: (event) => void this.checkAuthentication(event) },
        h("h2", null, "Connect to Hermes"),
        h("p", null, "Enter the address you use to open Hermes."),
        h("label", { class: "gateway-label", for: "dashboard-url" }, "Hermes address"),
        url,
        check,
      ),
      authForm,
      h("p", { class: "gateway-inline-error", role: this.message ? "alert" : null, "aria-live": "polite" }, this.message),
    );
  }

  agentView() {
    const connected = this.connectionSnapshot.state === "connected";
    const active = ACTIVE_AGENT_STATES.has(this.agentSnapshot.status);
    const prompt = h("textarea", {
      id: "agent-prompt",
      class: "gateway-textarea",
      rows: "4",
      maxlength: String(64 * 1024),
      placeholder: connected ? "Ask Hermes to work on something…" : "Waiting for Hermes to reconnect…",
      disabled: !connected || active,
      oninput: (event) => { this.promptValue = event.target.value; this.syncForms(); },
    });
    prompt.value = this.promptValue;
    this.promptInput = prompt;
    const submit = h("button", { class: "gateway-submit", type: "submit" }, this.agentSnapshot.status === "completed" ? "Start another request" : "Start request");
    this.promptButton = submit;

    return h("section", { class: "gateway-agent" },
      !connected ? h("div", { class: `gateway-connection-note gateway-connection-note-${this.connectionSnapshot.state}`, role: "status", "aria-live": "polite" },
        reconnectCopy(this.connectionSnapshot),
      ) : null,
      h("section", { class: "gateway-card gateway-run", "aria-labelledby": "agent-title" },
        h("div", { class: "gateway-run-heading" },
          h("h2", { id: "agent-title" }, "Agent"),
          h("span", { class: `gateway-run-status gateway-run-status-${this.agentSnapshot.status}`, "aria-live": "polite" }, runStatusLabel(this.agentSnapshot.status)),
        ),
        !active ? h("form", { class: "gateway-form", onsubmit: (event) => void this.startRequest(event) },
          h("label", { class: "gateway-label", for: "agent-prompt" }, "Request"), prompt, submit,
        ) : null,
        this.agentSnapshot.assistant ? h("section", { class: "gateway-run-output", "aria-labelledby": "assistant-title" },
          h("h3", { id: "assistant-title" }, "Hermes"),
          h("p", { class: "gateway-assistant", "aria-live": "polite" }, this.agentSnapshot.assistant),
        ) : null,
        this.agentSnapshot.activity.length ? h("section", { class: "gateway-run-activity", "aria-labelledby": "activity-title" },
          h("h3", { id: "activity-title" }, "Activity"),
          h("ol", { class: "gateway-activity-list" }, this.agentSnapshot.activity.map((item) => h("li", { class: `gateway-activity gateway-activity-${item.kind}` },
            h("strong", null, item.label), item.detail ? h("span", null, item.detail) : null,
          ))),
        ) : null,
        this.approvalView(),
        active && this.agentSnapshot.status !== "waiting_for_approval" ? this.activeControls() : null,
        this.agentSnapshot.error ? h("p", { class: "gateway-inline-error", role: "alert" }, this.agentSnapshot.error) : null,
      ),
    );
  }

  approvalView() {
    const approval = this.agentSnapshot.pendingApproval;
    if (!approval) return null;
    return h("section", { class: "gateway-approval", "aria-labelledby": "approval-title" },
      h("h3", { id: "approval-title" }, "Approval required"),
      h("p", null, approval.tool),
      approval.command ? h("pre", { class: "gateway-command" }, approval.command) : null,
      h("div", { class: "gateway-control-row" }, approval.choices.map((choice) => h("button", {
        class: choice === "deny" ? "gateway-danger" : "gateway-secondary",
        type: "button",
        disabled: this.agentSnapshot.actionPending || this.connectionSnapshot.state !== "connected",
        onclick: () => void this.agent?.approve(choice).catch(() => {}),
      }, choice === "once" ? "Allow once" : choice === "session" ? "Allow for session" : choice === "always" ? "Always allow" : "Deny"))),
    );
  }

  activeControls() {
    const steer = h("input", {
      id: "agent-steer",
      class: "gateway-input",
      type: "text",
      maxlength: String(64 * 1024),
      placeholder: "Add guidance…",
      disabled: this.agentSnapshot.actionPending || this.connectionSnapshot.state !== "connected",
      oninput: (event) => { this.steerValue = event.target.value; this.syncForms(); },
    });
    steer.value = this.steerValue;
    const steerButton = h("button", { class: "gateway-secondary", type: "submit" }, "Send guidance");
    this.steerInput = steer;
    this.steerButton = steerButton;
    return h("section", { class: "gateway-run-controls", "aria-labelledby": "controls-title" },
      h("h3", { id: "controls-title" }, "Controls"),
      h("form", { class: "gateway-steer-form", onsubmit: (event) => void this.steer(event) }, steer, steerButton),
      h("button", {
        class: "gateway-danger",
        type: "button",
        disabled: this.agentSnapshot.actionPending || this.connectionSnapshot.state !== "connected",
        onclick: () => void this.agent?.stop().catch(() => {}),
      }, this.agentSnapshot.status === "stopping" ? "Stop requested…" : "Stop"),
    );
  }

  syncForms() {
    if (this.checkButton) {
      let valid = false;
      try { normalizeHermesDashboardUrl(this.urlValue); valid = true; } catch { /* validation is rendered on submit */ }
      this.checkButton.disabled = ["restoring", "discovering", "authenticating"].includes(this.state) || !valid;
    }
    if (this.signInButton) this.signInButton.disabled = this.state === "authenticating" || !this.usernameValue.trim() || !this.passwordValue;
    if (this.promptButton) this.promptButton.disabled = this.connectionSnapshot.state !== "connected" || !this.promptValue.trim();
    if (this.steerButton) this.steerButton.disabled = this.connectionSnapshot.state !== "connected" || this.agentSnapshot.actionPending || !this.steerValue.trim();
  }

  async checkAuthentication(event) {
    event.preventDefault();
    if (["restoring", "discovering", "authenticating"].includes(this.state)) return;
    await this.releaseConnection();
    this.state = "discovering";
    this.message = "";
    this.render();
    try {
      const baseUrl = normalizeHermesDashboardUrl(this.urlValue);
      this.authSession = new DashboardAuthSession({ baseUrl });
      this.authSnapshot = await this.authSession.discover();
      this.state = "signed_out";
    } catch (error) {
      this.authSession = null;
      this.authSnapshot = emptyAuthSnapshot();
      this.state = "signed_out";
      this.message = authErrorCopy(error);
    }
    this.render();
    if (this.authSnapshot.providers.some((provider) => provider.supportsPassword)) this.usernameInput?.focus();
  }

  async signIn(event) {
    event.preventDefault();
    if (!this.authSession || this.state === "authenticating") return;
    this.state = "authenticating";
    this.message = "";
    this.render();
    try {
      this.authSnapshot = await this.authSession.login({
        provider: this.providerValue,
        username: this.usernameValue,
        password: this.passwordValue,
      });
      this.lastSessionCheckAt = Date.now();
      await this.persistDashboardSession();
      await this.connectAgent();
    } catch (error) {
      this.authSnapshot = this.authSession.snapshot;
      this.state = "signed_out";
      this.message = authErrorCopy(error);
      if (error instanceof DashboardAuthError && error.code === "session_expired") await this.sessionBroker.clearDashboard();
    } finally {
      this.clearCredentials();
    }
    this.render();
    if (this.authSnapshot.state !== "logged_in") this.usernameInput?.focus();
  }

  restoreSavedSession() {
    if (this.restorePromise) return this.restorePromise;
    const operation = this.performSavedSessionRestore();
    this.restorePromise = operation;
    void operation.finally(() => {
      if (this.restorePromise === operation) this.restorePromise = null;
    });
    return operation;
  }

  async performSavedSessionRestore() {
    this.state = "restoring";
    this.render();
    const saved = await this.sessionBroker.readDashboard();
    if (!saved) {
      this.state = "signed_out";
      this.render();
      this.urlInput?.focus();
      return;
    }
    this.urlValue = saved.baseUrl;
    this.boardValue = saved.board;
    try {
      this.authSession = DashboardAuthSession.fromSession({ baseUrl: saved.baseUrl, session: saved.auth });
      this.authSnapshot = await this.authSession.verify();
      this.lastSessionCheckAt = Date.now();
      await this.persistDashboardSession();
      await this.connectAgent();
    } catch (error) {
      this.authSnapshot = this.authSession?.snapshot ?? emptyAuthSnapshot();
      this.state = "signed_out";
      this.message = authErrorCopy(error);
      if (error instanceof DashboardAuthError && error.code === "session_expired") await this.sessionBroker.clearDashboard();
    }
    this.render();
  }

  async connectAgent() {
    const generation = ++this.connectionGeneration;
    await this.releaseConnection({ preserveGeneration: true });
    if (generation !== this.connectionGeneration || this.authSnapshot.state !== "logged_in") return;
    this.state = "authenticated";
    this.gateway = new DashboardGatewayClient({
      authSession: this.authSession,
      persistSession: async () => this.persistDashboardSession(),
    });
    this.agent = new DashboardAgentController({ gateway: this.gateway });
    this.unsubscribeConnection = this.gateway.subscribe((snapshot) => {
      if (generation !== this.connectionGeneration) return;
      this.connectionSnapshot = snapshot;
      if (snapshot.state === "signed_out") queueMicrotask(() => { void this.invalidateSession(); });
      this.render();
    });
    this.unsubscribeAgent = this.agent.subscribe((snapshot) => {
      if (generation !== this.connectionGeneration) return;
      this.agentSnapshot = snapshot;
      this.render();
    });
    this.render();
    await this.gateway.connect().catch(() => {});
  }

  async verifyPrimarySession() {
    if (!this.authSession || this.authSnapshot.state !== "logged_in" || this.sessionCheckInFlight) return;
    this.sessionCheckInFlight = true;
    try {
      this.authSnapshot = await this.authSession.verify();
      this.lastSessionCheckAt = Date.now();
      await this.persistDashboardSession();
    } catch (error) {
      this.authSnapshot = this.authSession.snapshot;
      if (error instanceof DashboardAuthError && error.code === "session_expired") await this.invalidateSession();
    } finally {
      this.sessionCheckInFlight = false;
    }
    this.render();
  }

  async invalidateSession() {
    if (this.sessionInvalidating) return;
    this.sessionInvalidating = true;
    try {
      await this.releaseConnection();
      await this.sessionBroker.clearDashboard();
      this.authSnapshot = this.authSession?.snapshot ?? Object.freeze({ ...emptyAuthSnapshot(), state: "session_expired" });
      this.state = "signed_out";
      this.message = "Your Hermes sign-in expired. Sign in again to continue.";
    } finally {
      this.sessionInvalidating = false;
    }
    this.render();
  }

  async persistDashboardSession() {
    const auth = this.authSession?.exportSession();
    if (!auth) return false;
    return this.sessionBroker.saveDashboard({ baseUrl: this.authSession.baseUrl, board: this.boardValue, auth });
  }

  clearCredentials() {
    this.usernameValue = "";
    this.passwordValue = "";
    if (this.usernameInput) this.usernameInput.value = "";
    if (this.passwordInput) this.passwordInput.value = "";
  }

  async startRequest(event) {
    event.preventDefault();
    const prompt = this.promptValue;
    if (!prompt.trim() || !this.agent) return;
    this.promptValue = "";
    this.render();
    await this.agent.start(prompt).catch(() => {});
  }

  async steer(event) {
    event.preventDefault();
    const guidance = this.steerValue;
    if (!guidance.trim() || !this.agent) return;
    this.steerValue = "";
    this.render();
    await this.agent.steer(guidance).catch(() => {});
  }

  async openBoard() {
    await window.muxy?.tabs?.open?.({ type: "hermes-project-board", singleton: true });
  }

  async logout() {
    const auth = this.authSession;
    await this.releaseConnection();
    try { await auth?.logout(); } catch { /* logout always clears local cookies */ }
    await this.sessionBroker.clearDashboard();
    this.authSnapshot = auth?.snapshot ?? emptyAuthSnapshot();
    this.state = "signed_out";
    this.message = "Signed out.";
    this.clearCredentials();
    this.render();
    this.urlInput?.focus();
  }

  async releaseConnection({ preserveGeneration = false } = {}) {
    if (!preserveGeneration) this.connectionGeneration += 1;
    this.unsubscribeAgent?.();
    this.unsubscribeAgent = null;
    this.unsubscribeConnection?.();
    this.unsubscribeConnection = null;
    this.agent?.release();
    this.agent = null;
    const gateway = this.gateway;
    this.gateway = null;
    if (gateway) await gateway.disconnect();
    this.connectionSnapshot = Object.freeze({ state: "disconnected", attempt: 0, retryInMs: null, reason: null });
  }

  async release() {
    if (this.sessionCheckTimer) globalThis.clearInterval(this.sessionCheckTimer);
    this.sessionCheckTimer = null;
    this.clearCredentials();
    await this.releaseConnection();
  }
}
