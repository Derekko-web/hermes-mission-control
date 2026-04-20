import assert from "node:assert/strict";
import test from "node:test";

import { buildReaderSections } from "../src/components/mission-control/MissionControlMemoryView";

test("promotes timestamped journal lead lines into section headings without duplicating them in body text", () => {
  const memory = {
    _id: "memory-journal-1",
    title: "Journal: 2026-04-20",
    summary: undefined,
    content: `05:37 AM — Architecture Review
Decision: Keep Mission Control as the durable operating layer.

09:12 AM — Journal Layout Direction
What happened: Use timestamp headings in purple and do not repeat them below.`,
    kind: "journal",
    color: "indigo",
    tags: [],
    pinned: false,
    wordCount: 24,
    createdAt: 1776660000000,
    updatedAt: 1776663600000,
    _creationTime: 1776660000000,
  } as const;

  const sections = buildReaderSections(memory as never);

  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.heading, "05:37 AM — Architecture Review");
  assert.deepEqual(sections[0]?.body, ["Decision: Keep Mission Control as the durable operating layer."]);
  assert.equal(sections[1]?.heading, "09:12 AM — Journal Layout Direction");
  assert.deepEqual(sections[1]?.body, ["What happened: Use timestamp headings in purple and do not repeat them below."]);
});
