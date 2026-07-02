interface ControlsBarProps {
  isPlaying: boolean;
  canStep: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
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
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const base =
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const tone = primary
    ? "bg-sky-500/90 text-white hover:bg-sky-400"
    : "bg-surface-overlay text-slate-300 hover:bg-edge hover:text-slate-100";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tone}`}>
      <span aria-hidden>{glyph}</span>
      {label}
    </button>
  );
}

export default function ControlsBar({
  isPlaying,
  canStep,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
}: ControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-edge bg-surface-raised px-5 py-3">
      {isPlaying ? (
        <ControlButton label="Pause" glyph="⏸" onClick={onPause} primary />
      ) : (
        <ControlButton label="Play" glyph="▶" onClick={onPlay} primary />
      )}
      <ControlButton label="Step" glyph="⏭" onClick={onStep} disabled={isPlaying || !canStep} />
      <ControlButton label="Reset" glyph="↩" onClick={onReset} />

      <label className="ml-auto flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400">Speed</span>
        <input
          type="range"
          min={1}
          max={5}
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-edge accent-sky-400"
        />
        <span className="w-6 font-mono text-xs text-slate-500">{speed}×</span>
      </label>
    </div>
  );
}
