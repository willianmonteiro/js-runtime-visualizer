import { AnimatePresence, motion } from "framer-motion";
import { ZONES } from "../zones";
import type { ExecutionStep, RuntimeItem } from "../engine/types";
import Zone from "./Zone";
import ItemCard from "./ItemCard";
import EventLoopIndicator from "./EventLoopIndicator";

function ZoneContents({ items }: { items: RuntimeItem[] }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {items.length === 0 ? (
        <motion.p
          key="empty"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pt-1 font-mono text-[11px] text-slate-600"
        >
          empty
        </motion.p>
      ) : (
        items.map((item) => <ItemCard key={item.id} item={item} />)
      )}
    </AnimatePresence>
  );
}

export default function VisualizationPanel({ step }: { step: ExecutionStep }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_1fr] gap-3 lg:grid-cols-2">
        <Zone meta={ZONES.callStack}>
          {/* newest frame on top, the way a call stack is conventionally drawn */}
          <ZoneContents items={[...step.callStack].reverse()} />
        </Zone>
        <Zone meta={ZONES.webApis}>
          <ZoneContents items={step.webApis} />
        </Zone>
        <Zone meta={ZONES.microtaskQueue}>
          <ZoneContents items={step.microtaskQueue} />
        </Zone>
        <Zone meta={ZONES.callbackQueue}>
          <ZoneContents items={step.callbackQueue} />
        </Zone>
      </div>
      <EventLoopIndicator active={step.eventLoopActive} />
    </div>
  );
}
