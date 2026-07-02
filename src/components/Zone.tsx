import type { ReactNode } from "react";
import type { ZoneMeta } from "../zones";

interface ZoneProps {
  meta: ZoneMeta;
  children?: ReactNode;
}

export default function Zone({ meta, children }: ZoneProps) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border ${meta.accent.border} bg-surface-raised`}
    >
      <header className="flex items-center gap-2 border-b border-edge/60 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${meta.accent.dot}`} />
        <h2 className={`font-mono text-xs font-semibold ${meta.accent.title}`}>
          {meta.title}
        </h2>
        <span className="ml-auto hidden truncate text-[10px] text-slate-500 md:inline">
          {meta.subtitle}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
        {children}
      </div>
    </section>
  );
}
