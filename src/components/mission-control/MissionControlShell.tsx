"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Building2, CalendarDays, Command, ListTodo, MessageSquareText, Users2 } from "lucide-react";

export type MissionControlTool = "tasks" | "calendar" | "hermes" | "memory" | "office" | "team";

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
    href: "/mission-control/team",
    icon: Users2,
    label: "Team",
    tool: "team",
  },
  {
    href: "/mission-control/hermes",
    icon: MessageSquareText,
    label: "Hermes",
    tool: "hermes",
  },
];

type CompactShellVariant = "memory" | "team" | "office" | "hermes";

function ShellBrand() {
  return (
    <div data-slot="mission-control-sidebar-brand" className="px-1">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
          <Command className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-zinc-500">Workspace</p>
          <h1 className="text-[0.95rem] font-semibold leading-tight text-white">Mission Control</h1>
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
            className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[12px] font-medium tracking-[-0.01em] transition ${
              active
                ? "bg-[rgba(113,112,255,0.14)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                : "text-white/42 hover:bg-white/[0.03] hover:text-white/82"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function CompactShell({ tool, children, variant }: MissionControlShellProps & { variant: CompactShellVariant }) {
  const workspaceClassName = "grid h-full min-h-0 grid-cols-[188px_minmax(0,1fr)]";
  const mainClassName =
    variant === "team"
      ? "min-h-0 overflow-y-auto bg-[#0b0b0d]"
      : variant === "hermes"
        ? "min-h-0 overflow-hidden bg-black"
        : "min-h-0 overflow-hidden bg-[#0b0b0c]";

  return (
    <div className="mission-control-shell h-screen overflow-hidden bg-[#0b0b0c] text-[#f5f5f7]">
      <div data-slot="mission-control-workspace" className={workspaceClassName}>
        <aside
          data-slot="mission-control-primary-sidebar"
          className="flex min-h-0 flex-col border-r border-white/[0.06] bg-[#0d0d0f] px-3 py-4"
        >
          <ShellBrand />
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
            <CompactShellNavigation tool={tool} />
          </div>
          <div className="mt-4 ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#141518] text-xs font-medium text-zinc-300">
            N
          </div>
        </aside>

        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}

function DefaultShell({ tool, children }: MissionControlShellProps) {
  return (
    <div className="mission-control-shell min-h-screen bg-[#0a0b0f] text-zinc-100">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[188px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.05] bg-[#07080b] px-3 py-4 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
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
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <nav className="mt-6 hidden space-y-1 lg:block">
            {navItems.map(({ href, icon: Icon, label, tool: itemTool }) => {
              const active = tool === itemTool;
              const className = `flex w-full items-center rounded-[14px] border px-2.5 py-2 text-left transition ${
                active
                  ? "border-[#8992ff]/35 bg-[#8992ff]/12 text-white"
                  : "border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-zinc-200"
              }`;

              return (
                <Link key={label} href={href} className={className}>
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[0.82rem] font-medium">{label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

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

  if (tool === "team") {
    return (
      <CompactShell tool={tool} variant="team">
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
