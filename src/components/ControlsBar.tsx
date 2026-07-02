interface ControlsBarProps {
  onStep: () => void;
  onReset: () => void;
  canStep: boolean;
}

function ControlButton({
  label,
  glyph,
  onClick,
  disabled = false,
  primary = false,
}: {
  label: string;
  glyph: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const base =
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const tone = primary
    ? "bg-sky-500/90 text-white hover:bg-sky-400"
    : "bg-surface-overlay text-slate-300 hover:bg-edge hover:text-slate-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${tone}`}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </button>
  );
}

export default function ControlsBar({
  onStep,
  onReset,
  canStep,
}: ControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-edge bg-surface-raised px-5 py-3">
      {/* Play / Pause and Speed become interactive in the playback step. */}
      <ControlButton label="Play" glyph="▶" disabled primary />
      <ControlButton label="Pause" glyph="⏸" disabled />
      <ControlButton label="Step" glyph="⏭" onClick={onStep} disabled={!canStep} />
      <ControlButton label="Reset" glyph="↩" onClick={onReset} />

      <div className="ml-auto flex items-center gap-3 opacity-40">
        <span className="font-mono text-xs text-slate-400">Speed</span>
        <input
          type="range"
          min={1}
          max={5}
          defaultValue={3}
          disabled
          className="h-1 w-32 cursor-not-allowed appearance-none rounded-full bg-edge accent-sky-400"
        />
      </div>
    </div>
  );
}
