import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHermesAgentPromptContent,
  buildHermesChatArgs,
  parseHermesChatOutput,
} from "../src/components/mission-control/mission-control-hermes-cli";

test("builds Hermes CLI args with model and resumed session when present", () => {
  const args = buildHermesChatArgs({
    content: "what is today's date?",
    modelId: "gpt-5.4",
    sessionId: "20260420_210037_e575b8",
    source: "mission-control-hermes",
    maxTurns: 7,
  });

  assert.deepEqual(args, [
    "chat",
    "-q",
    "what is today's date?",
    "-Q",
    "--source",
    "mission-control-hermes",
    "--max-turns",
    "7",
    "-m",
    "gpt-5.4",
    "--resume",
    "20260420_210037_e575b8",
  ]);
});

test("wraps Hermes prompts with the selected Office agent identity", () => {
  const prompt = buildHermesAgentPromptContent({
    content: "Draft the rollout note.",
    agent: {
      name: "Lead Operator",
      roleTitle: "Primary Agent",
      summary: "Owns delivery across Mission Control.",
      responsibilities: ["Route work", "Keep context aligned", "Verify handoffs", "Extra item"],
    },
  });

  assert.match(prompt, /Mission Control Office agent binding/);
  assert.match(prompt, /Respond as Lead Operator/);
  assert.match(prompt, /Primary Agent/);
  assert.match(prompt, /Owns delivery across Mission Control/);
  assert.match(prompt, /Route work; Keep context aligned; Verify handoffs/);
  assert.doesNotMatch(prompt, /Extra item/);
  assert.match(prompt, /User request:\nDraft the rollout note\./);
});

test("parses quiet Hermes output for a brand new session", () => {
  const parsed = parseHermesChatOutput(`session_id: 20260420_210037_e575b8\npong\n`);

  assert.deepEqual(parsed, {
    response: "pong",
    sessionId: "20260420_210037_e575b8",
  });
});

test("parses quiet Hermes output for a resumed session and strips resume banner", () => {
  const parsed = parseHermesChatOutput(`↻ Resumed session 20260420_210037_e575b8 (1 user message, 2 total messages)\n\nsession_id: 20260420_210037_e575b8\nReply with exactly: pong\n`);

  assert.deepEqual(parsed, {
    response: "Reply with exactly: pong",
    sessionId: "20260420_210037_e575b8",
  });
});

test("strips a resumed-session banner that appears after the session id", () => {
  const parsed = parseHermesChatOutput(`session_id: 20260420_210037_e575b8\n↻ Resumed session 20260420_210037_e575b8 (1 user message, 2 total messages)\nReply with exactly: pong\n`);

  assert.deepEqual(parsed, {
    response: "Reply with exactly: pong",
    sessionId: "20260420_210037_e575b8",
  });
});

test("throws when Hermes quiet output does not contain a session id", () => {
  assert.throws(() => parseHermesChatOutput("pong\n"), /session_id/);
});
