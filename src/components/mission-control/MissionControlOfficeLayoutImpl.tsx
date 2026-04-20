import { Activity } from "lucide-react";

export type OfficeSceneArea =
  | "north_station"
  | "west_station"
  | "south_station"
  | "east_station"
  | "northeast_station"
  | "lounge";

export type OfficeTone = "amber" | "emerald" | "cyan" | "violet" | "rose" | "indigo" | "zinc";
export type OfficeAccent = Exclude<OfficeTone, "zinc">;
export type OfficeScenePresenceMode = "desk" | "idle";

export type OfficeSceneMember = {
  id: string;
  name: string;
  roleTitle: string;
  area: OfficeSceneArea;
  statusLabel: string;
  currentTask: string;
  activeTool: string;
  accent: OfficeAccent;
  avatarLabel: string;
  presenceMode: OfficeScenePresenceMode;
  showBubble: boolean;
};

export type OfficeActivityItem = {
  id: string;
  memberName: string;
  detail: string;
  meta: string;
  tone: OfficeTone;
};

type MissionControlOfficeLayoutProps = {
  title: string;
  subtitle: string;
  sceneMembers: OfficeSceneMember[];
  activityTitle: string;
  activityItems: OfficeActivityItem[];
};

const TONE_META: Record<
  OfficeTone,
  { dotClassName: string; nameClassName: string; avatarBodyClassName: string; glowClassName: string }
> = {
  amber: {
    dotClassName: "bg-amber-300",
    nameClassName: "text-amber-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#f59e0b,#b45309)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(251,191,36,0.08)]",
  },
  emerald: {
    dotClassName: "bg-emerald-300",
    nameClassName: "text-emerald-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#34d399,#047857)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(52,211,153,0.08)]",
  },
  cyan: {
    dotClassName: "bg-cyan-300",
    nameClassName: "text-cyan-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#22d3ee,#0e7490)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(103,232,249,0.08)]",
  },
  violet: {
    dotClassName: "bg-violet-300",
    nameClassName: "text-violet-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#a78bfa,#6d28d9)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(196,181,253,0.08)]",
  },
  rose: {
    dotClassName: "bg-rose-300",
    nameClassName: "text-rose-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#fb7185,#be123c)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(253,164,175,0.08)]",
  },
  indigo: {
    dotClassName: "bg-indigo-300",
    nameClassName: "text-indigo-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#818cf8,#4338ca)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(165,180,252,0.08)]",
  },
  zinc: {
    dotClassName: "bg-zinc-500",
    nameClassName: "text-zinc-200",
    avatarBodyClassName: "bg-[linear-gradient(180deg,#71717a,#3f3f46)]",
    glowClassName: "shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
  },
};

const SCENE_LAYOUT: Record<
  OfficeSceneArea,
  { avatarClassName: string; labelClassName: string; bubbleClassName: string }
> = {
  north_station: {
    avatarClassName: "left-[48%] top-[24%] -translate-x-1/2",
    labelClassName: "left-[48%] top-[29%] -translate-x-1/2",
    bubbleClassName: "left-[48%] top-[12%] -translate-x-1/2",
  },
  northeast_station: {
    avatarClassName: "left-[77%] top-[29%] -translate-x-1/2",
    labelClassName: "left-[77%] top-[34%] -translate-x-1/2",
    bubbleClassName: "left-[77%] top-[15%] -translate-x-1/2",
  },
  west_station: {
    avatarClassName: "left-[18%] top-[47%] -translate-x-1/2",
    labelClassName: "left-[18%] top-[52%] -translate-x-1/2",
    bubbleClassName: "left-[18%] top-[32%] -translate-x-1/2",
  },
  east_station: {
    avatarClassName: "left-[80%] top-[57%] -translate-x-1/2",
    labelClassName: "left-[80%] top-[62%] -translate-x-1/2",
    bubbleClassName: "left-[80%] top-[43%] -translate-x-1/2",
  },
  south_station: {
    avatarClassName: "left-[57%] top-[79%] -translate-x-1/2",
    labelClassName: "left-[57%] top-[84%] -translate-x-1/2",
    bubbleClassName: "left-[57%] top-[64%] -translate-x-1/2",
  },
  lounge: {
    avatarClassName: "left-[31%] top-[76%] -translate-x-1/2",
    labelClassName: "left-[31%] top-[81%] -translate-x-1/2",
    bubbleClassName: "left-[31%] top-[60%] -translate-x-1/2",
  },
};

const DESK_AREAS: OfficeSceneArea[] = [
  "north_station",
  "northeast_station",
  "west_station",
  "east_station",
  "south_station",
];

