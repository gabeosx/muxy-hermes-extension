import { clear, h } from "@/lib/dom";
import { normalizeGatewayUrl } from "@/gateway-client";
import { normalizeCapabilities } from "@/capabilities";
import { ConnectionProbe, FailureClass, ProbeState } from "@/probe";
import { RUN_FEATURES, supportsCoreRun } from "@/run-client";
import { RunController } from "@/run-controller";
import { buildBridgeContract, copyRedactedReport, evaluateStopGate, loadEvidenceIndex, renderDeploymentMatrix } from "@/stop-gate";
import { loadRecoveryEvidence, renderRecoveryEvidence } from "@/recovery-evidence";
import { RecoveryReceiptWriter } from "@/recovery-receipt";
import { SessionBrokerClient } from "@/session-broker";

const STAGE_LABEL = Object.freeze({ passed: "Ready", failed: "Couldn’t verify", not_verified: "Not checked" });
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DEPLOYMENT_CONDITION_NAMES = Object.freeze({
  host_native_loopback: "Host-native loopback",
  docker_published_loopback: "Docker published loopback",
  ssh_local_forward: "SSH local forward",
  direct_remote_https: "Direct remote HTTPS",
  remote_muxy_workspace: "Remote Muxy workspace",
});

function resultCopy(result) {
  if (result.status === ProbeState.SUCCESS) return ["Hermes is ready", "You can start and monitor a run from this panel."];
  if (result.failureClass === FailureClass.STREAMING) return ["The Gateway responded, but live updates could not be confirmed.", "Try the connection again before starting a run."];
  if (result.failureClass === FailureClass.AUTHENTICATION) return ["Connection not verified", "The Gateway rejected this access token. Check the token, then try again."];
  if (result.failureClass === FailureClass.URL) return ["Connection not verified", "Correct the Gateway URL, then test the connection again."];
  if (result.failureClass === FailureClass.GATEWAY_DNS) return ["Gateway name not found", "Check the Gateway hostname and network name resolution, then test the connection again."];
  if (result.failureClass === FailureClass.GATEWAY_TLS) return ["Gateway TLS check failed", "Check the Gateway certificate and trusted HTTPS address, then test the connection again."];
  if (result.failureClass === FailureClass.GATEWAY_REFUSED) return ["Gateway refused the connection", "Check that the Gateway is listening on the entered address and port, then retry."];
  if (result.failureClass === FailureClass.GATEWAY_UNREACHABLE) return ["Gateway unreachable", "Muxy could not reach this Gateway. Check that it is running and that the address is reachable, then retry."];
  if (result.failureClass === FailureClass.GATEWAY_TIMEOUT) return ["Gateway timed out", "The Gateway did not respond in time. Check that it is reachable, then retry."];
  if (result.failureClass === FailureClass.JOURNAL_LIMIT) return ["Connection test could not finish", "The response was too large to check safely. Try again with a smaller response."];
  if (result.failureClass === FailureClass.PROTOCOL) return ["Gateway response was not accepted", "Check the Gateway authentication and response status, then test the connection again."];
  if (result.failureClass === FailureClass.RELAY) return ["Muxy could not connect", "Allow Muxy to make the connection, then try again."];
  return ["Connection not verified", "Check the Gateway address and access token, then try again."];
}

export class HermesGatewayPanel {
  constructor(root) {
    this.root = root;
    const panelInstanceId = globalThis.crypto.randomUUID();
    this.sessionBroker = new SessionBrokerClient();
    this.recoveryReceiptWriter = new RecoveryReceiptWriter({ panelInstanceId });
    this.probe = new ConnectionProbe({ files: window.muxy?.files ?? null, randomId: () => panelInstanceId });
    this.snapshot = this.probe.snapshot;
    this.urlValue = "";
    this.tokenValue = "";
    this.validationMessage = "";
    this.preparing = true;
    this.cleanupFailed = false;
    this.detailsOpen = false;
    this.evidenceState = Object.freeze({ state: "loading", index: null, rows: [] });
    this.recoveryEvidenceState = Object.freeze({ state: "loading", rows: [] });
    this.stopGate = evaluateStopGate();
    this.copyState = "idle";
    this.contractState = "idle";
    this.bridgeContract = null;
    this.releasePromise = null;
    this.connectedResult = null;
    this.runController = null;
    this.runSnapshot = null;
    this.runUnsubscribe = null;
    this.promptValue = "";
    this.steerValue = "";
    this.recoverRunId = "";
    this.runValidationMessage = "";
    this.sessionCheckInFlight = false;
    this.lastSessionCheckAt = 0;
    this.sessionCheckTimer = null;
  }

