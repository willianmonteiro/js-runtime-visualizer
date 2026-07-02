import { PRESETS } from "../engine/presets";
import type { ConsoleEntry } from "../engine/types";
import CodeEditor from "./editor/CodeEditor";

interface EditorPanelProps {
  source: string;
  onSourceChange: (value: string) => void;
  currentLine: number | null;
  consoleOutput: ConsoleEntry[];
  activePresetId: string | null;
  onSelectPreset: (id: string) => void;
}

export default function EditorPanel({
  source,
  onSourceChange,
  currentLine,
  consoleOutput,
  activePresetId,
  onSelectPreset,
}: EditorPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Code Editor
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CodeEditor
            value={source}
            onChange={onSourceChange}
            currentLine={currentLine}
          />
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface-raised">
        <div className="border-b border-edge px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          Presets
        </div>
        <ul className="flex max-h-44 flex-col overflow-y-auto p-2">
          {PRESETS.map((preset) => {
            const active = preset.id === activePresetId;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`w-full rounded-md px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                    active
                      ? "bg-sky-500/15 text-sky-200"
                      : "text-slate-400 hover:bg-surface-overlay hover:text-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              </li>
            );
          })}
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
            consoleOutput.map((entry, index) =>
              entry.level === "error" ? (
                <div key={index} className="whitespace-pre text-rose-400">
                  {entry.text}
                </div>
              ) : (
                <div key={index} className="text-emerald-300">
                  <span className="mr-2 select-none text-slate-600">›</span>
                  {entry.text}
                </div>
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
}
