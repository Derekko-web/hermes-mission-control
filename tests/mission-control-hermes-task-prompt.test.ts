import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHermesTaskPrompt,
  buildHermesTaskOfficeActivity,
  buildHermesTaskRunPrompt,
  formatNotionSyncError,
  mergeMissionControlTaskSnapshots,
  resolveHermesTaskOperatorAgent,
} from "../src/components/mission-control/MissionControlTasksView";

test("builds focused Hermes task handoff messages from title and Notion body", () => {
  const prompt = buildHermesTaskPrompt({
    _id: "task-1",
    _creationTime: 0,
    title: "Wire Notion body text into Hermes",
    description: "Database property summary.",
    notionBodyText: "Page-body instructions that live inside the Notion card page.",
    status: "In progress",
    assignee: "lead",
    priority: "high",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof buildHermesTaskPrompt>[0]);

  assert.match(prompt, /^Wire Notion body text into Hermes/);
  assert.doesNotMatch(prompt, /Mission Control task/);
  assert.match(prompt, /Page-body instructions/);
  assert.doesNotMatch(prompt, /Database property summary/);
  assert.doesNotMatch(prompt, /Status:/);
  assert.doesNotMatch(prompt, /Priority:/);
  assert.doesNotMatch(prompt, /Project:/);
  assert.match(prompt, /linked here for continued conversation/);
  assert.doesNotMatch(prompt, /Start working/);
  assert.doesNotMatch(prompt, /complete the task/);
  assert.doesNotMatch(prompt, /Kanban card description/);
  assert.doesNotMatch(prompt, /code/);
});

test("uses task description as the Hermes brief when no Notion body exists", () => {
  const prompt = buildHermesTaskPrompt({
    _id: "task-1",
    _creationTime: 0,
    title: "Follow up with vendor",
    description: "Ask for the updated delivery date.",
    status: "In progress",
    assignee: "lead",
    priority: "medium",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof buildHermesTaskPrompt>[0]);

  assert.match(prompt, /^Follow up with vendor/);
  assert.match(prompt, /Ask for the updated delivery date\./);
  assert.match(prompt, /linked here for continued conversation/);
});

test("builds Hermes task run prompts that do work without updating card fields", () => {
  const prompt = buildHermesTaskRunPrompt({
    _id: "task-1",
    _creationTime: 0,
    title: "Publish the rollout note",
    description: "Use the approved launch points.",
    status: "In progress",
    assignee: "lead",
    priority: "medium",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof buildHermesTaskRunPrompt>[0]);

  assert.match(prompt, /^Start working on this Mission Control task/);
  assert.match(prompt, /Publish the rollout note/);
  assert.match(prompt, /Do the requested work using the available tools/);
  assert.match(prompt, /Do not edit, replace, summarize, append to, or otherwise rewrite the Kanban card description/);
  assert.match(prompt, /Do not move the card to Done, update the Kanban column yourself, or change the Notion status directly/);
  assert.match(prompt, /Mission Control will move this card from In progress to In review automatically/);
  assert.match(prompt, /user will review your work and manually drag the card from In review to Done/);
  assert.match(prompt, /Keep progress notes, blocker notes, completion notes, and follow-up questions inside this Hermes thread/);
});

test("builds human-readable Pixel Agents activity for task runs", () => {
  const activity = buildHermesTaskOfficeActivity({
    title: "Publish the rollout note",
  });

  assert.equal(activity, "Working on Publish the rollout note");
  assert.doesNotMatch(activity, /card status/);
  assert.doesNotMatch(activity, /Start working on this Mission Control task/);
});

test("keeps an existing Pixel Agent claim when a task is handed to Hermes", () => {
  const [lead, builder] = [
    { _id: "agent-lead", name: "Lead Operator", roleTitle: "Primary Agent", sortOrder: 0 },
    { _id: "agent-builder", name: "Implementation Engineer", roleTitle: "Implementation Engineer", sortOrder: 1 },
  ] as unknown as Parameters<typeof resolveHermesTaskOperatorAgent>[2];

  const operator = resolveHermesTaskOperatorAgent(
    { _id: "task-1", operatorAgentId: builder._id } as unknown as Parameters<
      typeof resolveHermesTaskOperatorAgent
    >[0],
    [
      { _id: "task-1", status: "In progress", hermesThreadId: undefined, operatorAgentId: builder._id },
      { _id: "task-2", status: "In progress", hermesThreadId: "thread-1", operatorAgentId: builder._id },
    ] as unknown as Parameters<typeof resolveHermesTaskOperatorAgent>[1],
    [lead, builder],
  );

  assert.equal(operator?.name, "Implementation Engineer");
});

test("assigns new Hermes task handoffs to the least busy Pixel Agent", () => {
  const [lead, builder] = [
    { _id: "agent-lead", name: "Lead Operator", roleTitle: "Primary Agent", sortOrder: 0 },
    { _id: "agent-builder", name: "Implementation Engineer", roleTitle: "Implementation Engineer", sortOrder: 1 },
  ] as unknown as Parameters<typeof resolveHermesTaskOperatorAgent>[2];

  const operator = resolveHermesTaskOperatorAgent(
    { _id: "task-target", operatorAgentId: undefined } as unknown as Parameters<
      typeof resolveHermesTaskOperatorAgent
    >[0],
    [
      { _id: "task-target", status: "In progress", hermesThreadId: undefined, operatorAgentId: undefined },
      { _id: "task-lead", status: "In progress", hermesThreadId: "thread-lead", operatorAgentId: lead._id },
      { _id: "task-done", status: "Done", hermesThreadId: "thread-builder", operatorAgentId: builder._id },
    ] as unknown as Parameters<typeof resolveHermesTaskOperatorAgent>[1],
    [lead, builder],
  );

  assert.equal(operator?.name, "Implementation Engineer");
});

test("randomizes between equally available Pixel Agents", () => {
  const [lead, builder] = [
    { _id: "agent-lead", name: "Lead Operator", roleTitle: "Primary Agent", sortOrder: 0 },
    { _id: "agent-builder", name: "Implementation Engineer", roleTitle: "Implementation Engineer", sortOrder: 1 },
  ] as unknown as Parameters<typeof resolveHermesTaskOperatorAgent>[2];

  const operator = resolveHermesTaskOperatorAgent(
    { _id: "task-target", operatorAgentId: undefined },
    [{ _id: "task-target", status: "Not started", operatorAgentId: undefined }],
    [lead, builder],
    () => 0.75,
  );

  assert.equal(operator?.name, "Implementation Engineer");
});

test("does not keep optimistic task cards after the server deletes them", () => {
  const merged = mergeMissionControlTaskSnapshots(
    [
      { _id: "task-1", title: "Still on the server", updatedAt: 10 },
      { _id: "task-2", title: "Also on the server", updatedAt: 9 },
    ],
    [
      { _id: "task-2", title: "Optimistic update", updatedAt: 20 },
      { _id: "task-deleted", title: "Deleted on the server", updatedAt: 30 },
    ],
  );

  assert.deepEqual(
    merged.map((task) => task.title),
    ["Optimistic update", "Still on the server"],
  );
});

test("keeps pending optimistic task snapshots only until the server catches up", () => {
  const pending = mergeMissionControlTaskSnapshots(
    [{ _id: "task-1", title: "Server value", updatedAt: 10 }],
    [{ _id: "task-1", title: "Pending optimistic value", updatedAt: 20 }],
  );
  const caughtUp = mergeMissionControlTaskSnapshots(
    [{ _id: "task-1", title: "Server linked thread", updatedAt: 20 }],
    [{ _id: "task-1", title: "Stale optimistic value", updatedAt: 20 }],
  );

  assert.deepEqual(
    pending.map((task) => task.title),
    ["Pending optimistic value"],
  );
  assert.deepEqual(
    caughtUp.map((task) => task.title),
    ["Server linked thread"],
  );
});

test("formats Notion sync failures for the Tasks board", () => {
  assert.equal(
    formatNotionSyncError(new Error("NOTION_API_TOKEN is missing.")),
    "Notion sync failed: NOTION_API_TOKEN is missing.",
  );
});
