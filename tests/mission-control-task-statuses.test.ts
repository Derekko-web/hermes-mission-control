import assert from "node:assert/strict";
import test from "node:test";

import {
  MISSION_CONTROL_TASK_STATUSES,
  buildMissionControlTaskSyncFingerprint,
  toMissionControlTaskStatus,
} from "../shared/missionControlTasks";

test("uses Notion default Kanban statuses as the native task statuses", () => {
  assert.deepEqual(MISSION_CONTROL_TASK_STATUSES, ["Not started", "In progress", "Done"]);
});

test("normalizes legacy local statuses during the compatibility migration", () => {
  assert.equal(toMissionControlTaskStatus("recurring"), "Not started");
  assert.equal(toMissionControlTaskStatus("backlog"), "Not started");
  assert.equal(toMissionControlTaskStatus("in_progress"), "In progress");
  assert.equal(toMissionControlTaskStatus("review"), "In progress");
  assert.equal(toMissionControlTaskStatus("done"), "Done");
});

test("task sync fingerprints use exact Notion status labels", () => {
  const fingerprint = buildMissionControlTaskSyncFingerprint({
    title: "Ship the Notion sync",
    status: "In progress",
    assignee: "lead",
    priority: "high",
  });

  assert.match(fingerprint, /"status":"In progress"/);
  assert.doesNotMatch(fingerprint, /in_progress/);
});
