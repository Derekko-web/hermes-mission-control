import {
  BookOpen,
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";

export type MemoryBrowserItem = {
  id: string;
  title: string;
  meta: string;
  selected: boolean;
  onSelect?: () => void;
};

export type MemoryBrowserGroup = {
  id: string;
  label: string;
  count?: number;
  expanded?: boolean;
  items: MemoryBrowserItem[];
};

export type PinnedMemoryCard = {
  id: string;
  title: string;
  meta: string;
  selected?: boolean;
  onSelect?: () => void;
};

export type MemoryReaderSection = {
  id: string;
  heading?: string;
  body: string[];
};

export type MemoryReaderDocument = {
  title: string;
  subtitle: string;
  modifiedLabel: string;
  sections: MemoryReaderSection[];
};

type MissionControlMemoryLayoutProps = {
  searchText: string;
  onSearchChange: (value: string) => void;
  browserHeading?: string;
  browserCountLabel?: string;
  pinnedMemory: PinnedMemoryCard | null;
  groups: MemoryBrowserGroup[];
  reader: MemoryReaderDocument | null;
};

function renderParagraph(paragraph: string, key: string) {
  const prefixMatch = paragraph.match(/^([^:]{2,36}:)\s+(.*)$/);
  const isBullet = paragraph.startsWith("• ");

  if (prefixMatch && !isBullet) {
    return (
      <p key={key} className="text-[15px] leading-7 text-zinc-300">
        <strong className="font-semibold text-[#f3f4f7]">{prefixMatch[1]}</strong> {prefixMatch[2]}
      </p>
    );
  }

  return (
    <p key={key} className={`text-[15px] leading-7 text-zinc-300 ${isBullet ? "pl-4" : ""}`}>
      {paragraph}
    </p>
  );
}

export function MissionControlMemoryLayout({
  searchText,
  onSearchChange,
  browserHeading = "DAILY JOURNAL",
  browserCountLabel,
  pinnedMemory,
  groups,
  reader,
}: MissionControlMemoryLayoutProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(340px,380px)_minmax(0,1fr)] gap-6 px-6 py-6 max-lg:grid-cols-1">
      <aside
        data-slot="memory-browser-panel"
        className="min-h-0 overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#0f1013]"
      >
        <div className="flex h-full min-h-0 flex-col px-6 py-6">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search memory..."
              className="h-10 w-full rounded-[10px] border border-white/[0.06] bg-[#17181b] pl-10 pr-3 text-[14px] text-white outline-none transition placeholder:text-zinc-500 focus:border-[#7170ff]/40"
            />
          </label>

          {pinnedMemory ? (
            <button
              type="button"
              onClick={pinnedMemory.onSelect}
              className={`mt-4 rounded-[12px] border p-3.5 text-left transition ${
                pinnedMemory.selected
                  ? "border-white/[0.08] bg-[#272930]"
                  : "border-white/[0.05] bg-[#141519] hover:border-white/[0.08] hover:bg-[#181a1f]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  data-slot="pinned-memory-icon"
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#6d43f6] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                >
                  <Brain className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[15px] font-medium tracking-[-0.01em] text-white">{pinnedMemory.title}</p>
                    <Sparkles
                      data-slot="pinned-memory-favorite"
                      className="h-3.5 w-3.5 shrink-0 fill-[#d4a63d] text-[#d4a63d]"
                    />
                  </div>
                  <p className="mt-1 text-[13px] text-zinc-500">{pinnedMemory.meta}</p>
                </div>
              </div>
            </button>
          ) : null}

          <div data-slot="memory-browser-heading" className="mt-6 flex items-center gap-2.5">
            <BookOpen data-slot="memory-browser-heading-icon" className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">{browserHeading}</p>
            {browserCountLabel ? (
              <span className="rounded-[6px] border border-white/[0.05] bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-400">
                {browserCountLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3.5">
              {groups.map((group) => {
                const expanded = group.expanded ?? true;
                const count = group.count ?? group.items.length;

                return (
                  <section key={group.id}>
                    <div className="flex items-center gap-2 text-[13px] text-zinc-400">
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                      )}
                      <p>
                        {group.label} ({count})
                      </p>
                    </div>

                    {expanded ? (
                      <div className="relative mt-2 pl-5">
                        <div
                          data-slot="memory-browser-guide"
                          className="absolute bottom-1 left-[7px] top-0 w-px rounded-full bg-white/[0.08]"
                        />
                        <div className="space-y-1.5">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={item.onSelect}
                              data-slot="memory-journal-row"
                              className={`flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                                item.selected
                                  ? "bg-[#2a2c31] text-white"
                                  : "text-zinc-200 hover:bg-[#17191d]"
                              }`}
                            >
                              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/[0.03] text-zinc-500">
                                <CalendarDays className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-medium text-white">{item.title}</p>
                                <p className="mt-1 text-[12px] text-zinc-500">{item.meta}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <section
        data-slot="memory-reader-panel"
        className="min-h-0 overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#121316]"
      >
        {reader ? (
          <article className="flex h-full min-h-0 flex-col">
            <header className="border-b border-white/[0.06] px-6 py-5">
              <div className="flex items-start justify-between gap-4 max-lg:flex-col">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#191b20] text-zinc-300">
                    <CalendarDays className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-white">{reader.title}</h2>
                    <p className="mt-1 text-[13px] text-zinc-500">{reader.subtitle}</p>
                  </div>
                </div>
                <p className="pt-1 text-[13px] text-zinc-600">{reader.modifiedLabel}</p>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-8">
                {reader.sections.map((section) => (
                  <section key={section.id} data-slot="memory-entry-block" className="space-y-3">
                    {section.heading ? (
                      <div className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em] text-[#7170ff]">
                        <Clock3 className="h-4 w-4" />
                        <h3>{section.heading}</h3>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {section.body.map((paragraph, index) =>
                        renderParagraph(paragraph, `${section.id}-${index}`),
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </article>
        ) : (
          <div className="flex h-full min-h-[680px] items-center justify-center px-8 text-center">
            <div>
              <p className="text-base font-medium text-white">No memory selected</p>
              <p className="mt-2 text-sm text-zinc-500">Choose a document from the browser to open the reader.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
