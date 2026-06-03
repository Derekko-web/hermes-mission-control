import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import {
  buildHermesAgentPromptContent,
  buildHermesChatArgs,
  parseHermesChatOutput,
} from "../../../../../components/mission-control/mission-control-hermes-cli";
import { pushChangedTaskStatusToNotion } from "../../../../../lib/mission-control/notionTaskStatus";

const execFileAsync = promisify(execFile);

type HermesRouteAttachment = {
  kind: "image" | "file";
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
};

type HermesRouteOfficeAgent = {
  _id: Id<"teamMembers">;
  name: string;
  roleTitle: string;
  summary?: string;
  responsibilities: string[];
};
type TaskDoc = Doc<"tasks">;

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

async function runHermesChat(args: {
  content: string;
  modelId?: string | null;
  sessionId?: string | null;
  officeAgent?: HermesRouteOfficeAgent | null;
}) {
  const { stdout, stderr } = await execFileAsync(
    "hermes",
    buildHermesChatArgs({
      content: buildHermesAgentPromptContent({
        content: args.content,
        agent: args.officeAgent,
      }),
      modelId: args.modelId,
      sessionId: args.sessionId,
      source: args.officeAgent ? "mission-control-hermes-office-agent" : "mission-control-hermes",
    }),
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    },
  );

  return parseHermesChatOutput(`${stderr}${stdout}`);
}

async function resolveOfficeAgentForHermes(
  client: ConvexHttpClient,
  args: {
    requestedOfficeAgentId?: Id<"teamMembers">;
    existingOfficeAgentId?: Id<"teamMembers">;
    defaultToFirst: boolean;
  },
) {
  const officeAgentId = args.requestedOfficeAgentId ?? args.existingOfficeAgentId;

  if (officeAgentId) {
    const officeAgent = await client.query(api.teamMembers.get, { id: officeAgentId });
    if (!officeAgent && args.requestedOfficeAgentId) {
      throw new Error("Office agent not found.");
    }

    return officeAgent;
  }

  if (!args.defaultToFirst) {
    return null;
  }

  const [officeAgent] = await client.query(api.teamMembers.list, {});
  return officeAgent ?? null;
}

async function resolveHermesLinkedTask(
  client: ConvexHttpClient,
  args: {
    taskId?: Id<"tasks">;
    threadId?: Id<"hermesThreads">;
  },
) {
  if (args.taskId) {
    return await client.query(api.tasks.get, { id: args.taskId });
  }

  if (!args.threadId) {
    return null;
  }

  const tasks = await client.query(api.tasks.list, {});
  return tasks.find((task: TaskDoc) => task.hermesThreadId === args.threadId) ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      threadId?: Id<"hermesThreads">;
      officeAgentId?: Id<"teamMembers">;
      taskId?: Id<"tasks">;
      content?: string;
      attachments?: HermesRouteAttachment[];
      recordUserMessage?: boolean;
    };

    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    await client.mutation(api.teamMembers.ensureSeedData, {});
    const existingThread = body.threadId
      ? await client.query(api.hermesThreads.getThread, { threadId: body.threadId })
      : null;

    if (body.threadId && !existingThread) {
      return NextResponse.json({ error: "Hermes thread not found." }, { status: 404 });
    }

    const officeAgent = await resolveOfficeAgentForHermes(client, {
      requestedOfficeAgentId: body.officeAgentId,
      existingOfficeAgentId: existingThread?.officeAgentId,
      defaultToFirst: !existingThread,
    });
    const shouldRecordUserMessage = body.recordUserMessage !== false;
    if (!shouldRecordUserMessage && !body.threadId) {
      return NextResponse.json({ error: "A Hermes thread is required for assistant-only sends." }, { status: 400 });
    }

    const taskBeforeHermes = await resolveHermesLinkedTask(client, {
      taskId: body.taskId,
      threadId: body.threadId,
    });
    const hermesResult = await runHermesChat({
      content: body.content ?? "",
      modelId: existingThread?.modelId,
      sessionId: existingThread?.hermesSessionId,
      officeAgent,
    });

    const sendResult = shouldRecordUserMessage
      ? await client.mutation(api.hermesThreads.recordExchange, {
          threadId: body.threadId,
          content: body.content ?? "",
          assistantContent: hermesResult.response,
          hermesSessionId: hermesResult.sessionId,
          attachments: body.attachments ?? [],
          officeAgentId: officeAgent?._id,
        })
      : await client.mutation(api.hermesThreads.recordAssistantResponse, {
          threadId: body.threadId!,
          content: body.content ?? "",
          assistantContent: hermesResult.response,
          hermesSessionId: hermesResult.sessionId,
          officeAgentId: officeAgent?._id,
        });
    const taskAfterHermes = taskBeforeHermes
      ? await client.query(api.tasks.get, { id: taskBeforeHermes._id })
      : await resolveHermesLinkedTask(client, {
          taskId: body.taskId,
          threadId: body.threadId,
        });
    await pushChangedTaskStatusToNotion({
      beforeTask: taskBeforeHermes,
      afterTask: taskAfterHermes,
    });

    if (!sendResult.threadId) {
      return NextResponse.json({ error: "Hermes send did not return a thread." }, { status: 400 });
    }

    const threadId = sendResult.threadId as Id<"hermesThreads">;
    const [threads, messages] = await Promise.all([
      client.query(api.hermesThreads.listThreads, {}),
      client.query(api.hermesThreads.listMessages, { threadId }),
    ]);

    return NextResponse.json({
      messages,
      officeAgent: officeAgent
        ? {
            id: officeAgent._id,
            name: officeAgent.name,
            roleTitle: officeAgent.roleTitle,
          }
        : null,
      sendResult,
      threadId,
      threads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send Hermes message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