  start() {
    this.unsubscribe = this.probe.subscribe((snapshot) => {
      const wasTesting = this.snapshot.status === ProbeState.TESTING;
      this.snapshot = snapshot;
      if (!wasTesting && snapshot.status === ProbeState.TESTING) this.detailsOpen = false;
      if (snapshot.status !== ProbeState.TESTING) this.detailsOpen = false;
      this.render();
      if (snapshot.status === ProbeState.FAILURE && snapshot.failureClass === FailureClass.URL) this.urlInput?.focus();
    });
    this.render();
    void this.loadEvidence();
    void this.loadRecoveryEvidence();
    this.probe.prepare().then(async () => {
      this.preparing = false;
      await this.restoreGatewaySession();
      this.render();
    }, () => {
      this.preparing = false;
      this.cleanupFailed = true;
      this.validationMessage = "This connection could not be prepared safely. Reload the extension and try again.";
      this.render();
    });
    this.sessionCheckTimer = globalThis.setInterval(() => { void this.verifySavedGateway(); }, SESSION_CHECK_INTERVAL_MS);
    window.muxy?.onFocus?.((focused) => {
      if (focused !== false && Date.now() - this.lastSessionCheckAt >= SESSION_CHECK_INTERVAL_MS) void this.verifySavedGateway();
      if (this.snapshot.status !== ProbeState.TESTING) this.urlInput?.focus();
    });
    window.muxy?.lifecycle?.onBeforeClose?.(async () => this.release());
    window.addEventListener("pagehide", () => { void this.release(); }, { once: true });
  }

  release() {
    if (!this.releasePromise) {
      this.releasePromise = (async () => {
        await this.disconnectRun();
        await this.probe.abort();
        if (this.sessionCheckTimer) globalThis.clearInterval(this.sessionCheckTimer);
        this.sessionCheckTimer = null;
        this.tokenValue = "";
        if (this.tokenInput) this.tokenInput.value = "";
        this.unsubscribe?.();
        this.unsubscribe = null;
      })();
    }
    return this.releasePromise;
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.stopHeading = this.root.querySelector("#transport-stop-title");
    this.syncForm();
    if (this.stopGate.active) queueMicrotask(() => this.stopHeading?.focus());
  }

