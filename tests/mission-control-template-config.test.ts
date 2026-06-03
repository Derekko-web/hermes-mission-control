import assert from "node:assert/strict";
import test from "node:test";

import {
  MISSION_CONTROL_TEMPLATE,
  TASK_ASSIGNEE_OPTIONS,
  SCHEDULE_OWNER_OPTIONS,
  buildStarterMemories,
  buildStarterScheduledItems,
  buildStarterTasks,
  getTaskAssigneeMeta,
} from "../shared/missionControlTemplate";

test("defines a portable workspace template without exposing operator assignees in Tasks", () => {
  assert.equal(MISSION_CONTROL_TEMPLATE.workspaceTitle, "Mission Control");
  assert.equal(MISSION_CONTROL_TEMPLATE.primaryOperator.id, "lead");
  assert.equal(MISSION_CONTROL_TEMPLATE.primaryOperator.label, "Lead Operator");
  assert.equal(MISSION_CONTROL_TEMPLATE.operators.length, 5);

  assert.deepEqual(
    TASK_ASSIGNEE_OPTIONS.map((option) => option.id),
    ["you", "unassigned"],
  );

  assert.deepEqual(
    SCHEDULE_OWNER_OPTIONS.map((option) => option.id),
    ["you", "lead", "architect", "builder", "writer", "designer", "system"],
  );

  assert.equal(getTaskAssigneeMeta("you").label, "You");
  assert.equal(getTaskAssigneeMeta("unassigned").label, "Unassigned");
  assert.equal(getTaskAssigneeMeta("mystery-agent").label, "Mystery Agent");
  assert.equal(getTaskAssigneeMeta("mystery-agent").avatarText, "M");

  assert.equal(TASK_ASSIGNEE_OPTIONS.some((option) => String(option.id) === "codex"), false);
  assert.equal(SCHEDULE_OWNER_OPTIONS.some((option) => String(option.id) === "codex"), false);
});

test("builds portable starter tasks, schedules, and memories from the shared workspace template", () => {
  const now = 1_700_000_000_000;

  const tasks = buildStarterTasks(now);
  assert.equal(tasks.length, 5);
  assert.equal(tasks[0]?.assignee, "you");
  assert.equal(tasks.every((task) => task.assignee === "you"), true);
  assert.equal(tasks.every((task) => String(task.assignee) !== "codex"), true);
  assert.equal(tasks.every((task) => task.project === MISSION_CONTROL_TEMPLATE.workspaceTitle), true);

  const scheduledItems = buildStarterScheduledItems(now);
  assert.equal(scheduledItems.length, 3);
  assert.equal(scheduledItems.every((item) => String(item.owner) !== "codex"), true);
  assert.equal(scheduledItems[0]?.project, MISSION_CONTROL_TEMPLATE.workspaceTitle);

  const memories = buildStarterMemories(now);
  assert.equal(memories.length >= 4, true);
  assert.match(memories[0]?.content ?? "", /shared\/missionControlTemplate\.ts/);
  assert.match(memories[0]?.content ?? "", /Lead Operator/);
});
