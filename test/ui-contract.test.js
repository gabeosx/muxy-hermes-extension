import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("marketplace identity, metadata, and permissions are frozen", async () => {
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(manifest.name, "hermes-agent");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.engines.node, ">=20");
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  assert.deepEqual(manifest.muxy.marketplace, {
    author: "Gabe",
    categories: ["developer-tools", "productivity"],
    github: "gabeosx",
    icon: "assets/icon.svg",
    screenshots: [
      "assets/screenshots/operations.png",
      "assets/screenshots/agent-approval.png",
      "assets/screenshots/project-board.png",
    ],
  });
  assert.deepEqual(manifest.muxy.permissions, ["commands:exec", "panels:write", "storage:read", "storage:write", "tabs:write"]);
  for (const forbidden of ["background", "events", "scripts", "topbarItems", "statusbarItems"]) {
    assert.equal(Object.hasOwn(manifest.muxy, forbidden), false);
  }
});

test("product source contains only the Dashboard session relay contract", async () => {
  const [relay, auth, gateway, dom, icons] = await Promise.all([
    readFile(new URL("src/curl-relay.js", root), "utf8"),
    readFile(new URL("src/dashboard-auth.js", root), "utf8"),
    readFile(new URL("src/dashboard-gateway.js", root), "utf8"),
    readFile(new URL("src/lib/dom.js", root), "utf8"),
    readFile(new URL("src/lib/icons.js", root), "utf8"),
  ]);
  assert.match(relay, /requestSessionJson/);
  assert.match(relay, /stdin: buildSessionConfig/);
  assert.doesNotMatch(relay, /bearer|text\/event-stream|streamJournal|journal|Authorization:/i);
  assert.match(auth, /requestWebSocketTicket/);
  assert.match(gateway, /authSession\.requestWebSocketTicket\(\)/);
  assert.doesNotMatch(dom, /innerHTML|\bhtml\b/);
  assert.match(icons, /svg\.innerHTML = ICONS\[name\]/);
});

test("OAuth-only providers and password security boundaries are explicit in both surfaces", async () => {
  const [panel, board, readme] = await Promise.all([
    readFile(new URL("src/panel/app.js", root), "utf8"),
    readFile(new URL("src/board/app.js", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);
  for (const source of [panel, board]) {
    assert.match(source, /OAuth\/OIDC not supported/);
    assert.match(source, /password sign-in only/);
    assert.match(source, /trusted network, VPN, or operator-controlled connection/);
    assert.match(source, /type: "password"/);
  }
  for (const heading of ["Beta support contract", "Security warning", "Permissions", "Data and privacy", "Troubleshooting", "Uninstall and rollback"]) {
    assert.match(readme, new RegExp(heading));
  }
  assert.match(readme, /Muxy 1\.5\.0 \(945\)/);
  assert.match(readme, /Hermes 0\.20\.2/);
  assert.match(readme, /No analytics or telemetry/);
});

test("native styles retain themes, focus, responsive scale, and reduced motion", async () => {
  const [panelCss, boardCss] = await Promise.all([
    readFile(new URL("src/styles/global.css", root), "utf8"),
    readFile(new URL("src/styles/board.css", root), "utf8"),
  ]);
  for (const css of [panelCss, boardCss]) {
    assert.match(css, /var\(--muxy-background\)/);
    assert.match(css, /var\(--muxy-accent\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  }
  assert.match(boardCss, /@media \(max-width:\s*720px\)/);
  assert.match(panelCss, /overflow-y:\s*auto/);
});
