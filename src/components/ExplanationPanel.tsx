import type { ReactNode } from "react";

interface ExplanationPanelProps {
  explanation: string;
  index: number;
  total: number;
}

/** renders `code`-quoted spans as styled chips so identifiers stand out */
function formatExplanation(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, position) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={position}
          className="rounded bg-surface-overlay px-1 py-0.5 font-mono text-[0.85em] text-sky-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={position}>{part}</span>;
  });
}

export default function ExplanationPanel({
  explanation,
  index,
  total,
}: ExplanationPanelProps) {
  const progress = total > 1 ? (index / (total - 1)) * 100 : 100;

  return (
    <div className="border-t border-edge bg-surface px-5 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
          <span className="text-sky-400">▹</span> What&rsquo;s happening
        </span>
        <span className="font-mono text-xs text-slate-500">
          step {index + 1} / {total}
        </span>
      </div>
      <p className="min-h-[2.5rem] text-sm leading-relaxed text-slate-200">
        {formatExplanation(explanation)}
      </p>
      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-edge">
        <div
          className="h-full rounded-full bg-sky-500/70 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
