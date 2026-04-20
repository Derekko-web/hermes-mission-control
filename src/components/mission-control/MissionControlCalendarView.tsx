"use client";

import { startTransition, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader, Plus } from "lucide-react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { MissionControlCalendarLayout } from "./MissionControlCalendarLayout";

type ScheduledItemDoc = Doc<"scheduledItems">;
type ScheduledItemCadence = "once" | "daily" | "weekly" | "biweekly" | "observed";
type ScheduledItemKind = "cron_job" | "scheduled_task" | "observed_automation";
type ScheduledItemOwner = "you" | "codex" | "system";
type ScheduledItemColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

type ScheduleFormState = {
  title: string;
  description: string;
  owner: ScheduledItemOwner;
  kind: ScheduledItemKind;
  cadence: ScheduledItemCadence;
  anchorInput: string;
  durationMinutes: string;
  color: ScheduledItemColor;
  project: string;
  sourcePath: string;
  command: string;
};

type CalendarOccurrence = {
  item: ScheduledItemDoc;
  at: number;
  dayIndex: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const displayTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const CADENCE_LABELS: Record<ScheduledItemCadence, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  observed: "Observed",
};

const DEFAULT_FORM: ScheduleFormState = {
  title: "",
  description: "",
  owner: "codex",
  kind: "scheduled_task",
  cadence: "weekly",
  anchorInput: "",
  durationMinutes: "45",
  color: "indigo",
  project: "Mission Control",
  sourcePath: "",
  command: "",
};

const EMPTY_SCHEDULED_ITEMS: ScheduledItemDoc[] = [];

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number) {
  const dayStart = startOfUtcDay(timestamp);
  const date = new Date(dayStart);
  return dayStart - date.getUTCDay() * DAY_MS;
}

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }
  if (Math.abs(diff) < week) {
    return relativeTimeFormat.format(Math.round(diff / day), "day");
  }
  return relativeTimeFormat.format(Math.round(diff / week), "week");
}

function formatScheduleTime(timestamp: number) {
  return displayTimeFormatter.format(timestamp);
}

function formatTimeMinutes(timeMinutes: number | undefined) {
  if (timeMinutes === undefined) {
    return null;
  }
  return formatScheduleTime(Date.UTC(2026, 0, 4, 0, timeMinutes));
}

function observedItemMeta(item: ScheduledItemDoc) {
  if (item.lastObservedAt) {
    return `Seen ${formatRelativeTime(item.lastObservedAt)}`;
  }
  return "Observed";
}

function cadenceSummary(item: ScheduledItemDoc) {
  if (item.cadence === "observed") {
    return observedItemMeta(item);
  }

  const timeLabel = formatTimeMinutes(item.timeMinutes);

  if (item.cadence === "daily") {
    return timeLabel ? `Daily • ${timeLabel}` : "Daily";
  }

  if (item.cadence === "weekly") {
    const dayLabel = item.dayOfWeek !== undefined ? weekdayFormatter.format(Date.UTC(2026, 0, 4 + item.dayOfWeek)) : "Weekly";
    return timeLabel ? `${dayLabel} • ${timeLabel}` : dayLabel;
  }

  if (item.cadence === "biweekly") {
    return timeLabel ? `Every 2 weeks • ${timeLabel}` : "Every 2 weeks";
  }

  return timeLabel ? `One-time • ${timeLabel}` : CADENCE_LABELS[item.cadence];
}

function getOccurrencesForWeek(item: ScheduledItemDoc, weekStart: number) {
  if (!item.isActive || item.cadence === "observed") {
    return [] as CalendarOccurrence[];
  }

  const occurrences: CalendarOccurrence[] = [];

  if (item.cadence === "once") {
    if (!item.anchorAt) {
      return occurrences;
    }
    const dayIndex = Math.floor((startOfUtcDay(item.anchorAt) - weekStart) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < 7) {
      occurrences.push({
        item,
        at: item.anchorAt,
        dayIndex,
      });
    }
    return occurrences;
  }

  if (item.cadence === "daily") {
    const startingDay = item.anchorAt ? Math.max(startOfUtcDay(item.anchorAt), weekStart) : weekStart;
    for (let dayStart = startingDay; dayStart < weekStart + 7 * DAY_MS; dayStart += DAY_MS) {
      const at = dayStart + (item.timeMinutes ?? 0) * MINUTE_MS;
      occurrences.push({
        item,
        at,
        dayIndex: Math.floor((dayStart - weekStart) / DAY_MS),
      });
    }
    return occurrences;
  }

  if (item.dayOfWeek === undefined) {
    return occurrences;
  }

  const occurrenceDayStart = weekStart + item.dayOfWeek * DAY_MS;
  const at = occurrenceDayStart + (item.timeMinutes ?? 0) * MINUTE_MS;

  if (item.anchorAt && at < item.anchorAt) {
    return occurrences;
  }

  if (item.cadence === "weekly") {
    occurrences.push({ item, at, dayIndex: item.dayOfWeek });
    return occurrences;
  }

  if (item.cadence === "biweekly" && item.anchorAt) {
    const anchorDay = startOfUtcDay(item.anchorAt);
    const diffDays = Math.round((occurrenceDayStart - anchorDay) / DAY_MS);
    if (diffDays >= 0 && diffDays % 14 === 0) {
      occurrences.push({ item, at, dayIndex: item.dayOfWeek });
    }
  }

  return occurrences;
}

