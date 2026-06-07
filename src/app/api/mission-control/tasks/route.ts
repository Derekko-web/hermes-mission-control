import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  isMissionControlTaskStatus,
} from "../../../../../shared/missionControlTasks";

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

function readTaskPriority(value: unknown) {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  throw new Error("A valid task priority is required.");
}

function optionalText(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be text.`);
  }

  return value;
}

function optionalNumber(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} is required.`);
  }

  return number;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      throw new Error("Task payload is required.");
    }

    const title = requiredText(body.title, "Task title");
    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const task = await client.mutation(api.tasks.create, {
      title,
      description: optionalText(body.description, "Description"),
      status: body.status === undefined ? "Not started" : readTaskStatus(body.status),
      assignee: optionalText(body.assignee, "Assignee")?.trim() || "unassigned",
      priority: body.priority === undefined ? "medium" : readTaskPriority(body.priority),
      project: optionalText(body.project, "Project"),
      createdBy: "mission-control",
      kanbanOrder: optionalNumber(body.kanbanOrder, "Kanban order"),
      operatorAgentId:
        body.operatorAgentId === undefined
          ? undefined
          : (requiredText(body.operatorAgentId, "Pixel Agent id") as Id<"teamMembers">),
    });

    return NextResponse.json({ task });
  } catch (error) {
    return errorResponse(error, "Unable to create card.");
  }
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
      title?: string;
      description?: string;
      status?: ReturnType<typeof readTaskStatus>;
      assignee?: string;
      priority?: ReturnType<typeof readTaskPriority>;
      project?: string;
      kanbanOrder?: number;
    } = {
      id: id as Id<"tasks">,
    };

    if (body.title !== undefined) {
      patch.title = requiredText(body.title, "Task title");
    }
    if (body.description !== undefined) {
      patch.description = optionalText(body.description, "Description");
    }
    if (body.status !== undefined) {
      patch.status = readTaskStatus(body.status);
    }
    if (body.assignee !== undefined) {
      patch.assignee = optionalText(body.assignee, "Assignee")?.trim() || "unassigned";
    }
    if (body.priority !== undefined) {
      patch.priority = readTaskPriority(body.priority);
    }
    if (body.project !== undefined) {
      patch.project = optionalText(body.project, "Project");
    }
    if (body.kanbanOrder !== undefined) {
      patch.kanbanOrder = optionalNumber(body.kanbanOrder, "Kanban order");
    }

    const client = new ConvexHttpClient(readMissionControlConvexUrl());
    const existingTask = await client.query(api.tasks.get, { id: patch.id });
    if (!existingTask) {
      throw new Error("Task not found.");
    }

    const task = await client.mutation(api.tasks.update, patch);

    return NextResponse.json({ task });
  } catch (error) {
    return errorResponse(error, "Unable to save card.");
  }
}
