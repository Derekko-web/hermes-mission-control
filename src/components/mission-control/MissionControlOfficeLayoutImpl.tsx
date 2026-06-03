import { Activity } from "lucide-react";

import { PixelAgentsOffice } from "./PixelAgentsOffice";
import type { OfficeActivityItem, PixelOfficeAgent } from "./mission-control-office-types";

type MissionControlOfficeLayoutProps = {
  title: string;
  subtitle: string;
  agents: PixelOfficeAgent[];
  activityTitle: string;
  activityItems: OfficeActivityItem[];
};

const TONE_CLASS_NAMES: Record<OfficeActivityItem["tone"], string> = {
  amber: "bg-amber-300",
  emerald: "bg-emerald-300",
  cyan: "bg-cyan-300",
  violet: "bg-violet-300",
  rose: "bg-rose-300",
  indigo: "bg-indigo-300",
  zinc: "bg-zinc-500",
};

export type { OfficeActivityItem, PixelOfficeAgent };

export function MissionControlOfficeLayout({
  title,
  subtitle,
  agents,
  activityTitle,
  activityItems,
}: MissionControlOfficeLayoutProps) {
  const activeCount = agents.filter((agent) => agent.isActive).length;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-[#11111e] text-white">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.08] px-5">
        <div className="min-w-0">
          <h1 className="truncate text-[23px] font-semibold tracking-[-0.03em] text-white">{title}</h1>
          <p className="mt-1 truncate text-[12px] text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-[8px] border border-white/[0.08] bg-black/25 px-3 py-2 text-[12px] text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-[#3794ff]" aria-hidden="true" />
          <span>{activeCount} active</span>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_284px] max-xl:grid-cols-1">
        <section data-slot="office-scene-panel" className="min-h-0 overflow-hidden">
          <PixelAgentsOffice agents={agents} />
        </section>

        <aside
          data-slot="office-activity-panel"
          className="grid min-h-0 grid-rows-[52px_minmax(0,1fr)] border-l border-white/[0.08] bg-[#0d0d18] max-xl:hidden"
        >
          <header className="flex items-center justify-between border-b border-white/[0.08] px-4">
            <p className="text-[13px] font-medium text-white">{activityTitle}</p>
            <Activity className="h-4 w-4 text-zinc-500" />
          </header>

          {activityItems.length > 0 ? (
            <div className="min-h-0 overflow-y-auto p-3">
              <div className="space-y-2.5">
                {activityItems.map((item) => (
                  <article
                    key={item.id}
                    data-slot="office-activity-row"
                    className="border border-white/[0.07] bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 ${TONE_CLASS_NAMES[item.tone]}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white">{item.memberName}</p>
                        <p className="mt-1 text-[12px] leading-5 text-zinc-300">{item.detail}</p>
                        <p className="mt-2 text-[11px] leading-4 text-zinc-500">{item.meta}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center border border-white/8 bg-white/[0.03] text-zinc-500">
                  <Activity className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-medium text-white">No live activity right now</p>
                <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                  Live updates will appear here when someone starts working from the floor.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