  view() {
    const testing = this.snapshot.status === ProbeState.TESTING;
    const runActive = this.runController?.isActive() ?? false;
    const url = h("input", {
      id: "gateway-url", class: "gateway-input", type: "url", autocomplete: "off", spellcheck: "false",
      placeholder: "https://gateway.example", required: true, disabled: testing || runActive,
      "aria-describedby": "gateway-url-error",
      oninput: (event) => { this.urlValue = event.target.value; this.validationMessage = ""; this.syncForm(); },
    });
    url.value = this.urlValue;
    const token = h("input", {
      id: "bearer-token", class: "gateway-input", type: "password", autocomplete: "off", spellcheck: "false",
      required: true, disabled: testing || runActive, "aria-describedby": "gateway-token-error",
      oninput: (event) => { this.tokenValue = event.target.value; this.validationMessage = ""; this.syncForm(); },
    });
    token.value = this.tokenValue;
    const statusCopy = this.preparing ? "Preparing connection…" : testing ? "Testing connection…" : runActive ? "A run is in progress." : "";
    const status = h("p", { class: "gateway-live", "aria-live": "polite" }, statusCopy);
    const submit = h("button", { class: "gateway-submit", type: "submit" }, this.preparing ? "Preparing connection…" : testing ? "Testing connection…" : runActive ? "Run active" : "Test connection");
    this.urlInput = url;
    this.tokenInput = token;
    this.submitButton = submit;
    this.statusNode = status;
    return h(
      "main", { class: "gateway-panel" },
      h("header", { class: "gateway-header" },
        h("h1", { class: "gateway-title" }, "Hermes Gateway"),
        h("p", { class: "gateway-purpose" }, "Start and monitor work through your Hermes Gateway."),
        h("p", { class: "gateway-footnote" }, "Your connection is saved on this Mac."),
      ),
      h("section", { class: "gateway-card gateway-board-launcher", "aria-labelledby": "project-board-title" },
        h("div", null,
          h("h2", { id: "project-board-title" }, "Project board"),
          h("p", null, "Open the Hermes board for this project."),
        ),
        h("button", { class: "gateway-secondary", type: "button", onclick: () => void this.openProjectBoard() }, "Open board"),
      ),
      h("form", { class: "gateway-card gateway-form", onsubmit: (event) => this.submit(event) },
        h("label", { for: "gateway-url", class: "gateway-label" }, "Gateway URL"), url,
        h("p", { id: "gateway-url-error", class: "gateway-inline-error", "aria-live": "polite" }, this.validationMessage),
        h("label", { for: "bearer-token", class: "gateway-label" }, "Access token"), token,
        h("p", { id: "gateway-token-error", class: "gateway-inline-error", "aria-live": "polite" }),
        submit, status,
        h("p", { class: "gateway-note" }, "Muxy may ask for permission before it connects. Your access token is stored only for this extension."),
        testing ? h("p", { class: "gateway-capability-loading", "aria-live": "polite" }, "Checking available controls…") : null,
      ),
      this.snapshot.status === ProbeState.IDLE
        ? h("section", { class: "gateway-card gateway-empty" }, h("h2", null, "Connect Hermes"), h("p", null, "Enter the Gateway address and access token provided by your Hermes administrator."))
        : this.verdictSection(),
      this.runSection(),
      h("details", { class: "gateway-card gateway-advanced" },
        h("summary", null, "Advanced diagnostics and validation evidence"),
        this.evidenceShell(),
      ),
      this.stopGate.active ? this.transportStopShell() : null,
    );
  }

  async openProjectBoard() {
    await window.muxy?.tabs?.open?.({
      kind: "extensionWebView",
      extension: {
        id: window.muxy.extensionID ?? "muxy-hermes-extension",
        tabType: "hermes-project-board",
        singleton: true,
      },
    });
  }

  syncForm() {
    if (!this.submitButton) return;
    let validUrl = false;
    try { normalizeGatewayUrl(this.urlValue); validUrl = true; } catch { /* local validation renders on submit */ }
    this.submitButton.disabled = this.preparing || this.cleanupFailed || this.snapshot.status === ProbeState.TESTING || (this.runController?.isActive() ?? false) || !validUrl || !this.tokenValue;
  }

  async submit(event) {
    event.preventDefault();
    if (this.preparing || this.cleanupFailed || this.snapshot.status === ProbeState.TESTING || this.runController?.isActive()) return;
    if (!this.urlValue.trim()) {
      this.validationMessage = "Enter a Gateway URL.";
      this.render();
      this.urlInput?.focus();
      return;
    }
    if (!this.tokenValue) {
      this.validationMessage = "Enter an access token.";
      this.render();
      this.tokenInput?.focus();
      return;
    }
    try { normalizeGatewayUrl(this.urlValue); } catch (error) {
      this.validationMessage = error.message;
      this.render();
      this.urlInput?.focus();
      return;
    }
    const bearer = this.tokenValue;
    await this.disconnectRun();
    this.connectedResult = null;
    const result = await this.probe.start({ url: this.urlValue, token: bearer });
    if (result.status === ProbeState.SUCCESS) {
      this.connectedResult = result;
      if (supportsCoreRun(result.capabilityNames)) {
        this.attachRunController({ baseUrl: result.endpoint, bearer, capabilities: result.capabilityNames });
      }
      await this.sessionBroker.saveGateway({ url: this.urlValue, bearer, result });
      this.lastSessionCheckAt = Date.now();
      this.tokenValue = "";
      if (this.tokenInput) this.tokenInput.value = "";
      this.render();
    }
  }

