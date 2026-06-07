import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { POST } from "../src/app/api/mission-control/notion/webhook/route";

const originalFetch = globalThis.fetch;
const originalAutomationSecret = process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET;
const originalVerificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalAutomationSecret === undefined) {
    delete process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET;
  } else {
    process.env.MISSION_CONTROL_NOTION_AUTOMATION_SECRET = originalAutomationSecret;
  }

  if (originalVerificationToken === undefined) {
    delete process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  } else {
    process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = originalVerificationToken;
  }
});

test("database automation webhook with the Mission Control secret defers to manual Notion sync", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

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
  assert.equal(payload.syncDeferred, true);
  assert.equal(payload.manualSyncRequired, true);
  assert.equal(fetchCalls.length, 0);
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
