import type { RuntimeItem } from "../engine/types";

export default function ItemCard({ item }: { item: RuntimeItem }) {
  return (
    <div className="rounded-md border border-edge bg-surface-overlay px-3 py-2 font-mono text-xs text-slate-200 shadow-sm">
      <span>{item.label}</span>
      {item.detail && <span className="ml-2 text-slate-500">{item.detail}</span>}
    </div>
  );
}
