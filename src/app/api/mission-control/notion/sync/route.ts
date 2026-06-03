import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@notionhq/client";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import {
  buildNotionTaskProperties,
  buildTaskSyncHash,
  extractNotionTaskSnapshot,
  resolveNotionTaskPropertyNames,
  type NotionTaskPropertyNames,
  type NotionTaskSnapshot,
} from "../../../../../components/mission-control/mission-control-notion-sync";
import {
  isVisibleNotionPageRecord,
  isArchivedOrTrashedNotionMutationError,
  shouldDeleteMissionControlTaskMissingFromNotion,
  shouldRemoveLocalOnlyMissionControlTask,
} from "../../../../../../shared/missionControlNotionSyncPolicy";
import { toMissionControlTaskStatus } from "../../../../../../shared/missionControlTasks";

export const dynamic = "force-dynamic";

type TaskDoc = Doc<"tasks">;
type NotionPageResult = {
  object: "page";
  id: string;
  archived?: boolean;
  in_trash?: boolean;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, never>;
};
type NotionBlockResult = {
  object: "block";
  id: string;
  type?: string;
  has_children?: boolean;
  [key: string]: unknown;
};
type NotionClient = {
  dataSources: {
    retrieve: (args: { data_source_id: string }) => Promise<Record<string, unknown>>;
    query: (args: Record<string, unknown>) => Promise<{
      results: unknown[];
      has_more: boolean;
      next_cursor: string | null;
    }>;
  };
  databases: {
    retrieve: (args: { database_id: string }) => Promise<Record<string, unknown>>;
  };
  pages: {
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  blocks: {
    children: {
      list: (args: Record<string, unknown>) => Promise<{
        results: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>;
    };
  };
};

const NOTION_PAGE_BODY_TEXT_LIMIT = 12_000;
const NOTION_BLOCK_CHILD_DEPTH_LIMIT = 3;

function readEnvFileValue(name: string) {
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const match = envLocal.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || readEnvFileValue(name);
}

function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name);
  if (value) {
    return value;
  }

  throw new Error(`${name} is missing.`);
}

function readMissionControlConvexUrl() {
  return readRequiredEnv("NEXT_PUBLIC_CONVEX_URL");
}

function isPageResult(result: unknown): result is NotionPageResult {
  return isVisibleNotionPageRecord(result) && typeof (result as { id?: unknown }).id === "string";
}

function msFromNotionTime(value: unknown) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBlockResult(result: unknown): result is NotionBlockResult {
  return Boolean(result && typeof result === "object" && (result as { object?: string }).object === "block");
}

function plainTextFromRichTextParts(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((part) => {
      if (!isRecord(part)) {
        return "";
      }

      const text = isRecord(part.text) ? part.text.content : undefined;
      return typeof part.plain_text === "string"
        ? part.plain_text
        : typeof text === "string"
          ? text
          : "";
    })
    .join("")
    .trim();
}

function normalizeNotionBodyText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, NOTION_PAGE_BODY_TEXT_LIMIT);
}

function notionBlockPlainText(block: NotionBlockResult) {
  const type = block.type;
  const payload = type && isRecord(block[type]) ? block[type] : undefined;

  if (type === "divider") {
    return "---";
  }
  if (!payload) {
    return "";
  }
  if (type === "table_row" && Array.isArray(payload.cells)) {
    return payload.cells.map(plainTextFromRichTextParts).filter(Boolean).join(" | ");
  }

  const text = plainTextFromRichTextParts(payload.rich_text);
  if (text) {
    switch (type) {
      case "heading_1":
        return `# ${text}`;
      case "heading_2":
        return `## ${text}`;
      case "heading_3":
        return `### ${text}`;
      case "bulleted_list_item":
        return `- ${text}`;
      case "numbered_list_item":
        return `1. ${text}`;
      case "to_do":
        return `${payload.checked ? "[x]" : "[ ]"} ${text}`;
      case "quote":
        return `> ${text}`;
      case "code":
        return text;
      default:
        return text;
    }
  }

  if (typeof payload.title === "string") {
    return payload.title;
  }

  return plainTextFromRichTextParts(payload.caption);
}

