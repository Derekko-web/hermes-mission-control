import assert from "node:assert/strict";
import test from "node:test";

import {
  compareMissionControlKanbanTasks,
  missionControlTaskKanbanOrder,
  resolveMissionControlKanbanDragCenter,
  resolveMissionControlKanbanDragTargetPoints,
  resolveMissionControlKanbanOrder,
} from "../shared/missionControlKanban";

test("falls back to newest-first Kanban ordering for existing tasks", () => {
  const tasks = [
    { _id: "older", status: "Not started", updatedAt: 1000 },
    { _id: "newer", status: "Not started", updatedAt: 2000 },
  ];

  assert.equal(missionControlTaskKanbanOrder(tasks[0]), -1000);
  assert.deepEqual([...tasks].sort(compareMissionControlKanbanTasks).map((task) => task._id), ["newer", "older"]);
});

test("resolves a Kanban drop order at the intended insertion point", () => {
  const tasks = [
    { _id: "first", status: "In progress", updatedAt: 3000, kanbanOrder: 100 },
    { _id: "second", status: "In progress", updatedAt: 2000, kanbanOrder: 300 },
    { _id: "done", status: "Done", updatedAt: 1000, kanbanOrder: 200 },
  ];

  assert.equal(
    resolveMissionControlKanbanOrder(tasks, {
      taskId: "moved",
      status: "In progress",
      beforeTaskId: "second",
    }),
    200,
  );
  assert.equal(
    resolveMissionControlKanbanOrder(tasks, {
      taskId: "moved",
      status: "In progress",
      beforeTaskId: "first",
    }),
    -900,
  );
  assert.equal(
    resolveMissionControlKanbanOrder(tasks, {
      taskId: "moved",
      status: "In progress",
      beforeTaskId: null,
    }),
    1300,
  );
  assert.equal(
    resolveMissionControlKanbanOrder(tasks, {
      taskId: "moved",
      status: "Not started",
      beforeTaskId: null,
      now: 12345,
    }),
    -12345,
  );
});

test("resolves the dragged card center for Kanban drop targeting", () => {
  assert.deepEqual(
    resolveMissionControlKanbanDragCenter({
      pointerX: 132,
      pointerY: 84,
      offsetX: 12,
      offsetY: 14,
      width: 240,
      height: 120,
    }),
    { x: 240, y: 130 },
  );
});

test("prefers the pointer before the card center for Kanban column targeting", () => {
  assert.deepEqual(
    resolveMissionControlKanbanDragTargetPoints({
      pointerX: 420,
      pointerY: 96,
      offsetX: 220,
      offsetY: 24,
      width: 260,
      height: 120,
    }),
    [
      { x: 420, y: 96 },
      { x: 330, y: 132 },
    ],
  );
});
