import assert from "node:assert/strict";
import test from "node:test";

import {
  HERMES_SLASH_COMMANDS,
  applyHermesSlashCommand,
  findHermesSlashCommands,
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