  async restoreGatewaySession({ refresh = false } = {}) {
    if (this.sessionCheckInFlight || this.preparing || this.runController?.isActive()) return;
    this.sessionCheckInFlight = true;
    try {
      const saved = await this.sessionBroker.readGateway();
      if (!saved || (!refresh && this.connectedResult) || saved.result?.status !== ProbeState.SUCCESS) return;
      if (refresh) await this.disconnectRun();
      this.urlValue = saved.url;
      const result = await this.probe.restore({ url: saved.url, token: saved.bearer, previousResult: saved.result });
      this.lastSessionCheckAt = Date.now();
      this.connectedResult = null;
      if (result.status === ProbeState.SUCCESS) {
        this.connectedResult = result;
        if (supportsCoreRun(result.capabilityNames)) {
          this.attachRunController({ baseUrl: result.endpoint, bearer: saved.bearer, capabilities: result.capabilityNames });
        }
        await this.sessionBroker.saveGateway({ url: saved.url, bearer: saved.bearer, result });
      } else if (result.failureClass === FailureClass.AUTHENTICATION) {
        await this.sessionBroker.clearGateway();
      }
    } finally {
      this.sessionCheckInFlight = false;
    }
  }

  async verifySavedGateway() {
    if (this.preparing || this.sessionCheckInFlight || this.snapshot.status === ProbeState.TESTING || this.runController?.isActive()) return;
    await this.restoreGatewaySession({ refresh: true });
    this.render();
  }

  attachRunController({ baseUrl, bearer, capabilities }) {
    this.runController = new RunController({ baseUrl, bearer, capabilities });
    this.runSnapshot = this.runController.snapshot;
    this.runUnsubscribe = this.runController.subscribe((snapshot) => {
      this.runSnapshot = snapshot;
      this.render();
      void this.recoveryReceiptWriter.observe(snapshot);
    });
  }

  async forgetGateway() {
    if (this.runController?.isActive()) return;
    await this.disconnectRun();
    await this.probe.abort();
    await this.sessionBroker.clearGateway();
    this.connectedResult = null;
    this.snapshot = Object.freeze({ status: ProbeState.IDLE, previousResult: null });
    this.tokenValue = "";
    this.validationMessage = "Connection removed.";
    this.render();
    this.tokenInput?.focus();
  }

  verdictSection() {
    const result = this.snapshot.status === ProbeState.TESTING ? this.snapshot.previousResult : this.snapshot;
    if (!result) return null;
    const [title, explanation] = resultCopy(result);
    const failure = result.status === ProbeState.FAILURE;
    const detailButton = h("button", {
      class: "gateway-details-toggle", type: "button", "aria-expanded": String(this.detailsOpen),
      onclick: () => { this.detailsOpen = !this.detailsOpen; this.render(); },
    }, "Details");
    return h("section", { class: "gateway-card gateway-result", tabindex: "-1", "aria-live": failure ? "assertive" : "polite" },
      this.snapshot.status === ProbeState.TESTING ? h("p", { class: "gateway-previous" }, "Previous result") : null,
      h("h2", { class: failure ? "gateway-error" : "gateway-success" }, title),
      h("p", null, explanation),
      h("dl", { class: "gateway-details" },
        h("dt", null, "Gateway address"), h("dd", { class: "gateway-safe-endpoint" }, result.endpoint ?? "Not recorded"),
        h("dt", null, "Connection"), h("dd", null, STAGE_LABEL[result.relayOutcome.state]),
        h("dt", null, "Sign-in"), h("dd", null, STAGE_LABEL[result.authenticationOutcome.state]),
        h("dt", null, "Controls"), h("dd", null, STAGE_LABEL[result.capabilityOutcome.state]),
        h("dt", null, "Live updates"), h("dd", null, STAGE_LABEL[result.streamOutcome.state]),
      ),
      !failure ? h("button", { class: "gateway-secondary", type: "button", disabled: this.runController?.isActive() ?? false, onclick: () => void this.forgetGateway() }, "Forget connection") : null,
      detailButton,
      this.detailsOpen ? h("p", { class: "gateway-diagnostic" }, result.failureClass ? `Observed result: ${result.failureClass.replace("_", " ")}. Raw request and response details are redacted.` : "No additional redacted diagnostics were recorded.") : null,
      failure ? h("button", { class: "gateway-retry", type: "button", onclick: () => this.urlInput?.focus() }, "Test connection again") : null,
      this.capabilitySummary(result),
    );
  }

