import type { ReactNode } from "react";
import { Plus } from "lucide-react";

export type CalendarLayoutColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

export type CalendarRunningItem = {
  id: string;
  label: string;
  meta: string;
  color: CalendarLayoutColor;
};

export type CalendarDayItem = {
  id: string;
  title: string;
  timeLabel: string;
  color: CalendarLayoutColor;
};

export type CalendarDay = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  isCurrent: boolean;
  items: CalendarDayItem[];
};

export type CalendarNextUpItem = {
  id: string;
  title: string;
  whenLabel: string;
  color: CalendarLayoutColor;
};

const COLOR_META: Record<
  CalendarLayoutColor,
  {
    eventClassName: string;
    titleClassName: string;
    metaClassName: string;
    pillClassName: string;
    listTextClassName: string;
  }
> = {
  indigo: {
    eventClassName: "border-indigo-300/12 bg-indigo-300/[0.14]",
    titleClassName: "text-indigo-100",
    metaClassName: "text-indigo-200/72",
    pillClassName: "border-indigo-300/15 bg-indigo-300/[0.13] text-indigo-100",
    listTextClassName: "text-indigo-200",
  },
  amber: {
    eventClassName: "border-amber-300/12 bg-amber-300/[0.14]",
    titleClassName: "text-amber-100",
    metaClassName: "text-amber-200/72",
    pillClassName: "border-amber-300/15 bg-amber-300/[0.13] text-amber-100",
    listTextClassName: "text-amber-200",
  },
  emerald: {
    eventClassName: "border-emerald-300/12 bg-emerald-300/[0.14]",
    titleClassName: "text-emerald-100",
    metaClassName: "text-emerald-200/72",
    pillClassName: "border-emerald-300/15 bg-emerald-300/[0.13] text-emerald-100",
    listTextClassName: "text-emerald-200",
  },
  rose: {
    eventClassName: "border-rose-300/12 bg-rose-300/[0.14]",
    titleClassName: "text-rose-100",
    metaClassName: "text-rose-200/72",
    pillClassName: "border-rose-300/15 bg-rose-300/[0.13] text-rose-100",
    listTextClassName: "text-rose-200",
  },
  cyan: {
    eventClassName: "border-cyan-300/12 bg-cyan-300/[0.14]",
    titleClassName: "text-cyan-100",
    metaClassName: "text-cyan-200/72",
    pillClassName: "border-cyan-300/15 bg-cyan-300/[0.13] text-cyan-100",
    listTextClassName: "text-cyan-200",
  },
  violet: {
    eventClassName: "border-violet-300/12 bg-violet-300/[0.14]",
    titleClassName: "text-violet-100",
    metaClassName: "text-violet-200/72",
    pillClassName: "border-violet-300/15 bg-violet-300/[0.13] text-violet-100",
    listTextClassName: "text-violet-200",
  },
};

type MissionControlCalendarLayoutProps = {
  isComposerOpen: boolean;
  onToggleComposer: () => void;
  composer: ReactNode;
  title: string;
  subtitle: string;
  runningItems: CalendarRunningItem[];
  currentViewLabel: string;
  secondaryViewLabel: string;
  days: CalendarDay[];
  nextUpItems: CalendarNextUpItem[];
};

export function MissionControlCalendarLayout({
  isComposerOpen,
  onToggleComposer,
  composer,
  title,
  subtitle,
  runningItems,
  currentViewLabel,
  secondaryViewLabel,
  days,
  nextUpItems,
}: MissionControlCalendarLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.2rem]">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto">
          <span className="inline-flex h-8 items-center rounded-full border border-[#8992ff]/28 bg-[#8992ff]/12 px-3 text-[11px] font-medium text-[#d9ddff]">
            {currentViewLabel}
          </span>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3 text-[11px] font-medium text-zinc-400 transition hover:border-white/[0.12] hover:text-zinc-200"
          >
            {secondaryViewLabel}
          </button>
          <button
            type="button"
            onClick={onToggleComposer}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-zinc-300 transition hover:text-white ${
              isComposerOpen
                ? "border-[#8992ff]/35 bg-[#8992ff]/12"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]"
            }`}
            aria-label={isComposerOpen ? "Close schedule composer" : "Open schedule composer"}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {composer}

      <section
        data-slot="calendar-always-running"
        className="rounded-[22px] border border-white/[0.08] bg-[#101117] px-4 py-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Always Running</p>
            <p className="mt-1 text-xs text-zinc-500">Observed automations and background routines that stay hot outside the weekly grid.</p>
          </div>
          <div className="inline-flex h-7 items-center rounded-full border border-white/[0.08] bg-[#0d0f13] px-3 text-[11px] font-medium text-zinc-500">
            Scheduled heartbeat
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {runningItems.length > 0 ? (
            runningItems.map((item) => (
              <div
                key={item.id}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium ${COLOR_META[item.color].pillClassName}`}
              >
                {item.label} • {item.meta}
              </div>
            ))
          ) : (
            <p className="text-[11px] text-zinc-600">No always-on routines yet.</p>
          )}
        </div>
      </section>

      <section data-slot="calendar-week-grid" className="grid gap-2.5 xl:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.id}
            data-slot="calendar-day-card"
            data-current-day={day.isCurrent ? "true" : "false"}
            className={`min-h-[210px] rounded-[22px] border bg-[#101117] p-3 ${
              day.isCurrent
                ? "border-[#8992ff]/40 ring-1 ring-[#8992ff]/30"
                : "border-white/[0.08]"
            }`}
          >
            <header className="flex items-center justify-between gap-3">
              <p className={`text-[0.78rem] font-medium ${day.isCurrent ? "text-[#dce0ff]" : "text-zinc-400"}`}>{day.dayLabel}</p>
              <span className="text-[0.68rem] text-zinc-600">{day.dateLabel}</span>
            </header>

            <div className="mt-3 space-y-1.5">
              {day.items.length > 0 ? (
                day.items.map((item) => (
                  <article
                    key={item.id}
                    data-slot="calendar-event"
                    className={`rounded-[10px] border px-2.5 py-2 ${COLOR_META[item.color].eventClassName}`}
                  >
                    <p className={`text-[11px] font-medium leading-4 ${COLOR_META[item.color].titleClassName}`}>{item.title}</p>
                    <p className={`mt-0.5 text-[10px] leading-4 ${COLOR_META[item.color].metaClassName}`}>{item.timeLabel}</p>
                  </article>
                ))
              ) : (
                <p className="px-1 pt-1 text-[11px] text-zinc-600">No scheduled runs</p>
              )}
            </div>
          </section>
        ))}
      </section>

      <section data-slot="calendar-next-up" className="rounded-[22px] border border-white/[0.08] bg-[#101117]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-medium text-white">Next Up</p>
        </div>

        <div>
          {nextUpItems.length > 0 ? (
            nextUpItems.map((item, index) => (
              <div
                key={item.id}
                data-slot="calendar-next-row"
                className={`flex items-center justify-between gap-4 px-4 py-3 ${index > 0 ? "border-t border-white/[0.06]" : ""}`}
              >
                <p className={`text-[13px] font-medium ${COLOR_META[item.color].listTextClassName}`}>{item.title}</p>
                <p className="whitespace-nowrap text-[11px] text-zinc-500">{item.whenLabel}</p>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-[11px] text-zinc-600">No upcoming scheduled runs.</div>
          )}
        </div>
      </section>
    </div>
  );
}
