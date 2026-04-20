import assert from "node:assert/strict";
import test from "node:test";

import { TEAM_DISCIPLINE_META, buildDefaultTeamRoster } from "../shared/missionControlTeam";

test("defines the recurring Mission Control roster as Codex plus developer, writer, and designer subagents", () => {
  const roster = buildDefaultTeamRoster(1700000000000);

  assert.equal(roster.length, 5);
  assert.equal(roster[0]?.name, "Codex");
  assert.equal(roster[0]?.memberType, "core_agent");

  const subagents = roster.filter((member) => member.memberType === "subagent");
  assert.equal(subagents.length, 4);
  assert.deepEqual(
    subagents.map((member) => member.name),
    ["McClintock", "Confucius", "Banach", "Lorentz"],
  );

  assert.deepEqual(Object.keys(TEAM_DISCIPLINE_META), ["developer", "writer", "designer"]);
  assert.equal(TEAM_DISCIPLINE_META.developer.label, "Developers");
  assert.equal(TEAM_DISCIPLINE_META.writer.label, "Writers");
  assert.equal(TEAM_DISCIPLINE_META.designer.label, "Designers");

  assert.deepEqual(
    roster.map((member) => member.roleTitle),
    ["Mission Lead", "Architecture Scout", "Implementation Engineer", "Writer Specialist", "Product Designer"],
  );
});
