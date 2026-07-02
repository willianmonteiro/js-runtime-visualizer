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

type Value = string | number | boolean | null | undefined;

type Scope = Map<string, Value>;

interface CallbackJob {
  id: string;
  label: string;
  callback: CallbackFunction;
}

interface PendingTimer extends CallbackJob {
  delay: number;
  expiresAt: number;
}

interface MicrotaskJob {
  id: string;
  label: string;
  resume: () => void;
}

interface AwaitPoint {
  varName?: string;
  value: string;
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

/** The settled value of an awaited expression, e.g. `Promise.resolve("data")` yields `data` */
function awaitedValue(node: ESTree.Expression): string {
  if (
    node.type === "CallExpression" &&
    calleeText(node.callee) === "Promise.resolve"
  ) {
    return node.arguments[0] ? staticValue(node.arguments[0]) : "undefined";
  }
  return staticValue(node);
}

// thrown internally to unwind the simulator's own recursion when the running
// program throws; carries the stack trace captured at the throw site
class SimulatedError {
  constructor(
    readonly name: string,
    readonly message: string,
    readonly stackTrace: string[],
  ) {}
}

function throwInfo(argument: ESTree.Expression): { name: string; message: string } {
  if (argument.type === "NewExpression") {
    const name =
      argument.callee.type === "Identifier" ? argument.callee.name : "Error";
    const first = argument.arguments[0];
    const message = first?.type === "Literal" ? String(first.value) : "";
    return { name, message };
  }
  if (argument.type === "Literal") {
    return { name: "Error", message: String(argument.value) };
  }
  return { name: "Error", message: "" };
}

function formatStackFrame(label: string): string {
  return label === "(script)" ? "(anonymous)" : label.replace(/\(.*\)$/, "");
}

function display(value: Value): string {
  return value === undefined ? "undefined" : String(value);
}

function applyBinaryOperator(operator: string, left: Value, right: Value): Value {
  switch (operator) {
    case "+":
      return (left as number) + (right as number);
    case "-":
      return (left as number) - (right as number);
    case "*":
      return (left as number) * (right as number);
    case "/":
      return (left as number) / (right as number);
    case "%":
      return (left as number) % (right as number);
    default:
      return undefined;
  }
}

/** Detects `await x` or `const y = await x`, returning the bound name and settled value */
function extractAwait(statement: ESTree.Node): AwaitPoint | null {
  if (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "AwaitExpression"
  ) {
    return { value: awaitedValue(statement.expression.argument) };
  }
  if (statement.type === "VariableDeclaration" && statement.declarations.length === 1) {
    const declarator = statement.declarations[0];
    if (
      declarator.init?.type === "AwaitExpression" &&
      declarator.id.type === "Identifier"
    ) {
      return {
        varName: declarator.id.name,
        value: awaitedValue(declarator.init.argument),
      };
    }
  }
  return null;
}

class Simulator {
  private readonly trace = new Trace();
  private readonly microtaskQueue: MicrotaskJob[] = [];
  private readonly taskQueue: CallbackJob[] = [];
  private readonly timers: PendingTimer[] = [];
  private readonly functions = new Map<string, ESTree.FunctionDeclaration>();
  private scope: Scope = new Map();
  private clock = 0;

  run(source: string): ExecutionStep[] {
    const program = parseProgram(source);
    this.hoistFunctions(program.body);

    const scriptFrame = this.trace.createItem({ label: "(script)", kind: "frame" });
    this.trace.pushFrame(scriptFrame);
    this.trace.snapshot(
      "The engine starts running the script. A frame for the top-level code sits on the call stack.",
    );

    try {
      this.runStatements(program.body);
      this.trace.popFrame();
      this.trace.snapshot(
        "Top-level code finishes, so the `(script)` frame leaves the stack.",
      );
    } catch (error) {
      if (!(error instanceof SimulatedError)) throw error;
      this.reportUncaughtError(error);
    }

    this.runEventLoop();

    this.trace.setCurrentLine(null);
    this.trace.setEventLoopActive(true);
    this.trace.snapshot(
      "Every queue is empty and the call stack is clear. The event loop has nothing left to do — execution is complete.",
    );

    return this.trace.build();
  }

  private hoistFunctions(statements: ESTree.Node[]): void {
    for (const node of statements) {
      if (node.type === "FunctionDeclaration" && node.id) {
        this.functions.set(node.id.name, node);
      }
    }
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
      return;
    }
    if (node.type === "VariableDeclaration") {
      this.runVariableDeclaration(node);
      return;
    }
    if (node.type === "ThrowStatement") {
      this.runThrow(node);
    }
    // other statements have no observable runtime effect in the supported
    // subset, so they are skipped
  }