  capabilitySummary(result) {
    if (result.capabilityOutcome.state !== "passed") {
      return h("section", { class: "gateway-capability-summary", "aria-labelledby": "capability-summary-title" },
        h("h3", { id: "capability-summary-title", class: "gateway-capability-title" }, "Available controls"),
        h("p", null, "Available controls could not be checked."),
        h("p", { class: "gateway-footnote" }, "Run controls appear after the Gateway confirms what it supports."),
      );
    }

    const summary = normalizeCapabilities({
      version: result.capabilityVersion,
      features: Object.fromEntries((result.capabilityNames ?? []).map((name) => [name, true])),
    });
    const summaryState = summary.state === "empty" ? "No controls available" : summary.state === "partial" ? "Some controls available" : "Available controls";
    return h("section", { class: "gateway-capability-summary", "aria-labelledby": "capability-summary-title" },
      h("h3", { id: "capability-summary-title", class: "gateway-capability-title" }, "Available controls"),
      h("p", { class: "gateway-capability-state" }, summaryState),
      summary.state === "empty"
        ? h("p", null, "This Gateway does not offer controls for this panel.")
        : h("ul", { class: "gateway-capabilities", "aria-label": "Available controls" }, summary.names.map((name) => h("li", null, name))),
      h("p", { class: "gateway-footnote" }, "Only controls confirmed by this Gateway are shown."),
    );
  }

  runSection() {
    if (!this.connectedResult) return null;
    if (!supportsCoreRun(this.connectedResult.capabilityNames)) {
      const missing = [RUN_FEATURES.submit, RUN_FEATURES.status, RUN_FEATURES.events]
        .filter((name) => !this.connectedResult.capabilityNames.includes(name));
      return h("section", { class: "gateway-card gateway-run", "aria-labelledby": "run-title" },
        h("h2", { id: "run-title" }, "Run control unavailable"),
        h("p", null, "This Gateway does not provide everything needed to start and monitor a run."),
        h("p", { class: "gateway-footnote" }, `It needs: ${missing.join(", ")}.`),
      );
    }
    const run = this.runSnapshot;
    if (!run) return null;
    const active = this.runController.isActive();
    const terminal = ["completed", "failed", "cancelled"].includes(run.status);
    const prompt = h("textarea", {
      id: "run-prompt", class: "gateway-textarea", rows: "4", maxlength: String(64 * 1024),
      placeholder: "Ask Hermes to work on a task…", disabled: active,
      oninput: (event) => { this.promptValue = event.target.value; this.syncRunForm(); },
    });
    prompt.value = this.promptValue;
    const start = h("button", { class: "gateway-submit", type: "submit" }, terminal ? "Start another run" : "Start run");
    this.runPrompt = prompt;
    this.runSubmit = start;
    const content = [
      h("div", { class: "gateway-run-heading" },
        h("h2", { id: "run-title" }, "Hermes run"),
        h("span", { class: `gateway-run-status gateway-run-status-${run.status}`, "aria-live": "polite" }, run.status.replaceAll("_", " ")),
      ),
      run.runId ? h("details", { class: "gateway-run-advanced" },
        h("summary", null, "Run recovery details"),
        h("p", { class: "gateway-run-id" }, "Run ID: ", h("code", { tabindex: "0" }, run.runId)),
      ) : null,
      !active ? h("form", { class: "gateway-run-form", onsubmit: (event) => void this.startRun(event) },
        h("label", { for: "run-prompt", class: "gateway-label" }, "Task"), prompt, start,
      ) : null,
      run.status === "idle" ? h("details", { class: "gateway-run-advanced" },
        h("summary", null, "Recover an existing run"),
        this.recoveryForm(),
      ) : null,
      run.assistant ? h("section", { class: "gateway-run-output", "aria-labelledby": "assistant-output-title" },
        h("h3", { id: "assistant-output-title" }, "Assistant"),
        h("p", { class: "gateway-assistant", "aria-live": "polite" }, run.assistant),
      ) : null,
      run.activity.length ? h("section", { class: "gateway-run-activity", "aria-labelledby": "run-activity-title" },
        h("h3", { id: "run-activity-title" }, "Activity"),
        h("ol", { class: "gateway-activity-list" }, run.activity.map((item) => h("li", { class: `gateway-activity gateway-activity-${item.kind}` },
          h("strong", null, item.label), item.detail ? h("span", null, item.detail) : null,
        ))),
      ) : null,
      this.approvalSection(run),
      active && run.status !== "status_unavailable" ? this.runControls(run) : null,
      this.recoveryState(run),
      run.manualRefresh ? h("button", { class: "gateway-secondary", type: "button", disabled: run.actionPending, onclick: () => void this.refreshRun() }, "Refresh status") : null,
      run.error ? h("p", { class: "gateway-inline-error", role: "alert" }, run.error) : null,
    ];
    queueMicrotask(() => this.syncRunForm());
    return h("section", { class: "gateway-card gateway-run", "aria-labelledby": "run-title" }, content);
  }