function getNextOccurrence(item: ScheduledItemDoc, now: number) {
  if (!item.isActive || item.cadence === "observed") {
    return null;
  }

  if (item.cadence === "once") {
    return item.anchorAt && item.anchorAt >= now ? item.anchorAt : null;
  }

  if (item.cadence === "daily") {
    const dayStart = startOfUtcDay(now);
    const todayAt = dayStart + (item.timeMinutes ?? 0) * MINUTE_MS;
    if ((!item.anchorAt || todayAt >= item.anchorAt) && todayAt >= now) {
      return todayAt;
    }
    return todayAt + DAY_MS;
  }

  if (item.dayOfWeek === undefined) {
    return null;
  }

  if (item.cadence === "weekly") {
    const currentWeekStart = startOfUtcWeek(now);
    const candidate = currentWeekStart + item.dayOfWeek * DAY_MS + (item.timeMinutes ?? 0) * MINUTE_MS;
    if ((!item.anchorAt || candidate >= item.anchorAt) && candidate >= now) {
      return candidate;
    }
    return candidate + 7 * DAY_MS;
  }

  if (item.cadence === "biweekly" && item.anchorAt) {
    const anchorDayStart = startOfUtcDay(item.anchorAt);
    const anchorTimeOffset = (item.timeMinutes ?? 0) * MINUTE_MS;

    for (let dayStart = anchorDayStart; dayStart < now + 366 * DAY_MS; dayStart += 14 * DAY_MS) {
      const candidate = dayStart + anchorTimeOffset;
      if (candidate >= now) {
        return candidate;
      }
    }
  }

  return null;
}

