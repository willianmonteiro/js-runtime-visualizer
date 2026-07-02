export default function EventLoopIndicator() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-edge bg-surface-raised px-4 py-2">
      <span className="text-slate-500">↻</span>
      <span className="font-mono text-xs font-medium text-slate-300">
        Event Loop
      </span>
      <span className="text-xs text-slate-500">
        is the call stack empty?
      </span>
    </div>
  );
}
