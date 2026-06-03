import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { ConvexHttpClient } from "convex/browser";

import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";

function readConvexUrl() {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const match = envLocal.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  if (!match) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is missing from .env.local");
  }

  return match[1].trim();
}

const client = new ConvexHttpClient(readConvexUrl());

test("new Hermes chats can be created immediately before the first message is sent", async (t) => {
  let threadId: Id<"hermesThreads"> | null = null;

  t.after(async () => {
    if (!threadId) {
      return;
    }

    try {
      await client.mutation(api.hermesThreads.deleteThread, { threadId });
    } catch {
      // Ignore cleanup failures while the mutation is still under development.
    }
  });

  const createdThread = await client.mutation(api.hermesThreads.createThread, {});
  threadId = createdThread.threadId;

  assert.equal(createdThread.title, "New chat");
  assert.equal(createdThread.modelId, "gpt-5.4");
  assert.equal(createdThread.reasoningEffort, "xhigh");
  assert.equal(createdThread.fastModeEnabled, true);

  const updatedThread = await client.mutation(api.hermesThreads.updateThreadSettings, {
    threadId,
    modelId: "claude-code",
    reasoningEffort: "high",
    fastModeEnabled: true,
  });

  assert.equal(updatedThread.modelId, "claude-code");
  assert.equal(updatedThread.reasoningEffort, null);
  assert.equal(updatedThread.fastModeEnabled, false);

  const threads = await client.query(api.hermesThreads.listThreads, {});
  const newThread = threads.find((thread) => thread._id === threadId);

  assert.ok(newThread, "the new chat should appear in the thread list immediately");
  assert.equal(newThread?.title, "New chat");
  assert.equal(newThread?.modelId, "claude-code");

  const messages = await client.query(api.hermesThreads.listMessages, { threadId });
  assert.deepEqual(messages, []);
});

test("records a real Hermes exchange on a thread and stores the Hermes session id", async (t) => {
  let threadId: Id<"hermesThreads"> | null = null;

  t.after(async () => {
    if (!threadId) {
      return;
    }

    try {
      await client.mutation(api.hermesThreads.deleteThread, { threadId });
    } catch {
      // Ignore cleanup failures while the mutation is still under development.
    }
  });

  const createdThread = await client.mutation(api.hermesThreads.createThread, {});
  threadId = createdThread.threadId;

  const recorded = await client.mutation(api.hermesThreads.recordExchange, {
    threadId,
    content: "what's today's date?",
    assistantContent: "Today is April 20, 2026.",
    hermesSessionId: "20260420_210037_e575b8",
    attachments: [],
  });

  assert.equal(recorded.inserted, 2);
  assert.equal(recorded.threadId, threadId);

  const threads = await client.query(api.hermesThreads.listThreads, {});
  const savedThread = threads.find((thread) => thread._id === threadId);
  assert.equal(savedThread?.hermesSessionId, "20260420_210037_e575b8");
  assert.equal(savedThread?.title, "what's today's date");

  const messages = await client.query(api.hermesThreads.listMessages, { threadId });
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.content, "what's today's date?");
  assert.equal(messages[1]?.content, "Today is April 20, 2026.");
});

test("records a task handoff as a user message without running Hermes", async (t) => {
  let threadId: Id<"hermesThreads"> | null = null;

  t.after(async () => {
    if (!threadId) {
      return;
    }

    try {
      await client.mutation(api.hermesThreads.deleteThread, { threadId });
    } catch {
      // Ignore cleanup failures while the mutation is still under development.
    }
  });

  const createdThread = await client.mutation(api.hermesThreads.createThread, {});
  threadId = createdThread.threadId;

  const recorded = await client.mutation(api.hermesThreads.recordTaskHandoff, {
    threadId,
    content: "Review launch handoff\n\nThis Mission Control card is linked here for continued conversation.",
  });

  assert.equal(recorded.inserted, 1);
  assert.equal(recorded.threadId, threadId);

  const threads = await client.query(api.hermesThreads.listThreads, {});
  const savedThread = threads.find((thread) => thread._id === threadId);
  assert.equal(savedThread?.hermesSessionId, undefined);
  assert.equal(savedThread?.title, "Review launch handoff This Mission");

  const messages = await client.query(api.hermesThreads.listMessages, { threadId });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, "user");
  assert.match(messages[0]?.content ?? "", /continued conversation/);
});

