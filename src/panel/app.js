import { clear, h } from "@/lib/dom";
import { normalizeGatewayUrl } from "@/gateway-client";
import { normalizeCapabilities } from "@/capabilities";
import { ConnectionProbe, FailureClass, ProbeState } from "@/probe";

const STAGE_LABEL = Object.freeze({ passed: "Observed", failed: "Failed", not_verified: "Not verified" });

function resultCopy(result) {
  if (result.status === ProbeState.SUCCESS) return ["Connection verified", "Authentication, exact-origin access, and capability discovery succeeded."];
  if (result.failureClass === FailureClass.STREAMING) return ["The Gateway connected, but live streaming was not verified.", "Review the redacted failure report before claiming this deployment is supported."];
  if (result.failureClass === FailureClass.AUTHENTICATION) return ["Connection not verified", "The Gateway rejected this bearer token. Check the token, then test the connection again."];
  if (result.failureClass === FailureClass.URL) return ["Connection not verified", "Correct the Gateway URL, then test the connection again."];
  return ["Connection not verified", "Check the Gateway URL and token, confirm its exact Muxy origin is allowed, then test the connection again."];
}

export class HermesGatewayPanel {
  constructor(root) {
    this.root = root;
    this.probe = new ConnectionProbe();
    this.snapshot = this.probe.snapshot;
    this.urlValue = "";
    this.tokenValue = "";
    this.validationMessage = "";
    this.detailsOpen = false;
    this.evidenceState = Object.freeze({ state: "empty", rows: [] });
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
    window.muxy?.onFocus?.(() => {
      if (this.snapshot.status !== ProbeState.TESTING) this.urlInput?.focus();
    });
    window.addEventListener("pagehide", () => this.release(), { once: true });
  }

  release() {
    this.probe.abort();
    this.tokenValue = "";
    if (this.tokenInput) this.tokenInput.value = "";
    this.unsubscribe?.();
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.syncForm();
  }

  view() {
    const testing = this.snapshot.status === ProbeState.TESTING;
    const url = h("input", {
      id: "gateway-url", class: "gateway-input", type: "url", autocomplete: "off", spellcheck: "false",
      placeholder: "https://gateway.example", required: true, disabled: testing,
      "aria-describedby": "gateway-url-error",
      oninput: (event) => { this.urlValue = event.target.value; this.validationMessage = ""; this.syncForm(); },
    });
    url.value = this.urlValue;
    const token = h("input", {
      id: "bearer-token", class: "gateway-input", type: "password", autocomplete: "off", spellcheck: "false",
      required: true, disabled: testing, "aria-describedby": "gateway-token-error",
      oninput: (event) => { this.tokenValue = event.target.value; this.validationMessage = ""; this.syncForm(); },
    });
    token.value = this.tokenValue;
    const status = h("p", { class: "gateway-live", "aria-live": "polite" }, testing ? "Testing connection…" : "");
    const submit = h("button", { class: "gateway-submit", type: "submit" }, testing ? "Testing connection…" : "Test connection");
    this.urlInput = url;
    this.tokenInput = token;
    this.submitButton = submit;
    this.statusNode = status;
    return h(
      "main", { class: "gateway-panel" },
      h("header", { class: "gateway-header" },
        h("h1", { class: "gateway-title" }, "Hermes Gateway"),
        h("p", { class: "gateway-purpose" }, "Test one authenticated Gateway connection and live-streaming path."),
        h("p", { class: "gateway-footnote" }, "Panel-only credentials — your bearer token is cleared when the panel closes."),
      ),
      h("form", { class: "gateway-card gateway-form", onsubmit: (event) => this.submit(event) },
        h("label", { for: "gateway-url", class: "gateway-label" }, "Gateway URL"), url,
        h("p", { id: "gateway-url-error", class: "gateway-inline-error", "aria-live": "polite" }, this.validationMessage),
        h("label", { for: "bearer-token", class: "gateway-label" }, "Bearer token"), token,
        h("p", { id: "gateway-token-error", class: "gateway-inline-error", "aria-live": "polite" }),
        submit, status,
        h("p", { class: "gateway-note" }, "Literal loopback HTTP is evaluated only by the local transport proof. Every other Gateway requires normally trusted HTTPS."),
        testing ? h("p", { class: "gateway-capability-loading", "aria-live": "polite" }, "Discovering capabilities…") : null,
      ),
      this.snapshot.status === ProbeState.IDLE
        ? h("section", { class: "gateway-card gateway-empty" }, h("h2", null, "Connect a Hermes Gateway"), h("p", null, "Enter the Gateway URL and bearer token for this panel session. Your token is cleared when the panel closes."))
        : this.verdictSection(),
    );
  }

  syncForm() {
    if (!this.submitButton) return;
    let validUrl = false;
    try { normalizeGatewayUrl(this.urlValue); validUrl = true; } catch { /* local validation renders on submit */ }
    this.submitButton.disabled = this.snapshot.status === ProbeState.TESTING || !validUrl || !this.tokenValue;
  }

