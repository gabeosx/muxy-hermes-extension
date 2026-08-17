import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { appendEvidenceIndex, buildEvidenceRecord, createRunId, writeEvidencePair } from "../src/evidence.js";

function argumentsFor(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || values.has(key)) throw new Error("validation_invalid_arguments");
    values.set(key, value);
  }
  if (values.size !== 2 || !values.has("--input") || !values.has("--out")) throw new Error("validation_usage");
  return { input: resolve(values.get("--input")), output: resolve(values.get("--out")) };
}

try {
  const { input, output } = argumentsFor(process.argv.slice(2));
  const observation = JSON.parse(await readFile(input, "utf8"));
  if (!observation.runId) observation.runId = createRunId();
  const record = buildEvidenceRecord(observation);
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