  private runThrow(node: ESTree.ThrowStatement): void {
    const { name, message } = throwInfo(node.argument);
    const stackTrace = this.trace.stackLabels();
    const thrower = formatStackFrame(stackTrace[0] ?? "(anonymous)");

    this.trace.setCurrentLine(lineOf(node));
    this.trace.snapshot(
      `\`throw\` raises \`${name}: ${message}\` inside \`${thrower}\`. With no try/catch to handle it, the error begins unwinding the call stack.`,
    );

    throw new SimulatedError(name, message, stackTrace);
  }

  private reportUncaughtError(error: SimulatedError): void {
    this.trace.printError(`Uncaught ${error.name}: ${error.message}`);
    for (const frame of error.stackTrace) {
      this.trace.printError(`    at ${formatStackFrame(frame)}`);
    }
    this.trace.snapshot(
      `The error is never caught, so the runtime logs "Uncaught ${error.name}: ${error.message}" with the stack trace captured at the throw.`,
    );

    this.trace.popFrame();
    this.trace.snapshot("The uncaught error unwound the entire call stack, which is now empty.");
  }

  private runVariableDeclaration(node: ESTree.VariableDeclaration): void {
    for (const declarator of node.declarations) {
      if (declarator.id.type !== "Identifier") continue;
      const value = declarator.init ? this.evaluate(declarator.init) : undefined;
      this.scope.set(declarator.id.name, value);
      this.trace.snapshot(
        `\`${declarator.id.name}\` is assigned \`${display(value)}\`.`,
      );
    }
  }

  private runCall(call: ESTree.CallExpression): void {
    const callee = calleeText(call.callee);
    if (callee === "console.log") {
      this.runConsoleLog(call);
    } else if (callee === "setTimeout") {
      this.runSetTimeout(call);
    } else if (isThenCall(call)) {
      this.runPromiseChain(call);
    } else if (this.functions.has(callee)) {
      this.runUserFunction(this.functions.get(callee)!, call);
    } else {
      this.runGenericCall(call);
    }
  }

  /** Evaluates an expression to a value, invoking user functions as a side effect */
  private evaluate(node: ESTree.Node): Value {
    switch (node.type) {
      case "Literal":
        return node.value as Value;
      case "Identifier":
        return this.scope.has(node.name) ? this.scope.get(node.name) : undefined;
      case "BinaryExpression":
        return applyBinaryOperator(
          node.operator,
          this.evaluate(node.left),
          this.evaluate(node.right),
        );
      case "TemplateLiteral":
        return node.quasis
          .map(
            (quasi, index) =>
              quasi.value.cooked +
              (node.expressions[index] !== undefined
                ? display(this.evaluate(node.expressions[index]))
                : ""),
          )
          .join("");
      case "CallExpression":
        return this.evaluateCall(node);
      default:
        return undefined;
    }
  }

  private evaluateCall(call: ESTree.CallExpression): Value {
    const callee = calleeText(call.callee);
    if (callee === "console.log") {
      this.runConsoleLog(call);
      return undefined;
    }
    const fn = this.functions.get(callee);
    if (fn && !fn.async) {
      return this.callUserFunction(fn, call);
    }
    return undefined;
  }

