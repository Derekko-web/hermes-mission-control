import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import {
  toMissionControlTaskStatus,
  type MissionControlTaskStatus,
} from "../shared/missionControlTasks";
import { buildStarterTasks, inferTemplateAssignee } from "../shared/missionControlTemplate";

const nativeTaskStatus = v.union(
  v.literal("Not started"),
  v.literal("In progress"),
  v.literal("In review"),
  v.literal("Done"),
);

const taskAssignee = v.string();

const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const hermesLaunchMode = v.union(
  v.literal("manual"),
  v.literal("confirm"),
  v.literal("auto"),
);

type TaskAssignee = string;

function inferNamedAssignee(title: string, description?: string): TaskAssignee {
  return inferTemplateAssignee(title, description);
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const get = query({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: nativeTaskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    kanbanOrder: v.optional(v.number()),
    operatorAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const operatorAgent = args.operatorAgentId ? await ctx.db.get(args.operatorAgentId) : null;
    if (args.operatorAgentId && !operatorAgent) {
      throw new Error("Pixel Agent not found.");
    }

    return await ctx.db.insert("tasks", {
      title: args.title.trim(),
      description: trimOptional(args.description),
      status: args.status,
      assignee: args.assignee,
      priority: args.priority,
      project: trimOptional(args.project),
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      kanbanOrder: args.kanbanOrder ?? -now,
      ...(operatorAgent
        ? {
            operatorAgentId: operatorAgent._id,
            operatorAgentName: operatorAgent.name,
            operatorAgentRoleTitle: operatorAgent.roleTitle,
          }
        : {}),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(nativeTaskStatus),
    assignee: v.optional(taskAssignee),
    priority: v.optional(taskPriority),
    project: v.optional(v.string()),
    kanbanOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const patch: {
      title?: string;
      description?: string;
      status?: MissionControlTaskStatus;
      assignee?: TaskAssignee;
      priority?: "low" | "medium" | "high";
      project?: string;
      kanbanOrder?: number;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = args.title.trim();
    }
    if (args.description !== undefined) {
      patch.description = trimOptional(args.description);
    }
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.assignee !== undefined) {
      patch.assignee = args.assignee;
    }
    if (args.priority !== undefined) {
      patch.priority = args.priority;
    }
    if (args.project !== undefined) {
      patch.project = trimOptional(args.project);
    }
    if (args.kanbanOrder !== undefined) {
      patch.kanbanOrder = args.kanbanOrder;
    }

    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const normalizeStatusesToNotionDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    let updated = 0;

    for (const task of tasks) {
      const normalizedStatus = toMissionControlTaskStatus(task.status);
      if (task.status === normalizedStatus) {
        continue;
      }

      await ctx.db.patch(task._id, {
        status: normalizedStatus,
        updatedAt: task.updatedAt,
      });
      updated += 1;
    }

    return { updated };
  },
});

export const createFromNotion = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: nativeTaskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    notionDatabaseId: v.optional(v.string()),
    notionDataSourceId: v.optional(v.string()),
    notionPageId: v.string(),
    notionUrl: v.optional(v.string()),
    notionBodyText: v.optional(v.string()),
    notionLastEditedAt: v.number(),
    notionLastSyncedHash: v.string(),
    hermesLaunchMode: v.optional(hermesLaunchMode),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      title: args.title.trim() || "Untitled task",
      description: trimOptional(args.description),
      status: args.status,
      assignee: args.assignee,
      priority: args.priority,
      project: trimOptional(args.project),
      createdBy: "notion",
      createdAt: now,
      updatedAt: now,
      kanbanOrder: -now,
      notionDatabaseId: trimOptional(args.notionDatabaseId),
      notionDataSourceId: trimOptional(args.notionDataSourceId),
      notionPageId: args.notionPageId,
      notionUrl: trimOptional(args.notionUrl),
      notionBodyText: trimOptional(args.notionBodyText),
      notionLastEditedAt: args.notionLastEditedAt,
      notionLastSyncedAt: now,
      notionLastSyncedHash: args.notionLastSyncedHash,
      hermesLaunchMode: args.hermesLaunchMode,
    });
  },
});

export const createManyFromNotion = mutation({
  args: {
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        status: nativeTaskStatus,
        assignee: taskAssignee,
        priority: taskPriority,
        project: v.optional(v.string()),
        notionDatabaseId: v.optional(v.string()),
        notionDataSourceId: v.optional(v.string()),
        notionPageId: v.string(),
        notionUrl: v.optional(v.string()),
        notionBodyText: v.optional(v.string()),
        notionLastEditedAt: v.number(),
        notionLastSyncedHash: v.string(),
        hermesLaunchMode: v.optional(hermesLaunchMode),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds = [];

    for (const task of args.tasks) {
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_notionPageId", (q) => q.eq("notionPageId", task.notionPageId))
        .first();

      if (existing) {
        continue;
      }

      insertedIds.push(
        await ctx.db.insert("tasks", {
          title: task.title.trim() || "Untitled task",
          description: trimOptional(task.description),
          status: task.status,
          assignee: task.assignee,
          priority: task.priority,
          project: trimOptional(task.project),
          createdBy: "notion",
          createdAt: now,
          updatedAt: now,
          kanbanOrder: -(now + insertedIds.length),
          notionDatabaseId: trimOptional(task.notionDatabaseId),
          notionDataSourceId: trimOptional(task.notionDataSourceId),
          notionPageId: task.notionPageId,
          notionUrl: trimOptional(task.notionUrl),
          notionBodyText: trimOptional(task.notionBodyText),
          notionLastEditedAt: task.notionLastEditedAt,
          notionLastSyncedAt: now,
          notionLastSyncedHash: task.notionLastSyncedHash,
          hermesLaunchMode: task.hermesLaunchMode,
        }),
      );
    }

    return { inserted: insertedIds.length, insertedIds };
  },
});

