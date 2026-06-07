#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const children = new Set();
let shuttingDown = false;

function start(label, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: ["inherit", "pipe", "pipe"],
  });
  children.add(child);

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) {
      return;
    }

    console.error(`[${label}] exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  });

  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("hermes-terminal", process.execPath, ["scripts/hermes-terminal-server.mjs"]);
start("next", "next", ["dev", "--hostname", "127.0.0.1", "--port", "4322"]);
