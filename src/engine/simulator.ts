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

class Simulator {
  private readonly trace = new Trace();
  private readonly timers: PendingTimer[] = [];
  private readonly taskQueue: CallbackJob[] = [];
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

  private runEventLoop(): void {
    let iterations = 0;
    while (this.taskQueue.length > 0 || this.timers.length > 0) {
      if (iterations++ > MAX_LOOP_ITERATIONS) break;

      if (this.taskQueue.length === 0) {
        this.expireTimers();
      }
      if (this.taskQueue.length > 0) {
        this.runNextTask();
      }
    }
  }

  private expireTimers(): void {
    const nextExpiry = Math.min(...this.timers.map((timer) => timer.expiresAt));
    this.clock = Math.max(this.clock, nextExpiry);

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
        `The ${timer.delay}ms timer fires. Its callback moves from the Web APIs into the callback queue to await the event loop.`,
      );
    }
  }

  private runNextTask(): void {
    const job = this.taskQueue.shift()!;

    this.trace.setEventLoopActive(true);
    this.trace.dequeueCallback();
    this.trace.snapshot(
      "The call stack is empty, so the event loop takes the next callback from the callback queue and pushes it onto the stack.",
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
