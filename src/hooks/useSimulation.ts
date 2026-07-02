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

// milliseconds between auto-advanced steps, indexed by the 1-5 speed setting
const STEP_DELAY_BY_SPEED = [0, 1400, 850, 500, 280, 140];

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);

  const clampedIndex = Math.min(index, steps.length - 1);
  const atStart = clampedIndex === 0;
  const atEnd = clampedIndex === steps.length - 1;

  useEffect(() => {
    setIndex(0);
    setIsPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!isPlaying) return;
    if (clampedIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(
      () => setIndex((current) => current + 1),
      STEP_DELAY_BY_SPEED[speed],
    );
    return () => clearTimeout(timer);
  }, [isPlaying, clampedIndex, speed, steps.length]);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const play = useCallback(() => {
    setIndex((current) => (current >= steps.length - 1 ? 0 : current));
    setIsPlaying(true);
  }, [steps.length]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setIndex(0);
  }, []);

  return {
    step: steps[clampedIndex],
    index: clampedIndex,
    total: steps.length,
    atStart,
    atEnd,
    error,
    isPlaying,
    speed,
    stepForward,
    play,
    pause,
    reset,
    setSpeed,
  };
}
