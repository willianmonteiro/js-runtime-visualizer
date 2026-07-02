import { useCallback, useEffect, useMemo, useState } from "react";
import { simulate } from "../engine/simulator";
import type { ExecutionStep } from "../engine/types";

interface SimulationResult {
  steps: ExecutionStep[];
  error: string | null;
}

const EMPTY_STEP: ExecutionStep = {
  callStack: [],
  webApis: [],
  microtaskQueue: [],
  callbackQueue: [],
  consoleOutput: [],
  currentLine: null,
  eventLoopActive: false,
  explanation: "",
};

function safeSimulate(source: string): SimulationResult {
  try {
    return { steps: simulate(source), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse the code.";
    return {
      steps: [{ ...EMPTY_STEP, explanation: `Could not run: ${message}` }],
      error: message,
    };
  }
}

export function useSimulation(source: string) {
  const { steps, error } = useMemo(() => safeSimulate(source), [source]);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [steps]);

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
    error,
    stepForward,
    reset,
  };
}
