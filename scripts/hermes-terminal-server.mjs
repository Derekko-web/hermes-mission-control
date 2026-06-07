#!/usr/bin/env node

import http from "node:http";
import os from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { spawn as spawnProcess } from "node:child_process";

import pty from "node-pty";
import { WebSocketServer } from "ws";

const DEFAULT_PORT = 4323;
const MAX_REPLAY_BYTES = 1024 * 1024;

const port = Number(process.env.HERMES_TERMINAL_PORT ?? DEFAULT_PORT);
const workspaceCwd = process.env.HERMES_TERMINAL_WORKSPACE ?? process.cwd();
const hermesBinary = process.env.HERMES_BINARY ?? "hermes";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const ptyBridgePath = join(scriptDir, "hermes-pty-bridge.py");

const sessions = new Map();

function writeJson(socket, payload) {
  if (socket.readyState !== 1) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function appendReplay(session, data) {
  session.replay += data;
  if (Buffer.byteLength(session.replay, "utf8") <= MAX_REPLAY_BYTES) {
    return;
  }

  session.replay = session.replay.slice(Math.floor(session.replay.length / 2));
}

function getSpawnArgs(pendingPrompt) {
  const prompt = pendingPrompt?.trim();
  if (!prompt) {
    return [];
  }

  return ["chat", "-q", prompt];
}

function createPythonPtyBridge({ command, args, cwd, env, cols, rows }) {
  const child = spawnProcess(
    process.env.PYTHON ?? "python3",
    [
      ptyBridgePath,
      "--cwd",
      cwd,
      "--cols",
      String(cols),
      "--rows",
      String(rows),
      command,
      ...args,
    ],
    {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  return {
    backend: "python-pty-bridge",
    onData(handler) {
      child.stdout.on("data", (chunk) => handler(chunk.toString("utf8")));
    },
    onExit(handler) {
      child.on("exit", (exitCode, signal) => {
        if (stderr.trim()) {
          handler({
            exitCode: exitCode ?? 1,
            signal,
            error: stderr.trim(),
          });
          return;
        }

        handler({ exitCode, signal });
      });
      child.on("error", (error) => {
        handler({ exitCode: 1, signal: null, error: error.message });
      });
    },
    write(data) {
      child.stdin.write(data);
    },
    resize() {
      // The bridge sets the initial PTY size. Runtime resize is best-effort only.
    },
    kill() {
      child.kill();
    },
  };
}

function createTerminalProcess({ command, args, cwd, env, cols, rows }) {
  try {
    const terminal = pty.spawn(command, args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env,
    });

    return {
      backend: "node-pty",
      onData(handler) {
        terminal.onData(handler);
      },
      onExit(handler) {
        terminal.onExit(handler);
      },
      write(data) {
        terminal.write(data);
      },
      resize(nextCols, nextRows) {
        terminal.resize(nextCols, nextRows);
      },
      kill() {
        terminal.kill();
      },
    };
  } catch (error) {
    console.warn(
      `node-pty spawn failed (${error instanceof Error ? error.message : String(error)}); using Python PTY bridge.`,
    );
    return createPythonPtyBridge({ command, args, cwd, env, cols, rows });
  }
}

function createSession(sessionId, opts = {}) {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const cols = Number(opts.cols) > 0 ? Number(opts.cols) : 120;
  const rows = Number(opts.rows) > 0 ? Number(opts.rows) : 32;
  const env = {
    ...process.env,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
  };
  const terminal = createTerminalProcess({
    command: hermesBinary,
    args: getSpawnArgs(opts.pendingPrompt),
    cwd: workspaceCwd,
    env,
    cols,
    rows,
  });
  const session = {
    id: sessionId,
    terminal,
    backend: terminal.backend,
    replay: "",
    cols,
    rows,
    exited: false,
    sockets: new Set(),
  };

  terminal.onData((data) => {
    appendReplay(session, data);
    for (const socket of session.sockets) {
      writeJson(socket, { type: "data", data });
    }
  });

  terminal.onExit(({ exitCode, signal, error }) => {
    session.exited = true;
    if (error) {
      const errorOutput = `\r\nHermes terminal failed: ${error}\r\n`;
      appendReplay(session, errorOutput);
      for (const socket of session.sockets) {
        writeJson(socket, { type: "data", data: errorOutput });
      }
    }
    for (const socket of session.sockets) {
      writeJson(socket, { type: "exit", exitCode, signal });
    }
  });

  sessions.set(sessionId, session);
  return session;
}

function destroySession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  for (const socket of session.sockets) {
    writeJson(socket, { type: "exit", exitCode: null, signal: "destroyed" });
    socket.close(1000, "session destroyed");
  }
  session.sockets.clear();
  if (!session.exited) {
    session.terminal.kill();
  }
  sessions.delete(sessionId);
  return true;
}

function sendCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer((request, response) => {
  sendCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        workspaceCwd,
        sessions: sessions.size,
      }),
    );
    return;
  }

  const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/);
  if (request.method === "DELETE" && sessionMatch) {
    const destroyed = destroySession(decodeURIComponent(sessionMatch[1]));
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ destroyed }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ server, path: "/terminal" });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const sessionId = url.searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    writeJson(socket, { type: "error", error: "Missing sessionId." });
    socket.close(1008, "missing sessionId");
    return;
  }

  let attachedSession = null;

  function attach(opts = {}) {
    attachedSession = createSession(sessionId, opts);
    attachedSession.sockets.add(socket);
    writeJson(socket, {
      type: "ready",
      cols: attachedSession.cols,
      rows: attachedSession.rows,
      replay: attachedSession.replay,
      exited: attachedSession.exited,
    });
  }

  socket.on("message", (rawMessage) => {
    let message;
    try {
      message = JSON.parse(String(rawMessage));
    } catch {
      writeJson(socket, { type: "error", error: "Invalid terminal message." });
      return;
    }

    if (message.type === "start") {
      attach({
        pendingPrompt: typeof message.pendingPrompt === "string" ? message.pendingPrompt : null,
        cols: message.cols,
        rows: message.rows,
      });
      return;
    }

    if (!attachedSession) {
      if (message.type === "resize") {
        return;
      }

      writeJson(socket, { type: "error", error: "Terminal session has not started." });
      return;
    }

    if (message.type === "input" && typeof message.data === "string" && !attachedSession.exited) {
      attachedSession.terminal.write(message.data);
      return;
    }

    if (message.type === "resize" && Number(message.cols) > 0 && Number(message.rows) > 0 && !attachedSession.exited) {
      attachedSession.cols = Number(message.cols);
      attachedSession.rows = Number(message.rows);
      attachedSession.terminal.resize(attachedSession.cols, attachedSession.rows);
      return;
    }

    if (message.type === "dispose") {
      destroySession(sessionId);
    }
  });

  socket.on("close", () => {
    if (!attachedSession) {
      return;
    }

    attachedSession.sockets.delete(socket);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Hermes terminal server listening on ws://127.0.0.1:${port}/terminal (${workspaceCwd} on ${os.platform()})`,
  );
});