const DESK_LAYOUT: Record<OfficeSceneArea, string> = {
  north_station: "left-[48%] top-[18%] -translate-x-1/2",
  northeast_station: "left-[77%] top-[23%] -translate-x-1/2",
  west_station: "left-[18%] top-[41%] -translate-x-1/2",
  east_station: "left-[80%] top-[51%] -translate-x-1/2",
  south_station: "left-[57%] top-[73%] -translate-x-1/2",
  lounge: "left-[31%] top-[70%] -translate-x-1/2",
};

const IDLE_LINE_LAYOUT: Record<
  OfficeSceneArea,
  { avatarClassName: string; labelClassName: string; bubbleClassName: string }
> = {
  north_station: {
    avatarClassName: "left-[27%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[27%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[27%] top-[62%] -translate-x-1/2",
  },
  west_station: {
    avatarClassName: "left-[37%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[37%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[37%] top-[62%] -translate-x-1/2",
  },
  south_station: {
    avatarClassName: "left-[47%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[47%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[47%] top-[62%] -translate-x-1/2",
  },
  east_station: {
    avatarClassName: "left-[57%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[57%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[57%] top-[62%] -translate-x-1/2",
  },
  northeast_station: {
    avatarClassName: "left-[67%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[67%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[67%] top-[62%] -translate-x-1/2",
  },
  lounge: {
    avatarClassName: "left-[77%] top-[75%] -translate-x-1/2 -translate-y-1/2",
    labelClassName: "left-[77%] top-[80%] -translate-x-1/2 -translate-y-1/2",
    bubbleClassName: "left-[77%] top-[62%] -translate-x-1/2",
  },
};

function DeskSprite({ className, area }: { className: string; area?: OfficeSceneArea }) {
  return (
    <div data-slot="office-scene-desk" data-area={area} className={`absolute ${className}`}>
      <div className="relative h-[54px] w-[86px]">
        <span className="absolute left-[12px] top-[20px] h-[16px] w-[62px] border border-[#514b44] bg-[#71675f]" />
        <span className="absolute left-[32px] top-[1px] h-[18px] w-[22px] border border-[#9edbff]/60 bg-[linear-gradient(180deg,#61c7ff,#2e63ff)] shadow-[0_0_10px_rgba(59,130,246,0.34)]" />
        <span className="absolute left-[40px] top-[18px] h-[4px] w-[3px] bg-[#5b6473]" />
        <span className="absolute left-[18px] top-[36px] h-[13px] w-[4px] bg-[#4f4840]" />
        <span className="absolute right-[18px] top-[36px] h-[13px] w-[4px] bg-[#4f4840]" />
        <span className="absolute left-[26px] top-[41px] h-[6px] w-[34px] bg-[#5d554e]" />
      </div>
    </div>
  );
}

function AvatarSprite({ member }: { member: OfficeSceneMember }) {
  const meta = TONE_META[member.accent];
  const state = member.presenceMode ?? "desk";
  const layout = state === "idle" ? IDLE_LINE_LAYOUT[member.area] : SCENE_LAYOUT[member.area];

  return (
    <>
      <div data-slot="office-scene-avatar" className={`absolute ${layout.avatarClassName}`} data-state={state}>
        <div className="relative h-[30px] w-[20px]">
          <span className="absolute left-[5px] top-0 h-[8px] w-[10px] bg-[#f8d0ac] shadow-[0_0_0_1px_rgba(24,18,16,0.65)]" />
          <span className={`absolute left-[3px] top-[8px] h-[12px] w-[14px] shadow-[0_0_0_1px_rgba(16,16,20,0.35)] ${meta.avatarBodyClassName}`} />
          <span className="absolute left-[1px] top-[10px] h-[7px] w-[2px] bg-[#f8d0ac]" />
          <span className="absolute right-[1px] top-[10px] h-[7px] w-[2px] bg-[#f8d0ac]" />
          <span className="absolute left-[5px] top-[20px] h-[9px] w-[3px] bg-[#f8d0ac]" />
          <span className="absolute right-[5px] top-[20px] h-[9px] w-[3px] bg-[#f8d0ac]" />
        </div>
      </div>

      <div data-slot="office-scene-name" className={`absolute ${layout.labelClassName}`} data-state={state}>
        <p className={`text-[11px] font-semibold tracking-[0.01em] drop-shadow-[0_1px_0_rgba(0,0,0,0.7)] ${meta.nameClassName}`}>
          {member.name}
        </p>
      </div>
    </>
  );
}

