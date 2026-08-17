import { RUN_FEATURES, RunClient, supportsCoreRun, TERMINAL_RUN_STATUSES } from "./run-client.js";

const MAX_ASSISTANT_CHARS = 128 * 1024;
const MAX_ACTIVITY_ITEMS = 100;
const ACTIVE = new Set(["starting", "queued", "started", "running", "waiting_for_approval", "stopping", "reconciling"]);

function freezeSnapshot(snapshot) {
  return Object.freeze({
    ...snapshot,
    capabilities: Object.freeze([...snapshot.capabilities]),
    activity: Object.freeze(snapshot.activity.map((item) => Object.freeze({ ...item }))),
    pendingApproval: snapshot.pendingApproval
      ? Object.freeze({ ...snapshot.pendingApproval, choices: Object.freeze([...snapshot.pendingApproval.choices]) })
      : null,
  });
}

function activityFor(event) {
  if (event.type === "tool.started") return { kind: "tool", label: `${event.tool} started`, detail: event.preview };
  if (event.type === "tool.completed") return { kind: event.error ? "error" : "tool", label: `${event.tool} ${event.error ? "failed" : "completed"}`, detail: event.duration === null ? "" : `${event.duration}s` };
  if (event.type === "reasoning.available") return { kind: "reasoning", label: "Reasoning available", detail: event.text };
  if (event.type === "subagent.start") return { kind: "subagent", label: "Subagent started", detail: event.preview };
  if (event.type === "subagent.complete") return { kind: "subagent", label: "Subagent completed", detail: event.preview };
  if (event.type === "approval.request") return { kind: "approval", label: "Approval required", detail: event.command };
  if (event.type === "approval.responded") return { kind: "approval", label: "Approval response received", detail: "" };
  if (event.type === "run.steered") return { kind: "control", label: "Guidance received", detail: "" };
  if (event.type.startsWith("run.")) return { kind: "status", label: event.type.replace("run.", "Run "), detail: "" };
  return null;
}

export class RunController {
  #client;
  #baseUrl;
  #bearer;
  #features;
  #listeners = new Set();
  #generation = 0;
  #actionPending = false;
  #snapshot;

  constructor({ baseUrl, bearer, capabilities, client = new RunClient() }) {
    this.#client = client;
    this.#baseUrl = baseUrl;
    this.#bearer = bearer;
    this.#features = new Set(capabilities ?? []);
    this.#snapshot = freezeSnapshot({
      supported: supportsCoreRun(this.#features),
      capabilities: this.#features,
      status: "idle",
      runId: null,
      assistant: "",
      activity: [],
      pendingApproval: null,
      actionPending: false,
      error: null,
      streamState: "idle",
    });
  }

  get snapshot() { return this.#snapshot; }
  has(feature) { return this.#features.has(feature); }
  isActive() { return ACTIVE.has(this.#snapshot.status); }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async start(input) {
    if (!this.#snapshot.supported) throw new Error("run_not_supported");
    if (this.isActive()) throw new Error("run_already_active");
    const generation = ++this.#generation;
    this.#publish({ status: "starting", runId: null, assistant: "", activity: [], pendingApproval: null, error: null, streamState: "connecting" });
    try {
      const started = await this.#client.start({
        baseUrl: this.#baseUrl,
        bearer: this.#bearer,
        input,
        onEvent: (event) => this.#handleEvent(event, generation),
      });
      if (generation !== this.#generation) return;
      this.#publish({ runId: started.runId, status: this.#snapshot.pendingApproval ? "waiting_for_approval" : "running", streamState: "streaming" });
      void Promise.resolve(started.stream).then(
        () => this.#streamEnded(generation),
        () => this.#streamEnded(generation, "The live event stream ended before a terminal status was confirmed."),
      );
    } catch {
      if (generation === this.#generation) this.#publish({ status: "failed", error: "The run could not be started.", streamState: "closed" });
    }
  }

  async approve(choice) {
    const approval = this.#snapshot.pendingApproval;
    if (!this.has(RUN_FEATURES.approval) || !approval?.choices.includes(choice)) throw new Error("approval_not_available");
    await this.#action(async () => {
      await this.#client.approve({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId: this.#snapshot.runId, choice });
      this.#append({ kind: "approval", label: choice === "deny" ? "Approval denied" : "Approval granted", detail: choice });
      this.#publish({ pendingApproval: null, status: "running" });
      await this.reconcile();
    });
  }

  async steer(input) {
    if (!this.has(RUN_FEATURES.steer) || !this.isActive()) throw new Error("steer_not_available");
    await this.#action(async () => {
      await this.#client.steer({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId: this.#snapshot.runId, input });
      this.#append({ kind: "control", label: "Guidance sent", detail: "" });
    });
  }

  async stop() {
    if (!this.has(RUN_FEATURES.stop) || !this.isActive()) throw new Error("stop_not_available");
    await this.#action(async () => {
      this.#publish({ status: "stopping", pendingApproval: null });
      await this.#client.stop({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId: this.#snapshot.runId });
      await this.reconcile({ preserveStopping: true });
    });
  }

  async reconcile({ preserveStopping = false } = {}) {
    const runId = this.#snapshot.runId;
    if (!runId) return;
    try {
      const status = await this.#client.status({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId });
      const nextStatus = preserveStopping && !TERMINAL_RUN_STATUSES.has(status.status) ? "stopping" : status.status;
      const assistant = this.#snapshot.assistant || status.output || "";
      this.#publish({ status: nextStatus, assistant, pendingApproval: nextStatus === "waiting_for_approval" ? this.#snapshot.pendingApproval : null, error: null });
    } catch {
      this.#publish({ error: "The Gateway status could not be reconciled." });
    }
  }

  async release() {
    this.#generation += 1;
    this.#bearer = null;
    this.#listeners.clear();
    await this.#client.teardown();
  }

  #handleEvent(event, generation) {
    if (generation !== this.#generation) return;
    if (event.type === "message.delta") {
      this.#publish({ assistant: `${this.#snapshot.assistant}${event.delta}`.slice(-MAX_ASSISTANT_CHARS) });
      return;
    }
    const activity = activityFor(event);
    if (activity) this.#append(activity);
    if (event.type === "approval.request") {
      this.#publish({ status: "waiting_for_approval", pendingApproval: { command: event.command, choices: event.choices } });
    } else if (event.type === "approval.responded") {
      this.#publish({ status: "running", pendingApproval: null });
    }
  }

  async #streamEnded(generation, error = null) {
    if (generation !== this.#generation) return;
    this.#publish({ streamState: "closed", status: TERMINAL_RUN_STATUSES.has(this.#snapshot.status) ? this.#snapshot.status : "reconciling", error });
    await this.reconcile();
  }

  async #action(operation) {
    if (this.#actionPending) return;
    this.#actionPending = true;
    this.#publish({ actionPending: true, error: null });
    try {
      await operation();
    } catch {
      await this.reconcile();
      this.#publish({ error: "The Gateway did not accept that run control." });
    } finally {
      this.#actionPending = false;
      this.#publish({ actionPending: false });
    }
  }

  #append(item) {
    this.#publish({ activity: [...this.#snapshot.activity, item].slice(-MAX_ACTIVITY_ITEMS) });
  }

  #publish(changes) {
    this.#snapshot = freezeSnapshot({ ...this.#snapshot, ...changes, capabilities: this.#features });
    for (const listener of this.#listeners) listener(this.#snapshot);
  }
}
