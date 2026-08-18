import { RUN_FEATURES, RunClient, supportsCoreRun, TERMINAL_RUN_STATUSES } from "./run-client.js";
import { isSafeRunId } from "./run-events.js";

const MAX_ASSISTANT_CHARS = 128 * 1024;
const MAX_ACTIVITY_ITEMS = 100;
const ACTIVE = new Set(["starting", "queued", "started", "running", "waiting_for_approval", "stopping", "reconciling", "status_unavailable"]);
const REPLAY_LIMIT_NOTICE = "Live events may be missing or duplicated after an interruption. Earlier approval detail is unavailable.";

function freezeSnapshot(snapshot) {
  return Object.freeze({
    ...snapshot,
    capabilities: Object.freeze([...snapshot.capabilities]),
    activity: Object.freeze(snapshot.activity.map((item) => Object.freeze({ ...item }))),
    pendingApproval: snapshot.pendingApproval
      ? Object.freeze({ ...snapshot.pendingApproval, choices: Object.freeze([...snapshot.pendingApproval.choices]) })
      : null,
    recovery: Object.freeze({ ...snapshot.recovery }),
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
  #recoveryDelays;
  #sleep;

  constructor({ baseUrl, bearer, capabilities, client = new RunClient(), recoveryDelays = [500, 1500], sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)) }) {
    this.#client = client;
    this.#baseUrl = baseUrl;
    this.#bearer = bearer;
    this.#features = new Set(capabilities ?? []);
    this.#recoveryDelays = Object.freeze([...recoveryDelays]);
    this.#sleep = sleep;
    this.#snapshot = freezeSnapshot({
      supported: supportsCoreRun(this.#features), capabilities: this.#features,
      status: "idle", runId: null, assistant: "", activity: [], pendingApproval: null,
      actionPending: false, error: null, streamState: "idle", reconnectAttempt: 0,
      recoveryNotice: null, manualRefresh: false,
      recovery: { interruptionSeen: false, observerAttempts: 0, lifecycle: "same_panel", statusReconciled: false, statusClass: "not_run" },
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
    this.#publish({ status: "starting", runId: null, assistant: "", activity: [], pendingApproval: null, error: null, streamState: "connecting", reconnectAttempt: 0, recoveryNotice: null, manualRefresh: false });
    try {
      const started = await this.#client.start({ baseUrl: this.#baseUrl, bearer: this.#bearer, input, onEvent: (event) => this.#handleEvent(event, generation) });
      if (generation !== this.#generation) return;
      this.#publish({ runId: started.runId, status: this.#snapshot.pendingApproval ? "waiting_for_approval" : "running", streamState: "streaming" });
      this.#watchStream(started.stream, generation, 0);
    } catch {
      if (generation === this.#generation) this.#publish({ status: "failed", error: "The run could not be started.", streamState: "closed" });
    }
  }

  async recover(runId) {
    if (!isSafeRunId(runId)) throw new Error("invalid_run_id");
    const generation = ++this.#generation;
    await this.#client.teardown();
    if (generation !== this.#generation) return;
    this.#publish({
      status: "reconciling", runId, assistant: "", activity: [], pendingApproval: null, error: null,
      streamState: "detached", reconnectAttempt: 0, manualRefresh: true,
      recoveryNotice: "Previous live activity and approval detail were not recovered. Gateway status is authoritative.",
      recovery: { interruptionSeen: true, observerAttempts: 0, lifecycle: "recreated_panel", statusReconciled: false, statusClass: "not_run" },
    });
    await this.reconcile({ generation, interruption: true, detached: true });
  }

  async refresh() {
    if (!this.#snapshot.runId) throw new Error("run_not_available");
    await this.reconcile({ generation: this.#generation, interruption: true, detached: this.#snapshot.streamState === "detached" });
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

  async reconcile({ preserveStopping = false, generation = this.#generation, interruption = false, detached = false } = {}) {
    const runId = this.#snapshot.runId;
    if (!runId || generation !== this.#generation) return "unavailable";
    try {
      const status = await this.#client.status({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId });
      if (generation !== this.#generation) return "unavailable";
      const terminal = TERMINAL_RUN_STATUSES.has(status.status);
      const nextStatus = preserveStopping && !terminal ? "stopping" : status.status;
      this.#publish({
        status: nextStatus, assistant: this.#snapshot.assistant || status.output || "",
        pendingApproval: nextStatus === "waiting_for_approval" && !interruption ? this.#snapshot.pendingApproval : null,
        error: null, streamState: terminal ? (detached ? "detached" : this.#snapshot.streamState === "disconnected" ? "disconnected" : "closed") : this.#snapshot.streamState,
        manualRefresh: !terminal && (detached || this.#snapshot.streamState === "disconnected"),
        recovery: interruption ? { ...this.#snapshot.recovery, interruptionSeen: true, lifecycle: detached ? "recreated_panel" : this.#snapshot.recovery.lifecycle, statusReconciled: true, statusClass: terminal ? "terminal" : "active" } : this.#snapshot.recovery,
      });
      return terminal ? "terminal" : "active";
    } catch {
      if (generation !== this.#generation) return "unavailable";
      if (interruption) {
        this.#publish({ status: "status_unavailable", streamState: "disconnected", pendingApproval: null, error: "Gateway status could not be confirmed.", manualRefresh: true, recoveryNotice: this.#snapshot.recoveryNotice || REPLAY_LIMIT_NOTICE, recovery: { ...this.#snapshot.recovery, interruptionSeen: true, statusReconciled: false, statusClass: "unavailable" } });
      } else this.#publish({ error: "The Gateway status could not be reconciled." });
      return "unavailable";
    }
  }

  async release() {
    this.#generation += 1;
    this.#bearer = null;
    this.#listeners.clear();
    await this.#client.teardown();
  }

  #watchStream(stream, generation, attempt) {
    void Promise.resolve(stream).then(() => this.#streamSettled(generation, attempt), () => this.#streamSettled(generation, attempt));
  }

  async #streamSettled(generation, attempt) {
    if (generation !== this.#generation) return;
    this.#publish({ status: TERMINAL_RUN_STATUSES.has(this.#snapshot.status) ? this.#snapshot.status : "reconciling", streamState: "reconnecting", pendingApproval: null, error: null, recoveryNotice: REPLAY_LIMIT_NOTICE, recovery: { ...this.#snapshot.recovery, interruptionSeen: true } });
    const outcome = await this.reconcile({ generation, interruption: true });
    if (generation !== this.#generation || outcome !== "active") return;
    if (attempt >= this.#recoveryDelays.length) {
      this.#publish({ streamState: "disconnected", manualRefresh: true, recoveryNotice: REPLAY_LIMIT_NOTICE });
      return;
    }
    const reconnectAttempt = attempt + 1;
    this.#publish({ streamState: "reconnecting", reconnectAttempt, manualRefresh: false, recoveryNotice: REPLAY_LIMIT_NOTICE, recovery: { ...this.#snapshot.recovery, interruptionSeen: true, observerAttempts: reconnectAttempt } });
    await this.#sleep(this.#recoveryDelays[attempt]);
    if (generation !== this.#generation) return;
    try {
      const stream = this.#client.observe({ baseUrl: this.#baseUrl, bearer: this.#bearer, runId: this.#snapshot.runId, onEvent: (event) => this.#handleEvent(event, generation) });
      this.#watchStream(stream, generation, reconnectAttempt);
    } catch {
      this.#watchStream(Promise.reject(new Error("observer_failed")), generation, reconnectAttempt);
    }
  }

  #handleEvent(event, generation) {
    if (generation !== this.#generation) return;
    if (event.type === "message.delta") {
      this.#publish({ assistant: `${this.#snapshot.assistant}${event.delta}`.slice(-MAX_ASSISTANT_CHARS) });
      return;
    }
    const activity = activityFor(event);
    if (activity) this.#append(activity);
    if (event.type === "approval.request") this.#publish({ status: "waiting_for_approval", pendingApproval: { command: event.command, choices: event.choices } });
    else if (event.type === "approval.responded") this.#publish({ status: "running", pendingApproval: null });
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

  #append(item) { this.#publish({ activity: [...this.#snapshot.activity, item].slice(-MAX_ACTIVITY_ITEMS) }); }

  #publish(changes) {
    this.#snapshot = freezeSnapshot({ ...this.#snapshot, ...changes, capabilities: this.#features });
    for (const listener of this.#listeners) listener(this.#snapshot);
  }
}
