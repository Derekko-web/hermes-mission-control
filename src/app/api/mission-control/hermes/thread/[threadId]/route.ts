import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const execFileAsync = promisify(execFile);

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const body = (await request.json()) as {
      modelId: string;
      reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | null;
      fastModeEnabled?: boolean;
      officeAgentId?: Id<"teamMembers">;
    };
    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const updatedThread = await client.mutation(api.hermesThreads.updateThreadSettings, {
      threadId: threadId as Id<"hermesThreads">,
      modelId: body.modelId,
      reasoningEffort: body.reasoningEffort ?? null,
      fastModeEnabled: body.fastModeEnabled,
      officeAgentId: body.officeAgentId,
    });
    const threads = await client.query(api.hermesThreads.listThreads, {});

    return NextResponse.json({
      thread: updatedThread,
      threads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update Hermes thread settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const existingThread = await client.query(api.hermesThreads.getThread, {
      threadId: threadId as Id<"hermesThreads">,
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Hermes thread not found." }, { status: 404 });
    }

    if (existingThread.hermesSessionId) {
      try {
        await execFileAsync(
          "hermes",
          ["sessions", "delete", existingThread.hermesSessionId, "--yes"],
          {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024,
            timeout: 60 * 1000,
          },
        );
      } catch {
        // If the backing Hermes session is already gone, still delete the local thread.
      }
    }

    await client.mutation(api.hermesThreads.deleteThread, {
      threadId: threadId as Id<"hermesThreads">,
    });
    const threads = await client.query(api.hermesThreads.listThreads, {});

    return NextResponse.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete Hermes chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
