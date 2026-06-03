import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const tasksViewPath = new URL("../src/components/mission-control/MissionControlTasksView.tsx", import.meta.url);
const tasksMutationPath = new URL("../convex/tasks.ts", import.meta.url);
const tasksRoutePath = new URL("../src/app/api/mission-control/tasks/route.ts", import.meta.url);
const tasksPagePath = new URL("../src/app/mission-control/page.tsx", import.meta.url);
const shellPath = new URL("../src/components/mission-control/MissionControlShell.tsx", import.meta.url);
const taskCardPath = new URL("../src/components/mission-control/MissionControlTaskCard.tsx", import.meta.url);
const taskEditorPath = new URL("../src/components/mission-control/MissionControlTaskEditor.tsx", import.meta.url);

test("keeps the simplified Tasks board implementation without task-card editing feature files", () => {
  const tasksViewSource = readFileSync(tasksViewPath, "utf8");
  const tasksMutationSource = readFileSync(tasksMutationPath, "utf8");
  const tasksRouteSource = readFileSync(tasksRoutePath, "utf8");
  const tasksPageSource = readFileSync(tasksPagePath, "utf8");
  const shellSource = readFileSync(shellPath, "utf8");

  assert.match(tasksViewSource, /Drag cards into In progress to prepare a Hermes handoff\./);
  assert.doesNotMatch(tasksViewSource, /MissionControlTaskCard/);
  assert.doesNotMatch(tasksViewSource, /MissionControlTaskEditor/);
  assert.equal(existsSync(taskCardPath), false);
  assert.equal(existsSync(taskEditorPath), false);
  assert.match(tasksMutationSource, /export const remove = mutation/);
  assert.match(tasksViewSource, /"Not started"/);
  assert.match(tasksViewSource, /"In progress"/);
  assert.match(tasksViewSource, /Done/);
  assert.doesNotMatch(tasksViewSource, /Create card/);
  assert.doesNotMatch(tasksViewSource, /mission-control:new-task/);
  assert.doesNotMatch(tasksViewSource, /Sync Notion/);
  assert.doesNotMatch(tasksViewSource, /mission-control:sync-notion/);
  assert.doesNotMatch(shellSource, /Sync Notion/);
  assert.doesNotMatch(shellSource, /mission-control:sync-notion/);
  assert.match(tasksViewSource, /\/api\/mission-control\/notion\/sync/);
  assert.match(tasksViewSource, /NOTION_AUTO_SYNC_INTERVAL_MS/);
  assert.match(tasksViewSource, /visibilitychange/);
  assert.doesNotMatch(tasksRouteSource, /export async function POST/);
  assert.doesNotMatch(tasksPageSource, /api\.tasks\.ensureSeedData/);
});
