import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { normalizeHermesThreadSettings } from "../src/components/mission-control/mission-control-hermes-shared";

type HermesAttachment = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
  dataUrl?: string;
};

type HermesOfficeAgent = Pick<
  Doc<"teamMembers">,
  "_id" | "name" | "roleTitle" | "summary" | "responsibilities"
>;

const hermesAttachmentValidator = v.object({
  name: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  kind: v.union(v.literal("image"), v.literal("file")),
  dataUrl: v.optional(v.string()),
});

const hermesReasoningEffortValidator = v.union(
  v.literal("none"),
  v.literal("minimal"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("xhigh"),
);

async function findOfficeAgent(ctx: MutationCtx, officeAgentId?: Id<"teamMembers"> | null) {
  if (!officeAgentId) {
    return null;
  }

  return await ctx.db.get(officeAgentId);
}

async function requireOfficeAgent(ctx: MutationCtx, officeAgentId: Id<"teamMembers">) {
  const officeAgent = await findOfficeAgent(ctx, officeAgentId);
  if (!officeAgent) {
    throw new Error("Office agent not found.");
  }

  return officeAgent;
}

async function getDefaultOfficeAgent(ctx: MutationCtx) {
  const [officeAgent] = await ctx.db.query("teamMembers").withIndex("by_sortOrder").take(1);
  return officeAgent ?? null;
}

function buildOfficeAgentThreadPatch(officeAgent: HermesOfficeAgent | null) {
  if (!officeAgent) {
    return {};
  }

  return {
    officeAgentId: officeAgent._id,
    officeAgentName: officeAgent.name,
    officeAgentRoleTitle: officeAgent.roleTitle,
  };
}

function buildHermesOfficeActivity(content: string, attachments: HermesAttachment[]) {
  const normalized = content.replace(/^\/[a-z]+\s*/i, "").trim();
  if (normalized) {
    return `Hermes: ${normalized.split(/\s+/).slice(0, 8).join(" ")}`;
  }

  if (attachments.length > 0) {
    return `Hermes: reviewing ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`;
  }

  return "Hermes chat session";
}

async function updateOfficePresenceForHermes(
  ctx: MutationCtx,
  officeAgent: HermesOfficeAgent | null,
  content: string,
  attachments: HermesAttachment[],
  now: number,
) {
  if (!officeAgent) {
    return;
  }

  const [existingPresence] = await ctx.db
    .query("officePresence")
    .withIndex("by_memberName", (q) => q.eq("memberName", officeAgent.name))
    .take(1);
  const presencePatch = {
    status: "working" as const,
    currentTask: buildHermesOfficeActivity(content, attachments),
    statusNote: `Bound to Hermes as ${officeAgent.roleTitle}.`,
    activeTool: "Hermes",
    isAtDesk: true,
    lastUpdatedAt: now,
    updatedAt: now,
  };

  if (existingPresence) {
    await ctx.db.patch(existingPresence._id, presencePatch);
    return;
  }

  await ctx.db.insert("officePresence", {
    memberName: officeAgent.name,
    area: "south_station",
    createdAt: now,
    ...presencePatch,
  });
}

const LEGACY_THREAD_TITLE = "Hermes launch thread";
const LEGACY_THREAD_SUMMARY = "Starter conversation for Mission Control's dedicated Hermes workspace.";
const LEGACY_SEED_MESSAGES = [
  {
    role: "system" as const,
    author: "System",
    content: "Hermes is online. This thread is seeded so the chat surface has a live history from the first render.",
  },
  {
    role: "assistant" as const,
    author: "Hermes",
    content: "Mission Control is ready. I’m keeping the thread lean, the history live, and the interface close to the work.",
  },
  {
    role: "user" as const,
    author: "You",
    content: "What should I watch first when this screen comes up?",
  },
  {
    role: "assistant" as const,
    author: "Hermes",
    content: "Watch the thread list, the realtime badge, and the composer. If those stay in sync, the rest of the surface is doing its job.",
  },
];

function buildHermesThreadTitle(content: string, attachments: HermesAttachment[]) {
  const normalized = content.replace(/^\/[a-z]+\s*/i, "").trim();
  if (normalized) {
    return normalized.split(/\s+/).slice(0, 5).join(" ").replace(/[.?!,:;]+$/, "") || "New chat";
  }

  if (attachments.length > 0) {
    return attachments[0].name.replace(/\.[^.]+$/, "") || "New chat";
  }

  return "New chat";
}

function buildHermesSummary(content: string, attachments: HermesAttachment[]) {
  const normalized = content.replace(/^\/[a-z]+\s*/i, "").trim();
  if (normalized) {
    return normalized;
  }

  if (attachments.length > 0) {
    return `Shared ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}.`;
  }

  return "Ready for the next turn.";
}

function buildHermesReply(
  content: string,
  threadTitle: string,
  attachments: HermesAttachment[],
  officeAgent: HermesOfficeAgent | null = null,
) {
  const trimmed = content.trim();
  const normalized = trimmed.toLowerCase();
  const attachmentCount = attachments.length;
  const agentSuffix = officeAgent ? ` as ${officeAgent.name}` : "";

  if (normalized.startsWith("/new") || normalized.startsWith("/reset") || normalized.startsWith("/clear")) {
    return "Use /new or the + button to start a fresh chat tab in Hermes.";
  }

  if (normalized.startsWith("/help") || normalized.startsWith("/commands")) {
    return "Type / in the composer to browse the built-in Hermes slash commands for this surface.";
  }

  if (normalized.startsWith("/resume")) {
    return "Use /resume with a saved session or thread name to jump back into prior work.";
  }

  if (normalized.startsWith("/compress")) {
    return "Use /compress when you want Hermes to condense a long thread before continuing.";
  }

  if (normalized.startsWith("/model")) {
    return "Use /model to inspect or change the active model.";
  }

  if (normalized.startsWith("/tools") || normalized.startsWith("/toolsets")) {
    return "Use /tools to inspect or manage the tool access available to Hermes.";
  }

  if (normalized.startsWith("/status") || normalized.includes("status") || normalized.includes("live")) {
    return `Status is live${agentSuffix}. ${threadTitle} stays backed by Convex, so the thread can pick up right where you left it.`;
  }

  if (normalized.startsWith("/quit") || normalized.startsWith("/exit") || normalized === "/q") {
    return "Use /quit to leave the session cleanly.";
  }

  if (attachmentCount > 0 && !trimmed) {
    return `Received ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"} in ${threadTitle}${agentSuffix}. I’ll keep them paired with the thread.`;
  }

  if (normalized.includes("test") || normalized.includes("verify")) {
    return `I can keep this thread pinned to the real data path${agentSuffix} and use it as a clean verification surface.`;
  }

  if (normalized.includes("ship") || normalized.includes("launch")) {
    return `Copy that${agentSuffix}. I’ll keep the interface tight, the history readable, and the handoff clean while this lands.`;
  }

  if (attachmentCount > 0) {
    return `Got it${agentSuffix}. I logged ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"} in ${threadTitle} and kept the chat ready for follow-up.`;
  }

  return `Acknowledged${agentSuffix}. I’ve logged that in ${threadTitle} and kept the chat state live in Convex.`;
}

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hermesThreads").withIndex("by_lastMessageAt").order("desc").collect();
  },
});

