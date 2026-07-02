import type { ExecutionState, ExecutionStep, RuntimeItem } from "./types";

const EMPTY_STATE: ExecutionState = {
  callStack: [],
  webApis: [],
  microtaskQueue: [],
  callbackQueue: [],
  consoleOutput: [],
  currentLine: null,
  eventLoopActive: false,
};

/**
 * Accumulates a mutable working state and records an immutable snapshot each
 * time {@link Trace.snapshot} is called. The resulting step list is what the UI
 * scrubs through. RuntimeItem objects are created once and reused across
 * snapshots so their identity is stable, which lets the animation layer track a
 * single card as it moves between zones.
 */
export class Trace {
  private readonly steps: ExecutionStep[] = [];
  private state: ExecutionState = { ...EMPTY_STATE };
  private nextItemId = 0;

  createItem(item: Omit<RuntimeItem, "id">): RuntimeItem {
    return { id: `item-${this.nextItemId++}`, ...item };
  }

  pushFrame(frame: RuntimeItem): void {
    this.state.callStack = [...this.state.callStack, frame];
  }

  popFrame(): void {
    this.state.callStack = this.state.callStack.slice(0, -1);
  }

  print(text: string): void {
    this.state.consoleOutput = [...this.state.consoleOutput, text];
  }

  setCurrentLine(line: number | null): void {
    this.state.currentLine = line;
  }

  setEventLoopActive(active: boolean): void {
    this.state.eventLoopActive = active;
  }

  snapshot(explanation: string): void {
    this.steps.push({
      ...this.state,
      callStack: [...this.state.callStack],
      webApis: [...this.state.webApis],
      microtaskQueue: [...this.state.microtaskQueue],
      callbackQueue: [...this.state.callbackQueue],
      consoleOutput: [...this.state.consoleOutput],
      explanation,
    });
  }

  build(): ExecutionStep[] {
    return this.steps;
  }
}
