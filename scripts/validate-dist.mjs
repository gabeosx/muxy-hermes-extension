import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { isAbsolute, relative, resolve } from "node:path";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const allowedManifestKeys = new Set(["$schema", "description", "panels"]);
const allowedPanelKeys = new Set(["entry", "icon", "id", "mode", "position", "title"]);

function insideDist(path) {
  const pathFromDist = relative(dist, path);
  return pathFromDist !== "" && !pathFromDist.startsWith("..") && !isAbsolute(pathFromDist);
}

async function filesUnder(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    const displayPath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(entryPath, `${displayPath}/`));
    else if (entry.isFile()) files.push(displayPath);
    else assert.fail(`dist contains a non-file, non-directory entry: ${displayPath}`);
  }
  return files.sort();
}

async function parseManifest(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assertManifestShape(manifest, label) {
  assert.ok(manifest && typeof manifest === "object", `${label} must be an object`);
  assert.ok(manifest.muxy && typeof manifest.muxy === "object", `${label} must contain a muxy manifest`);
  for (const key of Object.keys(manifest.muxy)) {
    assert.ok(allowedManifestKeys.has(key), `${label} contains unauthorized muxy surface: ${key}`);
  }
  assert.ok(Array.isArray(manifest.muxy.panels) && manifest.muxy.panels.length === 1, `${label} must declare exactly one panel`);
  const [panel] = manifest.muxy.panels;
  for (const key of Object.keys(panel)) {
    assert.ok(allowedPanelKeys.has(key), `${label} panel contains unauthorized surface: ${key}`);
  }
  assert.equal(typeof panel.entry, "string", `${label} panel entry must be a string`);
  assert.ok(panel.entry.length > 0, `${label} panel entry must not be empty`);
  assert.equal(Object.hasOwn(manifest.muxy, "permissions"), false, `${label} must not request permissions`);
  return panel.entry;
}

function assetReferences(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
}

async function validateCurrentBuild() {
  const source = await parseManifest(resolve(root, "package.json"));
  const published = await parseManifest(resolve(dist, "package.json"));
  const sourceEntry = assertManifestShape(source, "source package.json");
  const distEntry = assertManifestShape(published, "dist/package.json");
  assert.deepEqual(published.muxy, source.muxy, "source and dist manifests must match structurally");
  assert.equal(distEntry, sourceEntry, "source and dist must configure the same panel entry");

  const entryPath = resolve(dist, distEntry);
  assert.ok(insideDist(entryPath), "panel entry must resolve within dist");
  assert.ok((await stat(entryPath)).isFile(), `configured panel entry is missing: ${distEntry}`);

  const entryHtml = await readFile(entryPath, "utf8");
  const declared = new Set(["package.json", distEntry]);
  for (const asset of assetReferences(entryHtml)) {
    assert.ok(!asset.startsWith("/") && !asset.includes("://"), `panel entry contains an external or absolute asset: ${asset}`);
    const assetPath = resolve(entryPath, "..", asset);
    assert.ok(insideDist(assetPath), `panel entry asset escapes dist: ${asset}`);
    assert.ok((await stat(assetPath)).isFile(), `panel entry asset is missing: ${asset}`);
    declared.add(relative(dist, assetPath));
  }

  const emitted = await filesUnder(dist);
  assert.deepEqual(emitted, [...declared].sort(), "dist contains undeclared or missing build assets");
  return emitted;
}

async function build() {
  await run(npm, ["run", "build"], { cwd: root });
}

await validateCurrentBuild();
await build();
const firstBuild = await validateCurrentBuild();
await build();
const secondBuild = await validateCurrentBuild();
assert.deepEqual(secondBuild, firstBuild, "two clean sequential builds must produce the same complete file set");
console.log(`dist manifest and ${secondBuild.length}-file build output validated across two clean builds.`);
