import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotionTaskProperties,
  buildTaskSyncHash,
  extractNotionTaskSnapshot,
  resolveNotionTaskPropertyNames,
} from "../src/components/mission-control/mission-control-notion-sync";

const notionTaskSchema = {
  Name: { type: "title" },
  Status: { type: "status" },
  Description: { type: "rich_text" },
  Priority: { type: "select" },
  Assignee: { type: "rich_text" },
  Project: { type: "rich_text" },
  "Mission Control ID": { type: "rich_text" },
  "Hermes Launch": { type: "select" },
};

test("extracts a Notion page using exact Mission Control task statuses", () => {
  const propertyNames = resolveNotionTaskPropertyNames(notionTaskSchema);
  const task = extractNotionTaskSnapshot(
    {
      id: "notion-page-1",
      url: "https://notion.so/notion-page-1",
      last_edited_time: "2026-06-01T12:00:00.000Z",
      properties: {
        Name: { type: "title", title: [{ plain_text: "Run the sync" }] },
        Status: { type: "status", status: { name: "In progress" } },
        Description: { type: "rich_text", rich_text: [{ plain_text: "Keep the loop explicit." }] },
        Priority: { type: "select", select: { name: "high" } },
        Assignee: { type: "rich_text", rich_text: [{ plain_text: "lead" }] },
        Project: { type: "rich_text", rich_text: [{ plain_text: "Mission Control" }] },
        "Mission Control ID": { type: "rich_text", rich_text: [{ plain_text: "task-1" }] },
        "Hermes Launch": { type: "select", select: { name: "Confirm" } },
      },
    },
    propertyNames,
    "Use the webhook event as the trigger.",
  );

  assert.equal(task.status, "In progress");
  assert.equal(task.priority, "high");
  assert.equal(task.description, "Keep the loop explicit.");
  assert.equal(task.notionBodyText, "Use the webhook event as the trigger.");
  assert.equal(task.missionControlTaskId, "task-1");
  assert.equal(task.hermesLaunchMode, "confirm");
  assert.equal(task.hasTitle, true);
});

test("uses Notion page body text as a description fallback when no Description property exists", () => {
  const propertyNames = resolveNotionTaskPropertyNames({
    Name: { type: "title" },
    Status: { type: "status" },
  });
  const task = extractNotionTaskSnapshot(
    {
      id: "notion-page-2",
      properties: {
        Name: { type: "title", title: [{ plain_text: "Brief Hermes" }] },
        Status: { type: "status", status: { name: "Not started" } },
      },
    },
    propertyNames,
    "Body line one.\nBody line two.",
  );

  assert.equal(task.description, "Body line one.\nBody line two.");
  assert.equal(task.notionBodyText, "Body line one.\nBody line two.");
  assert.equal(task.hasTitle, true);
});

test("marks blank Notion task pages so sync can avoid importing transient untitled cards", () => {
  const propertyNames = resolveNotionTaskPropertyNames({
    Name: { type: "title" },
    Status: { type: "status" },
  });
  const task = extractNotionTaskSnapshot(
    {
      id: "notion-page-blank",
      properties: {
        Name: { type: "title", title: [] },
        Status: { type: "status", status: { name: "Not started" } },
      },
    },
    propertyNames,
  );

  assert.equal(task.title, "Untitled task");
  assert.equal(task.hasTitle, false);
});

test("builds Notion properties without mapping away native statuses", () => {
  const propertyNames = resolveNotionTaskPropertyNames(notionTaskSchema);
  const properties = buildNotionTaskProperties(
    {
      _id: "task-1",
      title: "Run the sync",
      description: "Keep the loop explicit.",
      status: "In progress",
      assignee: "lead",
      priority: "high",
      project: "Mission Control",
      hermesLaunchMode: "auto",
    },
    propertyNames,
  );

  assert.deepEqual(properties.Status, { status: { name: "In progress" } });
  assert.deepEqual(properties["Hermes Launch"], { select: { name: "Auto-run" } });
  assert.match(JSON.stringify(properties), /Mission Control ID/);
  assert.doesNotMatch(JSON.stringify(properties), /in_progress/);
});

test("sync hashes stay stable around the fields Notion can actually store", () => {
  const hash = buildTaskSyncHash({
    title: "Run the sync",
    description: "Keep the loop explicit.",
    notionBodyText: "Use the webhook event as the trigger.",
    status: "In progress",
    assignee: "lead",
    priority: "high",
    project: "Mission Control",
  });

  assert.match(hash, /Run the sync/);
  assert.match(hash, /In progress/);
  assert.match(hash, /webhook event/);
});
