import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const KANBAN_FIXTURE_BOARD = "muxy-test";
export const KANBAN_FIXTURE_TOKEN = "kanban-fixture-only";
const API_ROOT = "/api/plugins/kanban";
const VALID_STATUSES = new Set(["triage", "todo", "scheduled", "ready", "running", "blocked", "review", "done"]);
const MAX_REQUEST_BYTES = 32 * 1024;
const SEED_URL = new URL("../fixtures/kanban/board.json", import.meta.url);

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function sendJson(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
    Connection: "close",
  });
  response.end(text);
}

function safeClone(value) {
  return structuredClone(value);
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) throw new Error("fixture_request_too_large");
  }
  try { return JSON.parse(body || "{}"); }
  catch { throw new Error("fixture_request_invalid_json"); }
}

function findTask(board, id) {
  for (const column of board.columns) {
    const index = column.tasks.findIndex((task) => task.id === id);
    if (index >= 0) return { column, index, task: column.tasks[index] };
  }
  return null;
}

function validBoardRequest(url) {
  return url.searchParams.get("board") === KANBAN_FIXTURE_BOARD;
}

/** Test-only Hermes dashboard analogue. State is bounded, in-memory, and never persisted. */
export async function startKanbanFixture({ token = KANBAN_FIXTURE_TOKEN } = {}) {
  if (token !== KANBAN_FIXTURE_TOKEN) throw new Error("kanban_fixture_token_must_remain_fixed");
  const seed = JSON.parse(await readFile(SEED_URL, "utf8"));
  const board = safeClone(seed);
  let sequence = 0;
  const observations = { authenticatedRequests: 0, created: 0, moved: 0 };

  const server = createServer(async (request, response) => {
    try {
      if (request.headers.authorization !== `Bearer ${KANBAN_FIXTURE_TOKEN}`) {
        sendJson(response, 401, { detail: "authentication required" });
        return;
      }
      observations.authenticatedRequests += 1;
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!validBoardRequest(url)) {
        sendJson(response, 404, { detail: "board not found" });
        return;
      }

      if (request.method === "GET" && url.pathname === `${API_ROOT}/board`) {
        sendJson(response, 200, safeClone({
          columns: board.columns,
          assignees: board.assignees,
          tenants: board.tenants,
          latest_event_id: observations.created + observations.moved,
          now: Math.floor(Date.now() / 1_000),
        }));
        return;
      }

      if (request.method === "POST" && url.pathname === `${API_ROOT}/tasks`) {
        const payload = await readJsonBody(request);
        const title = typeof payload.title === "string" ? payload.title.trim() : "";
        if (!title || title.length > 1_000 || payload.workspace_kind !== "scratch") {
          sendJson(response, 400, { detail: "invalid task" });
          return;
        }
        sequence += 1;
        const status = payload.triage === true ? "triage" : "todo";
        const task = {
          id: `t_fixture_created_${String(sequence).padStart(3, "0")}`,
          title,
          status,
          assignee: null,
          tenant: KANBAN_FIXTURE_BOARD,
          priority: 0,
          comment_count: 0,
          latest_summary: null,
        };
        board.columns.find((column) => column.name === status).tasks.push(task);
        observations.created += 1;
        sendJson(response, 200, { task: safeClone(task) });
        return;
      }

      const match = url.pathname.match(new RegExp(`^${API_ROOT}/tasks/([A-Za-z0-9_-]{1,128})$`));
      if (request.method === "PATCH" && match) {
        const payload = await readJsonBody(request);
        if (!VALID_STATUSES.has(payload.status)) {
          sendJson(response, 400, { detail: "invalid status" });
          return;
        }
        const found = findTask(board, match[1]);
        if (!found) {
          sendJson(response, 404, { detail: "task not found" });
          return;
        }
        found.column.tasks.splice(found.index, 1);
        found.task.status = payload.status;
        board.columns.find((column) => column.name === payload.status).tasks.push(found.task);
        observations.moved += 1;
        sendJson(response, 200, { task: safeClone(found.task) });
        return;
      }

      sendJson(response, 404, { detail: "route not found" });
    } catch (error) {
      sendJson(response, error?.message === "fixture_request_too_large" ? 413 : 400, { detail: "invalid fixture request" });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
    await closeServer(server);
    throw new Error("kanban_fixture_not_loopback");
  }
  return Object.freeze({
    url: `http://127.0.0.1:${address.port}`,
    board: KANBAN_FIXTURE_BOARD,
    token: KANBAN_FIXTURE_TOKEN,
    observation: () => Object.freeze({ ...observations }),
    close: () => closeServer(server),
  });
}

async function runCli() {
  const fixture = await startKanbanFixture();
  process.stdout.write(`${JSON.stringify({
    status: "kanban_fixture_ready",
    dashboardUrl: fixture.url,
    board: fixture.board,
    sessionToken: fixture.token,
    contract: "board_create_move_v1",
  })}\n`);
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await fixture.close();
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().catch((error) => {
    process.stderr.write(`${error?.message ?? "kanban_fixture_failed"}\n`);
    process.exitCode = 1;
  });
}
