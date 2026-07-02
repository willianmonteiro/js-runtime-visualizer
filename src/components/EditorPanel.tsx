const PRESET_PLACEHOLDERS = [
  "Synchronous order",
  "setTimeout(0)",
  "Promise vs setTimeout",
  "Multiple microtasks",
  "async / await",
  "Nested setTimeout",
  "Promise chaining",
  "The classic mix",
];

export default function EditorPanel() {
  return (
    <div className="flex h-full flex-col gap-4">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Code Editor
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed text-slate-600">
          {/* CodeMirror lands here in step 7 */}
          // pick a preset or write your own JS
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Presets
        </div>
        <ul className="flex flex-col p-2">
          {PRESET_PLACEHOLDERS.map((label) => (
            <li key={label}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-1.5 text-left font-mono text-sm text-slate-400 transition-colors hover:bg-surface-overlay hover:text-slate-200"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
