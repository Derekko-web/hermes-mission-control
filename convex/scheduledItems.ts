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
