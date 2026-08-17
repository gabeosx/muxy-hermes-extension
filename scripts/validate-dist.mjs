import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { isAbsolute, relative, resolve } from "node:path";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const publicDir = resolve(root, "public");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const allowedManifestKeys = new Set(["$schema", "description", "commands", "events", "panels", "permissions"]);
const allowedPanelKeys = new Set(["entry", "icon", "id", "mode", "position", "title"]);
const allowedCommandKeys = new Set(["id", "title", "action"]);
const allowedCommandActionKeys = new Set(["kind", "panel"]);
const allowedPublicAssets = new Set(["evidence/index.json", "evidence/recovery-v1.json", "evidence/schema-v1.json", "evidence/schema-v2.json"]);

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

  assert.ok(Array.isArray(manifest.muxy.commands) && manifest.muxy.commands.length === 1, `${label} must declare exactly one panel opener command`);
  const [command] = manifest.muxy.commands;
  for (const key of Object.keys(command)) {
    assert.ok(allowedCommandKeys.has(key), `${label} command contains unauthorized surface: ${key}`);
  }
  assert.equal(command.id, "toggle-hermes-gateway", `${label} command id must be the stable Hermes panel opener`);
  assert.equal(command.title, "Hermes: Toggle Gateway Panel", `${label} command title must identify the Hermes panel opener`);
  assert.ok(command.action && typeof command.action === "object" && !Array.isArray(command.action), `${label} command must contain an action object`);
  for (const key of Object.keys(command.action)) {
    assert.ok(allowedCommandActionKeys.has(key), `${label} command action contains unauthorized surface: ${key}`);
  }
  assert.deepEqual(command.action, { kind: "togglePanel", panel: panel.id }, `${label} command may only toggle the declared panel`);
  assert.deepEqual(manifest.muxy.events, ["file.changed"], `${label} must subscribe only to journal changes`);
  assert.deepEqual(
    manifest.muxy.permissions,
    ["commands:exec", "files:read", "files:write", "panels:write"],
    `${label} must request only the approved relay, journal, and panel permissions`,
  );
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

  const publicAssets = await filesUnder(publicDir);
  assert.deepEqual(publicAssets, [...allowedPublicAssets].sort(), "public must contain only the declared redacted evidence assets");
  for (const asset of publicAssets) {
    const publishedAsset = resolve(dist, asset);
    assert.ok(insideDist(publishedAsset), `public asset escapes dist: ${asset}`);
    assert.ok((await stat(publishedAsset)).isFile(), `published public asset is missing: ${asset}`);
    assert.equal(await readFile(publishedAsset, "utf8"), await readFile(resolve(publicDir, asset), "utf8"), `published public asset differs from source: ${asset}`);
    declared.add(asset);
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