export function MissionControlCalendarView({
  initialScheduledItems,
}: {
  initialScheduledItems: ScheduledItemDoc[];
}) {
  const scheduledItemsQuery = useQuery(api.scheduledItems.list);
  const createScheduledItem = useMutation(api.scheduledItems.create);
  const connectionState = useConvexConnectionState();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState<ScheduleFormState>(DEFAULT_FORM);

  const scheduledItems = scheduledItemsQuery ?? initialScheduledItems ?? EMPTY_SCHEDULED_ITEMS;
  const isLoading = scheduledItemsQuery === undefined && initialScheduledItems.length === 0;
  const isRealtime = connectionState.hasEverConnected && connectionState.isWebSocketConnected;

  const weekStart = useMemo(() => startOfUtcWeek(Date.now()), []);
  const todayStart = useMemo(() => startOfUtcDay(Date.now()), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => weekStart + index * DAY_MS), [weekStart]);

  const observedItems = useMemo(
    () => scheduledItems.filter((item) => item.cadence === "observed" && item.isActive),
    [scheduledItems],
  );

  const weekOccurrences = useMemo(
    () =>
      scheduledItems
        .flatMap((item) => getOccurrencesForWeek(item, weekStart))
        .sort((left, right) => left.at - right.at),
    [scheduledItems, weekStart],
  );

  const occurrencesByDay = useMemo(
    () => weekDays.map((_, dayIndex) => weekOccurrences.filter((occurrence) => occurrence.dayIndex === dayIndex)),
    [weekDays, weekOccurrences],
  );

  const upcomingItems = useMemo(() => {
    const now = Date.now();
    return scheduledItems
      .map((item) => {
        const nextOccurrence = getNextOccurrence(item, now);
        return nextOccurrence ? { item, nextOccurrence } : null;
      })
      .filter((value): value is { item: ScheduledItemDoc; nextOccurrence: number } => value !== null)
      .sort((left, right) => left.nextOccurrence - right.nextOccurrence)
      .slice(0, 5);
  }, [scheduledItems]);

  async function handleCreateScheduledItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formState.title.trim();

    if (!title) {
      return;
    }

    const anchorAt =
      formState.cadence === "observed" || !formState.anchorInput
        ? undefined
        : new Date(formState.anchorInput).getTime();

    if (formState.cadence !== "observed" && (!anchorAt || Number.isNaN(anchorAt))) {
      return;
    }

    const anchorDate = anchorAt ? new Date(anchorAt) : null;
    const timeMinutes = anchorDate ? anchorDate.getUTCHours() * 60 + anchorDate.getUTCMinutes() : undefined;
    const dayOfWeek = anchorDate ? anchorDate.getUTCDay() : undefined;
    const durationMinutes = Number.parseInt(formState.durationMinutes, 10);

    setIsCreating(true);

    try {
      await createScheduledItem({
        title,
        description: formState.description.trim() || undefined,
        kind: formState.kind,
        owner: formState.owner,
        cadence: formState.cadence,
        color: formState.color,
        project: formState.project.trim() || undefined,
        sourcePath: formState.sourcePath.trim() || undefined,
        command: formState.command.trim() || undefined,
        anchorAt,
        dayOfWeek: formState.cadence === "once" || formState.cadence === "observed" ? undefined : dayOfWeek,
        timeMinutes: formState.cadence === "observed" ? undefined : timeMinutes,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
        lastObservedAt: formState.cadence === "observed" ? Date.now() : undefined,
        isActive: true,
      });

      startTransition(() => {
        setFormState(DEFAULT_FORM);
        setIsComposerOpen(false);
      });
    } finally {
      setIsCreating(false);
    }
  }

  const composer = isComposerOpen ? (
    <form
      onSubmit={handleCreateScheduledItem}
      className="rounded-[22px] border border-[#8992ff]/18 bg-[#101117] p-4 shadow-[0_18px_60px_-38px_rgba(137,146,255,0.5)]"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Title</span>
            <input
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Schedule a new automation or reminder"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Description</span>
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              placeholder="Capture what the schedule does and why it matters"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Owner</span>
            <select
              value={formState.owner}
              onChange={(event) =>
                setFormState((current) => ({ ...current, owner: event.target.value as ScheduledItemOwner }))
              }
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="you">You</option>
              <option value="codex">Codex</option>
              <option value="system">System</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Type</span>
            <select
              value={formState.kind}
              onChange={(event) =>
                setFormState((current) => ({ ...current, kind: event.target.value as ScheduledItemKind }))
              }
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="scheduled_task">Scheduled task</option>
              <option value="cron_job">Cron job</option>
              <option value="observed_automation">Observed automation</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Cadence</span>
            <select
              value={formState.cadence}
              onChange={(event) =>
                setFormState((current) => ({ ...current, cadence: event.target.value as ScheduledItemCadence }))
              }
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="observed">Observed</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Color</span>
            <select
              value={formState.color}
              onChange={(event) =>
                setFormState((current) => ({ ...current, color: event.target.value as ScheduledItemColor }))
              }
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="indigo">Indigo</option>
              <option value="amber">Amber</option>
              <option value="emerald">Emerald</option>
              <option value="cyan">Cyan</option>
              <option value="violet">Violet</option>
              <option value="rose">Rose</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">
              Anchor run {formState.cadence === "observed" ? "(optional)" : "(required)"}
            </span>
            <input
              type="datetime-local"
              value={formState.anchorInput}
              onChange={(event) => setFormState((current) => ({ ...current, anchorInput: event.target.value }))}
              disabled={formState.cadence === "observed"}
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Duration</span>
            <input
              value={formState.durationMinutes}
              onChange={(event) => setFormState((current) => ({ ...current, durationMinutes: event.target.value }))}
              placeholder="45"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Project</span>
            <input
              value={formState.project}
              onChange={(event) => setFormState((current) => ({ ...current, project: event.target.value }))}
              placeholder="Mission Control"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Source path</span>
            <input
              value={formState.sourcePath}
              onChange={(event) => setFormState((current) => ({ ...current, sourcePath: event.target.value }))}
              placeholder="scripts/my_job/cron_sync.sh"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-zinc-500">Command</span>
            <input
              value={formState.command}
              onChange={(event) => setFormState((current) => ({ ...current, command: event.target.value }))}
              placeholder="npm run mission-control:check"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0d11] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8992ff]/40"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-zinc-500">Recurring entries derive their day and time directly from the anchor run.</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsComposerOpen(false)}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition hover:border-white/[0.12] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#09090b] transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save schedule
          </button>
        </div>
      </div>
    </form>
  ) : null;

  const utilityTone = isLoading ? "loading" : isRealtime ? "live" : "snapshot";
  const utilityLabel = isLoading ? "Syncing" : isRealtime ? "Live schedule" : "Snapshot";

  return (
    <MissionControlCalendarLayout
      isComposerOpen={isComposerOpen}
      onToggleComposer={() => setIsComposerOpen((current) => !current)}
      composer={composer}
      utilityLabel={utilityLabel}
      utilityTone={utilityTone}
      title="Scheduled Tasks"
      subtitle="Mission Control automated routines"
      runningItems={observedItems.map((item) => ({
        id: item._id,
        label: item.title.toLowerCase(),
        meta: cadenceSummary(item),
        color: item.color,
      }))}
      currentViewLabel="Week"
      secondaryViewLabel="Today"
      days={weekDays.map((dayStart, index) => ({
        id: String(dayStart),
        dayLabel: weekdayFormatter.format(dayStart),
        dateLabel: monthDayFormatter.format(dayStart),
        isCurrent: dayStart === todayStart,
        items: occurrencesByDay[index].map((occurrence) => ({
          id: `${occurrence.item._id}-${occurrence.at}`,
          title: occurrence.item.title.toLowerCase(),
          timeLabel: formatScheduleTime(occurrence.at),
          color: occurrence.item.color,
        })),
      }))}
      nextUpItems={upcomingItems.map(({ item, nextOccurrence }) => ({
        id: item._id,
        title: item.title.toLowerCase(),
        whenLabel: formatRelativeTime(nextOccurrence),
        color: item.color,
      }))}
    />
  );
}
