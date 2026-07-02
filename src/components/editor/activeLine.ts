import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

const setActiveLineEffect = StateEffect.define<number | null>();

const activeLineDecoration = Decoration.line({ class: "cm-execLine" });

const activeLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setActiveLineEffect)) continue;
      const line = effect.value;
      if (line === null || line > transaction.state.doc.lines) {
        next = Decoration.none;
      } else {
        const from = transaction.state.doc.line(line).from;
        next = Decoration.set([activeLineDecoration.range(from)]);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const activeLineTheme = EditorView.baseTheme({
  ".cm-execLine": {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    boxShadow: "inset 2px 0 0 rgb(56, 189, 248)",
  },
});

export const activeLineExtension = [activeLineField, activeLineTheme];

export function setActiveLine(view: EditorView, line: number | null): void {
  view.dispatch({ effects: setActiveLineEffect.of(line) });
}
