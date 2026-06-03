import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { buildStarterScheduledItems } from "../shared/missionControlTemplate";

const scheduledItemKind = v.union(
  v.literal("cron_job"),
  v.literal("scheduled_task"),
  v.literal("observed_automation"),
);

const scheduledItemOwner = v.string();

const scheduledItemCadence = v.union(
  v.literal("once"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("observed"),
);

const scheduledItemColor = v.union(
  v.literal("indigo"),
  v.literal("amber"),
  v.literal("emerald"),
  v.literal("rose"),
  v.literal("cyan"),
  v.literal("violet"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scheduledItems").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    kind: scheduledItemKind,
    owner: scheduledItemOwner,
    cadence: scheduledItemCadence,
    color: scheduledItemColor,
    project: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    command: v.optional(v.string()),
    anchorAt: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    timeMinutes: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    lastObservedAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("scheduledItems", {
      ...args,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      project: args.project?.trim() || undefined,
      sourcePath: args.sourcePath?.trim() || undefined,
      command: args.command?.trim() || undefined,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduledItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    kind: v.optional(scheduledItemKind),
    owner: v.optional(scheduledItemOwner),
    cadence: v.optional(scheduledItemCadence),
    color: v.optional(scheduledItemColor),
    project: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    command: v.optional(v.string()),
    anchorAt: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    timeMinutes: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    lastObservedAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Scheduled item not found.");
    }

    const patch: {
      title?: string;
      description?: string;
      kind?: "cron_job" | "scheduled_task" | "observed_automation";
      owner?: string;
      cadence?: "once" | "daily" | "weekly" | "biweekly" | "observed";
      color?: "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";
      project?: string;
      sourcePath?: string;
      command?: string;
      anchorAt?: number;
      dayOfWeek?: number;
      timeMinutes?: number;
      durationMinutes?: number;
      lastObservedAt?: number;
      isActive?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.kind !== undefined) patch.kind = args.kind;
    if (args.owner !== undefined) patch.owner = args.owner;
    if (args.cadence !== undefined) patch.cadence = args.cadence;
    if (args.color !== undefined) patch.color = args.color;
    if (args.project !== undefined) patch.project = args.project.trim();
    if (args.sourcePath !== undefined) patch.sourcePath = args.sourcePath.trim();
    if (args.command !== undefined) patch.command = args.command.trim();
    if (args.anchorAt !== undefined) patch.anchorAt = args.anchorAt;
    if (args.dayOfWeek !== undefined) patch.dayOfWeek = args.dayOfWeek;
    if (args.timeMinutes !== undefined) patch.timeMinutes = args.timeMinutes;
    if (args.durationMinutes !== undefined) patch.durationMinutes = args.durationMinutes;
    if (args.lastObservedAt !== undefined) patch.lastObservedAt = args.lastObservedAt;
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: {
    id: v.id("scheduledItems"),
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
    const existingItems = await ctx.db.query("scheduledItems").take(1);
    if (existingItems.length > 0) {
      return { inserted: 0 };
    }

    const now = Date.now();
    const seedItems = buildStarterScheduledItems(now);

    for (const item of seedItems) {
      await ctx.db.insert("scheduledItems", item);
    }

    return { inserted: seedItems.length };
  },
});
