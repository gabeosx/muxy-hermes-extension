const NAME_PATTERN = /^[a-z][a-z0-9_:-]{0,127}$/;

function safeVersion(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128 ? value : null;
}

/**
 * Converts an untrusted capabilities response into a small, render-safe summary.
 * It deliberately does not preserve the original response object or false/unknown
 * feature values, because this phase only displays advertised names.
 */
export function normalizeCapabilities(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Object.freeze({ state: "unavailable", version: null, names: Object.freeze([]) });
  }

  const features = payload.features && typeof payload.features === "object" && !Array.isArray(payload.features)
    ? payload.features
    : null;
  if (!features) return Object.freeze({ state: "unavailable", version: safeVersion(payload.version), names: Object.freeze([]) });

  const entries = Object.entries(features);
  const names = [...new Set(entries
    .filter(([name, enabled]) => NAME_PATTERN.test(name) && enabled === true)
    .map(([name]) => name))].sort();
  const ignoredEntry = entries.some(([name, enabled]) => !NAME_PATTERN.test(name) || enabled !== true && enabled !== false);
  const state = names.length === 0 ? "empty" : ignoredEntry ? "partial" : "populated";
  return Object.freeze({ state, version: safeVersion(payload.version), names: Object.freeze(names) });
}
