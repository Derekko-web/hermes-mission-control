import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOTION_SYNC_EVENT_PREFIXES = ["page.", "data_source.", "database."] as const;
const NOTION_WEBHOOK_VERIFICATION_TOKEN_PATH = ".notion-webhook-verification-token";
const NOTION_AUTOMATION_WEBHOOK_SECRET_PATH = ".notion-automation-webhook-secret";
const NOTION_AUTOMATION_WEBHOOK_SECRET_HEADER = "x-mission-control-webhook-secret";
const MISSION_CONTROL_STATE_DIR = ".mission-control";

function readEnvFileValue(name: string) {
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const match = envLocal.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || readEnvFileValue(name);
}

function notionWebhookVerificationTokenFilePath() {
  return resolve(process.cwd(), MISSION_CONTROL_STATE_DIR, NOTION_WEBHOOK_VERIFICATION_TOKEN_PATH);
}

function notionAutomationWebhookSecretFilePath() {
  return resolve(process.cwd(), MISSION_CONTROL_STATE_DIR, NOTION_AUTOMATION_WEBHOOK_SECRET_PATH);
}

function readSavedVerificationToken() {
  try {
    return readFileSync(notionWebhookVerificationTokenFilePath(), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

function readSavedAutomationWebhookSecret() {
  try {
    return readFileSync(notionAutomationWebhookSecretFilePath(), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

function saveVerificationToken(verificationToken: string) {
  try {
    mkdirSync(resolve(process.cwd(), MISSION_CONTROL_STATE_DIR), { recursive: true });
    writeFileSync(notionWebhookVerificationTokenFilePath(), `${verificationToken}\n`, { mode: 0o600 });
  } catch (error) {
    console.warn(
      `[mission-control] Unable to save Notion webhook verification token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function verifyAutomationWebhookSecret(request: Request) {
  const configuredSecret =
    readOptionalEnv("MISSION_CONTROL_NOTION_AUTOMATION_SECRET") ?? readSavedAutomationWebhookSecret();
  const providedSecret = request.headers.get(NOTION_AUTOMATION_WEBHOOK_SECRET_HEADER)?.trim();

  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function verificationTokenFromPayload(payload: unknown) {
  return isRecord(payload) && typeof payload.verification_token === "string"
    ? payload.verification_token.trim()
    : undefined;
}

function notionWebhookEvents(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (isRecord(payload) && Array.isArray(payload.events)) {
    return payload.events.filter(isRecord);
  }
  return isRecord(payload) ? [payload] : [];
}

function shouldSyncForNotionWebhookPayload(payload: unknown) {
  return notionWebhookEvents(payload).some((event) => {
    const type = typeof event.type === "string" ? event.type : "";
    return NOTION_SYNC_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix));
  });
}

function verifyNotionSignature(rawBody: string, signature: string | null, verificationToken: string) {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", verificationToken).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

function missionControlInternalBaseUrl() {
  return readOptionalEnv("MISSION_CONTROL_INTERNAL_BASE_URL") ?? `http://127.0.0.1:${process.env.PORT ?? "4322"}`;
}

async function triggerNotionSync() {
  const syncUrl = new URL("/api/mission-control/notion/sync", missionControlInternalBaseUrl());
  const response = await fetch(syncUrl, { method: "POST" });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to sync Notion tasks from webhook.");
  }

  return payload;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Mission Control Notion webhook",
    accepts: ["POST"],
    note: "Use this URL in Notion's Webhooks tab. Browser visits are health checks only.",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS, POST",
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown;

  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Notion webhook payload." }, { status: 400 });
  }

  const verificationToken = verificationTokenFromPayload(payload);
  if (verificationToken) {
    saveVerificationToken(verificationToken);
    console.info(`[mission-control] Notion webhook verification token: ${verificationToken}`);
    return NextResponse.json({ ok: true, verificationToken, verification_token: verificationToken });
  }

  const isAutomationWebhook = verifyAutomationWebhookSecret(request);
  const configuredVerificationToken = readOptionalEnv("NOTION_WEBHOOK_VERIFICATION_TOKEN") ?? readSavedVerificationToken();
  if (
    configuredVerificationToken &&
    !isAutomationWebhook &&
    !verifyNotionSignature(rawBody, request.headers.get("x-notion-signature"), configuredVerificationToken)
  ) {
    return NextResponse.json({ ok: false, error: "Invalid Notion webhook signature." }, { status: 401 });
  }

  if (!isAutomationWebhook && !shouldSyncForNotionWebhookPayload(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const sync = await triggerNotionSync();
    return NextResponse.json({ ok: true, sync });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync Notion tasks from webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
