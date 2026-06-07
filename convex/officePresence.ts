import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { buildTemplateOfficePresence } from "../shared/missionControlTemplate";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("officePresence").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingPresence = await ctx.db.query("officePresence").take(1);
    if (existingPresence.length > 0) {
      return { inserted: 0 };
    }

    const entries = buildTemplateOfficePresence(Date.now());

    for (const entry of entries) {
      await ctx.db.insert("officePresence", entry);
    }

    return { inserted: entries.length };
  },
});

export const clearMemberActivity = mutation({
  args: {
    memberName: v.string(),
    expectedCurrentTask: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("officePresence")
      .withIndex("by_memberName", (q) => q.eq("memberName", args.memberName))
      .collect();
    const now = Date.now();
    let updated = 0;

    for (const row of rows) {
      if (args.expectedCurrentTask !== undefined && row.currentTask !== args.expectedCurrentTask) {
        continue;
      }

      await ctx.db.patch(row._id, {
        status: "idle",
        currentTask: "Standing by",
        statusNote: "No active Hermes task.",
        activeTool: "Mission Control",
        isAtDesk: false,
        lastUpdatedAt: now,
        updatedAt: now,
      });
      updated += 1;
    }

    return { updated };
  },
});