export const listMessages = query({
  args: {
    threadId: v.id("hermesThreads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hermesMessages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

export const getThread = query({
  args: {
    threadId: v.id("hermesThreads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const createThread = mutation({
  args: {
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const settings = normalizeHermesThreadSettings({});
    const officeAgent = args.officeAgentId
      ? await requireOfficeAgent(ctx, args.officeAgentId)
      : await getDefaultOfficeAgent(ctx);
    const threadId = await ctx.db.insert("hermesThreads", {
      title: "New chat",
      summary: "Ready for the next turn.",
      pinned: false,
      ...buildOfficeAgentThreadPatch(officeAgent),
      modelId: settings.modelId,
      reasoningEffort: settings.reasoningEffort,
      fastModeEnabled: settings.fastModeEnabled,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      threadId,
      title: "New chat",
      modelId: settings.modelId,
      reasoningEffort: settings.reasoningEffort,
      fastModeEnabled: settings.fastModeEnabled,
      ...buildOfficeAgentThreadPatch(officeAgent),
    };
  },
});

export const updateThreadSettings = mutation({
  args: {
    threadId: v.id("hermesThreads"),
    modelId: v.string(),
    reasoningEffort: v.optional(v.union(hermesReasoningEffortValidator, v.null())),
    fastModeEnabled: v.optional(v.boolean()),
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Hermes thread not found.");
    }

    const settings = normalizeHermesThreadSettings({
      modelId: args.modelId,
      reasoningEffort: args.reasoningEffort ?? null,
      fastModeEnabled: args.fastModeEnabled,
    });
    const officeAgent = args.officeAgentId ? await requireOfficeAgent(ctx, args.officeAgentId) : null;

    await ctx.db.patch(args.threadId, {
      modelId: settings.modelId,
      reasoningEffort: settings.reasoningEffort,
      fastModeEnabled: settings.fastModeEnabled,
      ...buildOfficeAgentThreadPatch(officeAgent),
      updatedAt: Date.now(),
    });

    return {
      ...(await ctx.db.get(args.threadId)),
      ...settings,
    };
  },
});

export const recordExchange = mutation({
  args: {
    threadId: v.optional(v.id("hermesThreads")),
    content: v.string(),
    assistantContent: v.string(),
    hermesSessionId: v.string(),
    attachments: v.optional(v.array(hermesAttachmentValidator)),
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    const assistantContent = args.assistantContent.trim();
    const attachments = args.attachments ?? [];

    if (!content && attachments.length === 0) {
      return { inserted: 0, threadId: args.threadId ?? null };
    }

    if (!assistantContent) {
      throw new Error("Assistant content is required.");
    }

    const now = Date.now();
    const thread = args.threadId ? await ctx.db.get(args.threadId) : null;

    if (args.threadId && !thread) {
      throw new Error("Hermes thread not found.");
    }

    const officeAgent = args.officeAgentId
      ? await requireOfficeAgent(ctx, args.officeAgentId)
      : (await findOfficeAgent(ctx, thread?.officeAgentId)) ?? (thread ? null : await getDefaultOfficeAgent(ctx));
    const nextTitle = buildHermesThreadTitle(content, attachments);
    const settings = normalizeHermesThreadSettings({
      modelId: thread?.modelId,
      reasoningEffort: thread?.reasoningEffort ?? null,
      fastModeEnabled: thread?.fastModeEnabled,
    });
    const threadId =
      thread?._id ??
      (await ctx.db.insert("hermesThreads", {
        title: nextTitle,
        summary: buildHermesSummary(content, attachments),
        pinned: false,
        hermesSessionId: args.hermesSessionId,
        ...buildOfficeAgentThreadPatch(officeAgent),
        modelId: settings.modelId,
        reasoningEffort: settings.reasoningEffort,
        fastModeEnabled: settings.fastModeEnabled,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      }));

    const resolvedThreadTitle = thread?.title && thread.title !== "New chat" ? thread.title : nextTitle;
    const userMessageId = await ctx.db.insert("hermesMessages", {
      threadId,
      role: "user",
      author: "You",
      content: content || "Shared attachments.",
      attachments,
      createdAt: now,
    });

    const assistantMessageId = await ctx.db.insert("hermesMessages", {
      threadId,
      role: "assistant",
      author: officeAgent?.name ?? "Hermes",
      content: assistantContent,
      createdAt: now + 1,
    });

    await ctx.db.patch(threadId, {
      title: resolvedThreadTitle,
      summary: buildHermesSummary(content, attachments),
      hermesSessionId: args.hermesSessionId,
      ...buildOfficeAgentThreadPatch(officeAgent),
      updatedAt: now + 1,
      lastMessageAt: now + 1,
    });
    await updateOfficePresenceForHermes(ctx, officeAgent, content, attachments, now + 1);

    return {
      inserted: 2,
      threadId,
      userMessageId,
      assistantMessageId,
    };
  },
});

export const recordTaskHandoff = mutation({
  args: {
    threadId: v.id("hermesThreads"),
    content: v.string(),
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (!content) {
      return { inserted: 0, threadId: args.threadId };
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Hermes thread not found.");
    }

    const officeAgent = args.officeAgentId
      ? await requireOfficeAgent(ctx, args.officeAgentId)
      : await findOfficeAgent(ctx, thread.officeAgentId);
    const now = Date.now();
    const nextTitle = buildHermesThreadTitle(content, []);
    const resolvedThreadTitle = thread.title && thread.title !== "New chat" ? thread.title : nextTitle;
    const userMessageId = await ctx.db.insert("hermesMessages", {
      threadId: args.threadId,
      role: "user",
      author: "You",
      content,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, {
      title: resolvedThreadTitle,
      summary: buildHermesSummary(content, []),
      ...buildOfficeAgentThreadPatch(officeAgent),
      updatedAt: now,
      lastMessageAt: now,
    });

    return {
      inserted: 1,
      threadId: args.threadId,
      userMessageId,
    };
  },
});

export const recordAssistantResponse = mutation({
  args: {
    threadId: v.id("hermesThreads"),
    content: v.string(),
    assistantContent: v.string(),
    hermesSessionId: v.string(),
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    const assistantContent = args.assistantContent.trim();
    if (!assistantContent) {
      throw new Error("Assistant content is required.");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Hermes thread not found.");
    }

    const officeAgent = args.officeAgentId
      ? await requireOfficeAgent(ctx, args.officeAgentId)
      : await findOfficeAgent(ctx, thread.officeAgentId);
    const now = Date.now();
    const nextTitle = content ? buildHermesThreadTitle(content, []) : thread.title;
    const resolvedThreadTitle = thread.title && thread.title !== "New chat" ? thread.title : nextTitle;
    const assistantMessageId = await ctx.db.insert("hermesMessages", {
      threadId: args.threadId,
      role: "assistant",
      author: officeAgent?.name ?? "Hermes",
      content: assistantContent,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, {
      title: resolvedThreadTitle,
      summary: content ? buildHermesSummary(content, []) : thread.summary,
      hermesSessionId: args.hermesSessionId,
      ...buildOfficeAgentThreadPatch(officeAgent),
      updatedAt: now,
      lastMessageAt: now,
    });
    await updateOfficePresenceForHermes(ctx, officeAgent, content, [], now);

    return {
      inserted: 1,
      threadId: args.threadId,
      assistantMessageId,
    };
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.optional(v.id("hermesThreads")),
    content: v.string(),
    attachments: v.optional(v.array(hermesAttachmentValidator)),
    officeAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    const attachments = args.attachments ?? [];

    if (!content && attachments.length === 0) {
      return { inserted: 0, threadId: args.threadId ?? null };
    }

    const now = Date.now();
    const thread = args.threadId ? await ctx.db.get(args.threadId) : null;

    if (args.threadId && !thread) {
      throw new Error("Hermes thread not found.");
    }

    const officeAgent = args.officeAgentId
      ? await requireOfficeAgent(ctx, args.officeAgentId)
      : (await findOfficeAgent(ctx, thread?.officeAgentId)) ?? (thread ? null : await getDefaultOfficeAgent(ctx));
    const nextTitle = buildHermesThreadTitle(content, attachments);
    const settings = normalizeHermesThreadSettings({
      modelId: thread?.modelId,
      reasoningEffort: thread?.reasoningEffort ?? null,
      fastModeEnabled: thread?.fastModeEnabled,
    });
    const threadId =
      thread?._id ??
      (await ctx.db.insert("hermesThreads", {
        title: nextTitle,
        summary: buildHermesSummary(content, attachments),
        pinned: false,
        ...buildOfficeAgentThreadPatch(officeAgent),
        modelId: settings.modelId,
        reasoningEffort: settings.reasoningEffort,
        fastModeEnabled: settings.fastModeEnabled,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      }));

    const resolvedThreadTitle = thread?.title && thread.title !== "New chat" ? thread.title : nextTitle;
    const userMessageId = await ctx.db.insert("hermesMessages", {
      threadId,
      role: "user",
      author: "You",
      content: content || "Shared attachments.",
      attachments,
      createdAt: now,
    });

    const assistantContent = buildHermesReply(content, resolvedThreadTitle, attachments, officeAgent);
    const assistantMessageId = await ctx.db.insert("hermesMessages", {
      threadId,
      role: "assistant",
      author: officeAgent?.name ?? "Hermes",
      content: assistantContent,
      createdAt: now + 1,
    });

    await ctx.db.patch(threadId, {
      title: resolvedThreadTitle,
      summary: buildHermesSummary(content, attachments),
      ...buildOfficeAgentThreadPatch(officeAgent),
      updatedAt: now + 1,
      lastMessageAt: now + 1,
    });
    await updateOfficePresenceForHermes(ctx, officeAgent, content, attachments, now + 1);

    return {
      inserted: 2,
      threadId,
      userMessageId,
      assistantMessageId,
    };
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.id("hermesThreads"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("hermesMessages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.threadId);

    return {
      deletedMessages: messages.length,
      deletedThread: 1,
    };
  },
});

export const cleanupSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query("hermesThreads").collect();
    let removed = 0;

    for (const thread of threads) {
      if (thread.title !== LEGACY_THREAD_TITLE || thread.summary !== LEGACY_THREAD_SUMMARY) {
        continue;
      }

      const messages = await ctx.db
        .query("hermesMessages")
        .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", thread._id))
        .order("asc")
        .collect();

      const isLegacySeed =
        messages.length === LEGACY_SEED_MESSAGES.length &&
        messages.every((message, index) => {
          const expected = LEGACY_SEED_MESSAGES[index];
          return (
            message.role === expected.role &&
            message.author === expected.author &&
            message.content === expected.content
          );
        });

      if (!isLegacySeed) {
        continue;
      }

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      await ctx.db.delete(thread._id);
      removed += 1;
    }

    return { removed };
  },
});
