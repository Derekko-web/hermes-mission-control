import type { Doc } from "../../../convex/_generated/dataModel";
import type { PixelOfficeAgent } from "./mission-control-office-types";

export type TeamMemberDoc = Doc<"teamMembers">;
export type OfficePresenceDoc = Doc<"officePresence">;
export type OfficeRosterEntry = {
  member: TeamMemberDoc;
  presence: OfficePresenceDoc | null;
};

const STATUS_LABELS: Record<OfficePresenceDoc["status"], string> = {
  working: "Working",
  reviewing: "Reviewing",
  designing: "Designing",
  writing: "Writing",
  monitoring: "Monitoring",
  idle: "Idle",
};

export const LIVE_ACTIVITY_WINDOW_MS = 30 * 60_000;

function isInternalHermesInstructionActivity(
  presence: Pick<OfficePresenceDoc, "activeTool" | "currentTask">,
) {
  if (presence.activeTool !== "Hermes") {
    return false;
  }

  const activity = presence.currentTask?.trim().toLowerCase();
  if (!activity) {
    return false;
  }

  return (
    activity.startsWith("hermes: run the task, but leave the card status") ||
    activity.startsWith("hermes: start working on this mission control task") ||
    activity.includes("mission control card rule:") ||
    activity.includes("do not change the card status")
  );
}

export function isLiveOfficePresence(
  presence: Pick<OfficePresenceDoc, "activeTool" | "currentTask" | "status" | "lastUpdatedAt">,
  now = Date.now(),
) {
  return (
    presence.status !== "idle" &&
    !isInternalHermesInstructionActivity(presence) &&
    now - presence.lastUpdatedAt <= LIVE_ACTIVITY_WINDOW_MS
  );
}

export function buildPixelOfficeAgents(
  officeRoster: readonly OfficeRosterEntry[],
  now = Date.now(),
): PixelOfficeAgent[] {
  return officeRoster.map(({ member, presence }, index) => {
    const isLive = presence ? isLiveOfficePresence(presence, now) : false;
    const isActive = Boolean(presence && isLive && presence.status !== "idle");
    const activity = presence?.currentTask ?? "Standing by";
    const activeTool = presence?.activeTool ?? "Mission Control";

    return {
      id: member.sortOrder + 1 || index + 1,
      memberId: String(member._id),
      name: member.name,
      roleTitle: member.roleTitle,
      statusLabel: presence && isLive ? STATUS_LABELS[presence.status] : STATUS_LABELS.idle,
      activity,
      activeTool,
      isActive,
    };
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
