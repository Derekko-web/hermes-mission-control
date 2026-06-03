import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const handle = process.env.MISSION_CONTROL_TUNNEL_HANDLE ?? "ernie";
const gatewayUrl = process.env.MISSION_CONTROL_WEBHOOK_GATEWAY_URL ?? "http://127.0.0.1:4324";
const stateDir = resolve(process.cwd(), ".mission-control");
const baseUrlPath = resolve(stateDir, `${handle}-tunnel-base-url`);
const webhookUrlPath = resolve(stateDir, `${handle}-notion-webhook-url`);
const webhookPath = "/api/mission-control/notion/webhook";

mkdirSync(stateDir, { recursive: true });

const child = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--no-autoupdate", "--url", gatewayUrl],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let lastBaseUrl = "";

function persistTunnelUrl(baseUrl) {
  if (baseUrl === lastBaseUrl) {
    return;
  }

  lastBaseUrl = baseUrl;
  const webhookUrl = `${baseUrl}${webhookPath}`;

  writeFileSync(baseUrlPath, `${baseUrl}\n`, { mode: 0o600 });
  writeFileSync(webhookUrlPath, `${webhookUrl}\n`, { mode: 0o600 });

  console.info(`[mission-control-${handle}-tunnel] Public base URL: ${baseUrl}`);
  console.info(`[mission-control-${handle}-tunnel] Notion webhook URL: ${webhookUrl}`);
}

function handleOutput(buffer, writer) {
  const text = buffer.toString();
  writer.write(text);

  for (const match of text.matchAll(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)) {
    persistTunnelUrl(match[0]);
  }
}

child.stdout.on("data", (buffer) => handleOutput(buffer, process.stdout));
child.stderr.on("data", (buffer) => handleOutput(buffer, process.stderr));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
