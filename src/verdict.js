import { validateEvidenceRecord } from "./evidence.js";

export const DEPLOYMENT_CONDITIONS = Object.freeze([
  "host_native_loopback",
  "docker_published_loopback",
  "ssh_local_forward",
  "direct_remote_https",
  "remote_muxy_workspace",
]);

const REQUIRED_STAGES = ["url", "request", "authentication", "origin", "capabilities", "stream"];

function pairFrom(record) {
  return {
    muxyVersion: record.muxyVersion,
    hermesVersion: record.hermesVersion,
    hermesRevisionOrDigest: record.hermesRevisionOrDigest,
  };
}

function pairKey(pair) {
  return `${pair.muxyVersion}\u0000${pair.hermesVersion}\u0000${pair.hermesRevisionOrDigest}`;
}

function samePair(left, right) {
  return left && right && pairKey(left) === pairKey(right);
}

function orderRecords(records) {
  return [...records].sort((left, right) => `${left.recordedAt}:${left.runId}`.localeCompare(`${right.recordedAt}:${right.runId}`));
}

function requiredStagesPassed(record) {
  return REQUIRED_STAGES.every((stage) => record.requiredStages[stage] === "passed");
}

function incrementalSseObserved(record) {
  if (record.requiredStages.authentication !== "passed" || record.requiredStages.stream !== "passed" || record.sseFrames.length < 2) return false;
  const frames = [...record.sseFrames].sort((left, right) => left.order - right.order);
  return frames.every((frame, index) => (
    frame.dataBytes > 0
    && !frame.event.startsWith("hermes.tool")
    && (index === 0 || (frame.order > frames[index - 1].order && frame.elapsedMs > frames[index - 1].elapsedMs))
  ));
}

function successfulQualification(record) {
  return record.realPath
    && !record.simulation
    && record.freshPanelSession
    && requiredStagesPassed(record)
    && record.originVerdict === "exact_origin_passed"
    && incrementalSseObserved(record)
    && (record.deploymentCondition !== "direct_remote_https" || record.trustClass === "trusted_https");
}

function failedRequiredStage(record) {
  return record.realPath && !record.simulation && record.freshPanelSession
    && REQUIRED_STAGES.some((stage) => record.requiredStages[stage] === "failed");
}

function supportedPair(records) {
  const firstSessions = records.filter((record) => record.sessionOrdinal === 1 && successfulQualification(record));
  const secondSessions = records.filter((record) => record.sessionOrdinal === 2 && successfulQualification(record));
  return firstSessions.length > 0 && secondSessions.length > 0;
}

function reproducibleFailure(records) {
  const failures = records.filter(failedRequiredStage);
  return failures.some((candidate) => failures.filter((record) => record.reasonCode === candidate.reasonCode).length >= 2);
}

function safeLatestPair(value) {
  if (!value || typeof value !== "object" || ![value.muxyVersion, value.hermesVersion, value.hermesRevisionOrDigest].every((part) => typeof part === "string" && /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,159}$/.test(part))) return null;
  return pairFrom(value);
}

function latestObservedPair(records) {
  const newest = orderRecords(records).at(-1);
  return newest ? pairFrom(newest) : null;
}

export function classifyVerdict({ records = [], latestStablePair = null } = {}) {
  for (const record of records) validateEvidenceRecord(record);
  const ordered = orderRecords(records);
  const targetPair = safeLatestPair(latestStablePair) ?? latestObservedPair(ordered);
  if (!targetPair) return { verdict: "Unverified", reasonCode: "no_complete_evidence", latestPair: null, lastVerifiedPair: null, carriedForward: false };
  const targetRecords = ordered.filter((record) => samePair(pairFrom(record), targetPair));
  const historicalGroups = new Map();
  for (const record of ordered) {
    const key = pairKey(pairFrom(record));
    const group = historicalGroups.get(key) ?? [];
    group.push(record);
    historicalGroups.set(key, group);
  }
  const supportedGroups = [...historicalGroups.values()].filter(supportedPair);
  const lastSupportedRecords = supportedGroups.at(-1) ?? null;
  const lastVerifiedPair = lastSupportedRecords ? pairFrom(lastSupportedRecords[0]) : null;

  if (targetRecords.length === 0 && lastVerifiedPair) {
    return { verdict: "Supported", reasonCode: "carried_forward_supported", latestPair: targetPair, lastVerifiedPair, carriedForward: true };
  }
  if (reproducibleFailure(targetRecords)) {
    return { verdict: "Unsupported", reasonCode: "latest_pair_reproducible_failure", latestPair: targetPair, lastVerifiedPair, carriedForward: false };
  }
  if (supportedPair(targetRecords)) {
    return { verdict: "Supported", reasonCode: "two_fresh_real_sessions_passed", latestPair: targetPair, lastVerifiedPair: targetPair, carriedForward: false };
  }
  return { verdict: "Unverified", reasonCode: targetRecords.length === 0 ? "no_complete_evidence" : "qualification_incomplete", latestPair: targetPair, lastVerifiedPair, carriedForward: false };
}

function indexEntry(record) {
  return {
    runId: record.runId,
    recordedAt: record.recordedAt,
    muxyVersion: record.muxyVersion,
    hermesVersion: record.hermesVersion,
    hermesRevisionOrDigest: record.hermesRevisionOrDigest,
    trustClass: record.trustClass,
    realPath: record.realPath,
    simulation: record.simulation,
    freshPanelSession: record.freshPanelSession,
    sessionOrdinal: record.sessionOrdinal,
    requiredStages: record.requiredStages,
    originVerdict: record.originVerdict,
    capabilityShapeHash: record.capabilityShapeHash,
    sseFrames: record.sseFrames,
    verdict: record.verdict,
    reasonCode: record.reasonCode,
    reportJson: `runs/${record.runId}/report.json`,
    reportMarkdown: `runs/${record.runId}/report.md`,
  };
}

export function updateEvidenceIndex({ records = [], latestStablePairs = {} } = {}) {
  for (const record of records) validateEvidenceRecord(record);
  const ordered = orderRecords(records);
  const conditions = DEPLOYMENT_CONDITIONS.map((id) => {
    const conditionRecords = ordered.filter((record) => record.deploymentCondition === id);
    const latestStablePair = safeLatestPair(latestStablePairs[id]);
    const result = classifyVerdict({ records: conditionRecords, latestStablePair });
    const history = conditionRecords.map(indexEntry);
    return {
      id,
      verdict: result.verdict,
      reasonCode: result.reasonCode,
      latest: history.at(-1) ?? null,
      latestPair: result.latestPair,
      lastVerifiedPair: result.lastVerifiedPair,
      carriedForward: result.carriedForward,
      history,
    };
  });
  return { schemaVersion: 1, conditions, history: ordered.map(indexEntry) };
}