function SceneBubble({ member }: { member: OfficeSceneMember }) {
  if (!member.showBubble) {
    return null;
  }

  const state = member.presenceMode ?? "desk";
  const layout = state === "idle" ? IDLE_LINE_LAYOUT[member.area] : SCENE_LAYOUT[member.area];

  return (
    <div data-slot="office-scene-bubble" className={`absolute hidden xl:block ${layout.bubbleClassName}`}>
      <div className="relative w-[184px] rounded-[8px] border border-white/10 bg-[#08090d]/96 px-3 py-2.5 text-[10px] shadow-[0_18px_44px_rgba(0,0,0,0.44)]">
        <p className="truncate font-medium text-white">{member.currentTask}</p>
        <p className="mt-1 truncate text-zinc-500">{member.activeTool}</p>
        <span className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-[#08090d]/96" />
      </div>
    </div>
  );
}

export function MissionControlOfficeLayout({
  title,
  subtitle,
  sceneMembers,
  activityTitle,
  activityItems,
}: MissionControlOfficeLayoutProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_248px] gap-3 px-4 py-4 max-xl:grid-cols-1">
      <section className="min-h-0 overflow-hidden">
        <header className="flex items-end gap-4 px-1">
          <div>
            <h1 className="text-[25px] font-semibold tracking-[-0.03em] text-white">{title}</h1>
            <p className="mt-1 text-[12px] text-zinc-500">{subtitle}</p>
          </div>
        </header>

        <section data-slot="office-scene-panel" className="mt-4 overflow-hidden rounded-[12px] border border-white/[0.07] bg-[#0f1014]">
          <div data-slot="office-scene" className="relative aspect-[16/10.5]">
            <div className="absolute inset-x-0 top-0 h-[15%] border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(123,147,168,0.16),rgba(49,58,70,0.12))]" />

            <div className="absolute left-[4.5%] right-[4.5%] top-[3.8%] grid h-[7%] grid-cols-7 gap-2.5">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-white/6 bg-[linear-gradient(180deg,rgba(214,228,241,0.18),rgba(83,95,109,0.15))]"
                />
              ))}
            </div>

            <div
              className="absolute inset-x-0 bottom-0 top-[15%]"
              style={{
                backgroundColor: "#171314",
                backgroundImage:
                  "linear-gradient(45deg, rgba(57, 48, 46, 0.84) 25%, transparent 25%, transparent 75%, rgba(57, 48, 46, 0.84) 75%, rgba(57, 48, 46, 0.84)), linear-gradient(45deg, rgba(34, 29, 28, 0.92) 25%, transparent 25%, transparent 75%, rgba(34, 29, 28, 0.92) 75%, rgba(34, 29, 28, 0.92))",
                backgroundPosition: "0 0, 24px 24px",
                backgroundSize: "48px 48px",
              }}
            />

            {DESK_AREAS.map((area) => (
              <DeskSprite key={area} className={DESK_LAYOUT[area]} area={area} />
            ))}

            <div className="absolute left-[51%] top-[66%] h-[70px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5f5953] bg-[#72685f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-[78px] sm:w-[138px]">
              <span className="absolute left-1/2 top-1/2 h-[24px] w-[24px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#85786c]" />
              <span className="absolute left-[10%] top-[64%] h-[14px] w-[14px] rounded-full bg-[#4b5563]" />
              <span className="absolute right-[10%] top-[64%] h-[14px] w-[14px] rounded-full bg-[#4b5563]" />
              <span className="absolute left-[22%] top-[18%] h-[12px] w-[12px] rounded-full bg-[#4b5563]" />
              <span className="absolute right-[22%] top-[18%] h-[12px] w-[12px] rounded-full bg-[#4b5563]" />
            </div>

            {sceneMembers.map((member) => (
              <AvatarSprite key={member.id} member={member} />
            ))}

            {sceneMembers.map((member) => (
              <SceneBubble key={`${member.id}-bubble`} member={member} />
            ))}
          </div>
        </section>
      </section>

      <aside
        data-slot="office-activity-panel"
        className="grid min-h-0 grid-rows-[52px_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-white/[0.07] bg-[#101116]"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4">
          <p className="text-[13px] font-medium text-white">{activityTitle}</p>
          <Activity className="h-4 w-4 text-zinc-500" />
        </header>

        {activityItems.length > 0 ? (
          <div className="min-h-0 overflow-y-auto p-3">
            <div className="space-y-2.5">
              {activityItems.map((item) => {
                const toneMeta = TONE_META[item.tone];
                return (
                  <article
                    key={item.id}
                    data-slot="office-activity-row"
                    className={`rounded-[10px] border border-white/[0.06] bg-[#13151b] px-3 py-3 ${toneMeta.glowClassName}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneMeta.dotClassName}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white">{item.memberName}</p>
                        <p className="mt-1 text-[12px] leading-5 text-zinc-300">{item.detail}</p>
                        <p className="mt-2 text-[11px] text-zinc-500">{item.meta}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-zinc-500">
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
  );
}
