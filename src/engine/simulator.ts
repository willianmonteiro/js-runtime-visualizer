import { parse } from "acorn";
import type * as ESTree from "estree";
import { Trace } from "./trace";
import {
  callSignature,
  callbackLabel,
  calleeText,
  lineOf,
  staticValue,
} from "./ast";
import type { ExecutionStep } from "./types";

type CallbackFunction = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression;

interface CallbackJob {
  id: string;
  label: string;
  callback: CallbackFunction;
}

interface PendingTimer extends CallbackJob {
  delay: number;
  expiresAt: number;
}

interface MicrotaskJob extends CallbackJob {
  // handlers further down a `.then(...).then(...)` chain, scheduled one at a
  // time as each preceding promise settles.
  continuation: CallbackFunction[];
}

// guards against a snippet with a self-scheduling timer producing an endless trace.
const MAX_LOOP_ITERATIONS = 1000;

function parseProgram(source: string): ESTree.Program {
  return parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  }) as unknown as ESTree.Program;
}

function asCallback(node: ESTree.Node | undefined): CallbackFunction | null {
  if (
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression"
  ) {
    return node;
  }
  return null;
}

function delayOf(node: ESTree.Node | undefined): number {
  if (node?.type === "Literal" && typeof node.value === "number") {
    return node.value;
  }
  return 0;
}

function isThenCall(node: ESTree.Node): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "then"
  );
}

/** The receiver a `.then(...)` was called on, e.g. the `Promise.resolve()` in it */
function thenReceiver(call: ESTree.CallExpression): ESTree.Node {
  return (call.callee as ESTree.MemberExpression).object;
}

/** Flattens `Promise.resolve().then(a).then(b)` into its handlers `[a, b]` */
function collectThenHandlers(call: ESTree.CallExpression): CallbackFunction[] {
  const handlers: CallbackFunction[] = [];
  let node: ESTree.Node = call;
  while (isThenCall(node)) {
    const thenCall = node as ESTree.CallExpression;
    const handler = asCallback(thenCall.arguments[0]);
    if (handler) handlers.unshift(handler);
    node = thenReceiver(thenCall);
  }
  return handlers;
}

function promiseChainLabel(call: ESTree.CallExpression): string {
  let node: ESTree.Node = call;
  let thenCount = 0;
  while (isThenCall(node)) {
    thenCount += 1;
    node = thenReceiver(node as ESTree.CallExpression);
  }
  const root = node.type === "CallExpression" ? callSignature(node) : "promise";
  return root + ".then(fn)".repeat(thenCount);
}

class Simulator {
  private readonly trace = new Trace();
  private readonly microtaskQueue: MicrotaskJob[] = [];
  private readonly taskQueue: CallbackJob[] = [];
  private readonly timers: PendingTimer[] = [];
  private clock = 0;

  run(source: string): ExecutionStep[] {
    const program = parseProgram(source);

    const scriptFrame = this.trace.createItem({ label: "(script)", kind: "frame" });
    this.trace.pushFrame(scriptFrame);
    this.trace.snapshot(
      "The engine starts running the script. A frame for the top-level code sits on the call stack.",
    );

    this.runStatements(program.body);

    this.trace.popFrame();
    this.trace.snapshot(
      "Top-level code finishes, so the `(script)` frame leaves the stack.",
    );

    this.runEventLoop();

    this.trace.setCurrentLine(null);
    this.trace.setEventLoopActive(true);
    this.trace.snapshot(
      "Every queue is empty and the call stack is clear. The event loop has nothing left to do — execution is complete.",
    );

    return this.trace.build();
  }

  private runStatements(statements: ESTree.Node[]): void {
    for (const node of statements) {
      this.runStatement(node);
    }
  }

