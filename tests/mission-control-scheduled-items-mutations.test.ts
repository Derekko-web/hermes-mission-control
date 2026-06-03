import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { ConvexHttpClient } from "convex/browser";

import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";

const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = envLocal.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
if (!match) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL missing from .env.local");
}
const client = new ConvexHttpClient(match[1].trim());

test("scheduled items can be updated and removed for calendar sync workflows", async (t) => {
  let itemId: Id<"scheduledItems"> | null = null;

  t.after(async () => {
    if (!itemId) return;
    try {
      await client.mutation(api.scheduledItems.remove, { id: itemId });
    } catch {
      // Ignore cleanup failures while the mutation is still under development.
    }
  });

  itemId = await client.mutation(api.scheduledItems.create, {
    title: `Calendar sync regression ${Date.now()}`,
    description: "Created by the automated scheduled item mutation regression test.",
    kind: "cron_job",
    owner: "codex",
    cadence: "weekly",
    color: "indigo",
    project: "Mission Control",
    sourcePath: "tests/calendar-sync-regression.sh",
    command: "bash tests/calendar-sync-regression.sh",
    anchorAt: Date.parse("2026-04-20T16:00:00Z"),
    dayOfWeek: 1,
    timeMinutes: 960,
    durationMinutes: 15,
    isActive: true,
  });

  const updated = await client.mutation(api.scheduledItems.update, {
    id: itemId,
    title: "Calendar sync regression updated",
    cadence: "daily",
    timeMinutes: 1020,
    durationMinutes: 30,
    description: "Updated by the regression test.",
  });

  assert.equal(updated?.title, "Calendar sync regression updated");
  assert.equal(updated?.cadence, "daily");
  assert.equal(updated?.timeMinutes, 1020);
  assert.equal(updated?.durationMinutes, 30);
  assert.equal(updated?.description, "Updated by the regression test.");

  const removed = await client.mutation(api.scheduledItems.remove, { id: itemId });
  assert.deepEqual(removed, { deleted: true, id: itemId });
  itemId = null;
});