  async submit(event) {
    event.preventDefault();
    if (this.snapshot.status === ProbeState.TESTING) return;
    if (!this.urlValue.trim()) {
      this.validationMessage = "Enter a Gateway URL.";
      this.render();
      this.urlInput?.focus();
      return;
    }
    if (!this.tokenValue) {
      this.validationMessage = "Enter a bearer token.";
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
    await this.probe.start({ url: this.urlValue, token: this.tokenValue });
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
        h("dt", null, "Endpoint"), h("dd", { class: "gateway-safe-endpoint" }, result.endpoint ?? "Not recorded"),
        h("dt", null, "Origin"), h("dd", null, STAGE_LABEL[result.originOutcome.state]),
        h("dt", null, "Authentication"), h("dd", null, STAGE_LABEL[result.authenticationOutcome.state]),
        h("dt", null, "Capabilities"), h("dd", null, STAGE_LABEL[result.capabilityOutcome.state]),
        h("dt", null, "Streaming"), h("dd", null, STAGE_LABEL[result.streamOutcome.state]),
      ),
      detailButton,
      this.detailsOpen ? h("p", { class: "gateway-diagnostic" }, result.failureClass ? `Observed result: ${result.failureClass.replace("_", " ")}. Raw request and response details are redacted.` : "No additional redacted diagnostics were recorded.") : null,
      failure ? h("button", { class: "gateway-retry", type: "button", onclick: () => this.urlInput?.focus() }, "Test connection again") : null,
      this.capabilitySummary(result),
      this.evidenceShell(),
    );
  }

  capabilitySummary(result) {
    if (result.capabilityOutcome.state !== "passed") {
      return h("section", { class: "gateway-capability-summary", "aria-labelledby": "capability-summary-title" },
        h("h3", { id: "capability-summary-title", class: "gateway-capability-title" }, "Capability summary"),
        h("p", null, "Capability discovery is Not verified."),
        h("p", { class: "gateway-footnote" }, "Run controls appear in Phase 2."),
      );
    }

    const summary = normalizeCapabilities({
      version: result.capabilityVersion,
      features: Object.fromEntries((result.capabilityNames ?? []).map((name) => [name, true])),
    });
    const summaryState = summary.state === "empty" ? "No capabilities advertised" : summary.state === "partial" ? "Partially verified" : "Advertised capabilities";
    return h("section", { class: "gateway-capability-summary", "aria-labelledby": "capability-summary-title" },
      h("h3", { id: "capability-summary-title", class: "gateway-capability-title" }, "Capability summary"),
      h("p", { class: "gateway-capability-state" }, summaryState),
      summary.state === "empty"
        ? h("p", null, "This Gateway did not advertise any controls for this client.")
        : h("ul", { class: "gateway-capabilities", "aria-label": "Advertised capabilities" }, summary.names.map((name) => h("li", null, name))),
      h("p", { class: "gateway-capability-version" }, summary.version ? `Protocol or fixture version: ${summary.version}` : "Protocol or fixture version: Not recorded"),
      h("p", { class: "gateway-footnote" }, "Run controls appear in Phase 2."),
    );
  }

  evidenceShell() {
    const conditions = [
      "Host-native loopback",
      "Docker published loopback",
      "SSH local forward",
      "Direct remote HTTPS",
      "Remote Muxy workspace",
    ];
    const evidence = this.evidenceState;
    const stateCopy = evidence.state === "loading"
      ? "Loading validation evidence…"
      : evidence.state === "error"
        ? "Validation evidence is unavailable"
        : null;
    return h("section", { class: "gateway-evidence", "aria-labelledby": "validation-evidence-title" },
      h("h3", { id: "validation-evidence-title", class: "gateway-capability-title" }, "Validation evidence"),
      stateCopy ? h("p", { class: evidence.state === "error" ? "gateway-evidence-unavailable" : null }, stateCopy) : null,
      h("ul", { class: "gateway-evidence-list" }, conditions.map((condition) => h("li", { class: "gateway-evidence-row", tabindex: "0" },
        h("strong", null, condition), h("span", null, "Unverified"), h("span", null, "Fixture version: Not recorded"),
        h("span", null, "No versioned fixture result has been recorded for this deployment condition."),
      ))),
    );
  }

  transportStopShell() {
    return h("section", { class: "gateway-transport-stop", role: "alert", "aria-labelledby": "transport-stop-title" },
      h("h2", { id: "transport-stop-title" }, "Muxy change required"),
      h("p", null, "Phase 1 is paused. No Muxy change has been made. Review the failure report and minimum bridge contract before expanding scope."),
      h("button", { type: "button" }, "Copy failure report"),
      h("button", { type: "button" }, "View bridge contract"),
    );
  }
}