  recoveryForm() {
    const runId = h("input", {
      id: "recover-run-id", class: "gateway-input", type: "text", autocomplete: "off", spellcheck: "false",
      required: true, maxlength: "128", placeholder: "run_abc12345",
      oninput: (event) => { this.recoverRunId = event.target.value; this.runValidationMessage = ""; this.syncRunForm(); },
    });
    runId.value = this.recoverRunId;
    this.recoverInput = runId;
    return h("form", { class: "gateway-recovery", onsubmit: (event) => void this.recoverRun(event) },
      h("h3", null, "Recover a run"),
      h("p", { class: "gateway-note" }, "Enter the run ID to check its current status. Earlier activity and approval requests are not shown again."),
      h("label", { for: "recover-run-id", class: "gateway-label" }, "Run ID"), runId,
      h("button", { class: "gateway-secondary", type: "submit" }, "Recover status"),
      this.runValidationMessage ? h("p", { class: "gateway-inline-error", role: "alert" }, this.runValidationMessage) : null,
    );
  }

  recoveryState(run) {
    let copy = null;
    if (run.status === "status_unavailable") copy = "Gateway status could not be confirmed. Live updates are disconnected; use Refresh status when the Gateway is reachable.";
    else if (run.streamState === "reconnecting") copy = `Attempting to resume live updates (attempt ${run.reconnectAttempt || 1} of 2). Gateway status is authoritative.`;
    else if (run.streamState === "disconnected") copy = "Live updates are disconnected. Gateway status is authoritative. Live events may be missing or duplicated.";
    else if (run.streamState === "detached" && run.runId) copy = "Previous live activity and approval detail were not recovered. Gateway status is authoritative.";
    else if (run.recoveryNotice) copy = `Live updates resumed with limits. ${run.recoveryNotice}`;
    return copy ? h("p", { class: "gateway-recovery-state", "aria-live": "polite" }, copy) : null;
  }

  approvalSection(run) {
    if (!run.pendingApproval) return null;
    const canRespond = this.runController.has(RUN_FEATURES.approval);
    return h("section", { class: "gateway-approval", "aria-labelledby": "approval-title" },
      h("h3", { id: "approval-title" }, "Approval required"),
      run.pendingApproval.command ? h("pre", { class: "gateway-command" }, run.pendingApproval.command) : null,
      canRespond
        ? h("div", { class: "gateway-control-row" }, run.pendingApproval.choices.map((choice) => h("button", {
          class: "gateway-secondary", type: "button", disabled: run.actionPending,
          onclick: () => void this.answerApproval(choice),
        }, choice === "once" ? "Allow once" : choice === "session" ? "Allow for session" : choice === "always" ? "Always allow" : "Deny")))
        : h("p", { class: "gateway-inline-error" }, "The Gateway requested approval without advertising approval responses."),
    );
  }

