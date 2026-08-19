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
const allowedManifestKeys = new Set(["$schema", "description", "commands", "events", "panels", "permissions", "tabTypes"]);
const allowedPanelKeys = new Set(["entry", "icon", "id", "mode", "position", "title"]);
const allowedTabTypeKeys = new Set(["entry", "id", "title"]);
const allowedCommandKeys = new Set(["id", "title", "action"]);
const allowedCommandActionKeys = new Set(["kind", "panel", "tabType"]);
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

  assert.ok(Array.isArray(manifest.muxy.tabTypes) && manifest.muxy.tabTypes.length === 1, `${label} must declare exactly one project board tab`);
  const [tabType] = manifest.muxy.tabTypes;
  for (const key of Object.keys(tabType)) {
    assert.ok(allowedTabTypeKeys.has(key), `${label} tab type contains unauthorized surface: ${key}`);
  }
  assert.deepEqual(tabType, { id: "hermes-project-board", title: "Hermes Project Board", entry: "board/index.html" }, `${label} must declare the stable project board tab`);

  assert.ok(Array.isArray(manifest.muxy.commands) && manifest.muxy.commands.length === 2, `${label} must declare the panel and board opener commands`);
  for (const command of manifest.muxy.commands) {
    for (const key of Object.keys(command)) {
      assert.ok(allowedCommandKeys.has(key), `${label} command contains unauthorized surface: ${key}`);
    }
    assert.ok(command.action && typeof command.action === "object" && !Array.isArray(command.action), `${label} command must contain an action object`);
    for (const key of Object.keys(command.action)) {
      assert.ok(allowedCommandActionKeys.has(key), `${label} command action contains unauthorized surface: ${key}`);
    }
  }
  assert.deepEqual(manifest.muxy.commands, [
    { id: "toggle-hermes-gateway", title: "Hermes: Toggle Gateway Panel", action: { kind: "togglePanel", panel: panel.id } },
    { id: "open-hermes-project-board", title: "Hermes: Open Project Board", action: { kind: "openTab", tabType: tabType.id } },
  ], `${label} commands must open only the declared Hermes surfaces`);
  assert.deepEqual(manifest.muxy.events, ["file.changed"], `${label} must subscribe only to journal changes`);
  assert.deepEqual(
    manifest.muxy.permissions,
    ["commands:exec", "files:read", "files:write", "panels:write", "storage:read", "storage:write", "tabs:write"],
    `${label} must request only the approved relay, journal, panel, extension-storage, and board-tab permissions`,
  );
  return [panel.entry, tabType.entry];
}

function assetReferences(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
}

async function validateCurrentBuild() {
  const source = await parseManifest(resolve(root, "package.json"));
  const published = await parseManifest(resolve(dist, "package.json"));
  const sourceEntries = assertManifestShape(source, "source package.json");
  const distEntries = assertManifestShape(published, "dist/package.json");
  assert.deepEqual(published.muxy, source.muxy, "source and dist manifests must match structurally");
  assert.deepEqual(distEntries, sourceEntries, "source and dist must configure the same surface entries");

  const declared = new Set(["package.json"]);
  const visitedModules = new Set();
  const collectModule = async (modulePath) => {
    const relativePath = relative(dist, modulePath);
    if (visitedModules.has(relativePath)) return;
    visitedModules.add(relativePath);
    declared.add(relativePath);
    const source = await readFile(modulePath, "utf8");
    const references = [...source.matchAll(/\bimport(?:[\s\S]*?\bfrom\s*)?["']([^"']+)["']/g)].map((match) => match[1]);
    for (const asset of references) {
      if (!asset.startsWith(".")) continue;
      const assetPath = resolve(modulePath, "..", asset);
      assert.ok(insideDist(assetPath), `module asset escapes dist: ${asset}`);
      assert.ok((await stat(assetPath)).isFile(), `module asset is missing: ${asset}`);
      await collectModule(assetPath);
    }
  };
  for (const entry of distEntries) {
    const entryPath = resolve(dist, entry);
    assert.ok(insideDist(entryPath), "surface entry must resolve within dist");
    assert.ok((await stat(entryPath)).isFile(), `configured surface entry is missing: ${entry}`);
    declared.add(entry);
    if (!entry.endsWith(".html")) {
      await collectModule(entryPath);
      continue;
    }
    const entryHtml = await readFile(entryPath, "utf8");
    for (const asset of assetReferences(entryHtml)) {
      assert.ok(!asset.startsWith("/") && !asset.includes("://"), `surface entry contains an external or absolute asset: ${asset}`);
      const assetPath = resolve(entryPath, "..", asset);
      assert.ok(insideDist(assetPath), `surface entry asset escapes dist: ${asset}`);
      assert.ok((await stat(assetPath)).isFile(), `surface entry asset is missing: ${asset}`);
      declared.add(relative(dist, assetPath));
    }
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
