import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { buildStarterMemories } from "../shared/missionControlTemplate";

const memoryKind = v.union(
  v.literal("long_term"),
  v.literal("journal"),
  v.literal("decision"),
  v.literal("reference"),
);

const memoryColor = v.union(
  v.literal("indigo"),
  v.literal("amber"),
  v.literal("emerald"),
  v.literal("rose"),
  v.literal("cyan"),
  v.literal("violet"),
);

function normalizeText(value: string) {
  return value.trim();
}

function normalizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

function countWords(content: string) {
  const words = content.trim().match(/\S+/g);
  return words?.length ?? 0;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("memories").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
    content: v.string(),
    kind: memoryKind,
    color: memoryColor,
    tags: v.array(v.string()),
    sourcePath: v.optional(v.string()),
    documentDate: v.optional(v.number()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const content = normalizeText(args.content);

    return await ctx.db.insert("memories", {
      title: normalizeText(args.title),
      summary: args.summary ? normalizeText(args.summary) : undefined,
      content,
      kind: args.kind,
      color: args.color,
      tags: normalizeTags(args.tags),
      sourcePath: args.sourcePath ? normalizeText(args.sourcePath) : undefined,
      documentDate: args.documentDate,
      wordCount: countWords(content),
      pinned: args.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMemories = await ctx.db.query("memories").take(1);
    if (existingMemories.length > 0) {
      return { inserted: 0 };
    }

    const seedMemories = buildStarterMemories(Date.now());

    for (const memory of seedMemories) {
      await ctx.db.insert("memories", {
        ...memory,
        wordCount: countWords(memory.content),
      });
    }

    return { inserted: seedMemories.length };
  },
});
