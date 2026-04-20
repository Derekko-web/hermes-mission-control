"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { type MissionControlTeamAccent, type MissionControlTeamNode, MissionControlTeamLayout } from "./MissionControlTeamLayout";

type TeamMemberDoc = Doc<"teamMembers">;

const EMPTY_TEAM: TeamMemberDoc[] = [];

function buildNode(member: TeamMemberDoc): MissionControlTeamNode {
  return {
    id: member._id,
    name: member.name,
    role: member.roleTitle,
    summary: member.summary ?? member.tagline ?? `${member.name} supports Mission Control with a dedicated specialty lane.`,
    avatarLabel: member.avatarLabel,
    accent: member.color as MissionControlTeamAccent,
    chips: (member.focusAreas ?? member.takesFromCodex ?? []).slice(0, 3),
    meta: "Role card →",
  };
}

export function MissionControlTeamView({ initialTeamMembers }: { initialTeamMembers: TeamMemberDoc[] }) {
  const teamMembersQuery = useQuery(api.teamMembers.list);

  const teamMembers = useMemo(
    () => [...(teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM)].sort((left, right) => left.sortOrder - right.sortOrder),
    [initialTeamMembers, teamMembersQuery],
  );

  const leadMember = useMemo(
    () => teamMembers.find((member) => member.memberType === "core_agent") ?? null,
    [teamMembers],
  );

  const subagents = useMemo(
    () => teamMembers.filter((member) => member.memberType === "subagent").map(buildNode),
    [teamMembers],
  );

  const disciplineCount = new Set(teamMembers.map((member) => member.discipline)).size;
  const activeCount = teamMembers.filter((member) => member.memberType === "subagent").length;
  const observedCount = teamMembers.filter((member) => member.state === "observed").length;

  if (!leadMember) {
    return (
      <section className="bg-[#0b0b0d] px-6 py-16 text-[#f5f5f7] sm:px-10 lg:px-12">
        <div className="mx-auto max-w-[720px] rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center shadow-[0_20px_48px_-32px_rgba(0,0,0,0.8)]">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white/94">Meet the Team</h1>
          <p className="mt-3 text-sm leading-6 text-white/52">
            Team member data has not been observed yet, so there is nothing trustworthy to render here.
          </p>
        </div>
      </section>
    );
  }

  const leaderNode = buildNode(leadMember);
  const leaderChips = leadMember.responsibilities.slice(0, 3).map((item) => {
    const words = item.replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
    return words.slice(0, 2).join(" ");
  });

  const metaNode: MissionControlTeamNode = {
    id: "operating-model",
    name: "Operating Model",
    role: "Delegation System",
    summary: `${leadMember.name} routes work through the recurring developer, writer, and designer lanes and closes the loop with verification.`,
    avatarLabel: "◎",
    accent: "indigo",
    chips: [`${activeCount} subagents`, `${disciplineCount} disciplines`, `${observedCount} observed`],
    meta: "Role card →",
  };

  return (
    <MissionControlTeamLayout
      title="Meet the Team"
      leader={{
        ...leaderNode,
        chips: leaderChips,
      }}
      middleLabelLeft="↓ INPUT SIGNAL"
      middleLabelRight="OUTPUT ACTION ↓"
      directReports={subagents}
      metaLabel="✺ META LAYER"
      metaNode={metaNode}
    />
  );
}
