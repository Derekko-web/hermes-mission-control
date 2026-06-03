import {
  DEFAULT_MISSION_CONTROL_TASK_STATUS,
  buildMissionControlTaskSyncFingerprint,
  toMissionControlTaskStatus,
  type MissionControlTaskPriority,
  type MissionControlTaskStatus,
} from "../../../shared/missionControlTasks";

export const NOTION_TASK_PROPERTY_DEFAULTS = {
  title: "Name",
  status: "Status",
  description: "Description",
  priority: "Priority",
  assignee: "Assignee",
  project: "Project",
  missionControlId: "Mission Control ID",
  hermesLaunch: "Hermes Launch",
} as const;

export type HermesLaunchMode = "manual" | "confirm" | "auto";

export type NotionTaskPropertyNames = {
  title: string;
  status: string;
  description?: string;
  priority?: string;
  assignee?: string;
  project?: string;
  missionControlId?: string;
  hermesLaunch?: string;
};

export type NotionTaskSnapshot = {
  pageId: string;
  url?: string;
  lastEditedAt: number;
  title: string;
  hasTitle: boolean;
  description?: string;
  notionBodyText?: string;
  status: MissionControlTaskStatus;
  assignee: string;
  priority: MissionControlTaskPriority;
  project?: string;
  missionControlTaskId?: string;
  hermesLaunchMode?: HermesLaunchMode;
};

type NotionPropertySchema = {
  type?: string;
};

type NotionPageProperty = {
  type?: string;
  title?: Array<{ plain_text?: string; text?: { content?: string } }>;
  rich_text?: Array<{ plain_text?: string; text?: { content?: string } }>;
  status?: { name?: string | null };
  select?: { name?: string | null };
  people?: Array<{ name?: string | null }>;
};

type NotionPageLike = {
  id: string;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionPageProperty>;
};

function firstPropertyNameByType(schema: Record<string, NotionPropertySchema>, type: string) {
  return Object.entries(schema).find(([, property]) => property.type === type)?.[0];
}

function propertyNameIfType(
  schema: Record<string, NotionPropertySchema>,
  name: string,
  type: string,
) {
  return schema[name]?.type === type ? name : undefined;
}

export function resolveNotionTaskPropertyNames(
  schema: Record<string, NotionPropertySchema>,
): NotionTaskPropertyNames {
  return {
    title:
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.title, "title") ??
      firstPropertyNameByType(schema, "title") ??
      NOTION_TASK_PROPERTY_DEFAULTS.title,
    status:
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.status, "status") ??
      firstPropertyNameByType(schema, "status") ??
      NOTION_TASK_PROPERTY_DEFAULTS.status,
    description: propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.description, "rich_text"),
    priority: propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.priority, "select"),
    assignee:
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.assignee, "rich_text") ??
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.assignee, "select") ??
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.assignee, "people") ??
      firstPropertyNameByType(schema, "people"),
    project:
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.project, "rich_text") ??
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.project, "select"),
    missionControlId: propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.missionControlId, "rich_text"),
    hermesLaunch:
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.hermesLaunch, "select") ??
      propertyNameIfType(schema, NOTION_TASK_PROPERTY_DEFAULTS.hermesLaunch, "status"),
  };
}

function richTextPlainText(value: NotionPageProperty | undefined) {
  return (value?.rich_text ?? [])
    .map((part) => part.plain_text ?? part.text?.content ?? "")
    .join("")
    .trim();
}

function titlePlainText(value: NotionPageProperty | undefined) {
  return (value?.title ?? [])
    .map((part) => part.plain_text ?? part.text?.content ?? "")
    .join("")
    .trim();
}

function selectLikeName(value: NotionPageProperty | undefined) {
  if (value?.type === "status") {
    return value.status?.name ?? undefined;
  }

  return value?.select?.name ?? undefined;
}

function assigneePlainText(value: NotionPageProperty | undefined) {
  if (!value) {
    return undefined;
  }

  if (value.type === "people") {
    return value.people?.map((person) => person.name).filter(Boolean).join(", ");
  }

  return selectLikeName(value) ?? richTextPlainText(value);
}

function normalizePriority(value: string | undefined): MissionControlTaskPriority {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return "medium";
}

function normalizeHermesLaunchMode(value: string | undefined): HermesLaunchMode | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "auto" || normalized === "auto-run" || normalized === "auto run") {
    return "auto";
  }
  if (normalized === "confirm" || normalized === "confirm to run") {
    return "confirm";
  }
  if (normalized === "manual") {
    return "manual";
  }

  return undefined;
}

