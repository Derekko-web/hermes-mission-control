import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_HERMES_MODEL_ID,
  DEFAULT_HERMES_REASONING_EFFORT,
  HERMES_MODEL_OPTIONS,
  HERMES_SLASH_COMMANDS,
  applyHermesSlashCommand,
  findHermesModelOption,
  findHermesSlashCommands,
  normalizeHermesThreadSettings,
} from "../src/components/mission-control/mission-control-hermes-shared";

test("shows built-in Hermes slash commands only when the draft starts with slash", () => {
  const allCommands = findHermesSlashCommands("/");
  const labels = allCommands.map((command) => command.label);

  for (const label of [
    "/new",
    "/clear",
    "/undo",
    "/resume",
    "/compress",
    "/help",
    "/commands",
    "/model",
    "/tools",
    "/status",
    "/quit",
  ]) {
    assert.ok(labels.includes(label), `${label} should be available in the built-in command list`);
  }

  assert.ok(!labels.includes("/complete"), "custom /complete should not be in the built-in command list");

  const filteredCommands = findHermesSlashCommands("/co").map((command) => command.label);
  assert.ok(filteredCommands.includes("/compress"));
  assert.ok(filteredCommands.includes("/commands"));
  assert.ok(!filteredCommands.includes("/complete"));

  assert.deepEqual(findHermesSlashCommands("hello"), []);
  assert.deepEqual(findHermesSlashCommands(" /co"), []);
});

test("clicking a built-in command fills the composer with the selected slash command", () => {
  const compressCommand = HERMES_SLASH_COMMANDS.find((command) => command.id === "compress");
  assert.ok(compressCommand);

  assert.equal(applyHermesSlashCommand("/co", compressCommand), "/compress ");
  assert.equal(applyHermesSlashCommand("", compressCommand), "/compress ");
});

test("normalizes Hermes thread settings and gates fast mode/reasoning by model capability", () => {
  const defaultModel = findHermesModelOption(DEFAULT_HERMES_MODEL_ID);
  assert.ok(defaultModel);
  assert.equal(defaultModel?.supportsFastMode, true);
  assert.equal(defaultModel?.supportsReasoning, true);

  const claudeCodeModel = findHermesModelOption("claude-code");
  assert.ok(claudeCodeModel);
  assert.equal(claudeCodeModel?.supportsFastMode, false);
  assert.equal(claudeCodeModel?.supportsReasoning, false);

  const trinityMiniModel = findHermesModelOption("arcee-ai/trinity-mini");
  assert.ok(trinityMiniModel);
  assert.equal(trinityMiniModel?.label, "Trinity Mini");
  assert.equal(trinityMiniModel?.supportsFastMode, false);
  assert.equal(trinityMiniModel?.supportsReasoning, false);

  const trinityLargeThinkingModel = findHermesModelOption("arcee-ai/trinity-large-thinking");
  assert.ok(trinityLargeThinkingModel);
  assert.equal(trinityLargeThinkingModel?.label, "Trinity Large Thinking");
  assert.equal(trinityLargeThinkingModel?.supportsFastMode, false);
  assert.equal(trinityLargeThinkingModel?.supportsReasoning, true);

  const normalizedDefaults = normalizeHermesThreadSettings({});
  assert.equal(normalizedDefaults.modelId, DEFAULT_HERMES_MODEL_ID);
  assert.equal(normalizedDefaults.reasoningEffort, DEFAULT_HERMES_REASONING_EFFORT);
  assert.equal(normalizedDefaults.fastModeEnabled, true);

  const normalizedUnsupported = normalizeHermesThreadSettings({
    modelId: "claude-code",
    reasoningEffort: "high",
    fastModeEnabled: true,
  });
  assert.equal(normalizedUnsupported.modelId, "claude-code");
  assert.equal(normalizedUnsupported.reasoningEffort, null);
  assert.equal(normalizedUnsupported.fastModeEnabled, false);

  const normalizedTrinityMini = normalizeHermesThreadSettings({
    modelId: "arcee-ai/trinity-mini",
    reasoningEffort: "high",
    fastModeEnabled: true,
  });
  assert.equal(normalizedTrinityMini.modelId, "arcee-ai/trinity-mini");
  assert.equal(normalizedTrinityMini.reasoningEffort, null);
  assert.equal(normalizedTrinityMini.fastModeEnabled, false);

  const normalizedTrinityLargeThinking = normalizeHermesThreadSettings({
    modelId: "arcee-ai/trinity-large-thinking",
    reasoningEffort: "high",
    fastModeEnabled: true,
  });
  assert.equal(normalizedTrinityLargeThinking.modelId, "arcee-ai/trinity-large-thinking");
  assert.equal(normalizedTrinityLargeThinking.reasoningEffort, "high");
  assert.equal(normalizedTrinityLargeThinking.fastModeEnabled, false);

  assert.ok(HERMES_MODEL_OPTIONS.length >= 7);
});
