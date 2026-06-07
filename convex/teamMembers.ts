import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { buildDefaultTeamRoster } from "../shared/missionControlTeam";

const LEGACY_DEFAULT_NAMES_BY_SORT_ORDER = new Map([
  [10, ["Lead Operator", "code-reviewer"]],
  [20, ["Architecture Scout", "research-assistant"]],
  [30, ["Implementation Engineer", "test-runner"]],
  [40, ["Writer Specialist", "debugger"]],
  [50, ["Product Designer", "security-auditor"]],
]);

const LEGACY_DEFAULT_PRESENCE_NAME_TO_SORT_ORDER = new Map(
  [...LEGACY_DEFAULT_NAMES_BY_SORT_ORDER.entries()].flatMap(([sortOrder, names]) =>
    names.map((name) => [name, sortOrder] as const),
  ),
);

async function syncLegacyDefaultRoster(ctx: MutationCtx) {
  const defaults = buildDefaultTeamRoster(Date.now());
  const defaultsBySortOrder = new Map(defaults.map((member) => [member.sortOrder, member]));
  const existingMembers = await ctx.db.query("teamMembers").withIndex("by_sortOrder").collect();
  const now = Date.now();
  let updatedMembers = 0;

  for (const member of existingMembers) {
    const defaultMember = defaultsBySortOrder.get(member.sortOrder);
    const legacyNames = LEGACY_DEFAULT_NAMES_BY_SORT_ORDER.get(member.sortOrder) ?? [];
    const isDefaultTemplateMember =
      legacyNames.includes(member.name) || member.sourceLabel === defaultMember?.sourceLabel;

    if (!defaultMember || !isDefaultTemplateMember) {
      continue;
    }

    if (
      member.name === defaultMember.name &&
      member.roleTitle === defaultMember.roleTitle &&
      member.avatarLabel === defaultMember.avatarLabel
    ) {
      continue;
    }

    await ctx.db.patch(member._id, {
      name: defaultMember.name,
      roleTitle: defaultMember.roleTitle,
      avatarLabel: defaultMember.avatarLabel,
      updatedAt: now,
    });
    updatedMembers += 1;
  }

  const presenceRows = await ctx.db.query("officePresence").collect();
  let updatedPresence = 0;

  for (const presence of presenceRows) {
    const sortOrder = LEGACY_DEFAULT_PRESENCE_NAME_TO_SORT_ORDER.get(presence.memberName);
    const defaultMember = sortOrder ? defaultsBySortOrder.get(sortOrder) : null;

    if (!defaultMember || presence.memberName === defaultMember.name) {
      continue;
    }

    await ctx.db.patch(presence._id, {
      memberName: defaultMember.name,
      updatedAt: now,
    });
    updatedPresence += 1;
  }

  return { updatedMembers, updatedPresence };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").withIndex("by_sortOrder").collect();
  },
});

export const get = query({
  args: {
    id: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMembers = await ctx.db.query("teamMembers").take(1);
    if (existingMembers.length > 0) {
      return { inserted: 0, ...(await syncLegacyDefaultRoster(ctx)) };
    }

    const members = buildDefaultTeamRoster(Date.now());

    for (const member of members) {
      await ctx.db.insert("teamMembers", member);
    }

    return { inserted: members.length, updatedMembers: 0, updatedPresence: 0 };
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