function formatHermesLaunchMode(value: HermesLaunchMode | undefined) {
  switch (value) {
    case "auto":
      return "Auto-run";
    case "manual":
      return "Manual";
    case "confirm":
    default:
      return "Confirm";
  }
}

function notionTimestampToMs(value: string | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function extractNotionTaskSnapshot(
  page: NotionPageLike,
  propertyNames: NotionTaskPropertyNames,
  bodyFallback?: string,
): NotionTaskSnapshot {
  const properties = page.properties ?? {};
  const notionBodyText = bodyFallback?.trim() || undefined;
  const rawTitle = titlePlainText(properties[propertyNames.title]);
  const title = rawTitle || "Untitled task";
  const description = propertyNames.description
    ? richTextPlainText(properties[propertyNames.description]) || undefined
    : notionBodyText;
  const rawStatus = selectLikeName(properties[propertyNames.status]) ?? DEFAULT_MISSION_CONTROL_TASK_STATUS;
  const assignee = propertyNames.assignee
    ? assigneePlainText(properties[propertyNames.assignee]) || "unassigned"
    : "unassigned";
  const projectValue = propertyNames.project
    ? (selectLikeName(properties[propertyNames.project]) ?? richTextPlainText(properties[propertyNames.project]))
    : undefined;
  const project = projectValue?.trim() || undefined;
  const missionControlTaskId = propertyNames.missionControlId
    ? richTextPlainText(properties[propertyNames.missionControlId]) || undefined
    : undefined;
  const hermesLaunchMode = propertyNames.hermesLaunch
    ? normalizeHermesLaunchMode(selectLikeName(properties[propertyNames.hermesLaunch]))
    : undefined;

  return {
    pageId: page.id,
    url: page.url,
    lastEditedAt: notionTimestampToMs(page.last_edited_time),
    title,
    hasTitle: Boolean(rawTitle),
    description,
    notionBodyText,
    status: toMissionControlTaskStatus(rawStatus),
    assignee,
    priority: normalizePriority(
      propertyNames.priority ? selectLikeName(properties[propertyNames.priority]) : undefined,
    ),
    project,
    missionControlTaskId,
    hermesLaunchMode,
  };
}

function richTextProperty(value: string) {
  return {
    rich_text: [
      {
        text: {
          content: value.slice(0, 2000),
        },
      },
    ],
  };
}

export function buildNotionTaskProperties(
  task: {
    _id?: string;
    title: string;
    description?: string;
    status: string;
    assignee: string;
    priority: MissionControlTaskPriority;
    project?: string;
    hermesLaunchMode?: HermesLaunchMode;
  },
  propertyNames: NotionTaskPropertyNames,
) {
  const properties: Record<string, unknown> = {
    [propertyNames.title]: {
      title: [
        {
          text: {
            content: task.title.trim() || "Untitled task",
          },
        },
      ],
    },
    [propertyNames.status]: {
      status: {
        name: toMissionControlTaskStatus(task.status),
      },
    },
  };

  if (propertyNames.description) {
    properties[propertyNames.description] = richTextProperty(task.description ?? "");
  }
  if (propertyNames.priority) {
    properties[propertyNames.priority] = { select: { name: task.priority } };
  }
  if (propertyNames.assignee) {
    properties[propertyNames.assignee] = richTextProperty(task.assignee);
  }
  if (propertyNames.project) {
    properties[propertyNames.project] = richTextProperty(task.project ?? "");
  }
  if (propertyNames.missionControlId && task._id) {
    properties[propertyNames.missionControlId] = richTextProperty(task._id);
  }
  if (propertyNames.hermesLaunch) {
    properties[propertyNames.hermesLaunch] = {
      select: {
        name: formatHermesLaunchMode(task.hermesLaunchMode),
      },
    };
  }

  return properties;
}

export function buildNotionTaskChildren(description: string | undefined) {
  const content = description?.trim();
  if (!content) {
    return [];
  }

  return [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: content.slice(0, 2000),
            },
          },
        ],
      },
    },
  ];
}

export function buildTaskSyncHash(task: {
  title: string;
  description?: string;
  notionBodyText?: string;
  status: string;
  assignee: string;
  priority: MissionControlTaskPriority | string;
  project?: string;
}) {
  return buildMissionControlTaskSyncFingerprint(task);
}
