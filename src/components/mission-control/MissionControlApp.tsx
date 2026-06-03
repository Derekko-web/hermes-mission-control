import type { MissionControlTool } from "@/components/mission-control/MissionControlShell";
import type { Doc } from "../../../convex/_generated/dataModel";
import { MissionControlCalendarView } from "@/components/mission-control/MissionControlCalendarView";
import { MissionControlHermesView } from "@/components/mission-control/MissionControlHermesView";
import { MissionControlMemoryView } from "@/components/mission-control/MissionControlMemoryView";
import { MissionControlOfficeView } from "@/components/mission-control/MissionControlOfficeView";
import { MissionControlShell } from "@/components/mission-control/MissionControlShell";
import { MissionControlTasksView } from "@/components/mission-control/MissionControlTasksView";

type MissionControlAppProps = {
  tool: MissionControlTool;
  initialTasks?: Doc<"tasks">[];
  initialScheduledItems?: Doc<"scheduledItems">[];
  initialMemories?: Doc<"memories">[];
  initialTeamMembers?: Doc<"teamMembers">[];
  initialOfficePresence?: Doc<"officePresence">[];
  initialHermesThreads?: Doc<"hermesThreads">[];
};

export function MissionControlApp({
  tool,
  initialTasks,
  initialScheduledItems,
  initialMemories,
  initialTeamMembers,
  initialOfficePresence,
  initialHermesThreads,
}: MissionControlAppProps) {
  const view =
    tool === "calendar" ? (
      <MissionControlCalendarView initialScheduledItems={initialScheduledItems ?? []} />
    ) : tool === "hermes" ? (
      <MissionControlHermesView
        initialThreads={initialHermesThreads ?? []}
        initialTeamMembers={initialTeamMembers ?? []}
      />
    ) : tool === "memory" ? (
      <MissionControlMemoryView initialMemories={initialMemories ?? []} />
    ) : tool === "office" ? (
      <MissionControlOfficeView
        initialTeamMembers={initialTeamMembers ?? []}
        initialOfficePresence={initialOfficePresence ?? []}
      />
    ) : (
      <MissionControlTasksView initialTasks={initialTasks ?? []} />
    );

  return (
    <MissionControlShell tool={tool}>
      {view}
    </MissionControlShell>
  );
}
