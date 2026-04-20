import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const tasksViewPath = new URL("../src/components/mission-control/MissionControlTasksView.tsx", import.meta.url);
const tasksMutationPath = new URL("../convex/tasks.ts", import.meta.url);
const taskCardPath = new URL("../src/components/mission-control/MissionControlTaskCard.tsx", import.meta.url);
const taskEditorPath = new URL("../src/components/mission-control/MissionControlTaskEditor.tsx", import.meta.url);

test("restores the original Tasks board implementation without task-card editing feature code", () => {
  const tasksViewSource = readFileSync(tasksViewPath, "utf8");
  const tasksMutationSource = readFileSync(tasksMutationPath, "utf8");

  assert.match(tasksViewSource, /Drag cards between columns to update status\./);
  assert.doesNotMatch(tasksViewSource, /MissionControlTaskCard/);
  assert.doesNotMatch(tasksViewSource, /MissionControlTaskEditor/);
  assert.equal(existsSync(taskCardPath), false);
  assert.equal(existsSync(taskEditorPath), false);
  assert.doesNotMatch(tasksMutationSource, /export const remove = mutation/);
});
