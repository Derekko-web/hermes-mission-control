import type { Doc } from "../../../convex/_generated/dataModel";
import type { OfficeAccent, OfficeSceneMember } from "./MissionControlOfficeLayout";

export type TeamMemberDoc = Doc<"teamMembers">;
export type OfficePresenceDoc = Doc<"officePresence">;
export type OfficeRosterEntry = {
  member: TeamMemberDoc;
  presence: OfficePresenceDoc | null;
};

export type AccentByTeamColor = Record<TeamMemberDoc["color"], OfficeAccent>;

const STATUS_LABELS: Record<OfficePresenceDoc["status"], string> = {
  working: "Working",
  reviewing: "Reviewing",
  designing: "Designing",
  writing: "Writing",
  monitoring: "Monitoring",
  idle: "Idle",
};

export const LIVE_ACTIVITY_WINDOW_MS = 30 * 60_000;

export function isLiveOfficePresence(
  presence: Pick<OfficePresenceDoc, "status" | "lastUpdatedAt">,
  now = Date.now(),
) {
  return presence.status !== "idle" && now - presence.lastUpdatedAt <= LIVE_ACTIVITY_WINDOW_MS;
}

export function buildOfficeSceneMembers(
  officeRoster: readonly OfficeRosterEntry[],
  accentByTeamColor: AccentByTeamColor,
  now = Date.now(),
): OfficeSceneMember[] {
  return officeRoster.flatMap(({ member, presence }) => {
    if (!presence) {
      return [];
    }

    const isLive = isLiveOfficePresence(presence, now);
    const presenceMode = isLive && presence.isAtDesk ? "desk" : "idle";

    return [
      {
        id: String(presence._id),
        name: member.name,
        roleTitle: member.roleTitle,
        area: presence.area,
        statusLabel: isLive ? STATUS_LABELS[presence.status] : STATUS_LABELS.idle,
        currentTask: presence.currentTask ?? "Standing by",
        activeTool: presence.activeTool ?? "Mission Control",
        accent: accentByTeamColor[member.color],
        avatarLabel: member.avatarLabel,
        presenceMode,
        showBubble: presenceMode === "desk" && Boolean(presence.currentTask),
      },
    ];
  });
}

export function buildLiveActivityEntries(
  officeRoster: readonly OfficeRosterEntry[],
  now = Date.now(),
) {
  return officeRoster
    .filter((entry): entry is { member: TeamMemberDoc; presence: OfficePresenceDoc } => Boolean(entry.presence))
    .filter(({ presence }) => isLiveOfficePresence(presence, now))
    .sort((left, right) => right.presence.lastUpdatedAt - left.presence.lastUpdatedAt);
}
