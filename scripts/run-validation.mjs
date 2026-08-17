import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildEvidenceRecord, createRunId, updateEvidenceIndexAtomically, writeEvidencePair } from "../src/evidence.js";
import { updateEvidenceIndex } from "../src/verdict.js";

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

async function readDurableRecords(output) {
  const runDirectory = join(output, "runs");
  let entries = [];
  try { entries = await readdir(runDirectory, { withFileTypes: true }); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const records = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    try { records.push(JSON.parse(await readFile(join(runDirectory, entry.name, "report.json"), "utf8"))); } catch { throw new Error("evidence_record_invalid"); }
  }
  return records;
}

try {
  const { input, output } = argumentsFor(process.argv.slice(2));
  const observation = JSON.parse(await readFile(input, "utf8"));
  if (!observation.runId) observation.runId = createRunId();
  const record = buildEvidenceRecord(observation);
  await writeEvidencePair({ outputDir: output, record });
  await updateEvidenceIndexAtomically({ outputDir: output, update: async () => updateEvidenceIndex({ records: await readDurableRecords(output) }) });
  process.stdout.write(`${record.runId}\n`);
} catch (error) {
  const message = typeof error?.message === "string" && /^evidence_|^validation_/.test(error.message)
    ? error.message
    : "validation_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
