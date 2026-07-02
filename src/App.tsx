import { motion } from "framer-motion";

export default function App() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="font-mono text-2xl font-semibold text-slate-100"
      >
        JS Runtime Visualizer
      </motion.h1>
      <p className="font-mono text-sm text-slate-500">
        React · TypeScript · Tailwind · Framer Motion
      </p>
    </div>
  );
}
