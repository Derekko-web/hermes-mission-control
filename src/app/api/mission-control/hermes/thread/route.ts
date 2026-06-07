import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function readMissionControlConvexUrl() {
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const match = envLocal.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // Fall back to process env below.
  }

  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return process.env.NEXT_PUBLIC_CONVEX_URL;
  }

  throw new Error("NEXT_PUBLIC_CONVEX_URL is missing.");
}

async function readCreateThreadBody(request: Request) {
  try {
    return (await request.json()) as { title?: string; officeAgentId?: Id<"teamMembers"> };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await readCreateThreadBody(request);
    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    await client.mutation(api.teamMembers.ensureSeedData, {});
    const createdThread = await client.mutation(api.hermesThreads.createThread, {
      title: body.title,
      officeAgentId: body.officeAgentId,
    });
    const threads = await client.query(api.hermesThreads.listThreads, {});

    return NextResponse.json({
      threadId: createdThread.threadId,
      threads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Hermes chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