export const applyNotionPull = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    status: nativeTaskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    notionDatabaseId: v.optional(v.string()),
    notionDataSourceId: v.optional(v.string()),
    notionPageId: v.string(),
    notionUrl: v.optional(v.string()),
    notionBodyText: v.optional(v.string()),
    notionLastEditedAt: v.number(),
    notionLastSyncedHash: v.string(),
    hermesLaunchMode: v.optional(hermesLaunchMode),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      title: args.title.trim() || existing.title,
      description: trimOptional(args.description),
      status: args.status,
      assignee: args.assignee,
      priority: args.priority,
      project: trimOptional(args.project),
      updatedAt: now,
      notionDatabaseId: trimOptional(args.notionDatabaseId),
      notionDataSourceId: trimOptional(args.notionDataSourceId),
      notionPageId: args.notionPageId,
      notionUrl: trimOptional(args.notionUrl),
      notionBodyText: trimOptional(args.notionBodyText),
      notionLastEditedAt: args.notionLastEditedAt,
      notionLastSyncedAt: now,
      notionLastSyncedHash: args.notionLastSyncedHash,
      notionConflictAt: undefined,
      notionConflictSummary: undefined,
      hermesLaunchMode: args.hermesLaunchMode,
    });

    return await ctx.db.get(args.id);
  },
});

export const markNotionSynced = mutation({
  args: {
    id: v.id("tasks"),
    notionDatabaseId: v.optional(v.string()),
    notionDataSourceId: v.optional(v.string()),
    notionPageId: v.string(),
    notionUrl: v.optional(v.string()),
    notionBodyText: v.optional(v.string()),
    notionLastEditedAt: v.number(),
    notionLastSyncedHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const patch: {
      notionDatabaseId?: string;
      notionDataSourceId?: string;
      notionPageId: string;
      notionUrl?: string;
      notionBodyText?: string;
      notionLastEditedAt: number;
      notionLastSyncedAt: number;
      notionLastSyncedHash: string;
      notionConflictAt: undefined;
      notionConflictSummary: undefined;
    } = {
      notionDatabaseId: trimOptional(args.notionDatabaseId),
      notionDataSourceId: trimOptional(args.notionDataSourceId),
      notionPageId: args.notionPageId,
      notionUrl: trimOptional(args.notionUrl),
      notionLastEditedAt: args.notionLastEditedAt,
      notionLastSyncedAt: Date.now(),
      notionLastSyncedHash: args.notionLastSyncedHash,
      notionConflictAt: undefined,
      notionConflictSummary: undefined,
    };

    if (args.notionBodyText !== undefined) {
      patch.notionBodyText = trimOptional(args.notionBodyText);
    }

    await ctx.db.patch(args.id, patch);

    return await ctx.db.get(args.id);
  },
});

export const markNotionConflict = mutation({
  args: {
    id: v.id("tasks"),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.id, {
      notionConflictAt: Date.now(),
      notionConflictSummary: args.summary.trim() || "Local and Notion changes both need review.",
    });

    return await ctx.db.get(args.id);
  },
});

export const linkHermesThread = mutation({
  args: {
    id: v.id("tasks"),
    hermesThreadId: v.id("hermesThreads"),
    operatorAgentId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const hermesThread = await ctx.db.get(args.hermesThreadId);
    const operatorAgentId = args.operatorAgentId ?? hermesThread?.officeAgentId;
    const operatorAgent = operatorAgentId ? await ctx.db.get(operatorAgentId) : null;
    if (args.operatorAgentId && !operatorAgent) {
      throw new Error("Pixel Agent not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      hermesThreadId: args.hermesThreadId,
      hermesStartedAt: now,
      updatedAt: now,
      ...(operatorAgent
        ? {
            operatorAgentId: operatorAgent._id,
            operatorAgentName: operatorAgent.name,
            operatorAgentRoleTitle: operatorAgent.roleTitle,
          }
        : {}),
    });

    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return { deleted: false, id: args.id };
    }

    await ctx.db.delete(args.id);
    return { deleted: true, id: args.id };
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTasks = await ctx.db.query("tasks").take(1);
    if (existingTasks.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const seededTasks = buildStarterTasks(now);

    for (const task of seededTasks) {
      await ctx.db.insert("tasks", task);
    }

    return { inserted: seededTasks.length };
  },
});

export const normalizeAssignees = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    let updated = 0;

    for (const task of tasks) {
      if (task.assignee === "you" || task.assignee === "unassigned") {
        continue;
      }

      const nextAssignee = inferNamedAssignee(task.title, task.description);

      if (nextAssignee === task.assignee) {
        continue;
      }

      await ctx.db.patch(task._id, {
        assignee: nextAssignee,
        updatedAt: task.updatedAt,
      });
      updated += 1;
    }

    return { updated };
  },
});
