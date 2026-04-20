import { mutation, query } from "./_generated/server";

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
