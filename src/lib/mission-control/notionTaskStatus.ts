import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@notionhq/client";

import type { Doc } from "../../../convex/_generated/dataModel";
import { resolveNotionTaskPropertyNames } from "../../components/mission-control/mission-control-notion-sync";
import { buildNotionStatusPropertyPatch } from "../../../shared/missionControlNotionStatusUpdate";
import {
  type MissionControlTaskStatus,
  toMissionControlTaskStatus,
} from "../../../shared/missionControlTasks";

type TaskDoc = Doc<"tasks">;
type NotionClient = {
  dataSources: {
    retrieve: (args: { data_source_id: string }) => Promise<Record<string, unknown>>;
  };
  databases: {
    retrieve: (args: { database_id: string }) => Promise<Record<string, unknown>>;
  };
  pages: {
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
};

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

async function resolveNotionStatusPropertyName(notion: NotionClient) {
  const configuredDataSourceId = readOptionalEnv("NOTION_TASKS_DATA_SOURCE_ID");
  const configuredDatabaseId = readOptionalEnv("NOTION_TASKS_DATABASE_ID");

  if (configuredDataSourceId) {
    const dataSource = await notion.dataSources.retrieve({ data_source_id: configuredDataSourceId });
    const schema = (dataSource.properties as Record<string, { type?: string }> | undefined) ?? {};
    return resolveNotionTaskPropertyNames(schema).status;
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
  const schema = (dataSource.properties as Record<string, { type?: string }> | undefined) ?? {};
  return resolveNotionTaskPropertyNames(schema).status;
}

export function shouldPushTaskStatusToNotion(
  beforeTask: Pick<TaskDoc, "status"> | null | undefined,
  afterTask: Pick<TaskDoc, "status" | "notionPageId"> | null | undefined,
) {
  return Boolean(
    afterTask?.notionPageId &&
      beforeTask &&
      toMissionControlTaskStatus(beforeTask.status) !== toMissionControlTaskStatus(afterTask.status),
  );
}

export async function pushTaskStatusToNotion(task: TaskDoc, status: MissionControlTaskStatus) {
  if (!task.notionPageId) {
    return;
  }
  if (toMissionControlTaskStatus(task.status) === status) {
    return;
  }

  const notion = new Client({
    auth: readRequiredEnv("NOTION_API_TOKEN"),
    notionVersion: "2026-03-11",
  }) as unknown as NotionClient;
  const statusPropertyName = await resolveNotionStatusPropertyName(notion);

  await notion.pages.update({
    page_id: task.notionPageId,
    properties: buildNotionStatusPropertyPatch(statusPropertyName, status),
  });
}

export async function pushChangedTaskStatusToNotion({
  beforeTask,
  afterTask,
}: {
  beforeTask: TaskDoc | null | undefined;
  afterTask: TaskDoc | null | undefined;
}) {
  if (!beforeTask || !afterTask || !shouldPushTaskStatusToNotion(beforeTask, afterTask)) {
    return false;
  }

  await pushTaskStatusToNotion(beforeTask, toMissionControlTaskStatus(afterTask.status));
  return true;
}