  runControls(run) {
    const canSteer = this.runController.has(RUN_FEATURES.steer);
    const canStop = this.runController.has(RUN_FEATURES.stop);
    const steer = h("input", {
      id: "run-steer", class: "gateway-input", type: "text", maxlength: String(64 * 1024),
      placeholder: "Add guidance…", disabled: run.actionPending,
      oninput: (event) => { this.steerValue = event.target.value; this.syncRunForm(); },
    });
    steer.value = this.steerValue;
    const steerButton = h("button", { class: "gateway-secondary", type: "submit", disabled: run.actionPending }, "Send guidance");
    this.steerInput = steer;
    this.steerButton = steerButton;
    return h("section", { class: "gateway-run-controls", "aria-labelledby": "run-controls-title" },
      h("h3", { id: "run-controls-title" }, "Run controls"),
      canSteer ? h("form", { class: "gateway-steer-form", onsubmit: (event) => void this.steerRun(event) },
        h("label", { for: "run-steer", class: "gateway-label" }, "Steer"), steer, steerButton,
      ) : null,
      canStop ? h("button", {
        class: "gateway-danger", type: "button", disabled: run.actionPending || run.status === "stopping",
        onclick: () => void this.stopRun(),
      }, run.status === "stopping" ? "Stop requested…" : "Request stop") : null,
    );
  }

  syncRunForm() {
    if (this.runSubmit) this.runSubmit.disabled = !this.promptValue.trim() || (this.runController?.isActive() ?? false);
    if (this.steerButton) this.steerButton.disabled = !this.steerValue.trim() || Boolean(this.runSnapshot?.actionPending);
  }

  async startRun(event) {
    event.preventDefault();
    const prompt = this.promptValue;
    if (!prompt.trim()) return;
    this.promptValue = "";
    await this.runController.start(prompt);
  }

  async recoverRun(event) {
    event.preventDefault();
    const runId = this.recoverRunId.trim();
    if (!runId) {
      this.recoverInput?.focus();
      return;
    }
    try {
      await this.runController.recover(runId);
      this.recoverRunId = "";
      this.runValidationMessage = "";
    } catch {
      this.runValidationMessage = "Enter a valid Run ID.";
      this.render();
      this.recoverInput?.focus();
    }
  }

  async refreshRun() {
    await this.runController.refresh();
  }

  async answerApproval(choice) {
    await this.runController.approve(choice);
  }

  async steerRun(event) {
    event.preventDefault();
    const guidance = this.steerValue;
    if (!guidance.trim()) return;
    this.steerValue = "";
    await this.runController.steer(guidance);
  }

  async stopRun() {
    await this.runController.stop();
  }

  async disconnectRun() {
    this.runUnsubscribe?.();
    this.runUnsubscribe = null;
    const controller = this.runController;
    this.runController = null;
    this.runSnapshot = null;
    if (controller) await controller.release();
  }

  evidenceShell() {
    const evidence = this.evidenceState;
    const stateCopy = evidence.state === "loading"
      ? "Loading validation evidence…"
      : evidence.state === "error"
        ? "Validation evidence is unavailable"
        : null;
    const rows = evidence.rows.length > 0 ? evidence.rows : Object.entries(DEPLOYMENT_CONDITION_NAMES).map(([id, name]) => ({
      id, name, verdict: "Unverified", version: "Not recorded", details: "No versioned fixture result has been recorded for this deployment condition.",
    }));
    return h("section", { class: "gateway-evidence", "aria-labelledby": "validation-evidence-title" },
      h("h3", { id: "validation-evidence-title", class: "gateway-capability-title" }, "Validation evidence"),
      stateCopy ? h("p", { class: evidence.state === "error" ? "gateway-evidence-unavailable" : null }, stateCopy) : null,
      evidence.state === "error" ? h("button", { class: "gateway-retry", type: "button", onclick: () => void this.loadEvidence() }, "Retry evidence") : null,
      h("ul", { class: "gateway-evidence-list" }, rows.map((row) => h("li", { class: "gateway-evidence-row", tabindex: "0" },
        h("strong", null, DEPLOYMENT_CONDITION_NAMES[row.id] ?? "Not recorded"), h("span", null, row.verdict), h("span", null, `Fixture version: ${row.version}`),
        h("span", null, row.details),
      ))),
      this.recoveryEvidenceShell(),
    );
  }

