import { PRESETS } from "../engine/presets";

interface EditorPanelProps {
  source: string;
  currentLine: number | null;
  consoleOutput: string[];
}

function CodeView({
  source,
  currentLine,
}: {
  source: string;
  currentLine: number | null;
}) {
  const lines = source.replace(/\n$/, "").split("\n");
  return (
    <pre className="min-h-0 flex-1 overflow-auto py-3 font-mono text-sm leading-relaxed">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const active = lineNumber === currentLine;
        return (
          <div
            key={lineNumber}
            className={`flex ${active ? "bg-sky-500/10" : ""}`}
          >
            <span className="w-10 shrink-0 select-none pr-3 text-right text-xs text-slate-600">
              {lineNumber}
            </span>
            <code
              className={`pr-4 ${active ? "text-slate-100" : "text-slate-400"}`}
            >
              {line || " "}
            </code>
          </div>
        );
      })}
    </pre>
  );
}

export default function EditorPanel({
  source,
  currentLine,
  consoleOutput,
}: EditorPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Code Editor
        </div>
        <CodeView source={source} currentLine={currentLine} />
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Presets
        </div>
        <ul className="flex flex-col p-2">
          {PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-1.5 text-left font-mono text-sm text-slate-400 transition-colors hover:bg-surface-overlay hover:text-slate-200"
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Console
        </div>
        <div className="max-h-32 min-h-[3rem] overflow-auto p-3 font-mono text-sm">
          {consoleOutput.length === 0 ? (
            <p className="text-[11px] text-slate-600">no output yet</p>
          ) : (
            consoleOutput.map((line, index) => (
              <div key={index} className="text-emerald-300">
                <span className="mr-2 select-none text-slate-600">›</span>
                {line}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
