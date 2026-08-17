import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the project board is a responsive Muxy tab rather than a second chat client", async () => {
  const [app, css, html] = await Promise.all([
    readFile(new URL("../src/board/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/board.css", import.meta.url), "utf8"),
    readFile(new URL("../board/index.html", import.meta.url), "utf8"),
  ]);

  for (const copy of [
    "Explicit project mapping",
    "Map this Muxy project to a Hermes board",
    "no workspace path is sent or compared",
    "Runs Gateway API alone does not provide boards",
    "Open board",
    "Add card",
    "Gateway status and board state remain separate authorities",
  ]) assert.match(app, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(app, /type: "password", autocomplete: "off"/);
  assert.match(app, /this\.tokenValue = ""/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|muxy\.storage|workspace_path/);
  assert.doesNotMatch(app, /chat|transcript|file browser/i);
  assert.match(html, /src="\/src\/board-main\.js"/);

  assert.match(css, /var\(--muxy-topbar-height\)/);
  assert.match(css, /grid-auto-flow:\s*column/);
  assert.match(css, /overflow:\s*auto/);
  assert.match(css, /@media \(max-width:\s*720px\)/);
  assert.match(css, /grid-auto-flow:\s*row/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /min-height:\s*0/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
