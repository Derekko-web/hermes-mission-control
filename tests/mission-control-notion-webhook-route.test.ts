import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { POST } from "../src/app/api/mission-control/notion/webhook/route";

const originalFetch = globalThis.fetch;
const originalAutomationSecret = process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET;
const originalInternalBaseUrl = process.env.MISSION_CONTROL_INTERNAL_BASE_URL;
const originalVerificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalAutomationSecret === undefined) {
    delete process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET;
  } else {
    process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET = originalAutomationSecret;
  }

  if (originalInternalBaseUrl === undefined) {
    delete process.env.MISSION_CONTROL_INTERNAL_BASE_URL;
  } else {
    process.env.MISSION_CONTROL_INTERNAL_BASE_URL = originalInternalBaseUrl;
  }

  if (originalVerificationToken === undefined) {
    delete process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  } else {
    process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = originalVerificationToken;
  }
});

test("database automation webhook with the Mission Control secret triggers Notion sync", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  process.env.MISSION_CONTROL_INTERNAL_BASE_URL = "http://mission-control.internal";
  process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET = "test-automation-secret";
  process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = "official-webhook-token";

  globalThis.fetch = async (input, init) => {
    fetchCalls.push({ input: input.toString(), init });

    return new Response(JSON.stringify({ ok: true, summary: { pulledFromNotion: 1 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const response = await POST(
    new Request("https://example.test/api/mission-control/notion/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-mission-control-webhook-secret": "test-automation-secret",
      },
      body: JSON.stringify({ changed: true }),
    }),
  );

  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, "http://mission-control.internal/api/mission-control/notion/sync");
  assert.equal(fetchCalls[0]?.init?.method, "POST");
});

test("database automation webhook without the Mission Control secret cannot bypass Notion signature checks", async () => {
  process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET = "test-automation-secret";
  process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = "official-webhook-token";

  const response = await POST(
    new Request("https://example.test/api/mission-control/notion/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changed: true }),
    }),
  );

  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Invalid Notion webhook signature.");
});
