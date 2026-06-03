import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionStatusPropertyPatch } from "../shared/missionControlNotionStatusUpdate";
import { shouldPushTaskStatusToNotion } from "../src/lib/mission-control/notionTaskStatus";

test("builds a Notion status property patch from a Mission Control column move", () => {
  assert.deepEqual(buildNotionStatusPropertyPatch("Status", "In progress"), {
    Status: {
      status: {
        name: "In progress",
      },
    },
  });
});

test("detects linked task status drift created during a Hermes run", () => {
  assert.equal(
    shouldPushTaskStatusToNotion(
      { status: "In progress" },
      { status: "Done", notionPageId: "notion-page-1" },
    ),
    true,
  );
  assert.equal(
    shouldPushTaskStatusToNotion(
      { status: "In progress" },
      { status: "In progress", notionPageId: "notion-page-1" },
    ),
    false,
  );
  assert.equal(
    shouldPushTaskStatusToNotion(
      { status: "In progress" },
      { status: "Done", notionPageId: undefined },
    ),
    false,
  );
});