  private runStatement(node: ESTree.Node): void {
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression"
    ) {
      this.runCall(node.expression);
    }
    // declarations and other statements have no observable runtime effect in
    // supported subset, so they are skipped
  }

  private runCall(call: ESTree.CallExpression): void {
    const callee = calleeText(call.callee);
    if (callee === "console.log") {
      this.runConsoleLog(call);
    } else if (callee === "setTimeout") {
      this.runSetTimeout(call);
    } else if (isThenCall(call)) {
      this.runPromiseChain(call);
    } else {
      this.runGenericCall(call);
    }
  }

  private runConsoleLog(call: ESTree.CallExpression): void {
    const output = call.arguments.map(staticValue).join(" ");
    const frame = this.trace.createItem({
      label: callSignature(call),
      kind: "frame",
    });

    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

    this.trace.print(output);
    this.trace.snapshot(`\`console.log\` prints "${output}" to the console.`);

    this.trace.popFrame();
    this.trace.snapshot("`console.log` returns, so its frame pops off the stack.");
  }

  private runSetTimeout(call: ESTree.CallExpression): void {
    const callback = asCallback(call.arguments[0]);
    if (!callback) {
      this.runGenericCall(call);
      return;
    }

    const delay = delayOf(call.arguments[1]);
    const label = callbackLabel(callback);

    const frame = this.trace.createItem({
      label: callSignature(call),
      kind: "frame",
    });
    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

    const timerId = this.trace.freshId();
    this.timers.push({
      id: timerId,
      label,
      callback,
      delay,
      expiresAt: this.clock + delay,
    });
    this.trace.addWebApi({
      id: timerId,
      label,
      detail: `timer ${delay}ms`,
      kind: "webApi",
    });
    this.trace.snapshot(
      `setTimeout registers the callback with the Web APIs, which starts a ${delay}ms timer off the main thread. The engine does not wait.`,
    );

    this.trace.popFrame();
    this.trace.snapshot("setTimeout returns immediately, so its frame pops off the stack.");
  }

  private runPromiseChain(call: ESTree.CallExpression): void {
    const handlers = collectThenHandlers(call);
    const frame = this.trace.createItem({
      label: promiseChainLabel(call),
      kind: "frame",
    });

    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(
      "`Promise.resolve()` returns an already-resolved promise, and `.then(...)` registers a handler on it.",
    );

    if (handlers.length > 0) {
      const [first, ...rest] = handlers;
      this.scheduleMicrotask(first, rest);
      this.trace.snapshot(
        handlers.length > 1
          ? "Because the promise is already resolved, the first `.then` handler is queued as a microtask. The chained handlers are scheduled one by one, each after its predecessor settles."
          : "Because the promise is already resolved, the handler is queued as a microtask — not run immediately.",
      );
    }

    this.trace.popFrame();
    this.trace.snapshot("The statement finishes; the queued microtask waits for the call stack to clear.");
  }

  private runGenericCall(call: ESTree.CallExpression): void {
    const frame = this.trace.createItem({
      label: callSignature(call),
      kind: "frame",
    });

    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

    this.trace.popFrame();
    this.trace.snapshot(`\`${frame.label}\` returns, so its frame pops off the stack.`);
  }

  private runCallbackBody(callback: CallbackFunction): void {
    if (callback.body.type === "BlockStatement") {
      this.runStatements(callback.body.body);
    } else if (callback.body.type === "CallExpression") {
      this.runCall(callback.body);
    }
  }

  private scheduleMicrotask(
    callback: CallbackFunction,
    continuation: CallbackFunction[],
  ): void {
    const id = this.trace.freshId();
    const label = callbackLabel(callback);
    this.microtaskQueue.push({ id, label, callback, continuation });
    this.trace.enqueueMicrotask({ id, label, kind: "microtask" });
  }

  private runEventLoop(): void {
    let iterations = 0;
    while (
      this.microtaskQueue.length > 0 ||
      this.taskQueue.length > 0 ||
      this.timers.length > 0
    ) {
      if (iterations++ > MAX_LOOP_ITERATIONS) break;

      // A timer that has already elapsed waits in the callback queue while the
      // microtask queue drains, so both queues can be populated at once.
      this.flushExpiredTimers();

      if (this.microtaskQueue.length > 0) {
        this.drainMicrotasks();
      } else if (this.taskQueue.length > 0) {
        this.runNextTask();
      } else if (this.timers.length > 0) {
        this.advanceClockToNextTimer();
      }
    }
  }

  /** Runs every queued microtask, including any queued while draining */
  private drainMicrotasks(): void {
    while (this.microtaskQueue.length > 0) {
      const job = this.microtaskQueue.shift()!;

      this.trace.setEventLoopActive(true);
      this.trace.dequeueMicrotask();
      this.trace.snapshot(
        "The call stack is empty, so the event loop drains the microtask queue — every microtask runs before the next callback-queue task.",
      );
      this.trace.setEventLoopActive(false);

      const frame = { id: job.id, label: job.label, kind: "frame" as const };
      this.trace.pushFrame(frame);
      this.trace.snapshot(`The microtask \`${job.label}\` runs.`);

      this.runCallbackBody(job.callback);

      if (job.continuation.length > 0) {
        const [next, ...rest] = job.continuation;
        this.scheduleMicrotask(next, rest);
        this.trace.snapshot(
          "This handler settles the next promise in the chain, queuing the following `.then` handler as a microtask.",
        );
      }

      this.trace.popFrame();
      this.trace.snapshot("The microtask finishes, so its frame pops off the stack.");
    }
  }

  /** Moves every timer whose delay has elapsed from the Web APIs to the queue. */
  private flushExpiredTimers(): void {
    const ready = this.timers
      .filter((timer) => timer.expiresAt <= this.clock)
      .sort((a, b) => a.expiresAt - b.expiresAt);

    for (const timer of ready) {
      this.timers.splice(this.timers.indexOf(timer), 1);
      this.taskQueue.push(timer);

      this.trace.setEventLoopActive(true);
      this.trace.removeWebApi(timer.id);
      this.trace.enqueueCallback({
        id: timer.id,
        label: timer.label,
        kind: "task",
      });
      this.trace.snapshot(
        `The ${timer.delay}ms timer has elapsed, so its callback moves from the Web APIs into the callback queue to await the event loop.`,
      );
    }
  }

  private advanceClockToNextTimer(): void {
    this.clock = Math.min(...this.timers.map((timer) => timer.expiresAt));
  }

  private runNextTask(): void {
    const job = this.taskQueue.shift()!;

    this.trace.setEventLoopActive(true);
    this.trace.dequeueCallback();
    this.trace.snapshot(
      "The microtask queue is empty, so the event loop takes the next callback from the callback queue and pushes it onto the stack.",
    );
    this.trace.setEventLoopActive(false);

    const frame = { id: job.id, label: job.label, kind: "frame" as const };
    this.trace.pushFrame(frame);
    this.trace.snapshot(`The callback \`${job.label}\` runs.`);

    this.runCallbackBody(job.callback);

    this.trace.popFrame();
    this.trace.snapshot("The callback finishes, so its frame pops off the stack.");
  }
}

export function simulate(source: string): ExecutionStep[] {
  return new Simulator().run(source);
}
