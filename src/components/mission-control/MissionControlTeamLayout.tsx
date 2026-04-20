export type MissionControlTeamAccent = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

export type MissionControlTeamNode = {
  id: string;
  name: string;
  role: string;
  summary: string;
  avatarLabel: string;
  accent: MissionControlTeamAccent;
  chips: string[];
  meta: string;
};

type MissionControlTeamLayoutProps = {
  title: string;
  leader: MissionControlTeamNode;
  middleLabelLeft: string;
  middleLabelRight: string;
  directReports: MissionControlTeamNode[];
  metaLabel: string;
  metaNode: MissionControlTeamNode;
};

type AccentMeta = {
  glowClassName: string;
  avatarClassName: string;
  chipClassName: string;
  dotClassName: string;
};

const ACCENT_META: Record<MissionControlTeamAccent, AccentMeta> = {
  indigo: {
    glowClassName: "from-indigo-500/14 via-indigo-400/6 to-transparent",
    avatarClassName: "text-indigo-100",
    chipClassName: "border-indigo-400/18 bg-indigo-400/10 text-indigo-100/88",
    dotClassName: "bg-indigo-300/90",
  },
  amber: {
    glowClassName: "from-amber-500/14 via-amber-400/6 to-transparent",
    avatarClassName: "text-amber-100",
    chipClassName: "border-amber-400/18 bg-amber-400/10 text-amber-100/88",
    dotClassName: "bg-amber-300/90",
  },
  emerald: {
    glowClassName: "from-emerald-500/14 via-emerald-400/6 to-transparent",
    avatarClassName: "text-emerald-100",
    chipClassName: "border-emerald-400/18 bg-emerald-400/10 text-emerald-100/88",
    dotClassName: "bg-emerald-300/90",
  },
  rose: {
    glowClassName: "from-rose-500/14 via-rose-400/6 to-transparent",
    avatarClassName: "text-rose-100",
    chipClassName: "border-rose-400/18 bg-rose-400/10 text-rose-100/88",
    dotClassName: "bg-rose-300/90",
  },
  cyan: {
    glowClassName: "from-cyan-500/14 via-cyan-400/6 to-transparent",
    avatarClassName: "text-cyan-100",
    chipClassName: "border-cyan-400/18 bg-cyan-400/10 text-cyan-100/88",
    dotClassName: "bg-cyan-300/90",
  },
  violet: {
    glowClassName: "from-violet-500/14 via-violet-400/6 to-transparent",
    avatarClassName: "text-violet-100",
    chipClassName: "border-violet-400/18 bg-violet-400/10 text-violet-100/88",
    dotClassName: "bg-violet-300/90",
  },
};

const CARD_BASE_CLASSNAME =
  "relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] shadow-[0_20px_48px_-32px_rgba(0,0,0,0.8)]";

type TeamCardProps = {
  node: MissionControlTeamNode;
  slot: string;
  size: "leader" | "report" | "support";
};