async function readNotionBlockChildrenText(notion: NotionClient, blockId: string, depth = 0): Promise<string> {
  const lines: string[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor,
    });

    for (const result of response.results) {
      if (!isBlockResult(result)) {
        continue;
      }

      const text = notionBlockPlainText(result);
      if (text) {
        lines.push(text);
      }

      if (result.has_children && depth < NOTION_BLOCK_CHILD_DEPTH_LIMIT) {
        const childText = await readNotionBlockChildrenText(notion, result.id, depth + 1);
        if (childText) {
          lines.push(childText);
        }
      }

      if (normalizeNotionBodyText(lines.join("\n")).length >= NOTION_PAGE_BODY_TEXT_LIMIT) {
        return normalizeNotionBodyText(lines.join("\n"));
      }
    }

    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return normalizeNotionBodyText(lines.join("\n"));
}

async function readNotionPageBodyText(notion: NotionClient, pageId: string) {
  return readNotionBlockChildrenText(notion, pageId);
}

async function extractNotionTaskSnapshotsWithBodies(
  notion: NotionClient,
  pages: NotionPageResult[],
  propertyNames: NotionTaskPropertyNames,
) {
  const notionTasks: NotionTaskSnapshot[] = [];
  const bodyReadFailedPageIds = new Set<string>();
  let bodyReadFailures = 0;

  for (const page of pages) {
    try {
      const bodyText = await readNotionPageBodyText(notion, page.id);
      notionTasks.push(extractNotionTaskSnapshot(page, propertyNames, bodyText));
    } catch (error) {
      bodyReadFailures += 1;
      bodyReadFailedPageIds.add(page.id);
      console.warn(
        `[mission-control] Unable to read Notion page body for ${page.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      notionTasks.push(extractNotionTaskSnapshot(page, propertyNames));
    }
  }

  return { notionTasks, bodyReadFailures, bodyReadFailedPageIds };
}

function taskSyncHash(task: TaskDoc | NotionTaskSnapshot, propertyNames: NotionTaskPropertyNames) {
  return buildTaskSyncHash({
    title: task.title,
    description: propertyNames.description ? task.description : undefined,
    notionBodyText: task.notionBodyText,
    status: toMissionControlTaskStatus(task.status),
    assignee: propertyNames.assignee ? task.assignee : "unassigned",
    priority: propertyNames.priority ? task.priority : "medium",
    project: propertyNames.project ? task.project : undefined,
  });
}

function writableNotionTaskPropertyNames(
  propertyNames: NotionTaskPropertyNames,
  schema: Record<string, { type?: string }>,
) {
  return {
    ...propertyNames,
    assignee:
      propertyNames.assignee && schema[propertyNames.assignee]?.type !== "people"
        ? propertyNames.assignee
        : undefined,
  };
}

function notionDescriptionForLocal(
  notionTask: NotionTaskSnapshot,
  existingTask: TaskDoc | undefined,
  propertyNames: NotionTaskPropertyNames,
) {
  if (propertyNames.description) {
    return notionTask.description;
  }

  return existingTask?.description ?? notionTask.description;
}

function localTaskPayload(task: TaskDoc, propertyNames: NotionTaskPropertyNames) {
  return {
    _id: task._id,
    title: task.title,
    description: propertyNames.description ? task.description : undefined,
    notionBodyText: task.notionBodyText,
    status: toMissionControlTaskStatus(task.status),
    assignee: propertyNames.assignee ? task.assignee : "unassigned",
    priority: propertyNames.priority ? task.priority : "medium",
    project: propertyNames.project ? task.project : undefined,
    hermesLaunchMode: task.hermesLaunchMode,
  };
}

function notionTaskPayload(
  notionTask: NotionTaskSnapshot,
  existingTask: TaskDoc | undefined,
  propertyNames: NotionTaskPropertyNames,
) {
  return {
    title: notionTask.title,
    description: notionDescriptionForLocal(notionTask, existingTask, propertyNames),
    notionBodyText: notionTask.notionBodyText,
    status: notionTask.status,
    assignee: propertyNames.assignee ? notionTask.assignee : existingTask?.assignee ?? "unassigned",
    priority: propertyNames.priority ? notionTask.priority : existingTask?.priority ?? "medium",
    project: propertyNames.project ? notionTask.project : existingTask?.project,
    hermesLaunchMode: notionTask.hermesLaunchMode,
  };
}

async function resolveNotionTarget(notion: NotionClient) {
  const configuredDataSourceId = readOptionalEnv("NOTION_TASKS_DATA_SOURCE_ID");
  const configuredDatabaseId = readOptionalEnv("NOTION_TASKS_DATABASE_ID");

  if (configuredDataSourceId) {
    const dataSource = await notion.dataSources.retrieve({ data_source_id: configuredDataSourceId });
    const parent = dataSource.parent as { database_id?: string } | undefined;
    return {
      databaseId: typeof parent?.database_id === "string" ? parent.database_id : configuredDatabaseId,
      dataSourceId: configuredDataSourceId,
      schema: (dataSource.properties as Record<string, { type?: string }> | undefined) ?? {},
    };
  }

  if (!configuredDatabaseId) {
    throw new Error("NOTION_TASKS_DATABASE_ID or NOTION_TASKS_DATA_SOURCE_ID is missing.");
  }

  const database = await notion.databases.retrieve({ database_id: configuredDatabaseId });
  const dataSources = (database as { data_sources?: Array<{ id?: string }> }).data_sources ?? [];
  const dataSourceId = dataSources[0]?.id;
  if (!dataSourceId) {
    throw new Error("The configured Notion database does not expose a data source.");
  }

  const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  return {
    databaseId: configuredDatabaseId,
    dataSourceId,
    schema: (dataSource.properties as Record<string, { type?: string }> | undefined) ?? {},
  };
}

async function queryAllNotionPages(notion: NotionClient, dataSourceId: string) {
  const pages: NotionPageResult[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor,
      result_type: "page",
    });

    for (const result of response.results) {
      if (isPageResult(result)) {
        pages.push(result);
      }
    }

    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return pages;
}

export async function POST() {
  try {
    const notion = new Client({
      auth: readRequiredEnv("NOTION_API_TOKEN"),
      notionVersion: "2026-03-11",
    }) as unknown as NotionClient;
    const convex = new ConvexHttpClient(readMissionControlConvexUrl());

    await convex.mutation(api.tasks.normalizeStatusesToNotionDefaults, {});

    const target = await resolveNotionTarget(notion);
    const propertyNames = resolveNotionTaskPropertyNames(target.schema);
    const writablePropertyNames = writableNotionTaskPropertyNames(propertyNames, target.schema);
    const [tasks, notionPages] = await Promise.all([
      convex.query(api.tasks.list, {}) as Promise<TaskDoc[]>,
      queryAllNotionPages(notion, target.dataSourceId),
    ]);
    const { notionTasks, bodyReadFailures, bodyReadFailedPageIds } = await extractNotionTaskSnapshotsWithBodies(
      notion,
      notionPages,
      propertyNames,
    );

    const tasksById = new Map<string, TaskDoc>(tasks.map((task) => [task._id, task]));
    const tasksByPageId = new Map<string, TaskDoc>(
      tasks.filter((task) => task.notionPageId).map((task) => [task.notionPageId as string, task]),
    );
    const seenTaskIds = new Set<string>();
    const summary = {
      createdInMissionControl: 0,
      removedLocalOnly: 0,
      deletedFromMissionControl: 0,
      pulledFromNotion: 0,
      pushedToNotion: 0,
      linked: 0,
      conflicts: 0,
      skippedMissingRemote: 0,
      bodyReadFailures,
    };
    const missionControlCreates = [];

    for (const rawNotionTask of notionTasks) {
      const linkedByMissionControlId = rawNotionTask.missionControlTaskId
        ? tasksById.get(rawNotionTask.missionControlTaskId)
        : undefined;
      const linkedTask = linkedByMissionControlId ?? tasksByPageId.get(rawNotionTask.pageId);
      const notionTask =
        linkedTask && bodyReadFailedPageIds.has(rawNotionTask.pageId)
          ? {
              ...rawNotionTask,
              notionBodyText: linkedTask.notionBodyText,
            }
          : rawNotionTask;
      const notionHash = taskSyncHash(notionTask, propertyNames);

      if (!linkedTask) {
        if (!notionTask.hasTitle) {
          continue;
        }

        missionControlCreates.push({
          ...notionTaskPayload(notionTask, undefined, propertyNames),
          notionDatabaseId: target.databaseId,
          notionDataSourceId: target.dataSourceId,
          notionPageId: notionTask.pageId,
          notionUrl: notionTask.url,
          notionBodyText: notionTask.notionBodyText,
          notionLastEditedAt: notionTask.lastEditedAt,
          notionLastSyncedHash: notionHash,
        });
        continue;
      }

      seenTaskIds.add(linkedTask._id);
      const localHash = taskSyncHash(linkedTask, propertyNames);
      const lastSyncedHash = linkedTask.notionLastSyncedHash;
      const localChanged = lastSyncedHash ? localHash !== lastSyncedHash : localHash !== notionHash;
      const notionChanged = lastSyncedHash
        ? notionHash !== lastSyncedHash || notionTask.lastEditedAt > (linkedTask.notionLastEditedAt ?? 0)
        : notionHash !== localHash;

      if (localChanged && notionChanged && localHash !== notionHash) {
        await convex.mutation(api.tasks.markNotionConflict, {
          id: linkedTask._id,
          summary: "Mission Control and Notion both changed this task since the last clean sync.",
        });
        summary.conflicts += 1;
        continue;
      }

      if (notionChanged && notionHash !== localHash) {
        const notionPayload = notionTaskPayload(notionTask, linkedTask, propertyNames);
        const syncedHash = buildTaskSyncHash(notionPayload);
        await convex.mutation(api.tasks.applyNotionPull, {
          id: linkedTask._id,
          ...notionPayload,
          notionDatabaseId: target.databaseId,
          notionDataSourceId: target.dataSourceId,
          notionPageId: notionTask.pageId,
          notionUrl: notionTask.url,
          notionBodyText: notionTask.notionBodyText,
          notionLastEditedAt: notionTask.lastEditedAt,
          notionLastSyncedHash: syncedHash,
        });
        summary.pulledFromNotion += 1;
        continue;
      }

      if (notionChanged && notionHash === localHash) {
        await convex.mutation(api.tasks.markNotionSynced, {
          id: linkedTask._id,
          notionDatabaseId: target.databaseId,
          notionDataSourceId: target.dataSourceId,
          notionPageId: notionTask.pageId,
          notionUrl: notionTask.url,
          notionLastEditedAt: notionTask.lastEditedAt,
          notionLastSyncedHash: localHash,
        });
        summary.linked += 1;
        continue;
      }

      if (localChanged || linkedTask.notionPageId !== notionTask.pageId) {
        let updatedPage: Awaited<ReturnType<NotionClient["pages"]["update"]>>;
        try {
          updatedPage = await notion.pages.update({
            page_id: notionTask.pageId,
            properties: buildNotionTaskProperties(
              localTaskPayload(linkedTask, writablePropertyNames),
              writablePropertyNames,
            ),
          });
        } catch (error) {
          if (isArchivedOrTrashedNotionMutationError(error)) {
            const result = await convex.mutation(api.tasks.remove, { id: linkedTask._id });
            if (result.deleted) {
              summary.deletedFromMissionControl += 1;
            }
            continue;
          }

          throw error;
        }
        await convex.mutation(api.tasks.markNotionSynced, {
          id: linkedTask._id,
          notionDatabaseId: target.databaseId,
          notionDataSourceId: target.dataSourceId,
          notionPageId: notionTask.pageId,
          notionUrl: typeof updatedPage.url === "string" ? updatedPage.url : notionTask.url,
          notionLastEditedAt: msFromNotionTime(updatedPage.last_edited_time),
          notionLastSyncedHash: localHash,
        });
        summary.pushedToNotion += 1;
        continue;
      }

      if (!linkedTask.notionLastSyncedHash) {
        await convex.mutation(api.tasks.markNotionSynced, {
          id: linkedTask._id,
          notionDatabaseId: target.databaseId,
          notionDataSourceId: target.dataSourceId,
          notionPageId: notionTask.pageId,
          notionUrl: notionTask.url,
          notionLastEditedAt: notionTask.lastEditedAt,
          notionLastSyncedHash: localHash,
        });
        summary.linked += 1;
      }
    }

    if (missionControlCreates.length > 0) {
      const result = await convex.mutation(api.tasks.createManyFromNotion, {
        tasks: missionControlCreates,
      });
      summary.createdInMissionControl += result.inserted;
    }

    for (const task of tasks) {
      if (seenTaskIds.has(task._id)) {
        continue;
      }

      if (shouldDeleteMissionControlTaskMissingFromNotion(task, seenTaskIds)) {
        const result = await convex.mutation(api.tasks.remove, { id: task._id as Id<"tasks"> });
        if (result.deleted) {
          summary.deletedFromMissionControl += 1;
        } else {
          summary.skippedMissingRemote += 1;
        }
        continue;
      }

      if (shouldRemoveLocalOnlyMissionControlTask(task)) {
        const result = await convex.mutation(api.tasks.remove, { id: task._id as Id<"tasks"> });
        if (result.deleted) {
          summary.removedLocalOnly += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      dataSourceId: target.dataSourceId,
      databaseId: target.databaseId,
      propertyNames,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync Notion tasks.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
