import assert from "node:assert/strict";
import test from "node:test";

import { MISSION_CONTROL_TEMPLATE } from "../shared/missionControlTemplate";
import {
  LIVE_ACTIVITY_WINDOW_MS,
  buildLiveActivityEntries,
  buildOfficeSceneMembers,
} from "../src/components/mission-control/MissionControlOfficeState";

const accentByTeamColor = {
  amber: "amber",
  cyan: "cyan",
  emerald: "emerald",
  indigo: "indigo",
  rose: "rose",
  violet: "violet",
} as const;

const now = Date.UTC(2026, 3, 20, 6, 57, 0);
const [lead, , , writer, designer] = MISSION_CONTROL_TEMPLATE.operators;

test("keeps a fresh working operator at its assigned desk", () => {
  const officeRoster = [
    {
      member: {
        _id: "team-lead",
        name: lead.label,
        roleTitle: lead.roleTitle,
        color: lead.color,
        avatarLabel: lead.avatarLabel,
      },
      presence: {
        _id: "presence-lead",
        memberName: lead.label,
        status: "working",
        area: "south_station",
        currentTask: "Customize the portable workspace template",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedAt: now - 5 * 60_000,
      },
    },
  ] as const;

  const sceneMembers = buildOfficeSceneMembers(officeRoster, accentByTeamColor, now);

  assert.equal(sceneMembers.length, 1);
  assert.equal(sceneMembers[0]?.presenceMode, "desk");
  assert.equal(sceneMembers[0]?.area, "south_station");
  assert.equal(sceneMembers[0]?.showBubble, true);
});

test("converts stale desk presence into idle floor members without bubbles", () => {
  const officeRoster = [
    {
      member: {
        _id: "team-lead",
        name: lead.label,
        roleTitle: lead.roleTitle,
        color: lead.color,
        avatarLabel: lead.avatarLabel,
      },
      presence: {
        _id: "presence-lead",
        memberName: lead.label,
        status: "working",
        area: "south_station",
        currentTask: "Customize the portable workspace template",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedAt: now - LIVE_ACTIVITY_WINDOW_MS - 60_000,
      },
    },
  ] as const;

  const sceneMembers = buildOfficeSceneMembers(officeRoster, accentByTeamColor, now);

  assert.equal(sceneMembers.length, 1);
  assert.equal(sceneMembers[0]?.presenceMode, "idle");
  assert.equal(sceneMembers[0]?.showBubble, false);
  assert.equal(sceneMembers[0]?.statusLabel, "Idle");
});

test("returns only fresh non-idle presence entries for live activity", () => {
  const officeRoster = [
    {
      member: {
        _id: "team-lead",
        name: lead.label,
        roleTitle: lead.roleTitle,
        color: lead.color,
        avatarLabel: lead.avatarLabel,
      },
      presence: {
        _id: "presence-lead",
        memberName: lead.label,
        status: "working",
        area: "south_station",
        currentTask: "Customize the portable workspace template",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedAt: now - 5 * 60_000,
      },
    },
    {
      member: {
        _id: "team-designer",
        name: designer.label,
        roleTitle: designer.roleTitle,
        color: designer.color,
        avatarLabel: designer.avatarLabel,
      },
      presence: {
        _id: "presence-designer",
        memberName: designer.label,
        status: "designing",
        area: "northeast_station",
        currentTask: "Polish portable workspace shell",
        activeTool: "Design system",
        isAtDesk: true,
        lastUpdatedAt: now - LIVE_ACTIVITY_WINDOW_MS - 1,
      },
    },
    {
      member: {
        _id: "team-writer",
        name: writer.label,
        roleTitle: writer.roleTitle,
        color: writer.color,
        avatarLabel: writer.avatarLabel,
      },
      presence: {
        _id: "presence-writer",
        memberName: writer.label,
        status: "idle",
        area: "east_station",
        currentTask: "Standing by",
        activeTool: "Docs",
        isAtDesk: false,
        lastUpdatedAt: now - 60_000,
      },
    },
  ] as const;

  const liveEntries = buildLiveActivityEntries(officeRoster, now);

  assert.deepEqual(
    liveEntries.map((entry) => entry.member.name),
    [lead.label],
  );
});
