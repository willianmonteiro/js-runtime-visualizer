export default function Header() {
  return (
    <header className="flex items-center gap-3 border-b border-edge bg-surface-raised px-5 py-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-sky-500/15 font-mono text-sm font-bold text-sky-300">
        JS
      </span>
      <h1 className="font-mono text-sm font-semibold tracking-tight text-slate-100">
        Runtime Visualizer
      </h1>
      <span className="hidden text-xs text-slate-500 sm:inline">
        Watch the event loop, call stack, and queues execute step by step
      </span>
    </header>
  );
}
