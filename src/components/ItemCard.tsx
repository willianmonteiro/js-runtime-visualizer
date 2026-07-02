import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { RuntimeItem } from "../engine/types";

const spring = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const;

// forwardRef so AnimatePresence's popLayout mode can measure the card while it exits
const ItemCard = forwardRef<HTMLDivElement, { item: RuntimeItem }>(
  ({ item }, ref) => {
    const reduceMotion = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        layout
        initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
        transition={reduceMotion ? { duration: 0.12 } : spring}
        className="rounded-md border border-edge bg-surface-overlay px-3 py-2 font-mono text-xs text-slate-200 shadow-sm"
      >
        <span>{item.label}</span>
        {item.detail && <span className="ml-2 text-slate-500">{item.detail}</span>}
      </motion.div>
    );
  },
);

ItemCard.displayName = "ItemCard";

export default ItemCard;
