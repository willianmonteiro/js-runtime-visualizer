# JS Runtime Visualizer

An interactive tool that simulates how the JavaScript engine and event loop
execute code. Watch frames move between the **Call Stack**, **Web APIs**,
**Microtask Queue**, and **Callback Queue**, one step at a time.

## How it works

The visualizer never actually runs the code. Instead it **parses** the source
into an Abstract Syntax Tree (AST) and "walks" that tree, recording a snapshot
of the runtime after each observable action. The UI then just scrubs through
those snapshots.

```mermaid
flowchart LR
    A["Source code<br/>(string)"] -->|"acorn.parse()"| B["AST<br/>(ESTree nodes)"]
    B -->|"walk the tree"| C["Simulator"]
    C -->|"Trace records a<br/>snapshot per action"| D["ExecutionStep[]"]
    D -->|"useSimulation"| E["React UI<br/>zones · editor · console"]
```

### What is an AST?

An **Abstract Syntax Tree** is the structured, tree-shaped representation a
parser produces from raw source text. It captures what the code *is*: calls,
literals, arguments; and discards formatting noise like spaces and comments.

For example, this single line:

```js
console.log("start");
```

is parsed into this tree:

```mermaid
flowchart TD
    ES["ExpressionStatement"] --> CE["CallExpression"]
    CE -->|callee| ME["MemberExpression"]
    CE -->|arguments| L["Literal<br/>value: &quot;start&quot;"]
    ME -->|object| O["Identifier<br/>name: console"]
    ME -->|property| P["Identifier<br/>name: log"]
```

### From a node to snapshots

Walking a single `console.log(...)` call produces three snapshots, so you can
watch the frame enter the stack, do its work, and leave:

```mermaid
flowchart LR
    N["CallExpression<br/>console.log"] --> A["pushFrame<br/>snapshot: 'frame pushed'"]
    A --> B["print output<br/>snapshot: 'prints value'"]
    B --> C["popFrame<br/>snapshot: 'frame pops'"]
```

The `Trace` builder holds one mutable working state and copies it into an
immutable `ExecutionStep` each time `snapshot()` is called. `RuntimeItem`
objects are created once and reused across snapshots, so their identity is
stable, that is what will let the animation layer follow a single card as it
moves between zones.
