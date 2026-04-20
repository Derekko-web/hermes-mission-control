import assert from "node:assert/strict";
import test from "node:test";

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

test("keeps a fresh working agent at its assigned desk", () => {
  const officeRoster = [
    {
      member: {
        _id: "team-codex",
        name: "Codex",
        roleTitle: "Lead Builder",
        color: "amber",
        avatarLabel: "C",
      },
      presence: {
        _id: "presence-codex",
        memberName: "Codex",
        status: "working",
        area: "south_station",
        currentTask: "Build the digital office screen",
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
        _id: "team-codex",
        name: "Codex",
        roleTitle: "Lead Builder",
        color: "amber",
        avatarLabel: "C",
      },
      presence: {
        _id: "presence-codex",
        memberName: "Codex",
        status: "working",
        area: "south_station",
        currentTask: "Build the digital office screen",
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
        _id: "team-codex",
        name: "Codex",
        roleTitle: "Lead Builder",
        color: "amber",
        avatarLabel: "C",
      },
      presence: {
        _id: "presence-codex",
        memberName: "Codex",
        status: "working",
        area: "south_station",
        currentTask: "Build the digital office screen",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedAt: now - 5 * 60_000,
      },
    },
    {
      member: {
        _id: "team-lorentz",
        name: "Lorentz",
        roleTitle: "Designer Specialist",
        color: "rose",
        avatarLabel: "L",
      },
      presence: {
        _id: "presence-lorentz",
        memberName: "Lorentz",
        status: "designing",
        area: "northeast_station",
        currentTask: "Polish office layout",
        activeTool: "Design system",
        isAtDesk: true,
        lastUpdatedAt: now - LIVE_ACTIVITY_WINDOW_MS - 1,
      },
    },
    {
      member: {
        _id: "team-banach",
        name: "Banach",
        roleTitle: "Writer Specialist",
        color: "violet",
        avatarLabel: "B",
      },
      presence: {
        _id: "presence-banach",
        memberName: "Banach",
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
    ["Codex"],
  );
});
