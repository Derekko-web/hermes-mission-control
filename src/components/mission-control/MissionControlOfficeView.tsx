"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { type OfficeActivityItem, MissionControlOfficeLayout } from "./MissionControlOfficeLayout";
import {
  type TeamMemberDoc,
  buildLiveActivityEntries,
  buildOfficeSceneMembers,
} from "./MissionControlOfficeState";

type OfficePresenceDoc = Doc<"officePresence">;

type OfficeSceneArea = OfficePresenceDoc["area"];

type OfficeStatus = OfficePresenceDoc["status"];

const EMPTY_TEAM: TeamMemberDoc[] = [];
const EMPTY_PRESENCE: OfficePresenceDoc[] = [];

const STATUS_META: Record<OfficeStatus, { label: string; tone: OfficeActivityItem["tone"] }> = {
  working: { label: "Working", tone: "emerald" },
  reviewing: { label: "Reviewing", tone: "cyan" },
  designing: { label: "Designing", tone: "rose" },
  writing: { label: "Writing", tone: "violet" },
  monitoring: { label: "Monitoring", tone: "amber" },
  idle: { label: "Idle", tone: "zinc" },
};

const AREA_LABELS: Record<OfficeSceneArea, string> = {
  north_station: "North station",
  west_station: "West station",
  south_station: "South station",
  east_station: "East station",
  northeast_station: "Northeast station",
  lounge: "Lounge",
};

const ACCENT_BY_TEAM_COLOR = {
  amber: "amber",
  cyan: "cyan",
  emerald: "emerald",
  indigo: "indigo",
  rose: "rose",
  violet: "violet",
} as const;

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }
  return relativeTimeFormat.format(Math.round(diff / day), "day");
}

export function MissionControlOfficeView({
  initialTeamMembers,
  initialOfficePresence,
}: {
  initialTeamMembers: TeamMemberDoc[];
  initialOfficePresence: OfficePresenceDoc[];
}) {
  const teamMembersQuery = useQuery(api.teamMembers.list);
  const officePresenceQuery = useQuery(api.officePresence.list);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const teamMembers = teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM;
  const officePresence = officePresenceQuery ?? initialOfficePresence ?? EMPTY_PRESENCE;

  const officeRoster = useMemo(() => {
    const presenceByName = new Map(officePresence.map((entry) => [entry.memberName, entry]));

    return teamMembers
      .map((member) => ({
        member,
        presence: presenceByName.get(member.name) ?? null,
      }))
      .sort((left, right) => left.member.sortOrder - right.member.sortOrder);
  }, [officePresence, teamMembers]);

  const sceneMembers = useMemo(
    () => buildOfficeSceneMembers(officeRoster, ACCENT_BY_TEAM_COLOR, now),
    [now, officeRoster],
  );

  const activityItems = useMemo<OfficeActivityItem[]>(() => {
    return buildLiveActivityEntries(officeRoster, now).map(({ member, presence }) => ({
      id: String(presence._id),
      memberName: member.name,
      detail: presence.currentTask ?? "No active task logged",
      meta: `${STATUS_META[presence.status].label} · ${AREA_LABELS[presence.area]} · ${presence.activeTool ?? "Mission Control"} · ${formatRelativeTime(presence.lastUpdatedAt)}`,
      tone: STATUS_META[presence.status].tone,
    }));
  }, [now, officeRoster]);

  return (
    <MissionControlOfficeLayout
      title="The Office"
      subtitle="Mission Control headquarters"
      sceneMembers={sceneMembers}
      activityTitle="Live Activity"
      activityItems={activityItems}
    />
  );
}
