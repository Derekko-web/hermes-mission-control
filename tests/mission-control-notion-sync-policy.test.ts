import assert from "node:assert/strict";
import test from "node:test";

import {
  isArchivedOrTrashedNotionMutationError,
  isVisibleNotionPageRecord,
  shouldDeleteMissionControlTaskMissingFromNotion,
  shouldRemoveLocalOnlyMissionControlTask,
} from "../shared/missionControlNotionSyncPolicy";

test("treats archived and trashed Notion pages as absent from Mission Control sync", () => {
  assert.equal(isVisibleNotionPageRecord({ object: "page", id: "page-1" }), true);
  assert.equal(isVisibleNotionPageRecord({ object: "page", id: "page-2", archived: true }), false);
  assert.equal(isVisibleNotionPageRecord({ object: "page", id: "page-3", in_trash: true }), false);
  assert.equal(isVisibleNotionPageRecord({ object: "database", id: "database-1" }), false);
});

test("deletes linked Mission Control tasks when their Notion page is missing", () => {
  assert.equal(
    shouldDeleteMissionControlTaskMissingFromNotion(
      { _id: "task-1", notionPageId: "notion-page-1" },
      new Set(["task-2"]),
    ),
    true,
  );
  assert.equal(
    shouldDeleteMissionControlTaskMissingFromNotion(
      { _id: "task-1", notionPageId: "notion-page-1" },
      new Set(["task-1"]),
    ),
    false,
  );
  assert.equal(
    shouldDeleteMissionControlTaskMissingFromNotion({ _id: "task-1", notionPageId: undefined }, new Set()),
    false,
  );
});

test("removes local-only Mission Control tasks instead of creating Notion cards", () => {
  assert.equal(shouldRemoveLocalOnlyMissionControlTask({ _id: "task-1" }), true);
  assert.equal(
    shouldRemoveLocalOnlyMissionControlTask({ _id: "task-2", notionPageId: "notion-page-2" }),
    false,
  );
});

test("detects Notion archived or trashed page mutation errors", () => {
  assert.equal(
    isArchivedOrTrashedNotionMutationError(
      new Error("Can't edit block that is archived. You must unarchive the block before editing."),
    ),
    true,
  );
  assert.equal(isArchivedOrTrashedNotionMutationError("Page is in trash."), true);
  assert.equal(isArchivedOrTrashedNotionMutationError(new Error("Network timeout.")), false);
});