  recoveryEvidenceShell() {
    const recovery = this.recoveryEvidenceState;
    const copy = recovery.state === "loading" ? "Loading recovery evidence…"
      : recovery.state === "error" ? "Recovery evidence is unavailable." : null;
    return h("section", { class: "gateway-recovery-evidence", "aria-labelledby": "recovery-evidence-title" },
      h("h4", { id: "recovery-evidence-title", class: "gateway-capability-title" }, "Recovery evidence"),
      copy ? h("p", { class: recovery.state === "error" ? "gateway-evidence-unavailable" : null }, copy) : null,
      recovery.state === "error" ? h("button", { class: "gateway-retry", type: "button", onclick: () => void this.loadRecoveryEvidence() }, "Retry recovery evidence") : null,
      recovery.rows.length ? h("ul", { class: "gateway-evidence-list" }, recovery.rows.map((row) => h("li", { class: "gateway-evidence-row", tabindex: "0" },
        h("strong", null, DEPLOYMENT_CONDITION_NAMES[row.id] ?? "Not recorded"), h("span", null, row.verdict), h("span", null, row.details),
      ))) : null,
      h("p", { class: "gateway-footnote" }, "Status is authoritative. Event history is incomplete and approval detail is unavailable after an interruption or panel recreation."),
    );
  }

  transportStopShell() {
    return h("section", { class: "gateway-card gateway-transport-stop", role: "alert", "aria-labelledby": "transport-stop-title" },
      h("h2", { id: "transport-stop-title", tabindex: "-1" }, "Muxy change required"),
      h("p", null, "Phase 1 is paused. No Muxy change has been made. Review the failure report and minimum bridge contract before expanding scope."),
      h("button", { type: "button", disabled: this.copyState === "loading", onclick: () => void this.copyFailureReport() }, this.copyState === "loading" ? "Copying report…" : "Copy failure report"),
      this.copyState === "error" ? h("p", { class: "gateway-inline-error", "aria-live": "polite" }, "Could not copy the failure report.") : null,
      h("button", { type: "button", disabled: this.contractState === "loading", onclick: () => void this.viewBridgeContract() }, this.contractState === "loading" ? "Loading bridge contract…" : "View bridge contract"),
      this.contractState === "error" ? h("p", { class: "gateway-inline-error", "aria-live": "polite" }, "Could not load the bridge contract.") : null,
      this.bridgeContract ? h("pre", { class: "gateway-bridge-contract" }, JSON.stringify(this.bridgeContract, null, 2)) : null,
    );
  }

  async loadEvidence() {
    this.evidenceState = Object.freeze({ state: "loading", index: this.evidenceState.index, rows: this.evidenceState.rows });
    this.render();
    try {
      const index = await loadEvidenceIndex({ url: "/evidence/index.json" });
      const rows = renderDeploymentMatrix(index);
      const wasActive = this.stopGate.active;
      this.stopGate = evaluateStopGate({ evidenceIndex: index });
      this.evidenceState = Object.freeze({ state: "populated", index, rows });
      this.render();
      if (!wasActive && this.stopGate.active) queueMicrotask(() => this.stopHeading?.focus());
    } catch {
      this.evidenceState = Object.freeze({ state: "error", index: null, rows: [] });
      this.stopGate = evaluateStopGate();
      this.render();
    }
  }

  async loadRecoveryEvidence() {
    this.recoveryEvidenceState = Object.freeze({ state: "loading", rows: this.recoveryEvidenceState.rows });
    this.render();
    try {
      const evidence = await loadRecoveryEvidence({ url: "/evidence/recovery-v1.json" });
      this.recoveryEvidenceState = Object.freeze({ state: "populated", rows: renderRecoveryEvidence(evidence) });
    } catch {
      this.recoveryEvidenceState = Object.freeze({ state: "error", rows: [] });
    }
    this.render();
  }

  async copyFailureReport() {
    this.copyState = "loading";
    this.render();
    try {
      const report = copyRedactedReport(this.stopGate);
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(report);
      this.copyState = "idle";
    } catch {
      this.copyState = "error";
    }
    this.render();
  }

  async viewBridgeContract() {
    this.contractState = "loading";
    this.render();
    try {
      await Promise.resolve();
      this.bridgeContract = buildBridgeContract(this.stopGate);
      this.contractState = "ready";
    } catch {
      this.contractState = "error";
    }
    this.render();
  }
}
