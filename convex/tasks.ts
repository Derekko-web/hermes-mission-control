import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { buildStarterTasks, inferTemplateAssignee } from "../shared/missionControlTemplate";

const taskStatus = v.union(
  v.literal("recurring"),
  v.literal("backlog"),
  v.literal("in_progress"),
  v.literal("review"),
  v.literal("done"),
);

const taskAssignee = v.string();

const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

type TaskAssignee = string;

function inferNamedAssignee(title: string, description?: string): TaskAssignee {
  return inferTemplateAssignee(title, description);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    assignee: taskAssignee,
    priority: taskPriority,
    project: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      ...args,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      project: args.project?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(taskStatus),
    assignee: v.optional(taskAssignee),
    priority: v.optional(taskPriority),
    project: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found.");
    }

    const patch: {
      title?: string;
      description?: string;
      status?: "recurring" | "backlog" | "in_progress" | "review" | "done";
      assignee?: TaskAssignee;
      priority?: "low" | "medium" | "high";
      project?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = args.title.trim();
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim();
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
      patch.project = args.project.trim();
    }

    await ctx.db.patch(args.id, patch);
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