test("records a Hermes task result without duplicating the task handoff message", async (t) => {
  let threadId: Id<"hermesThreads"> | null = null;

  t.after(async () => {
    if (!threadId) {
      return;
    }

    try {
      await client.mutation(api.hermesThreads.deleteThread, { threadId });
    } catch {
      // Ignore cleanup failures while the mutation is still under development.
    }
  });

  const createdThread = await client.mutation(api.hermesThreads.createThread, {});
  threadId = createdThread.threadId;

  await client.mutation(api.hermesThreads.recordTaskHandoff, {
    threadId,
    content: "Review launch handoff\n\nThis Mission Control card is linked here for continued conversation.",
  });
  const recorded = await client.mutation(api.hermesThreads.recordAssistantResponse, {
    threadId,
    content: "Run Review launch handoff, but do not rewrite the card description.",
    assistantContent: "Done. I finished the launch handoff and kept the card description unchanged.",
    hermesSessionId: "20260603_120000_taskrun",
  });

  assert.equal(recorded.inserted, 1);
  assert.equal(recorded.threadId, threadId);

  const threads = await client.query(api.hermesThreads.listThreads, {});
  const savedThread = threads.find((thread) => thread._id === threadId);
  assert.equal(savedThread?.hermesSessionId, "20260603_120000_taskrun");

  const messages = await client.query(api.hermesThreads.listMessages, { threadId });
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.role, "user");
  assert.equal(messages[1]?.role, "assistant");
  assert.match(messages[1]?.content ?? "", /card description unchanged/);
});

test("linking a task to a Hermes thread stores the Pixel Agent claim on the task", async (t) => {
  let taskId: Id<"tasks"> | null = null;
  let threadId: Id<"hermesThreads"> | null = null;

  t.after(async () => {
    if (taskId) {
      try {
        await client.mutation(api.tasks.remove, { id: taskId });
      } catch {
        // Ignore cleanup failures while the mutation is still under development.
      }
    }
    if (threadId) {
      try {
        await client.mutation(api.hermesThreads.deleteThread, { threadId });
      } catch {
        // Ignore cleanup failures while the mutation is still under development.
      }
    }
  });

  await client.mutation(api.teamMembers.ensureSeedData, {});
  const [officeAgent] = await client.query(api.teamMembers.list, {});
  assert.ok(officeAgent, "the default Pixel Agent roster should exist");

  taskId = await client.mutation(api.tasks.create, {
    title: "Verify Pixel Agent task claim",
    status: "In progress",
    assignee: "unassigned",
    priority: "medium",
  });
  const createdThread = await client.mutation(api.hermesThreads.createThread, {
    officeAgentId: officeAgent._id,
  });
  threadId = createdThread.threadId;

  const linkedTask = await client.mutation(api.tasks.linkHermesThread, {
    id: taskId,
    hermesThreadId: threadId,
    operatorAgentId: officeAgent._id,
  });
  await client.mutation(api.hermesThreads.recordAssistantResponse, {
    threadId,
    content: "Run the task, but leave the card status unchanged for user review.",
    assistantContent: "Done from the Hermes thread. The card is ready for review.",
    hermesSessionId: "20260603_121500_review",
    officeAgentId: officeAgent._id,
  });
  const taskAfterHermesReply = await client.query(api.tasks.get, { id: taskId });

  assert.equal(linkedTask?.hermesThreadId, threadId);
  assert.equal(linkedTask?.operatorAgentId, officeAgent._id);
  assert.equal(linkedTask?.operatorAgentName, officeAgent.name);
  assert.equal(linkedTask?.operatorAgentRoleTitle, officeAgent.roleTitle);
  assert.equal(taskAfterHermesReply?.status, "In progress");
});
