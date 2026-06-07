"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bot, ExternalLink, Loader, Pencil, Play, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  MISSION_CONTROL_TASK_STATUSES,
  isMissionControlTaskStatus,
  toMissionControlTaskStatus,
  type MissionControlTaskStatus,
} from "../../../shared/missionControlTasks";
import {
  compareMissionControlKanbanTasks,
  resolveMissionControlKanbanDragTargetPoints,
  resolveMissionControlKanbanOrder,
} from "../../../shared/missionControlKanban";
import { TaskColumnEmptyState } from "./TaskColumnEmptyState";

type TaskDoc = Doc<"tasks">;
type TeamMemberDoc = Doc<"teamMembers">;
type TaskStatus = MissionControlTaskStatus;
type TaskPriority = TaskDoc["priority"];
type HermesSendRouteResponse = {
  threadId: Id<"hermesThreads">;
};
type HermesCreateThreadRouteResponse = {
  threadId: Id<"hermesThreads">;
};
type TaskMutationRouteResponse = {
  task?: TaskDoc;
  deleted?: boolean;
  taskId?: Id<"tasks">;
  archivedRemote?: boolean;
  error?: string;
};
type NotionTaskSyncRouteResponse = {
  removedTaskIds?: Id<"tasks">[];
  summary?: NotionTaskSyncSummary;
  error?: string;
};
type NotionTaskSyncSummary = {
  createdInMissionControl?: number;
  createdInNotion?: number;
  deletedFromMissionControl?: number;
  pulledFromNotion?: number;
  pushedToNotion?: number;
  linked?: number;
  conflicts?: number;
  skippedMissingRemote?: number;
  bodyReadFailures?: number;
};
type TaskMutationResult =
  | {
      kind: "saved";
      task: TaskDoc;
    }
  | {
      kind: "deleted";
      taskId: Id<"tasks">;
      archivedRemote?: boolean;
    };
type DraggableTaskCardProps = {
  taskId: Id<"tasks">;
  isDragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  children: ReactNode;
};
type TaskColumnDropZoneProps = {
  status: TaskStatus;
  isActive: boolean;
  children: ReactNode;
};
type TaskCardContentProps = {
  task: TaskDoc;
  isLaunchPromptOpen: boolean;
  isLaunching: boolean;
  onEdit: () => void;
  onCreateHermesThread: () => void;
  onRunHermes: () => void;
  onDismissLaunchPrompt: () => void;
};
type TaskEditorDraft = {
  mode: "create" | "edit";
  taskId?: Id<"tasks">;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: string;
};
type TaskEditorDialogProps = {
  draft: TaskEditorDraft | null;
  isSaving: boolean;
  onChange: (draft: TaskEditorDraft) => void;
  onClose: () => void;
  onSave: () => void;
};
type DragTarget = {
  status: TaskStatus;
  beforeTaskId: Id<"tasks"> | null;
};
type KanbanDragState = {
  taskId: Id<"tasks">;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};
type TaskOperatorAgent = Pick<TeamMemberDoc, "_id" | "name" | "roleTitle" | "sortOrder">;

const STATUS_ORDER: TaskStatus[] = [...MISSION_CONTROL_TASK_STATUSES];

const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    dotClassName: string;
    emptyLabel: string;
  }
> = {
  "Not started": {
    label: "Not started",
    dotClassName: "bg-zinc-400",
    emptyLabel: "No tasks",
  },
  "In progress": {
    label: "In progress",
    dotClassName: "bg-indigo-400",
    emptyLabel: "No tasks",
  },
  "In review": {
    label: "In review",
    dotClassName: "bg-amber-300",
    emptyLabel: "No tasks",
  },
  Done: {
    label: "Done",
    dotClassName: "bg-emerald-400",
    emptyLabel: "No tasks",
  },
};

const PRIORITY_META: Record<
  TaskPriority,
  {
    label: string;
    badgeClassName: string;
    dotClassName: string;
  }
