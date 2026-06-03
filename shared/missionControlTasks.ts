export const MISSION_CONTROL_TASK_STATUSES = ["Not started", "In progress", "Done"] as const;

export type MissionControlTaskStatus = (typeof MISSION_CONTROL_TASK_STATUSES)[number];

export const DEFAULT_MISSION_CONTROL_TASK_STATUS: MissionControlTaskStatus = "Not started";

const LEGACY_TASK_STATUS_TO_NOTION_DEFAULT = {
  recurring: "Not started",
  backlog: "Not started",
  in_progress: "In progress",
  review: "In progress",
  done: "Done",
} as const satisfies Record<string, MissionControlTaskStatus>;

export type MissionControlTaskPriority = "low" | "medium" | "high";

export type MissionControlTaskSyncSnapshot = {
  title: string;
  description?: string;
  notionBodyText?: string;
  status: string;
  assignee: string;
  priority: MissionControlTaskPriority | string;
  project?: string;
};

export function isMissionControlTaskStatus(status: string): status is MissionControlTaskStatus {
  return MISSION_CONTROL_TASK_STATUSES.includes(status as MissionControlTaskStatus);
}

export function toMissionControlTaskStatus(status: string): MissionControlTaskStatus {
  if (isMissionControlTaskStatus(status)) {
    return status;
  }

  if (Object.prototype.hasOwnProperty.call(LEGACY_TASK_STATUS_TO_NOTION_DEFAULT, status)) {
    return LEGACY_TASK_STATUS_TO_NOTION_DEFAULT[
      status as keyof typeof LEGACY_TASK_STATUS_TO_NOTION_DEFAULT
    ];
  }

  return DEFAULT_MISSION_CONTROL_TASK_STATUS;
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildMissionControlTaskSyncFingerprint(task: MissionControlTaskSyncSnapshot) {
  return JSON.stringify({
    title: task.title.trim(),
    description: normalizeOptionalText(task.description),
    notionBodyText: normalizeOptionalText(task.notionBodyText),
    status: toMissionControlTaskStatus(task.status),
    assignee: task.assignee.trim(),
    priority: task.priority,
    project: normalizeOptionalText(task.project),
  });
}
