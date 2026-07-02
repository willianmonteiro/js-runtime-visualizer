import { parse } from "acorn";
import type * as ESTree from "estree";
import { Trace } from "./trace";
import { callSignature, calleeText, lineOf, staticValue } from "./ast";
import type { ExecutionStep } from "./types";

function parseProgram(source: string): ESTree.Program {
  return parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  }) as unknown as ESTree.Program;
}

function isConsoleLog(call: ESTree.CallExpression): boolean {
  return calleeText(call.callee) === "console.log";
}

function simulateConsoleLog(trace: Trace, call: ESTree.CallExpression): void {
  const line = lineOf(call);
  const output = call.arguments.map(staticValue).join(" ");
  const frame = trace.createItem({ label: callSignature(call), kind: "frame" });

  trace.setCurrentLine(line);
  trace.pushFrame(frame);
  trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

  trace.print(output);
  trace.snapshot(`\`console.log\` prints "${output}" to the console.`);

  trace.popFrame();
  trace.snapshot("`console.log` returns, so its frame pops off the stack.");
}

function simulateGenericCall(trace: Trace, call: ESTree.CallExpression): void {
  const frame = trace.createItem({ label: callSignature(call), kind: "frame" });

  trace.setCurrentLine(lineOf(call));
  trace.pushFrame(frame);
  trace.snapshot(`Call \`${frame.label}\` — its frame is pushed onto the call stack.`);

  trace.popFrame();
  trace.snapshot(`\`${frame.label}\` returns, so its frame pops off the stack.`);
}

function simulateStatement(trace: Trace, statement: ESTree.Statement): void {
  if (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "CallExpression"
  ) {
    const call = statement.expression;
    if (isConsoleLog(call)) {
      simulateConsoleLog(trace, call);
    } else {
      simulateGenericCall(trace, call);
    }
  }
  // declarations and other statements have no observable runtime effect in
  // synchronous subset, so they are skipped
}

export function simulate(source: string): ExecutionStep[] {
  const trace = new Trace();
  const program = parseProgram(source);

  const scriptFrame = trace.createItem({ label: "(script)", kind: "frame" });
  trace.pushFrame(scriptFrame);
  trace.snapshot(
    "The engine starts running the script. A frame for the top-level code sits on the call stack.",
  );

  for (const node of program.body) {
    if (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration") {
      continue;
    }
    simulateStatement(trace, node as ESTree.Statement);
  }

  trace.popFrame();
  trace.snapshot("Top-level code finishes, so the `(script)` frame leaves the stack.");

  trace.setCurrentLine(null);
  trace.setEventLoopActive(true);
  trace.snapshot(
    "The call stack is empty and no callbacks are queued. The event loop has nothing left to do — execution is complete.",
  );

  return trace.build();
}
