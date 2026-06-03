"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Building2, CalendarDays, Command, ListTodo, MessageSquareText, Moon, Search, Sun, X } from "lucide-react";

export type MissionControlTool = "tasks" | "calendar" | "hermes" | "memory" | "office";

type MissionControlShellProps = {
  tool: MissionControlTool;
  children: ReactNode;
};

type ShellNavItem = {
  label: string;
  href: string;
  tool: MissionControlTool;
  icon: typeof Command;
};

type CommandPaletteAction = {
  id: string;
  label: string;
  description: string;
  group: "Navigation";
  icon: typeof Command;
  shortcut?: string;
  run: () => void;
};

const navItems: ShellNavItem[] = [
  {
    href: "/mission-control",
    icon: ListTodo,
    label: "Tasks",
    tool: "tasks",
  },
  {
    href: "/mission-control/calendar",
    icon: CalendarDays,
    label: "Calendar",
    tool: "calendar",
  },
  {
    href: "/mission-control/memory",
    icon: BookOpen,
    label: "Memory",
    tool: "memory",
  },
  {
    href: "/mission-control/office",
    icon: Building2,
    label: "Office",
    tool: "office",
  },
  {
    href: "/mission-control/hermes",
    icon: MessageSquareText,
    label: "Hermes",
    tool: "hermes",
  },
];

function useMissionControlCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = useMemo<CommandPaletteAction[]>(
    () => [
      ...navItems.map(({ href, icon, label }) => ({
        id: `go-${label.toLowerCase()}`,
        label: `Go to ${label}`,
        description: href,
        group: "Navigation" as const,
        icon,
        run: () => {
          window.location.assign(href);
        },
      })),
    ],
    [],
  );

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return actions;
    }

    return actions.filter((action) =>
      `${action.label} ${action.description} ${action.group}`.toLowerCase().includes(normalizedQuery),
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, Math.max(0, filteredActions.length - 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const action = filteredActions[selectedIndex];
        if (action) {
          action.run();
          setOpen(false);
          setQuery("");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredActions, open, selectedIndex]);

  return {
    open,
    setOpen,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredActions,
  };
}

const LIGHT_MODE_STORAGE_KEY = "mission-control-light-mode";

