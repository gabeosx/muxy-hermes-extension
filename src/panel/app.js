import { clear, h } from "@/lib/dom";
import { GatewayClient, normalizeGatewayUrl } from "@/gateway-client";

export class HermesGatewayPanel {
  constructor(root) {
    this.root = root;
    this.client = new GatewayClient();
    this.busy = false;
    this.result = null;
  }

  start() {
    this.render();
    window.muxy?.onFocus?.(() => {
      if (!this.busy) this.urlInput?.focus();
    });
    window.addEventListener("pagehide", () => this.release(), { once: true });
  }

  release() {
    this.client.teardown();
    if (this.tokenInput) this.tokenInput.value = "";
  }

  render() {
    clear(this.root);
    this.root.appendChild(this.view());
    this.syncForm();
  }

  view() {
    const url = h("input", {
      id: "gateway-url",
      class: "gateway-input",
      type: "url",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: "https://gateway.example",
      required: true,
      oninput: () => this.syncForm(),
    });
    const token = h("input", {
      id: "bearer-token",
      class: "gateway-input",
      type: "password",
      autocomplete: "off",
      spellcheck: "false",
      required: true,
      oninput: () => this.syncForm(),
    });
    const status = h("p", { class: "gateway-live", "aria-live": "polite" });
    const submit = h("button", { class: "gateway-submit", type: "submit" }, "Test connection");
    this.urlInput = url;
    this.tokenInput = token;
    this.submitButton = submit;
    this.statusNode = status;
    return h(
      "main",
      { class: "gateway-panel" },
      h(
        "header",
        { class: "gateway-header" },
        h("h1", { class: "gateway-title" }, "Hermes Gateway"),
        h("p", { class: "gateway-purpose" }, "Test one authenticated Gateway connection and live-streaming path."),
        h("p", { class: "gateway-footnote" }, "Panel-only credentials — your bearer token is cleared when the panel closes."),
      ),
      h(
        "form",
        { class: "gateway-card gateway-form", onsubmit: (event) => this.submit(event) },
        h("label", { for: "gateway-url", class: "gateway-label" }, "Gateway URL"),
        url,
        h("label", { for: "bearer-token", class: "gateway-label" }, "Bearer token"),
        token,
        submit,
        status,
        h("p", { class: "gateway-note" }, "Literal loopback HTTP is evaluated only by the local transport proof. Every other Gateway requires normally trusted HTTPS."),
      ),
      this.result ? this.resultCard() : h("section", { class: "gateway-card gateway-empty" }, h("h2", null, "Connect a Hermes Gateway"), h("p", null, "Enter the Gateway URL and bearer token for this panel session. Your token is cleared when the panel closes.")),
    );
  }

  syncForm() {
    if (!this.submitButton) return;
    let validUrl = false;
    try {
      normalizeGatewayUrl(this.urlInput.value);
      validUrl = true;
    } catch {
      validUrl = false;
    }
    this.submitButton.disabled = this.busy || !validUrl || !this.tokenInput.value;
    this.submitButton.textContent = this.busy ? "Testing connection…" : "Test connection";
  }

  async submit(event) {
    event.preventDefault();
    if (this.busy) return;
    try {
      normalizeGatewayUrl(this.urlInput.value);
    } catch (error) {
      this.statusNode.textContent = error.message;
      this.urlInput.focus();
      return;
    }
    this.busy = true;
    this.syncForm();
    this.statusNode.textContent = "Testing connection…";
    const url = this.urlInput.value;
    const token = this.tokenInput.value;
    try {
      this.result = await this.client.probe(url, token);
    } finally {
      this.busy = false;
      this.tokenInput.value = "";
      this.render();
    }
  }

  resultCard() {
    const result = this.result;
    const streamPassed = result.stream.state === "passed";
    const capabilityNames = result.capabilities.names.length ? result.capabilities.names : ["No capabilities advertised"];
    return h(
      "section",
      { class: "gateway-card gateway-result", tabindex: "-1" },
      h("h2", { class: streamPassed ? "gateway-success" : "gateway-error" }, streamPassed ? "Connection verified" : "Connection not verified"),
      h("p", null, streamPassed ? "Authentication and capability discovery succeeded. Streaming evidence is observed but does not establish a deployment support verdict." : "Check the Gateway URL and token, confirm its exact Muxy origin is allowed, then test the connection again."),
      h("dl", { class: "gateway-details" },
        h("dt", null, "Origin"), h("dd", null, result.origin.state === "passed" ? "Observed" : "Not verified"),
        h("dt", null, "Capabilities"), h("dd", null, result.capabilities.state === "passed" ? "Observed" : "Not verified"),
        h("dt", null, "Streaming"), h("dd", null, streamPassed ? `Observed incrementally (${result.stream.eventCount} frames)` : "Not verified"),
      ),
      h("h3", { class: "gateway-capability-title" }, "Advertised capabilities"),
      h("ul", { class: "gateway-capabilities" }, capabilityNames.map((name) => h("li", null, name))),
      h("p", { class: "gateway-footnote" }, "Run controls appear in Phase 2."),
    );
  }
}
