import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Hermes",
  description: "Live Hermes Agent terminal sessions for Mission Control.",
};

export default async function MissionControlHermesPage() {
  await fetchMutation(api.teamMembers.ensureSeedData, {});
  await fetchMutation(api.officePresence.ensureSeedData, {});
  await fetchMutation(api.hermesThreads.cleanupSeedData, {});
  const [initialThreads, initialTeamMembers, initialOfficePresence] = await Promise.all([
    fetchQuery(api.hermesThreads.listThreads, {}),
    fetchQuery(api.teamMembers.list, {}),
    fetchQuery(api.officePresence.list, {}),
  ]);

  return (
    <MissionControlApp
      tool="hermes"
      initialHermesThreads={initialThreads}
      initialTeamMembers={initialTeamMembers}
      initialOfficePresence={initialOfficePresence}
    />
  );
}
