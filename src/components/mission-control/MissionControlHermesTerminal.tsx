"use client";

import { useEffect, useRef, useState } from "react";

type HermesTerminalStatus = "connecting" | "running" | "exited" | "error";

type MissionControlHermesTerminalProps = {
  sessionId: string;
  queuedPrompt?: string | null;
  onStatusChange?: (status: HermesTerminalStatus) => void;
};

type HermesTerminalServerMessage =
  | {
      type: "ready";
      cols: number;
      rows: number;
      replay?: string;
      exited?: boolean;
    }
  | {
      type: "data";
      data: string;
    }
  | {
      type: "exit";
      exitCode?: number | null;
      signal?: string | null;
    }
  | {
      type: "error";
      error: string;
    };

function getHermesTerminalWsUrl(sessionId: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_HERMES_TERMINAL_WS_URL;
  if (configuredUrl) {
    const url = new URL(configuredUrl);
    url.searchParams.set("sessionId", sessionId);
    return url.toString();
  }

  const port = process.env.NEXT_PUBLIC_HERMES_TERMINAL_PORT ?? "4323";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//127.0.0.1:${port}/terminal?sessionId=${encodeURIComponent(sessionId)}`;
}

function parseServerMessage(rawMessage: MessageEvent<string>): HermesTerminalServerMessage | null {
  try {
    return JSON.parse(rawMessage.data) as HermesTerminalServerMessage;
  } catch {
    return null;
  }
}

export function MissionControlHermesTerminal({
  sessionId,
  queuedPrompt,
  onStatusChange,
}: MissionControlHermesTerminalProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HermesTerminalStatus>("connecting");
  const onStatusChangeRef = useRef<MissionControlHermesTerminalProps["onStatusChange"]>(onStatusChange);
  const [status, setStatus] = useState<HermesTerminalStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let terminalDispose: (() => void) | null = null;

    function setNextStatus(nextStatus: HermesTerminalStatus) {
      statusRef.current = nextStatus;
      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    }

    async function mountTerminal() {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      setErrorMessage(null);
      setNextStatus("connecting");

      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);

      if (disposed) {
        return;
      }

      const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"SFMono-Regular", "Cascadia Code", "Liberation Mono", Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.22,
        scrollback: 4000,
        theme: {
          background: "#050506",
          foreground: "#e8e8ea",
          cursor: "#f5f5f6",
          selectionBackground: "#3b82f633",
          black: "#050506",
          red: "#f87171",
          green: "#86efac",
          yellow: "#fde68a",
          blue: "#93c5fd",
          magenta: "#c4b5fd",
          cyan: "#67e8f9",
          white: "#f5f5f6",
          brightBlack: "#71717a",
          brightRed: "#fca5a5",
          brightGreen: "#bbf7d0",
          brightYellow: "#fef3c7",
          brightBlue: "#bfdbfe",
          brightMagenta: "#ddd6fe",
          brightCyan: "#a5f3fc",
          brightWhite: "#ffffff",
        },
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(host);

      const writeInputDispose = terminal.onData((data) => {
        if (socket?.readyState !== WebSocket.OPEN) {
          return;
        }

        socket.send(JSON.stringify({ type: "input", data }));
      });

      const fitAndResize = () => {
        if (disposed) {
          return;
        }

        try {
          fitAddon.fit();
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "resize",
                cols: terminal.cols,
                rows: terminal.rows,
              }),
            );
          }
        } catch {
          // xterm can throw while the container is between layouts.
        }
      };

      resizeObserver = new ResizeObserver(fitAndResize);
      resizeObserver.observe(host);
      window.setTimeout(fitAndResize, 0);

      socket = new WebSocket(getHermesTerminalWsUrl(sessionId));
      socket.addEventListener("open", () => {
        fitAndResize();
        socket?.send(
          JSON.stringify({
            type: "start",
            pendingPrompt: queuedPrompt ?? null,
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
      });
      socket.addEventListener("message", (rawMessage) => {
        const message = parseServerMessage(rawMessage);
        if (!message) {
          return;
        }

        if (message.type === "ready") {
          if (message.replay) {
            terminal.write(message.replay);
          }
          setNextStatus(message.exited ? "exited" : "running");
          window.setTimeout(() => terminal.focus(), 50);
          return;
        }

        if (message.type === "data") {
          terminal.write(message.data);
          return;
        }

        if (message.type === "exit") {
          setNextStatus("exited");
          return;
        }

        if (message.type === "error") {
          setErrorMessage(message.error);
          setNextStatus("error");
        }
      });
      socket.addEventListener("close", () => {
        if (!disposed && statusRef.current !== "exited" && statusRef.current !== "error") {
          setNextStatus("exited");
        }
      });
      socket.addEventListener("error", () => {
        setErrorMessage("Hermes terminal server is not reachable.");
        setNextStatus("error");
      });

      terminalDispose = () => {
        writeInputDispose.dispose();
        terminal.dispose();
      };
    }

    void mountTerminal();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      socket?.close();
      terminalDispose?.();
    };
  }, [queuedPrompt, sessionId]);

  return (
    <div data-slot="hermes-terminal-container" className="relative flex h-full min-h-0 flex-col bg-[#050506]">
      <div ref={hostRef} data-slot="hermes-xterm-host" className="min-h-0 flex-1 px-3 py-3" />
      {status !== "running" ? (
        <div
          data-slot="hermes-terminal-status"
          data-status={status}
          className="pointer-events-none absolute right-4 top-4 rounded-[6px] border border-white/[0.1] bg-black/80 px-2.5 py-1.5 text-xs text-white/68"
        >
          {status === "connecting"
            ? "Connecting to Hermes terminal..."
            : status === "error"
              ? errorMessage ?? "Hermes terminal error."
              : "Hermes terminal exited."}
        </div>
      ) : null}
    </div>
  );
}
