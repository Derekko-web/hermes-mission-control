import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const messages = await client.query(api.hermesThreads.listMessages, {
      threadId: threadId as Id<"hermesThreads">,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Hermes messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
