import assert from "node:assert/strict";
import test from "node:test";

import { MISSION_CONTROL_TEMPLATE } from "../shared/missionControlTemplate";
import { TEAM_DISCIPLINE_META, buildDefaultTeamRoster } from "../shared/missionControlTeam";

test("builds the default Mission Control roster from the portable workspace template", () => {
  const roster = buildDefaultTeamRoster(1700000000000);

  assert.equal(roster.length, MISSION_CONTROL_TEMPLATE.operators.length);
  assert.equal(roster[0]?.name, MISSION_CONTROL_TEMPLATE.primaryOperator.label);
  assert.equal(roster[0]?.memberType, "core_agent");

  assert.deepEqual(
    roster.map((member) => member.name),
    MISSION_CONTROL_TEMPLATE.operators.map((operator) => operator.label),
  );

  assert.deepEqual(
    roster.map((member) => member.roleTitle),
    MISSION_CONTROL_TEMPLATE.operators.map((operator) => operator.roleTitle),
  );

  assert.deepEqual(
    roster.map((member) => member.focusAreas),
    MISSION_CONTROL_TEMPLATE.operators.map((operator) => operator.focusAreas),
  );

  assert.deepEqual(Object.keys(TEAM_DISCIPLINE_META), ["developer", "writer", "designer"]);
  assert.equal(TEAM_DISCIPLINE_META.developer.label, "Developers");
  assert.equal(TEAM_DISCIPLINE_META.writer.label, "Writers");
  assert.equal(TEAM_DISCIPLINE_META.designer.label, "Designers");
});
