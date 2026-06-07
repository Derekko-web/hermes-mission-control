export type MissionControlNotionLinkedTaskLike = {
  _id: string;
  notionPageId?: string | null;
};

export function isVisibleNotionPageRecord(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }

  const page = result as {
    object?: unknown;
    archived?: unknown;
    in_trash?: unknown;
  };

  return page.object === "page" && page.archived !== true && page.in_trash !== true;
}

export function shouldDeleteMissionControlTaskMissingFromNotion(
  task: MissionControlNotionLinkedTaskLike,
  seenTaskIds: ReadonlySet<string>,
) {
  return Boolean(task.notionPageId && !seenTaskIds.has(task._id));
}

export function shouldCreateNotionTaskForLocalOnlyTask(task: MissionControlNotionLinkedTaskLike) {
  return !task.notionPageId;
}

export function isArchivedOrTrashedNotionMutationError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /(?:archived|trash|trashed)/i.test(message);
}
