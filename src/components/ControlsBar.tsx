function ControlButton({
  label,
  glyph,
  primary = false,
}: {
  label: string;
  glyph: string;
  primary?: boolean;
}) {
  const base =
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors";
  const tone = primary
    ? "bg-sky-500/90 text-white hover:bg-sky-400"
    : "bg-surface-overlay text-slate-300 hover:bg-edge hover:text-slate-100";
  return (
    <button type="button" className={`${base} ${tone}`}>
      <span aria-hidden>{glyph}</span>
      {label}
    </button>
  );
}

export default function ControlsBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-edge bg-surface-raised px-5 py-3">
      <ControlButton label="Play" glyph="▶" primary />
      <ControlButton label="Pause" glyph="⏸" />
      <ControlButton label="Step" glyph="⏭" />
      <ControlButton label="Reset" glyph="↩" />

      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400">Speed</span>
        <input
          type="range"
          min={1}
          max={5}
          defaultValue={3}
          className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-edge accent-sky-400"
        />
      </div>
    </div>
  );
}
