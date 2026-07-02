import { useCallback, useMemo, useState } from "react";
import { simulate } from "../engine/simulator";

export function useSimulation(source: string) {
  const steps = useMemo(() => simulate(source), [source]);
  const [index, setIndex] = useState(0);

  const clampedIndex = Math.min(index, steps.length - 1);
  const atStart = clampedIndex === 0;
  const atEnd = clampedIndex === steps.length - 1;

  const stepForward = useCallback(() => {
    setIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const reset = useCallback(() => setIndex(0), []);

  return {
    step: steps[clampedIndex],
    index: clampedIndex,
    total: steps.length,
    atStart,
    atEnd,
    stepForward,
    reset,
  };
}
