import { Plus } from "lucide-react";

type MissionControlNewTaskButtonProps = {
  onClick: () => void;
};

export function MissionControlNewTaskButton({ onClick }: MissionControlNewTaskButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#5b49ff] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6b5bff]"
    >
      <Plus className="h-4 w-4" />
      New task
    </button>
  );
}
