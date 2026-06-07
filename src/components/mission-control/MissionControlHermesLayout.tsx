import { Plus, TerminalSquare, X } from "lucide-react";

import { MissionControlHermesTerminal } from "./MissionControlHermesTerminal";
import type { HermesLayoutThread } from "./mission-control-hermes-shared";

type HermesTerminalStatus = "connecting" | "running" | "exited" | "error";

type MissionControlHermesLayoutProps = {
  sessions: HermesLayoutThread[];
  activeSessionId: string | null;
  activeOfficeAgentLabel?: string | null;
  queuedPrompt?: string | null;
  onNewSession: () => void;
  onSessionSelect: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onTerminalStatusChange?: (sessionId: string, status: HermesTerminalStatus) => void;
};

function SessionTab({
  session,
  onSelect,
  onClose,
}: {
  session: HermesLayoutThread;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-slot="hermes-session-tab"
      data-active={session.active ? "true" : "false"}
      className={`group flex h-9 shrink-0 items-center gap-1 border-r border-white/[0.07] pl-3 pr-1.5 text-sm transition ${
        session.active
          ? "bg-[#111217] text-[#f5f5f6]"
          : "bg-[#0b0c0e] text-white/58 hover:bg-[#101114] hover:text-white/86"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 max-w-[220px] items-center gap-2"
        title={session.title}
      >
        <TerminalSquare
          className={`h-3.5 w-3.5 shrink-0 ${session.active ? "text-[#7dd3fc]" : "text-white/38"}`}
          aria-hidden="true"
        />
        <span className="truncate">{session.title}</span>
      </button>
      <button
        type="button"
        data-slot="hermes-session-close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-white/35 opacity-70 transition hover:bg-white/[0.08] hover:text-white group-hover:opacity-100"
        aria-label={`Close ${session.title}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function HermesEmptyState({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div data-slot="hermes-empty-state" className="flex min-h-0 flex-1 items-center justify-center bg-[#050506] px-6">
      <div className="max-w-[420px] text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/[0.1] bg-white/[0.035] text-white/72">
          <TerminalSquare className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-lg font-medium tracking-[0] text-[#f5f5f6]">No Hermes sessions</h1>
        <p className="mt-2 text-sm leading-6 text-white/48">Press plus to create a Hermes Agent terminal session.</p>
        <button
          type="button"
          onClick={onNewSession}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-[7px] border border-white/[0.1] bg-white text-sm font-medium text-black px-3 transition hover:bg-white/86"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New session
        </button>
      </div>
    </div>
  );
}

export function MissionControlHermesLayout({
  sessions,
  activeSessionId,
  activeOfficeAgentLabel,
  queuedPrompt,
  onNewSession,
  onSessionSelect,
  onSessionClose,
  onTerminalStatusChange,
}: MissionControlHermesLayoutProps) {
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-black text-[#f5f5f6]">
      <header
        data-slot="hermes-topbar"
        className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-white/[0.06] bg-[#0b0c0e]"
      >
        <button
          data-slot="hermes-new-session-button"
          type="button"
          onClick={onNewSession}
          className="flex h-9 w-10 items-center justify-center border-r border-white/[0.07] text-white/72 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Create new Hermes session"
          title="New Hermes session"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          data-slot="hermes-session-tabs"
          className="flex min-w-0 items-center overflow-x-auto"
          aria-label="Hermes sessions"
        >
          {sessions.map((session) => (
            <SessionTab
              key={session.id}
              session={session}
              onSelect={() => onSessionSelect(session.id)}
              onClose={() => onSessionClose(session.id)}
            />
          ))}
        </div>

        <div
          data-slot="hermes-session-meta"
          className="hidden h-9 max-w-[320px] items-center border-l border-white/[0.07] px-3 text-xs text-white/46 sm:flex"
        >
          <span className="truncate">{activeOfficeAgentLabel ?? "Hermes Agent"}</span>
        </div>
      </header>

      <main data-slot="hermes-main-pane" className="min-h-0">
        {activeSession ? (
          <div
            data-slot="hermes-terminal-pane"
            data-session-id={activeSession.id}
            className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-[#050506]"
          >
            <div className="flex min-h-9 items-center justify-between gap-3 border-b border-white/[0.05] bg-[#08090b] px-3">
              <div className="flex min-w-0 items-center gap-2">
                <TerminalSquare className="h-3.5 w-3.5 shrink-0 text-[#7dd3fc]" aria-hidden="true" />
                <span className="truncate text-xs font-medium text-white/70">Hermes Agent</span>
                {queuedPrompt ? (
                  <span className="truncate text-xs text-white/36">queued prompt ready</span>
                ) : null}
              </div>
              <span className="hidden text-xs text-white/32 sm:inline">{activeSession.title}</span>
            </div>
            <MissionControlHermesTerminal
              sessionId={activeSession.id}
              queuedPrompt={queuedPrompt}
              onStatusChange={(status) => onTerminalStatusChange?.(activeSession.id, status)}
            />
          </div>
        ) : (
          <HermesEmptyState onNewSession={onNewSession} />
        )}
      </main>
    </div>
  );
}
