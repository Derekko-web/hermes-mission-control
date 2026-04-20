import assert from "node:assert/strict";
import test from "node:test";

import { ConvexHttpClient } from "convex/browser";

import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient("http://127.0.0.1:3212");

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

  const threads = await client.query(api.hermesThreads.listThreads, {});
  const newThread = threads.find((thread) => thread._id === threadId);

  assert.ok(newThread, "the new chat should appear in the thread list immediately");
  assert.equal(newThread?.title, "New chat");

  const messages = await client.query(api.hermesThreads.listMessages, { threadId });
  assert.deepEqual(messages, []);
});