> = {
  low: {
    label: "Low",
    badgeClassName: "border-white/8 bg-white/[0.02] text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
  medium: {
    label: "Medium",
    badgeClassName: "border-amber-400/15 bg-amber-400/[0.08] text-amber-200",
    dotClassName: "bg-amber-400",
  },
  high: {
    label: "High",
    badgeClassName: "border-rose-400/15 bg-rose-400/[0.08] text-rose-200",
    dotClassName: "bg-rose-400",
  },
};

const AUTO_LINK_STORAGE_KEY = "mission-control.auto-link-hermes-on-in-progress";
const TASK_MUTATION_TIMEOUT_MS = 8000;
const HERMES_THREAD_CREATE_TIMEOUT_MS = 8000;
const NOTION_SYNC_TIMEOUT_MS = 20_000;

function matchesSearch(task: TaskDoc, deferredSearch: string) {
  if (!deferredSearch) {
    return true;
  }

  const haystack = [
    task.title,
    task.description,
    task.notionBodyText,
    task.project,
    PRIORITY_META[task.priority].label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(deferredSearch);
}

function trimOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function taskDescriptionForEditor(task: TaskDoc) {
  return task.description ?? task.notionBodyText ?? "";
}

function taskCardPreview(task: TaskDoc) {
  return task.description?.trim() || task.notionBodyText?.trim() || "";
}

function createTaskEditorDraft(status: TaskStatus = "Not started"): TaskEditorDraft {
  return {
    mode: "create",
    title: "",
    description: "",
    status,
    priority: "medium",
    project: "",
  };
}

function editTaskEditorDraft(task: TaskDoc): TaskEditorDraft {
  return {
    mode: "edit",
    taskId: task._id,
    title: task.title,
    description: taskDescriptionForEditor(task),
    status: toMissionControlTaskStatus(task.status),
    priority: task.priority,
    project: task.project ?? "",
  };
}

function taskEditorPayload(draft: TaskEditorDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description,
    status: draft.status,
    priority: draft.priority,
    project: draft.project,
  };
}

function formatNotionSyncSummary(summary: NotionTaskSyncSummary | undefined) {
  if (!summary) {
    return "Notion sync complete.";
  }

  const parts = [
    summary.createdInNotion ? `${summary.createdInNotion} created in Notion` : "",
    summary.createdInMissionControl ? `${summary.createdInMissionControl} imported` : "",
    summary.pushedToNotion ? `${summary.pushedToNotion} pushed` : "",
    summary.pulledFromNotion ? `${summary.pulledFromNotion} pulled` : "",
    summary.deletedFromMissionControl ? `${summary.deletedFromMissionControl} removed` : "",
    summary.conflicts ? `${summary.conflicts} conflicts` : "",
  ].filter(Boolean);

  return parts.length > 0 ? `Notion sync complete: ${parts.join(", ")}.` : "Notion sync complete. No changes.";
}

export function buildHermesTaskPrompt(task: TaskDoc) {
  const taskBody = task.notionBodyText?.trim() || task.description?.trim();
  const lines = [task.title];

  if (taskBody) {
    lines.push("", taskBody);
  }

  lines.push(
    "",
    "This Mission Control card is linked here for continued conversation.",
  );
  return lines.join("\n");
}

export function buildHermesTaskRunPrompt(task: TaskDoc) {
  return [
    "Start working on this Mission Control task from the linked Hermes thread.",
    "",
    buildHermesTaskPrompt(task),
    "",
    "Mission Control card rule:",
    "- Do not edit, replace, summarize, append to, or otherwise rewrite the Kanban card description or Notion page body.",
    "- Do not move the card to Done, update the Kanban column yourself, or change the Notion status directly.",
    "- When you finish, Mission Control will move this card from In progress to In review automatically.",
    "- The user will review your work and manually drag the card from In review to Done when they decide it is complete.",
    "- Keep progress notes, blocker notes, completion notes, and follow-up questions inside this Hermes thread.",
    "- Do the requested work using the available tools, then reply in this thread with the outcome for review.",
  ].join("\n");
}

export function buildHermesTaskOfficeActivity(task: Pick<TaskDoc, "title">) {
  const title = task.title.trim();
  return title ? `Working on ${title}` : "Working on a Mission Control task";
}

export function resolveHermesTaskOperatorAgent(
  task: { _id: string; operatorAgentId?: Id<"teamMembers"> | null },
  tasks: readonly { _id: string; status: string; hermesThreadId?: Id<"hermesThreads">; operatorAgentId?: Id<"teamMembers"> | null }[],
  teamMembers: readonly TaskOperatorAgent[],
  random = Math.random,
) {
  const orderedAgents = [...teamMembers].sort((left, right) => left.sortOrder - right.sortOrder);
  if (orderedAgents.length === 0) {
    return null;
  }

  const existingAgent = task.operatorAgentId
    ? orderedAgents.find((agent) => agent._id === task.operatorAgentId)
    : undefined;
  if (existingAgent) {
    return existingAgent;
  }

  const activeWorkByAgentId = new Map(orderedAgents.map((agent) => [agent._id, 0]));
  for (const candidateTask of tasks) {
    if (candidateTask._id === task._id || !candidateTask.operatorAgentId) {
      continue;
    }
    if (!activeWorkByAgentId.has(candidateTask.operatorAgentId)) {
      continue;
    }

    const status = toMissionControlTaskStatus(candidateTask.status);
    if (status !== "In progress") {
      continue;
    }

    activeWorkByAgentId.set(
      candidateTask.operatorAgentId,
      (activeWorkByAgentId.get(candidateTask.operatorAgentId) ?? 0) + 1,
    );
  }

  const leastBusyLoad = Math.min(...orderedAgents.map((agent) => activeWorkByAgentId.get(agent._id) ?? 0));
  const leastBusyAgents = orderedAgents.filter((agent) => (activeWorkByAgentId.get(agent._id) ?? 0) === leastBusyLoad);
  const randomIndex = Math.min(leastBusyAgents.length - 1, Math.floor(random() * leastBusyAgents.length));
  return leastBusyAgents[randomIndex];
}

export function mergeMissionControlTaskSnapshots<T extends { _id: string; updatedAt: number }>(
  serverTasks: readonly T[],
  optimisticTasks: readonly T[],
) {
  if (optimisticTasks.length === 0) {
    return [...serverTasks];
  }

  const optimisticTasksById = new Map(optimisticTasks.map((task) => [task._id, task]));
  return serverTasks
    .map((task) => {
      const optimisticTask = optimisticTasksById.get(task._id);
      if (!optimisticTask) {
        return task;
      }

      return optimisticTask.updatedAt > task.updatedAt ? optimisticTask : task;
    })
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

async function mutateTaskViaServer(method: "POST" | "PATCH", body: Record<string, unknown>): Promise<TaskMutationResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TASK_MUTATION_TIMEOUT_MS);

  try {
    const response = await fetch("/api/mission-control/tasks", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as TaskMutationRouteResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to save card.");
    }
    if (payload?.deleted && payload.taskId) {
      return {
        kind: "deleted",
        taskId: payload.taskId,
        archivedRemote: payload.archivedRemote,
      };
    }
    if (!payload?.task || typeof payload.task !== "object") {
      throw new Error("Unable to save card.");
    }

    return {
      kind: "saved",
      task: payload.task,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Saving timed out. Check that the local Convex service is running.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function syncNotionTasksViaServer() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), NOTION_SYNC_TIMEOUT_MS);

  try {
    const response = await fetch("/api/mission-control/notion/sync", {
      method: "POST",
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as NotionTaskSyncRouteResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to sync Notion tasks.");
    }

    return {
      removedTaskIds: Array.isArray(payload?.removedTaskIds) ? payload.removedTaskIds : [],
      summary: payload?.summary,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Notion sync timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatNotionSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return `Notion sync failed: ${message}`;
}

async function readHermesRouteError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallbackMessage;
}

async function createHermesThreadForTask(officeAgentId?: Id<"teamMembers"> | null) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HERMES_THREAD_CREATE_TIMEOUT_MS);

  try {
    const response = await fetch("/api/mission-control/hermes/thread", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        officeAgentId: officeAgentId ?? undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readHermesRouteError(response, "Unable to create Hermes thread."));
    }

    const payload = (await response.json()) as HermesCreateThreadRouteResponse;
    if (!payload.threadId) {
      throw new Error("Unable to create Hermes thread.");
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Creating the Hermes thread timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function sendHermesTaskPromptInThread({
  threadId,
  taskId,
  officeAgentId,
  content,
  officeActivity,
}: {
  threadId: Id<"hermesThreads">;
  taskId: Id<"tasks">;
  officeAgentId?: Id<"teamMembers">;
  content: string;
  officeActivity?: string;
}) {
  const response = await fetch("/api/mission-control/hermes/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      threadId,
      taskId,
      content,
      attachments: [],
      officeAgentId,
      officeActivity,
      recordUserMessage: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await readHermesRouteError(response, "Unable to start Hermes."));
  }

  return (await response.json()) as HermesSendRouteResponse;
}

function DropIndicator() {
  return (
    <div className="h-1 rounded-full bg-indigo-300 shadow-[0_0_18px_rgba(165,180,252,0.28)] transition-[opacity,transform] duration-150" />
  );
}

function TaskColumnDropZone({ status, isActive, children }: TaskColumnDropZoneProps) {
  return (
    <div
      data-task-column={status}
      className={`mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[14px] px-1 pb-1 transition-[background-color,box-shadow] duration-200 ${
        isActive ? "bg-white/[0.025] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]" : "bg-transparent"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableTaskCard({ taskId, isDragging, onPointerDown, children }: DraggableTaskCardProps) {
  return (
    <article
      data-task-card-id={taskId}
      onPointerDown={onPointerDown}
      className={`group cursor-grab rounded-[18px] border px-4 py-4 transition-[border-color,background-color,box-shadow,opacity,transform] duration-200 ease-out active:cursor-grabbing active:scale-[0.99] ${
        isDragging
          ? "pointer-events-none border-indigo-300/30 bg-[#17171c] opacity-35 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.16)]"
          : "border-white/8 bg-[#17171c] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:-translate-y-1 hover:border-white/16 hover:bg-[#1b1b21] hover:shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
      }`}
    >
      {children}
    </article>
  );
}

function TaskCardContent({
  task,
  isLaunchPromptOpen,
  isLaunching,
  onEdit,
  onCreateHermesThread,
  onRunHermes,
  onDismissLaunchPrompt,
}: TaskCardContentProps) {
  const isInProgress = toMissionControlTaskStatus(task.status) === "In progress";
  const priorityMeta = PRIORITY_META[task.priority];
  const previewText = taskCardPreview(task);
  const project = task.project?.trim();

  return (
    <>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${priorityMeta.dotClassName}`} />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            {priorityMeta.label}
          </p>
          <h4 className="text-[1rem] font-semibold leading-snug text-zinc-50">{task.title}</h4>
          {previewText ? (
            <p className="mt-2 max-h-16 overflow-hidden text-sm leading-5 text-zinc-400">{previewText}</p>
          ) : null}
        </div>
        <button
          type="button"
          data-no-card-drag
          onClick={onEdit}
          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.03] text-zinc-500 opacity-100 transition hover:border-white/14 hover:bg-white/[0.06] hover:text-zinc-100 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Edit ${task.title}`}
          title="Edit card"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.notionConflictAt ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2 py-1 text-[11px] font-medium text-amber-100">
            Needs sync review
          </span>
        </div>
      ) : null}

      {project ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex max-w-full items-center rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
            <span className="truncate">{project}</span>
          </span>
        </div>
      ) : null}

      {isInProgress || task.hermesThreadId ? (
        <div className="mt-4">
          {task.hermesThreadId ? (
            <a
              href={`/mission-control/hermes?thread=${task.hermesThreadId}`}
              className="inline-flex w-full items-center justify-between gap-3 rounded-[10px] border border-emerald-300/12 bg-emerald-300/[0.06] px-3 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/20 hover:bg-emerald-300/[0.09] hover:text-emerald-50"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Bot className="h-4 w-4 flex-none" />
                <span className="truncate">Open Hermes thread</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 flex-none" />
            </a>
          ) : isLaunchPromptOpen ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">Start this with Hermes?</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Creates a focused thread from the task brief.</p>
                </div>
                <button
                  type="button"
                  onClick={onDismissLaunchPrompt}
                  className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200 active:scale-95"
                  aria-label="Dismiss Hermes launch prompt"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCreateHermesThread}
                  disabled={isLaunching}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border border-white/80 bg-white px-3 text-sm font-semibold text-[#09090b] shadow-[0_12px_28px_rgba(0,0,0,0.24)] transition hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLaunching ? <Loader className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Create thread
                </button>
                <button
                  type="button"
                  onClick={onDismissLaunchPrompt}
                  className="h-10 rounded-[10px] border border-white/8 px-3 text-sm font-medium text-zinc-400 transition hover:border-white/12 hover:text-zinc-200 active:scale-[0.98]"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRunHermes}
              disabled={isLaunching}
              className="group relative inline-flex w-full items-center justify-between overflow-hidden rounded-[12px] border border-white/10 bg-[#18181e] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:border-white/18 hover:bg-[#202028] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cyan-300/70" />
              <span className="inline-flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.06] text-cyan-100">
                  {isLaunching ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">Run with Hermes</span>
                </span>
              </span>
              <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white text-[#09090b] transition group-hover:bg-zinc-100">
                <Play className="h-3.5 w-3.5 translate-x-px" />
              </span>
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}

function TaskEditorDialog({ draft, isSaving, onChange, onClose, onSave }: TaskEditorDialogProps) {
  if (!draft) {
    return null;
  }

  const canSave = draft.title.trim().length > 0 && !isSaving;
  const dialogTitle = draft.mode === "create" ? "New card" : "Edit card";
  const inputClassName =
    "h-11 w-full rounded-[10px] border border-white/8 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-300/40 focus:bg-white/[0.06]";
  const selectClassName = `${inputClassName} [color-scheme:dark]`;
  const optionClassName = "bg-[#15151a] text-zinc-100";
  const labelClassName = "space-y-2 text-sm font-medium text-zinc-300";

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#15151a] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) {
            onSave();
          }
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-50">{dialogTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close card editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className={labelClassName}>
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className={inputClassName}
              autoFocus
            />
          </label>

          <label className={labelClassName}>
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              rows={6}
              className="w-full resize-none rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-3 text-sm leading-5 text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-300/40 focus:bg-white/[0.06]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClassName}>
              <span>Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    status: event.target.value as TaskStatus,
                  })
                }
                className={selectClassName}
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status} className={optionClassName}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClassName}>
              <span>Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    priority: event.target.value as TaskPriority,
                  })
                }
                className={selectClassName}
              >
                {Object.entries(PRIORITY_META).map(([priority, meta]) => (
                  <option key={priority} value={priority} className={optionClassName}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="hidden sm:block" aria-hidden="true" />
          </div>

          <label className={labelClassName}>
            <span>Project</span>
            <input
              value={draft.project}
              onChange={(event) => onChange({ ...draft, project: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-[10px] border border-white/8 px-4 text-sm font-medium text-zinc-400 transition hover:border-white/12 hover:text-zinc-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/80 bg-white px-4 text-sm font-semibold text-[#09090b] transition hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export function MissionControlTasksView({ initialTasks }: { initialTasks: TaskDoc[] }) {
  const tasksQuery = useQuery(api.tasks.list);
  const teamMembersQuery = useQuery(api.teamMembers.list);
  const linkHermesThread = useMutation(api.tasks.linkHermesThread);
  const recordHermesTaskHandoff = useMutation(api.hermesThreads.recordTaskHandoff);

  const [taskMutationError, setTaskMutationError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<Id<"tasks"> | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [dragState, setDragState] = useState<KanbanDragState | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [launchPromptTaskId, setLaunchPromptTaskId] = useState<Id<"tasks"> | null>(null);
  const [launchingTaskId, setLaunchingTaskId] = useState<Id<"tasks"> | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [notionSyncError, setNotionSyncError] = useState<string | null>(null);
  const [notionSyncMessage, setNotionSyncMessage] = useState<string | null>(null);
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const [taskEditorDraft, setTaskEditorDraft] = useState<TaskEditorDraft | null>(null);
  const [isSavingTaskEditor, setIsSavingTaskEditor] = useState(false);
  const [autoLinkHermes, setAutoLinkHermes] = useState(false);
  const [removedTaskIds, setRemovedTaskIds] = useState<Id<"tasks">[]>([]);
  const dragStateRef = useRef<KanbanDragState | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const serverTasks = tasksQuery ?? initialTasks;
  const teamMembers = teamMembersQuery ?? [];
  const [optimisticTasks, setOptimisticTasks] = useState<TaskDoc[]>([]);
  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());
  const tasks = useMemo(() => {
    const removedTaskIdSet = new Set(removedTaskIds);
    return mergeMissionControlTaskSnapshots(serverTasks, optimisticTasks).filter(
      (task) => !removedTaskIdSet.has(task._id),
    );
  }, [optimisticTasks, removedTaskIds, serverTasks]);

  useEffect(() => {
    const serverTasksById = new Map(serverTasks.map((task) => [task._id, task]));
    setOptimisticTasks((current) => {
      const next = current.filter((task) => {
        const serverTask = serverTasksById.get(task._id);
        return Boolean(serverTask && task.updatedAt > serverTask.updatedAt);
      });
      return next.length === current.length ? current : next;
    });
  }, [serverTasks]);

  useEffect(() => {
    setAutoLinkHermes(window.localStorage.getItem(AUTO_LINK_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AUTO_LINK_STORAGE_KEY, String(autoLinkHermes));
  }, [autoLinkHermes]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => matchesSearch(task, deferredSearch)),
    [deferredSearch, tasks],
  );

  const columnTasks = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        tasks: visibleTasks
          .filter((task) => toMissionControlTaskStatus(task.status) === status)
          .sort(compareMissionControlKanbanTasks),
      })),
    [visibleTasks],
  );
  const activeTask = draggedTaskId ? tasks.find((task) => task._id === draggedTaskId) : undefined;

  const now = Date.now();
  const tasksThisWeek = tasks.filter((task) => now - task.createdAt < 7 * 24 * 60 * 60 * 1000).length;
  const inProgressCount = tasks.filter((task) => toMissionControlTaskStatus(task.status) === "In progress").length;
  const completedCount = tasks.filter((task) => toMissionControlTaskStatus(task.status) === "Done").length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const visibleError = taskMutationError ?? launchError ?? notionSyncError;

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  function upsertOptimisticTask(task: TaskDoc) {
    setRemovedTaskIds((current) => current.filter((taskId) => taskId !== task._id));
    setOptimisticTasks((current) => [task, ...current.filter((currentTask) => currentTask._id !== task._id)]);
  }

  function applyNotionSyncResult(syncResult: Awaited<ReturnType<typeof syncNotionTasksViaServer>>) {
    if (syncResult.removedTaskIds.length === 0) {
      return;
    }

    const removedTaskIdSet = new Set(syncResult.removedTaskIds);
    setRemovedTaskIds((current) => {
      const next = new Set(current);
      for (const taskId of syncResult.removedTaskIds) {
        next.add(taskId);
      }
      return [...next];
    });
    setOptimisticTasks((current) => current.filter((task) => !removedTaskIdSet.has(task._id)));
  }

  function openCreateTaskEditor(status: TaskStatus = "Not started") {
    setTaskMutationError(null);
    setTaskEditorDraft(createTaskEditorDraft(status));
  }

  function openEditTaskEditor(task: TaskDoc) {
    setTaskMutationError(null);
    setTaskEditorDraft(editTaskEditorDraft(task));
  }

  function closeTaskEditor() {
    if (!isSavingTaskEditor) {
      setTaskEditorDraft(null);
    }
  }

  async function saveTaskEditorDraft() {
    if (!taskEditorDraft || isSavingTaskEditor) {
      return;
    }

    const payload = taskEditorPayload(taskEditorDraft);
    if (!payload.title) {
      setTaskMutationError("Task title is required.");
      return;
    }

    const existingTask =
      taskEditorDraft.mode === "edit" && taskEditorDraft.taskId
        ? tasks.find((task) => task._id === taskEditorDraft.taskId)
        : undefined;
    setIsSavingTaskEditor(true);
    setTaskMutationError(null);

    try {
      if (taskEditorDraft.mode === "create") {
        const operatorAgent = resolveHermesTaskOperatorAgent(
          { _id: "new-task", operatorAgentId: undefined },
          tasks,
          teamMembers,
        );
        const firstTaskInStatus =
          tasks
            .filter((task) => toMissionControlTaskStatus(task.status) === payload.status)
            .sort(compareMissionControlKanbanTasks)[0]?._id ?? null;
        const mutationResult = await mutateTaskViaServer("POST", {
          ...payload,
          ...(operatorAgent ? { operatorAgentId: operatorAgent._id } : {}),
          kanbanOrder: resolveMissionControlKanbanOrder<string>(tasks, {
            taskId: "new-task",
            status: payload.status,
            beforeTaskId: firstTaskInStatus,
          }),
        });

        if (mutationResult.kind === "saved") {
          upsertOptimisticTask(mutationResult.task);
        }
        setTaskEditorDraft(null);
        return;
      }

      if (!existingTask) {
        throw new Error("Task not found.");
      }

      const statusChanged = toMissionControlTaskStatus(existingTask.status) !== payload.status;
      const kanbanOrder = statusChanged
        ? resolveMissionControlKanbanOrder(tasks, {
            taskId: existingTask._id,
            status: payload.status,
            beforeTaskId: null,
          })
        : existingTask.kanbanOrder;
      const optimisticTask: TaskDoc = {
        ...existingTask,
        title: payload.title,
        description: trimOptionalText(payload.description),
        status: payload.status,
        priority: payload.priority,
        project: trimOptionalText(payload.project),
        kanbanOrder,
        updatedAt: Date.now(),
      };
      upsertOptimisticTask(optimisticTask);

      const mutationResult = await mutateTaskViaServer("PATCH", {
        id: existingTask._id,
        ...payload,
        ...(statusChanged && kanbanOrder !== undefined ? { kanbanOrder } : {}),
      });

      if (mutationResult.kind === "saved") {
        upsertOptimisticTask(mutationResult.task);
      } else {
        setRemovedTaskIds((current) =>
          current.includes(mutationResult.taskId) ? current : [...current, mutationResult.taskId],
        );
        setOptimisticTasks((current) => current.filter((task) => task._id !== mutationResult.taskId));
      }
      setTaskEditorDraft(null);
    } catch (error) {
      if (existingTask) {
        upsertOptimisticTask(existingTask);
      }
      setTaskMutationError(error instanceof Error ? error.message : "Unable to save card.");
    } finally {
      setIsSavingTaskEditor(false);
    }
  }

  async function handleManualNotionSync() {
    if (isSyncingNotion) {
      return;
    }

    setIsSyncingNotion(true);
    setNotionSyncError(null);
    setNotionSyncMessage(null);

    try {
      const syncResult = await syncNotionTasksViaServer();
      applyNotionSyncResult(syncResult);
      setNotionSyncMessage(formatNotionSyncSummary(syncResult.summary));
    } catch (error) {
      setNotionSyncError(formatNotionSyncError(error));
    } finally {
      setIsSyncingNotion(false);
    }
  }

  async function runHermesForTask(task: TaskDoc) {
    if (launchingTaskId === task._id) {
      return;
    }

    setLaunchingTaskId(task._id);
    setLaunchError(null);

    try {
      const { threadId, officeAgentId } = await createHermesThreadHandoffForTask(task);
      setLaunchPromptTaskId(null);
      await sendHermesTaskPromptInThread({
        threadId,
        taskId: task._id,
        content: buildHermesTaskRunPrompt(task),
        officeActivity: buildHermesTaskOfficeActivity(task),
        ...(officeAgentId ? { officeAgentId } : {}),
      });
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Unable to run Hermes task.");
    } finally {
      setLaunchingTaskId(null);
    }
  }

  async function createHermesThreadForTaskHandoff(task: TaskDoc) {
    if (launchingTaskId === task._id) {
      return;
    }

    setLaunchingTaskId(task._id);
    setLaunchError(null);

    try {
      await createHermesThreadHandoffForTask(task);
      setLaunchPromptTaskId(null);
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Unable to start Hermes.");
    } finally {
      setLaunchingTaskId(null);
    }
  }

  async function createHermesThreadHandoffForTask(task: TaskDoc) {
    if (task.hermesThreadId) {
      return {
        threadId: task.hermesThreadId,
        officeAgentId: task.operatorAgentId,
      };
    }

    const operatorAgent = resolveHermesTaskOperatorAgent(task, tasks, teamMembers);
    const payload = await createHermesThreadForTask(operatorAgent?._id);
    const operatorAgentId = operatorAgent?._id;
    const now = Date.now();
    const optimisticLinkedTask = {
      ...task,
      hermesThreadId: payload.threadId,
      hermesStartedAt: now,
      ...(operatorAgent
        ? {
            operatorAgentId: operatorAgent._id,
            operatorAgentName: operatorAgent.name,
            operatorAgentRoleTitle: operatorAgent.roleTitle,
          }
        : {}),
      updatedAt: now,
    } as TaskDoc;
    setOptimisticTasks((current) => [
      optimisticLinkedTask,
      ...current.filter((currentTask) => currentTask._id !== task._id),
    ]);

    const linkedTask = await linkHermesThread({
      id: task._id,
      hermesThreadId: payload.threadId,
      ...(operatorAgentId ? { operatorAgentId } : {}),
    });
    if (linkedTask) {
      setOptimisticTasks((current) => [
        linkedTask,
        ...current.filter((currentTask) => currentTask._id !== linkedTask._id),
      ]);
    }
    await recordHermesTaskHandoff({
      threadId: payload.threadId,
      content: buildHermesTaskPrompt(task),
      officeActivity: buildHermesTaskOfficeActivity(task),
      ...(operatorAgentId ? { officeAgentId: operatorAgentId } : {}),
    });

    return {
      threadId: payload.threadId,
      officeAgentId: operatorAgentId,
    };
  }

  function clearDragState() {
    dragStateRef.current = null;
    dragTargetRef.current = null;
    setDragState(null);
    setDragTarget(null);
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }

  function setCurrentDragState(nextDragState: KanbanDragState | null) {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function setCurrentDragTarget(nextDragTarget: DragTarget | null) {
    dragTargetRef.current = nextDragTarget;
    setDragTarget(nextDragTarget);
    setDragOverStatus(nextDragTarget?.status ?? null);
  }

  function getDragTargetFromPoint(clientX: number, clientY: number, activeTaskId: Id<"tasks">): DragTarget | null {
    const columnFromHitTest = document
      .elementsFromPoint(clientX, clientY)
      .map((element) =>
        element instanceof HTMLElement ? element.closest<HTMLElement>("[data-task-column]") : null,
      )
      .find((element): element is HTMLElement => Boolean(element));
    const column =
      columnFromHitTest ??
      Array.from(document.querySelectorAll<HTMLElement>("[data-task-column]")).find((element) => {
        const rect = element.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      });
    const status = column?.dataset.taskColumn;

    if (!status || !isMissionControlTaskStatus(status)) {
      return null;
    }

    const cards = Array.from(column.querySelectorAll<HTMLElement>("[data-task-card-id]")).filter(
      (card) => card.dataset.taskCardId !== activeTaskId,
    );
    const beforeCard = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });

    return {
      status,
      beforeTaskId: (beforeCard?.dataset.taskCardId as Id<"tasks"> | undefined) ?? null,
    };
  }

  function getDragTargetFromState(currentDragState: KanbanDragState): DragTarget | null {
    for (const point of resolveMissionControlKanbanDragTargetPoints(currentDragState)) {
      const target = getDragTargetFromPoint(point.x, point.y, currentDragState.taskId);
      if (target) {
        return target;
      }
    }

    return null;
  }

  function computeKanbanOrder(taskId: Id<"tasks">, target: DragTarget) {
    return resolveMissionControlKanbanOrder(visibleTasks, {
      taskId,
      status: target.status,
      beforeTaskId: target.beforeTaskId,
    });
  }

  function moveTaskToTarget(taskId: Id<"tasks">, target: DragTarget) {
    const draggedTask = tasks.find((task) => task._id === taskId);

    if (!draggedTask) {
      clearDragState();
      return;
    }

    const previousStatus = toMissionControlTaskStatus(draggedTask.status);
    const kanbanOrder = computeKanbanOrder(taskId, target);
    const optimisticTask: TaskDoc = {
      ...draggedTask,
      status: target.status,
      kanbanOrder,
      updatedAt: Date.now(),
    };
    setTaskMutationError(null);
    setOptimisticTasks((current) => [optimisticTask, ...current.filter((task) => task._id !== optimisticTask._id)]);
    clearDragState();

    void (async () => {
      try {
        const mutationResult = await mutateTaskViaServer("PATCH", {
          id: draggedTask._id,
          status: target.status,
          kanbanOrder,
        });
        if (mutationResult.kind === "deleted") {
          setRemovedTaskIds((current) =>
            current.includes(mutationResult.taskId) ? current : [...current, mutationResult.taskId],
          );
          setOptimisticTasks((current) => current.filter((task) => task._id !== mutationResult.taskId));
          return;
        }

        const savedTask = mutationResult.task;
        setRemovedTaskIds((current) => current.filter((taskId) => taskId !== savedTask._id));
        setOptimisticTasks((current) => [savedTask, ...current.filter((task) => task._id !== savedTask._id)]);

        if (target.status !== "In progress" || previousStatus === target.status) {
          return;
        }

        if (autoLinkHermes || draggedTask.hermesLaunchMode === "auto") {
          await createHermesThreadForTaskHandoff(savedTask);
          return;
        }

        setLaunchPromptTaskId(draggedTask._id);
      } catch (error) {
        setOptimisticTasks((current) => [draggedTask, ...current.filter((task) => task._id !== draggedTask._id)]);
        setTaskMutationError(error instanceof Error ? error.message : "Unable to save card.");
      }
    })();
  }

  function handleCardPointerDown(event: ReactPointerEvent<HTMLElement>, task: TaskDoc) {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button,a,input,textarea,select,[role='button'],[data-no-card-drag]")
    ) {
      return;
    }

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const initialDragState: KanbanDragState = {
      taskId: task._id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    const initialPointerX = event.clientX;
    const initialPointerY = event.clientY;
    let didMove = false;
    let disposed = false;

    setDraggedTaskId(task._id);
    setCurrentDragState(initialDragState);
    setCurrentDragTarget(getDragTargetFromState(initialDragState));

    const previousBodyUserSelect = document.body.style.userSelect;
    const previousBodyCursor = document.body.style.cursor;
    /* eslint-disable react-hooks/immutability -- Direct DOM style changes are scoped to this pointer drag gesture. */
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const cleanup = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      document.body.style.userSelect = previousBodyUserSelect;
      document.body.style.cursor = previousBodyCursor;
      /* eslint-enable react-hooks/immutability */
      dragCleanupRef.current = null;
    };

    const finish = (shouldDrop: boolean) => {
      const finalDragState = dragStateRef.current;
      const finalDragTarget = dragTargetRef.current;
      cleanup();

      if (shouldDrop && didMove && finalDragState && finalDragTarget) {
        moveTaskToTarget(finalDragState.taskId, finalDragTarget);
        return;
      }

      if (shouldDrop && !didMove) {
        clearDragState();
        openEditTaskEditor(task);
        return;
      }

      clearDragState();
    };

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      moveEvent.preventDefault();
      const currentDragState = dragStateRef.current;
      if (!currentDragState) {
        return;
      }

      didMove =
        didMove ||
        Math.hypot(moveEvent.clientX - initialPointerX, moveEvent.clientY - initialPointerY) >= 5;
      const nextDragState = {
        ...currentDragState,
        pointerX: moveEvent.clientX,
        pointerY: moveEvent.clientY,
      };
      setCurrentDragState(nextDragState);
      setCurrentDragTarget(getDragTargetFromState(nextDragState));
    }

    function handlePointerUp(upEvent: globalThis.PointerEvent) {
      upEvent.preventDefault();
      const currentDragState = dragStateRef.current;
      if (currentDragState) {
        const nextDragState = {
          ...currentDragState,
          pointerX: upEvent.clientX,
          pointerY: upEvent.clientY,
        };
        setCurrentDragState(nextDragState);
        setCurrentDragTarget(getDragTargetFromState(nextDragState));
      }
      finish(true);
    }

    function handlePointerCancel(cancelEvent: globalThis.PointerEvent) {
      cancelEvent.preventDefault();
      finish(false);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    dragCleanupRef.current = () => finish(false);
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col gap-4 lg:h-[calc(100dvh-3.25rem)] lg:min-h-0">
      <header className="shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-8 sm:gap-y-3">
          {[
            { label: "This week", value: tasksThisWeek, tone: "text-emerald-300" },
            { label: "In progress", value: inProgressCount, tone: "text-indigo-300" },
            { label: "Total", value: tasks.length, tone: "text-white" },
            { label: "Completion", value: `${completionRate}%`, tone: "text-violet-300" },
          ].map((stat) => (
            <div key={stat.label} className="flex min-w-0 items-baseline gap-3">
              <span className={`text-3xl font-semibold sm:text-4xl ${stat.tone}`}>{stat.value}</span>
              <span className="min-w-0 text-sm text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative flex h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 text-sm text-zinc-400 lg:max-w-[560px] lg:flex-1">
            <Search className="h-4 w-4 flex-none text-zinc-500" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search tasks"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
            />
          </label>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            <button
              type="button"
              onClick={() => {
                void handleManualNotionSync();
              }}
              disabled={isSyncingNotion}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-300/[0.08] px-3 text-sm font-semibold text-indigo-100 transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.12] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-4"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingNotion ? "animate-spin" : ""}`} />
              Sync Notion
            </button>
            <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-white/8 bg-white/[0.025] px-2.5 pr-3 text-sm font-medium text-zinc-400 transition hover:border-white/12 hover:bg-white/[0.04] hover:text-zinc-200 sm:w-fit">
              <input
                type="checkbox"
                checked={autoLinkHermes}
                onChange={(event) => setAutoLinkHermes(event.target.checked)}
                className="sr-only"
              />
              <span
                className={`relative h-5 w-9 flex-none rounded-full border transition ${
                  autoLinkHermes
                    ? "border-emerald-300/40 bg-emerald-400/70"
                    : "border-white/8 bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.28)] transition ${
                    autoLinkHermes ? "left-4" : "left-0.5"
                  }`}
                />
              </span>
              <span className="whitespace-nowrap">Auto-link Hermes</span>
            </label>
          </div>
        </div>

        {visibleError ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              "border-rose-400/20 bg-rose-400/[0.07] text-rose-100"
            }`}
          >
            {visibleError}
          </div>
        ) : null}
        {notionSyncMessage && !visibleError ? (
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] px-4 py-3 text-sm text-emerald-100">
            {notionSyncMessage}
          </div>
        ) : null}
      </header>

      <section
        data-slot="mission-control-task-board"
        className="flex min-h-[540px] flex-1 flex-col overflow-hidden lg:min-h-0"
      >
        <div className="grid min-h-0 flex-1 grid-flow-col auto-cols-[minmax(260px,78vw)] gap-4 overflow-x-auto pb-2 sm:auto-cols-[minmax(300px,360px)] lg:grid-flow-row lg:grid-cols-4 lg:auto-cols-fr">
          {columnTasks.map(({ status, tasks: tasksForStatus }, index) => {
            const showEndDropLine = dragTarget?.status === status && dragTarget.beforeTaskId === null;

            return (
              <section
                key={status}
                data-task-column={status}
                className="mission-control-column flex min-h-0 min-w-0 flex-col rounded-[18px] border border-white/[0.07] bg-[#101117] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <header className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].dotClassName}`} />
                    <h3 className="text-[0.98rem] font-medium text-zinc-100">{STATUS_META[status].label}</h3>
                    <span className="text-sm text-zinc-500">{tasksForStatus.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateTaskEditor(status)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.03] text-zinc-500 transition hover:border-white/14 hover:bg-white/[0.06] hover:text-zinc-100 active:scale-95"
                    aria-label={`Add ${STATUS_META[status].label} card`}
                    title="Add card"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </header>

                <TaskColumnDropZone status={status} isActive={dragOverStatus === status}>
                  {tasksForStatus.length === 0 ? (
                    <>
                      {showEndDropLine ? <DropIndicator /> : null}
                      <TaskColumnEmptyState label={STATUS_META[status].emptyLabel} />
                    </>
                  ) : null}

                  {tasksForStatus.map((task) => {
                    const isLaunchPromptOpen = launchPromptTaskId === task._id;
                    const isLaunching = launchingTaskId === task._id;

                    return (
                      <div key={task._id} className="contents">
                        {dragTarget?.status === status && dragTarget.beforeTaskId === task._id ? <DropIndicator /> : null}
                        <DraggableTaskCard
                          taskId={task._id}
                          isDragging={draggedTaskId === task._id}
                          onPointerDown={(pointerEvent) => handleCardPointerDown(pointerEvent, task)}
                        >
                          <TaskCardContent
                            task={task}
                            isLaunchPromptOpen={isLaunchPromptOpen}
                            isLaunching={isLaunching}
                            onEdit={() => openEditTaskEditor(task)}
                            onCreateHermesThread={() => {
                              void createHermesThreadForTaskHandoff(task);
                            }}
                            onRunHermes={() => {
                              void runHermesForTask(task);
                            }}
                            onDismissLaunchPrompt={() => setLaunchPromptTaskId(null)}
                          />
                        </DraggableTaskCard>
                      </div>
                    );
                  })}

                  {tasksForStatus.length > 0 && showEndDropLine ? <DropIndicator /> : null}
                </TaskColumnDropZone>
              </section>
            );
          })}
        </div>

        {activeTask && dragState
          ? createPortal(
              <div
                className="pointer-events-none fixed z-[80] rotate-[1deg]"
                style={{
                  height: dragState.height,
                  left: dragState.pointerX - dragState.offsetX,
                  top: dragState.pointerY - dragState.offsetY,
                  width: dragState.width,
                }}
              >
                <article className="rounded-[18px] border border-indigo-300/30 bg-[#1f2029] px-4 py-4 shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
                  <TaskCardContent
                    task={activeTask}
                    isLaunchPromptOpen={false}
                    isLaunching={launchingTaskId === activeTask._id}
                    onEdit={() => undefined}
                    onCreateHermesThread={() => undefined}
                    onRunHermes={() => undefined}
                    onDismissLaunchPrompt={() => undefined}
                  />
                </article>
              </div>,
              document.body,
            )
          : null}
      </section>

      <footer className="flex flex-col gap-2 text-sm text-zinc-500 lg:flex-row lg:items-center lg:justify-between">
        <p>
          {visibleTasks.length === tasks.length
            ? `${tasks.length} tasks in view`
            : `Showing ${visibleTasks.length} of ${tasks.length} tasks`}
        </p>
        <p>Drag cards into In progress to prepare a Hermes handoff. Sync Notion when changes are ready.</p>
      </footer>

      <TaskEditorDialog
        draft={taskEditorDraft}
        isSaving={isSavingTaskEditor}
        onChange={setTaskEditorDraft}
        onClose={closeTaskEditor}
        onSave={() => {
          void saveTaskEditorDraft();
        }}
      />
    </div>
  );
}
