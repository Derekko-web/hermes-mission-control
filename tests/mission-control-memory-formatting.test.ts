import assert from "node:assert/strict";
import test from "node:test";

import { browserMeta, readerSubtitle } from "../src/components/mission-control/MissionControlMemoryView";

test("journal browser meta and reader subtitle omit duplicate clock times", () => {
  const memory = {
    _id: "memory-journal-2",
    title: "Journal: 2026-04-20",
    summary: "A journal entry about Mission Control polishing.",
    content: `05:37 AM — Memory Journal Heading Pass\nWhat happened: Promote timestamp headings and keep them only in the purple heading treatment.`,
    kind: "journal",
    color: "indigo",
    tags: ["journal"],
    sourcePath: "src/components/mission-control/MissionControlMemoryView.tsx",
    documentDate: 1776663420000,
    pinned: false,
    wordCount: 20,
    createdAt: 1776663420000,
    updatedAt: 1776667020000,
    _creationTime: 1776663420000,
  } as const;

  assert.equal(browserMeta(memory as never), "134 B • 20 words");
  assert.equal(readerSubtitle(memory as never), "Monday, April 20, 2026 • 134 B • 20 words");
});
