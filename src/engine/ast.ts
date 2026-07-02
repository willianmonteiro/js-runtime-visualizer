import type * as ESTree from "estree";

export function lineOf(node: ESTree.Node): number | null {
  return node.loc?.start.line ?? null;
}

/** Renders a callee expression back to source-like text, e.g. `console.log`. */
export function calleeText(node: ESTree.Expression | ESTree.Super): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") {
    const object = calleeText(node.object as ESTree.Expression);
    if (!node.computed && node.property.type === "Identifier") {
      return `${object}.${node.property.name}`;
    }
    return `${object}[…]`;
  }
  return "…";
}

/**
 * Best-effort static evaluation of an expression to a display string. Only the
 * constructs used by the visualizer's snippets are supported; anything else
 * falls back to a readable placeholder rather than throwing.
 */
export function staticValue(node: ESTree.Node): string {
  switch (node.type) {
    case "Literal":
      return String((node as ESTree.Literal).value);
    case "TemplateLiteral": {
      const template = node as ESTree.TemplateLiteral;
      return template.quasis
        .map(
          (quasi, index) =>
            quasi.value.cooked +
            (template.expressions[index]
              ? staticValue(template.expressions[index])
              : ""),
        )
        .join("");
    }
    case "BinaryExpression": {
      const binary = node as ESTree.BinaryExpression;
      if (binary.operator === "+") {
        return staticValue(binary.left) + staticValue(binary.right);
      }
      return "…";
    }
    case "Identifier":
      return (node as ESTree.Identifier).name;
    default:
      return "…";
  }
}

/** Renders a call argument for a card label, keeping string quotes for clarity. */
export function argumentText(node: ESTree.Node): string {
  switch (node.type) {
    case "Literal":
      return JSON.stringify((node as ESTree.Literal).value);
    case "Identifier":
      return (node as ESTree.Identifier).name;
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return "fn";
    case "TemplateLiteral":
      return `\`${staticValue(node)}\``;
    default:
      return "…";
  }
}

export function callSignature(call: ESTree.CallExpression): string {
  const args = call.arguments.map(argumentText).join(", ");
  return `${calleeText(call.callee)}(${args})`;
}

function expressionText(node: ESTree.Expression): string {
  if (node.type === "CallExpression") return callSignature(node);
  return staticValue(node);
}

/** A readable name for a callback, e.g. `() => console.log("timeout")`. */
export function callbackLabel(node: ESTree.Node): string {
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    const params = node.params
      .map((param) => (param.type === "Identifier" ? param.name : "…"))
      .join(", ");

    if (
      node.type === "ArrowFunctionExpression" &&
      node.body.type !== "BlockStatement"
    ) {
      return `(${params}) => ${expressionText(node.body)}`;
    }
    return node.type === "ArrowFunctionExpression"
      ? `(${params}) => { … }`
      : `function (${params}) { … }`;
  }
  if (node.type === "Identifier") return node.name;
  return "callback";
}
