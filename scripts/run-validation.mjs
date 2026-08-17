import { resolve } from "node:path";

import { appendEvidenceIndex, buildUnverifiedEvidenceRecord, createRunId, writeEvidencePair } from "../src/evidence.js";

const OPTIONS = new Set([
  "--mode", "--out", "--deployment", "--trust", "--muxy-version", "--hermes-version",
  "--hermes-revision", "--category", "--reason", "--stage",
]);

function argumentsFor(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!OPTIONS.has(key) || typeof value !== "string" || value.length === 0 || values.has(key)) throw new Error("validation_invalid_arguments");
    values.set(key, value);
  }
  if (values.size !== OPTIONS.size || [...OPTIONS].some((option) => !values.has(option))) throw new Error("validation_usage");
  if (!["failure", "incomplete"].includes(values.get("--mode"))) throw new Error("validation_usage");
  const output = resolve(values.get("--out"));
  if (output === "/") throw new Error("validation_output_invalid");
  const failedStage = values.get("--stage") === "none" ? null : values.get("--stage");
  if ((values.get("--mode") === "failure") !== (failedStage !== null)) throw new Error("validation_usage");
  return {
    output,
    deploymentCondition: values.get("--deployment"),
    trustClass: values.get("--trust"),
    versionTuple: {
      muxyVersion: values.get("--muxy-version"),
      hermesVersion: values.get("--hermes-version"),
      hermesRevisionOrDigest: values.get("--hermes-revision"),
    },
    attemptCategory: values.get("--category"),
    reasonCode: values.get("--reason"),
    failedStage,
  };
}

try {
  const { output, ...attempt } = argumentsFor(process.argv.slice(2));
  const record = buildUnverifiedEvidenceRecord({
    runId: createRunId(),
    recordedAt: new Date().toISOString(),
    ...attempt,
  });
  await writeEvidencePair({ outputDir: output, record });
  await appendEvidenceIndex({ outputDir: output, record });
  process.stdout.write(`${record.runId}\n`);
} catch (error) {
  const message = typeof error?.message === "string" && /^evidence_|^validation_/.test(error.message)
    ? error.message
    : "validation_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
