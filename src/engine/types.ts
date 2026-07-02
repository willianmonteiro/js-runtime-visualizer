export type ItemKind = "frame" | "microtask" | "task" | "webApi";

export interface RuntimeItem {
  id: string;
  label: string;
  detail?: string;
  kind: ItemKind;
}

export interface ConsoleEntry {
  text: string;
  level: "log" | "error";
}

export interface ExecutionState {
  callStack: RuntimeItem[];
  webApis: RuntimeItem[];
  microtaskQueue: RuntimeItem[];
  callbackQueue: RuntimeItem[];
  consoleOutput: ConsoleEntry[];
  currentLine: number | null;
  eventLoopActive: boolean;
}

export interface ExecutionStep extends ExecutionState {
  explanation: string;
}
