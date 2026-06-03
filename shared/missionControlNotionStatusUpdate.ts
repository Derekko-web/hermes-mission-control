import type { MissionControlTaskStatus } from "./missionControlTasks";

export function buildNotionStatusPropertyPatch(
  statusPropertyName: string,
  status: MissionControlTaskStatus,
) {
  return {
    [statusPropertyName]: {
      status: {
        name: status,
      },
    },
  };
}
