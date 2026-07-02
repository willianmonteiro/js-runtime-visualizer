import { useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { activeLineExtension, setActiveLine } from "./activeLine";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  currentLine: number | null;
}

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", fontSize: "13px" },
  ".cm-scroller": { fontFamily: "inherit" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none" },
  "&.cm-focused": { outline: "none" },
});

const extensions = [javascript(), editorTheme, activeLineExtension];

export default function CodeEditor({ value, onChange, currentLine }: CodeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const view = editorRef.current?.view;
    if (view) setActiveLine(view, currentLine);
  }, [currentLine]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={extensions}
      height="100%"
      className="h-full font-mono text-sm"
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
    />
  );
}
