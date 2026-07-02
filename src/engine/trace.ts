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
 * scrubs through.
 *
 * RuntimeItems are never mutated in place: a card that changes zone is written
 * as a fresh object that keeps the same `id`. This keeps past snapshots intact
 * while giving the animation layer a stable identity to follow across zones
 */
export class Trace {
  private readonly steps: ExecutionStep[] = [];
  private state: ExecutionState = { ...EMPTY_STATE };
  private nextItemId = 0;

  freshId(): string {
    return `item-${this.nextItemId++}`;
  }

  createItem(item: Omit<RuntimeItem, "id">): RuntimeItem {
    return { id: this.freshId(), ...item };
  }

  pushFrame(frame: RuntimeItem): void {
    this.state.callStack = [...this.state.callStack, frame];
  }

  popFrame(): void {
    this.state.callStack = this.state.callStack.slice(0, -1);
  }

  addWebApi(item: RuntimeItem): void {
    this.state.webApis = [...this.state.webApis, item];
  }

  removeWebApi(id: string): void {
    this.state.webApis = this.state.webApis.filter((item) => item.id !== id);
  }

  enqueueCallback(item: RuntimeItem): void {
    this.state.callbackQueue = [...this.state.callbackQueue, item];
  }

  dequeueCallback(): void {
    this.state.callbackQueue = this.state.callbackQueue.slice(1);
  }

  hasCallbacks(): boolean {
    return this.state.callbackQueue.length > 0;
  }

  enqueueMicrotask(item: RuntimeItem): void {
    this.state.microtaskQueue = [...this.state.microtaskQueue, item];
  }

  dequeueMicrotask(): void {
    this.state.microtaskQueue = this.state.microtaskQueue.slice(1);
  }

  hasMicrotasks(): boolean {
    return this.state.microtaskQueue.length > 0;
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
