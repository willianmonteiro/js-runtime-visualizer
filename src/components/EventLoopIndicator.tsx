export default function EventLoopIndicator({ active }: { active: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-lg border px-4 py-2 transition-colors ${
        active
          ? "border-sky-500/50 bg-sky-500/10"
          : "border-edge bg-surface-raised"
      }`}
    >
      <span className={active ? "text-sky-300" : "text-slate-500"}>↻</span>
      <span
        className={`font-mono text-xs font-medium ${
          active ? "text-sky-200" : "text-slate-300"
        }`}
      >
        Event Loop
      </span>
      <span className="text-xs text-slate-500">
        {active
          ? "call stack is empty — checking the queues"
          : "waiting for the call stack to empty"}
      </span>
    </div>
  );
}
