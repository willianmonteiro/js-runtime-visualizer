export type ZoneId = "callStack" | "webApis" | "microtaskQueue" | "callbackQueue";

export interface ZoneMeta {
  id: ZoneId;
  title: string;
  subtitle: string;
  accent: {
    border: string;
    title: string;
    dot: string;
  };
}

export const ZONES: Record<ZoneId, ZoneMeta> = {
  callStack: {
    id: "callStack",
    title: "Call Stack",
    subtitle: "runs one frame at a time (LIFO)",
    accent: {
      border: "border-sky-500/40",
      title: "text-sky-300",
      dot: "bg-sky-400",
    },
  },
  webApis: {
    id: "webApis",
    title: "Web APIs",
    subtitle: "timers & async work run off-thread",
    accent: {
      border: "border-amber-500/40",
      title: "text-amber-300",
      dot: "bg-amber-400",
    },
  },
  microtaskQueue: {
    id: "microtaskQueue",
    title: "Microtask Queue",
    subtitle: "promises — drained first, fully",
    accent: {
      border: "border-violet-500/40",
      title: "text-violet-300",
      dot: "bg-violet-400",
    },
  },
  callbackQueue: {
    id: "callbackQueue",
    title: "Callback Queue",
    subtitle: "timers & events — one per loop tick",
    accent: {
      border: "border-emerald-500/40",
      title: "text-emerald-300",
      dot: "bg-emerald-400",
    },
  },
};

export const ZONE_ORDER: ZoneId[] = [
  "callStack",
  "webApis",
  "microtaskQueue",
  "callbackQueue",
];
