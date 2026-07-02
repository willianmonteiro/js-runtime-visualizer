interface StatusBarProps {
  explanation: string;
  index: number;
  total: number;
}

export default function StatusBar({ explanation, index, total }: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 border-t border-edge bg-surface px-5 py-2.5">
      <p className="min-w-0 flex-1 truncate text-sm text-slate-300">
        {explanation}
      </p>
      <span className="shrink-0 font-mono text-xs text-slate-500">
        step {index + 1} / {total}
      </span>
    </div>
  );
}
