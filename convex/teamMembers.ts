import { mutation, query } from "./_generated/server";
import { buildDefaultTeamRoster } from "../shared/missionControlTeam";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").withIndex("by_sortOrder").collect();
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMembers = await ctx.db.query("teamMembers").take(1);
    if (existingMembers.length > 0) {
      return { inserted: 0 };
    }

    const members = buildDefaultTeamRoster(Date.now());

    for (const member of members) {
      await ctx.db.insert("teamMembers", member);
    }

    return { inserted: members.length };
  },
});

export const resetDefaultRoster = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMembers = await ctx.db.query("teamMembers").collect();

    for (const member of existingMembers) {
      await ctx.db.delete(member._id);
    }

    const members = buildDefaultTeamRoster(Date.now());

    for (const member of members) {
      await ctx.db.insert("teamMembers", member);
    }

    return {
      removed: existingMembers.length,
      inserted: members.length,
    };
  },
});