function TeamCard({ node, slot, size }: TeamCardProps) {
  const accentMeta = ACCENT_META[node.accent];
  const isLeader = size === "leader";
  const isSupport = size === "support";

  return (
    <article
      data-slot={slot}
      className={`${CARD_BASE_CLASSNAME} ${
        isLeader
          ? "min-h-[116px] px-4 py-4 sm:px-5"
          : isSupport
            ? "min-h-[110px] px-4 py-4"
            : "min-h-[168px] px-3.5 py-3"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentMeta.glowClassName}`} />
      <div className="pointer-events-none absolute inset-[1px] rounded-[11px] border border-white/[0.03]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-black/20 text-[0.84rem] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${accentMeta.avatarClassName}`}
              >
                {node.avatarLabel}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[0.88rem] font-semibold tracking-[-0.02em] text-white/95">{node.name}</h3>
                <p className="truncate text-[11px] font-medium text-white/48">{node.role}</p>
              </div>
            </div>
          </div>
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accentMeta.dotClassName}`} />
        </div>

        <p className={`mt-3 text-[11px] leading-5 text-white/56 ${isLeader ? "max-w-[28rem]" : ""}`}>{node.summary}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.chips.slice(0, 3).map((chip) => (
            <span
              key={`${node.id}-${chip}`}
              className={`rounded-full border px-2 py-1 text-[10px] font-medium tracking-[0.01em] ${accentMeta.chipClassName}`}
            >
              {chip}
            </span>
          ))}
        </div>

        <p className={`mt-auto pt-3 text-[9px] uppercase tracking-[0.22em] text-white/28 ${isSupport ? "pt-4" : ""}`}>
          {node.meta}
        </p>
      </div>
    </article>
  );
}

function ConnectorLine({ className }: { className: string }) {
  return <div aria-hidden="true" className={`bg-white/[0.11] ${className}`} />;
}

function SectionLabel({ slot, label, align }: { slot: string; label: string; align: "left" | "right" | "center" }) {
  return (
    <p
      data-slot={slot}
      className={`text-[10px] font-medium uppercase tracking-[0.3em] text-white/32 ${
        align === "center" ? "text-center" : align === "left" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </p>
  );
}

export function MissionControlTeamLayout({
  title,
  leader,
  middleLabelLeft,
  middleLabelRight,
  directReports,
  metaLabel,
  metaNode,
}: MissionControlTeamLayoutProps) {
  return (
    <section className="bg-[#0b0b0d] px-6 pb-16 pt-10 text-[#f5f5f7] sm:px-10 lg:px-12 lg:pt-14">
      <div className="mx-auto flex w-full max-w-[920px] flex-col items-center">
        <header className="w-full text-center">
          <h1
            data-slot="team-page-title"
            className="text-center text-[2rem] font-semibold tracking-[-0.045em] text-white/96 sm:text-[2.45rem]"
          >
            {title}
          </h1>
        </header>

        <div data-slot="team-org-chart" className="mt-12 flex w-full flex-col items-center">
          <div className="w-full max-w-[360px]">
            <TeamCard node={leader} size="leader" slot="team-card-leader" />
          </div>

          <div className="mt-6 hidden w-full max-w-[720px] lg:block">
            <div data-slot="team-connector-grid" className="relative pb-10">
              <ConnectorLine className="mx-auto h-6 w-px" />
              <div className="grid grid-cols-2 gap-10 pt-4">
                <div className="flex items-center gap-3 pr-6">
                  <ConnectorLine className="h-px flex-1" />
                  <SectionLabel slot="team-flow-label-left" label={middleLabelLeft} align="left" />
                </div>
                <div className="flex items-center gap-3 pl-6">
                  <SectionLabel slot="team-flow-label-right" label={middleLabelRight} align="right" />
                  <ConnectorLine className="h-px flex-1" />
                </div>
              </div>

              <div className="grid gap-3 pt-6 lg:grid-cols-4">
                {directReports.map((node) => (
                  <div key={node.id} className="relative pt-5">
                    <ConnectorLine className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2" />
                    <TeamCard node={node} size="report" slot="team-card-direct-report" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid w-full max-w-[720px] gap-3 lg:hidden">
            <SectionLabel slot="team-flow-label-left" label={middleLabelLeft} align="center" />
            {directReports.map((node) => (
              <TeamCard key={node.id} node={node} size="report" slot="team-card-direct-report" />
            ))}
          </div>

          <div className="mt-2 w-full max-w-[520px]">
            <div className="flex items-center gap-4">
              <ConnectorLine className="h-px flex-1" />
              <SectionLabel slot="team-meta-label" label={metaLabel} align="center" />
              <ConnectorLine className="h-px flex-1" />
            </div>
            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-[320px]">
                <TeamCard node={metaNode} size="support" slot="team-card-support" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
