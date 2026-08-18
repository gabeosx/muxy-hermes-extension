import assert from "node:assert/strict";
import test from "node:test";

import {
  KANBAN_FIXTURE_BOARD,
  KANBAN_FIXTURE_TOKEN,
  startKanbanFixture,
} from "../scripts/run-kanban-fixture.mjs";

function request(fixture, path, { method = "GET", token = KANBAN_FIXTURE_TOKEN, body } = {}) {
  return fetch(`${fixture.url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("Kanban fixture is loopback-only, bearer-authenticated, seeded, and mutable in memory", async () => {
  const fixture = await startKanbanFixture();
  const boardPath = `/api/plugins/kanban/board?board=${KANBAN_FIXTURE_BOARD}`;
  try {
    assert.match(fixture.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal((await request(fixture, boardPath, { token: "wrong" })).status, 401);

    const initial = await request(fixture, boardPath);
    assert.equal(initial.status, 200);
    const initialBoard = await initial.json();
    assert.deepEqual(initialBoard.columns.map((column) => column.name), ["triage", "todo", "scheduled", "ready", "running", "blocked", "review", "done"]);
    assert.equal(initialBoard.columns.reduce((sum, column) => sum + column.tasks.length, 0), 4);
    assert.equal(JSON.stringify(initialBoard).includes("workspace_path"), false);

    const created = await request(fixture, `/api/plugins/kanban/tasks?board=${KANBAN_FIXTURE_BOARD}`, {
      method: "POST",
      body: { title: "Created through fixture", triage: true, workspace_kind: "scratch", idempotency_key: "fixture-test" },
    });
    assert.equal(created.status, 200);
    const createdTask = (await created.json()).task;
    assert.equal(createdTask.status, "triage");

    const moved = await request(fixture, `/api/plugins/kanban/tasks/${createdTask.id}?board=${KANBAN_FIXTURE_BOARD}`, {
      method: "PATCH",
      body: { status: "ready" },
    });
    assert.equal(moved.status, 200);
    assert.equal((await moved.json()).task.status, "ready");

    const finalBoard = await (await request(fixture, boardPath)).json();
    assert.equal(finalBoard.columns.find((column) => column.name === "ready").tasks.some((task) => task.id === createdTask.id), true);
    assert.deepEqual(fixture.observation(), { authenticatedRequests: 4, created: 1, moved: 1 });
  } finally {
    await fixture.close();
  }
});

test("Kanban fixture rejects unknown boards, routes, statuses, and non-scratch creates", async () => {
  const fixture = await startKanbanFixture();
  try {
    assert.equal((await request(fixture, "/api/plugins/kanban/board?board=other")).status, 404);
    assert.equal((await request(fixture, `/api/plugins/kanban/unknown?board=${KANBAN_FIXTURE_BOARD}`)).status, 404);
    assert.equal((await request(fixture, `/api/plugins/kanban/tasks/t_fixture_todo?board=${KANBAN_FIXTURE_BOARD}`, { method: "PATCH", body: { status: "invented" } })).status, 400);
    assert.equal((await request(fixture, `/api/plugins/kanban/tasks?board=${KANBAN_FIXTURE_BOARD}`, { method: "POST", body: { title: "Unsafe", workspace_kind: "dir", workspace_path: "/tmp" } })).status, 400);
  } finally {
    await fixture.close();
  }
});
