export function TaskColumnEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[148px] items-center justify-center px-4 text-center text-sm text-zinc-600">
      {label}
    </div>
  );
}