function MissionControlLightModeButton() {
  const [lightModeEnabled, setLightModeEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLightModeEnabled(window.localStorage.getItem(LIGHT_MODE_STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    document.documentElement.classList.toggle("mission-control-light", lightModeEnabled);
    window.localStorage.setItem(LIGHT_MODE_STORAGE_KEY, String(lightModeEnabled));
  }, [hydrated, lightModeEnabled]);

  const Icon = lightModeEnabled ? Moon : Sun;
  const label = lightModeEnabled ? "Dark mode" : "Light mode";

  return (
    <button
      type="button"
      data-slot="mission-control-light-mode-button"
      aria-label={lightModeEnabled ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={lightModeEnabled}
      onClick={() => setLightModeEnabled((current) => !current)}
      className="fixed right-4 top-4 z-[45] flex h-9 items-center gap-2 rounded-full border border-white/[0.1] bg-[#111116]/85 px-3 text-xs font-semibold text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur transition hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8992ff]/55"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

type CompactShellVariant = "memory" | "office" | "hermes";

function ShellBrand({ collapsible = false }: { collapsible?: boolean }) {
  return (
    <div data-slot="mission-control-sidebar-brand" className="px-1">
      <div className="flex h-10 items-center gap-2">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
          <Command className="h-4.5 w-4.5 text-white" aria-hidden="true" />
        </div>
        <div
          className={`min-w-0 overflow-hidden transition duration-200 ${
            collapsible
              ? "opacity-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100"
              : "opacity-100"
          }`}
        >
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-zinc-500">Workspace</p>
          <h1 className="whitespace-nowrap text-[0.95rem] font-semibold leading-tight text-white">Mission Control</h1>
        </div>
      </div>
    </div>
  );
}

function CompactShellNavigation({ tool }: { tool: MissionControlTool }) {
  return (
    <nav className="space-y-1.5">
      {navItems.map(({ href, icon: Icon, label, tool: itemTool }) => {
        const active = tool === itemTool;

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className={`flex h-9 items-center gap-2.5 overflow-hidden rounded-[9px] px-2.5 text-[12px] font-medium tracking-[-0.01em] transition ${
              active
                ? "bg-[rgba(113,112,255,0.14)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                : "text-white/42 hover:bg-white/[0.03] hover:text-white/82"
            }`}
          >
            <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span className="whitespace-nowrap opacity-0 transition duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarPanel({ tool, className = "" }: { tool: MissionControlTool; className?: string }) {
  return (
    <aside
      data-slot="mission-control-primary-sidebar"
      className={`group/sidebar relative z-40 h-full min-h-0 w-14 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0d0d0f] px-2.5 py-4 transition-[width] duration-200 ease-out hover:w-[188px] focus-within:w-[188px] ${className}`}
    >
      <ShellBrand collapsible />
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <CompactShellNavigation tool={tool} />
      </div>
      <div className="mt-4 flex h-9 items-center gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141518] px-2 text-xs font-medium text-zinc-300">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/[0.06] text-[10px]">
          N
        </span>
        <span className="whitespace-nowrap opacity-0 transition duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
          Notion ready
        </span>
      </div>
    </aside>
  );
}

function CommandPalette({
  open,
  query,
  selectedIndex,
  actions,
  onOpenChange,
  onQueryChange,
  onSelectedIndexChange,
}: {
  open: boolean;
  query: string;
  selectedIndex: number;
  actions: CommandPaletteAction[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelectedIndexChange: (index: number) => void;
}) {
  if (!open) {
    return null;
  }

  const groups = ["Actions", "Navigation"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#111116] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4">
          <Search className="h-4 w-4 flex-none text-zinc-500" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Type a command or search..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <kbd className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 text-[10px] font-medium text-zinc-500">
            esc
          </kbd>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {actions.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">No commands found.</div>
          ) : (
            groups.map((group) => {
              const groupActions = actions
                .map((action, index) => ({ action, index }))
                .filter((item) => item.action.group === group);

              if (groupActions.length === 0) {
                return null;
              }

              return (
                <div key={group} className="py-1">
                  <div className="px-2 py-1.5 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-zinc-600">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {groupActions.map(({ action, index }) => {
                      const Icon = action.icon;
                      const selected = index === selectedIndex;

                      return (
                        <button
                          key={action.id}
                          type="button"
                          onMouseEnter={() => onSelectedIndexChange(index)}
                          onClick={() => {
                            action.run();
                            onOpenChange(false);
                            onQueryChange("");
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            selected ? "bg-white/[0.07] text-white" : "text-zinc-300 hover:bg-white/[0.04]"
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-none text-zinc-500" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{action.label}</span>
                            <span className="block truncate text-xs text-zinc-500">{action.description}</span>
                          </span>
                          {action.shortcut ? (
                            <kbd className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 text-[10px] font-medium text-zinc-500">
                              {action.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function CompactShell({ tool, children, variant }: MissionControlShellProps & { variant: CompactShellVariant }) {
  const commandPalette = useMissionControlCommandPalette();
  const workspaceClassName = "grid h-full min-h-0 grid-cols-[56px_minmax(0,1fr)]";
  const mainClassName =
    variant === "hermes"
        ? "min-h-0 overflow-hidden bg-black"
        : "min-h-0 overflow-hidden bg-[#0b0b0c]";

  return (
    <div className="mission-control-shell h-screen overflow-hidden bg-[#0b0b0c] text-[#f5f5f7]">
      <CommandPalette
        open={commandPalette.open}
        query={commandPalette.query}
        selectedIndex={commandPalette.selectedIndex}
        actions={commandPalette.filteredActions}
        onOpenChange={commandPalette.setOpen}
        onQueryChange={commandPalette.setQuery}
        onSelectedIndexChange={commandPalette.setSelectedIndex}
      />
      <MissionControlLightModeButton />
      <div data-slot="mission-control-workspace" className={workspaceClassName}>
        <SidebarPanel tool={tool} className="flex" />
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}

function DefaultShell({ tool, children }: MissionControlShellProps) {
  const commandPalette = useMissionControlCommandPalette();

  return (
    <div className="mission-control-shell min-h-screen bg-[#0a0b0f] text-zinc-100">
      <CommandPalette
        open={commandPalette.open}
        query={commandPalette.query}
        selectedIndex={commandPalette.selectedIndex}
        actions={commandPalette.filteredActions}
        onOpenChange={commandPalette.setOpen}
        onQueryChange={commandPalette.setQuery}
        onSelectedIndexChange={commandPalette.setSelectedIndex}
      />
      <MissionControlLightModeButton />
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[56px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.05] bg-[#07080b] px-3 py-4 lg:hidden">
          <ShellBrand />

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map(({ href, icon: Icon, label, tool: itemTool }) => {
              const active = tool === itemTool;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    active
                      ? "border-[#8992ff]/35 bg-[#8992ff]/12 text-white"
                      : "border-white/[0.08] bg-white/[0.02] text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </aside>

        <SidebarPanel tool={tool} className="hidden lg:flex" />

        <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(139,146,255,0.14),transparent_30%),radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_24%),#0a0b0f] px-4 pb-8 pt-5 lg:px-6 lg:pb-8 lg:pt-5">
          <div className="mx-auto max-w-[1360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function MissionControlShell({ tool, children }: MissionControlShellProps) {
  if (tool === "memory") {
    return (
      <CompactShell tool={tool} variant="memory">
        {children}
      </CompactShell>
    );
  }

  if (tool === "office") {
    return (
      <CompactShell tool={tool} variant="office">
        {children}
      </CompactShell>
    );
  }

  if (tool === "hermes") {
    return (
      <CompactShell tool={tool} variant="hermes">
        {children}
      </CompactShell>
    );
  }

  return <DefaultShell tool={tool}>{children}</DefaultShell>;
}
