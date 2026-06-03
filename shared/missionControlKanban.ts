import {
  toMissionControlTaskStatus,
  type MissionControlTaskStatus,
} from "./missionControlTasks";

export type MissionControlKanbanTaskLike<TaskId extends string = string> = {
  _id: TaskId;
  status: string;
  updatedAt: number;
  kanbanOrder?: number;
};
export type MissionControlKanbanDragGeometry = {
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

const KANBAN_ORDER_STEP = 1000;

export function missionControlTaskKanbanOrder(task: MissionControlKanbanTaskLike) {
  return typeof task.kanbanOrder === "number" ? task.kanbanOrder : -task.updatedAt;
}

export function compareMissionControlKanbanTasks(
  left: MissionControlKanbanTaskLike,
  right: MissionControlKanbanTaskLike,
) {
  const orderDifference = missionControlTaskKanbanOrder(left) - missionControlTaskKanbanOrder(right);
  return orderDifference === 0 ? right.updatedAt - left.updatedAt : orderDifference;
}

export function resolveMissionControlKanbanDragCenter(dragGeometry: MissionControlKanbanDragGeometry) {
  return {
    x: dragGeometry.pointerX - dragGeometry.offsetX + dragGeometry.width / 2,
    y: dragGeometry.pointerY - dragGeometry.offsetY + dragGeometry.height / 2,
  };
}

export function resolveMissionControlKanbanDragTargetPoints(dragGeometry: MissionControlKanbanDragGeometry) {
  return [
    { x: dragGeometry.pointerX, y: dragGeometry.pointerY },
    resolveMissionControlKanbanDragCenter(dragGeometry),
  ];
}

export function resolveMissionControlKanbanOrder<TaskId extends string>(
  tasks: readonly MissionControlKanbanTaskLike<TaskId>[],
  options: {
    taskId: TaskId;
    status: MissionControlTaskStatus;
    beforeTaskId: TaskId | null;
    now?: number;
  },
) {
  const targetTasks = tasks
    .filter((task) => task._id !== options.taskId && toMissionControlTaskStatus(task.status) === options.status)
    .sort(compareMissionControlKanbanTasks);
  const nextTaskIndex = options.beforeTaskId
    ? targetTasks.findIndex((task) => task._id === options.beforeTaskId)
    : targetTasks.length;
  const normalizedNextTaskIndex = nextTaskIndex >= 0 ? nextTaskIndex : targetTasks.length;
  const previousTask = targetTasks[normalizedNextTaskIndex - 1];
  const nextTask = targetTasks[normalizedNextTaskIndex];

  if (previousTask && nextTask) {
    return (missionControlTaskKanbanOrder(previousTask) + missionControlTaskKanbanOrder(nextTask)) / 2;
  }
  if (nextTask) {
    return missionControlTaskKanbanOrder(nextTask) - KANBAN_ORDER_STEP;
  }
  if (previousTask) {
    return missionControlTaskKanbanOrder(previousTask) + KANBAN_ORDER_STEP;
  }
  return -(options.now ?? Date.now());
}
