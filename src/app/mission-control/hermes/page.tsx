import type { Metadata } from "next";
import { fetchMutation, fetchQuery } from "convex/nextjs";

import { MissionControlApp } from "@/components/mission-control/MissionControlApp";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Mission Control Hermes",
  description: "Live Hermes chat threads and message history for Mission Control.",
};

export default async function MissionControlHermesPage() {
  await fetchMutation(api.hermesThreads.cleanupSeedData, {});
  const initialThreads = await fetchQuery(api.hermesThreads.listThreads, {});

  return <MissionControlApp tool="hermes" initialHermesThreads={initialThreads} />;
}