  private runConsoleLog(call: ESTree.CallExpression): void {
    const output = call.arguments.map((arg) => display(this.evaluate(arg))).join(" ");
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
      this.scheduleThenHandler(first, rest);
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

  private runUserFunction(
    fn: ESTree.FunctionDeclaration,
    call: ESTree.CallExpression,
  ): void {
    if (fn.async) {
      this.runAsyncFunction(fn, call);
    } else {
      this.callUserFunction(fn, call);
    }
  }

  // arguments are evaluated in the caller's scope before the frame is pushed,
  // then bound to the parameters inside a fresh scope for the function body
  private callUserFunction(
    fn: ESTree.FunctionDeclaration,
    call: ESTree.CallExpression,
  ): Value {
    const name = fn.id?.name ?? "fn";
    const argumentValues = call.arguments.map((arg) => this.evaluate(arg));

    const frame = this.trace.createItem({
      label: callSignature(call),
      kind: "frame",
    });
    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

    const previousScope = this.scope;
    const localScope: Scope = new Map();
    fn.params.forEach((param, index) => {
      if (param.type === "Identifier") localScope.set(param.name, argumentValues[index]);
    });
    this.scope = localScope;
    let returnValue: Value;
    try {
      returnValue = this.runFunctionBody(fn.body.body);
    } catch (error) {
      this.scope = previousScope;
      if (error instanceof SimulatedError) {
        this.trace.popFrame();
        this.trace.snapshot(`The error unwinds \`${name}\` off the call stack.`);
      }
      throw error;
    }
    this.scope = previousScope;

    this.trace.popFrame();
    this.trace.snapshot(
      returnValue === undefined
        ? `\`${name}\` returns, so its frame pops off the stack.`
        : `\`${name}\` returns \`${display(returnValue)}\`, so its frame pops off the stack.`,
    );

    return returnValue;
  }

  private runFunctionBody(statements: ESTree.Node[]): Value {
    for (const statement of statements) {
      if (statement.type === "ReturnStatement") {
        return statement.argument ? this.evaluate(statement.argument) : undefined;
      }
      this.runStatement(statement);
    }
    return undefined;
  }

  private runAsyncFunction(
    fn: ESTree.FunctionDeclaration,
    call: ESTree.CallExpression,
  ): void {
    const name = fn.id?.name ?? "fn";
    const frame = this.trace.createItem({ label: `${name}()`, kind: "frame" });

    this.trace.setCurrentLine(lineOf(call));
    this.trace.pushFrame(frame);
    this.trace.snapshot(
      `\`${name}()\` is called. An async function runs synchronously until it reaches its first \`await\`.`,
    );

    const scope: Scope = new Map();
    const previousScope = this.scope;
    this.scope = scope;
    this.runAsyncStatements(name, fn.body.body, 0, scope);
    this.scope = previousScope;
  }

  private runAsyncStatements(
    name: string,
    statements: ESTree.Node[],
    startIndex: number,
    scope: Scope,
  ): void {
    for (let index = startIndex; index < statements.length; index += 1) {
      const statement = statements[index];
      const awaitPoint = extractAwait(statement);

      if (awaitPoint) {
        this.trace.setCurrentLine(lineOf(statement));
        this.trace.snapshot(
          `\`await\` pauses \`${name}\`. Because the awaited promise is already settled, the rest of \`${name}\` is scheduled as a microtask and control returns to the caller.`,
        );
        this.trace.popFrame();
        this.scheduleResume(name, statements, index + 1, scope, awaitPoint);
        return;
      }

      this.runStatement(statement);
    }

    this.trace.popFrame();
    this.trace.snapshot(`\`${name}\` reaches its end and returns, so its frame pops off the stack.`);
  }

  // the code after an await resumes as a microtask, keeping the async function's
  // scope and continuing from the statement that followed the await
  private scheduleResume(
    name: string,
    statements: ESTree.Node[],
    resumeIndex: number,
    scope: Scope,
    awaitPoint: AwaitPoint,
  ): void {
    const id = this.trace.freshId();
    const label = `${name} (resumed)`;
    const resume = () => {
      const frame = { id, label, kind: "frame" as const };
      this.trace.pushFrame(frame);

      const previousScope = this.scope;
      this.scope = scope;
      if (awaitPoint.varName) {
        scope.set(awaitPoint.varName, awaitPoint.value);
      }
      this.trace.snapshot(
        `The awaited value "${awaitPoint.value}" resolves, so \`${name}\` resumes right after the \`await\`.`,
      );
      this.runAsyncStatements(name, statements, resumeIndex, scope);
      this.scope = previousScope;
    };

    this.microtaskQueue.push({ id, label, resume });
    this.trace.enqueueMicrotask({ id, label, kind: "microtask" });
  }

  private runCallbackBody(callback: CallbackFunction): void {
    if (callback.body.type === "BlockStatement") {
      this.runStatements(callback.body.body);
    } else if (callback.body.type === "CallExpression") {
      this.runCall(callback.body);
    }
  }

  private scheduleThenHandler(
    handler: CallbackFunction,
    continuation: CallbackFunction[],
  ): void {
    const id = this.trace.freshId();
    const label = callbackLabel(handler);
    const resume = () => {
      const frame = { id, label, kind: "frame" as const };
      this.trace.pushFrame(frame);
      this.trace.snapshot(`The microtask \`${label}\` runs.`);

      this.runCallbackBody(handler);

      // handlers further down a `.then(...).then(...)` chain, scheduled one at a
      // time as each preceding promise settles.
      if (continuation.length > 0) {
        const [next, ...rest] = continuation;
        this.scheduleThenHandler(next, rest);
        this.trace.snapshot(
          "This handler settles the next promise in the chain, queuing the following `.then` handler as a microtask.",
        );
      }

      this.trace.popFrame();
      this.trace.snapshot("The microtask finishes, so its frame pops off the stack.");
    };

    this.microtaskQueue.push({ id, label, resume });
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

      // a timer that has already elapsed waits in the callback queue while the
      // microtask queue drains, so both queues can be populated at once
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

      job.resume();
    }
  }

  /** Moves every timer whose delay has elapsed from the Web APIs to the queue */
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
