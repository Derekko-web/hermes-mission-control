import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { isArchivedOrTrashedNotionMutationError } from "../../../../../shared/missionControlNotionSyncPolicy";
import {
  isMissionControlTaskStatus,
} from "../../../../../shared/missionControlTasks";
import { pushTaskStatusToNotion } from "../../../../lib/mission-control/notionTaskStatus";

function readEnvFileValue(name: string) {
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const match = envLocal.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name);
  if (value) {
    return value;
  }

  throw new Error(`${name} is missing.`);
}

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || readEnvFileValue(name);
}

function readMissionControlConvexUrl() {
  return readRequiredEnv("NEXT_PUBLIC_CONVEX_URL");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requiredText(value: unknown, fieldName: string) {
  const text = typeof value === "string" && value.trim() ? value.trim() : undefined;
  if (!text) {
    throw new Error(`${fieldName} is required.`);
  }
  return text;
}

function readTaskStatus(value: unknown) {
  if (typeof value === "string" && isMissionControlTaskStatus(value)) {
    return value;
  }

  throw new Error("A valid task status is required.");
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      throw new Error("Task payload is required.");
    }

    const id = requiredText(body.id, "Task id");
    const patch: {
      id: Id<"tasks">;
      status?: ReturnType<typeof readTaskStatus>;
      kanbanOrder?: number;
    } = {
      id: id as Id<"tasks">,
    };

    if (body.status !== undefined) {
      patch.status = readTaskStatus(body.status);
    }
    if (body.kanbanOrder !== undefined) {
      const kanbanOrder = Number(body.kanbanOrder);
      if (!Number.isFinite(kanbanOrder)) {
        throw new Error("A valid Kanban order is required.");
      }
      patch.kanbanOrder = kanbanOrder;
    }

    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const existingTask = await client.query(api.tasks.get, { id: patch.id });
    if (!existingTask) {
      throw new Error("Task not found.");
    }
    if (patch.status) {
      try {
        await pushTaskStatusToNotion(existingTask, patch.status);
      } catch (error) {
        if (existingTask.notionPageId && isArchivedOrTrashedNotionMutationError(error)) {
          const result = await client.mutation(api.tasks.remove, { id: patch.id });
          return NextResponse.json({
            deleted: result.deleted,
            taskId: patch.id,
            archivedRemote: true,
          });
        }

        throw error;
      }
    }

    const task = await client.mutation(api.tasks.update, patch);

    return NextResponse.json({ task });
  } catch (error) {
    return errorResponse(error, "Unable to save card.");
  }
}
