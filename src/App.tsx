import Header from "./components/Header";
import EditorPanel from "./components/EditorPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import StatusBar from "./components/StatusBar";
import ControlsBar from "./components/ControlsBar";
import { useSimulation } from "./hooks/useSimulation";
import { DEFAULT_PRESET } from "./engine/presets";

export default function App() {
  const source = DEFAULT_PRESET.source;
  const { step, index, total, atEnd, stepForward, reset } =
    useSimulation(source);

  return (
    <div className="flex h-full flex-col bg-surface">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <EditorPanel
          source={source}
          currentLine={step.currentLine}
          consoleOutput={step.consoleOutput}
        />
        <VisualizationPanel step={step} />
      </main>
      <StatusBar explanation={step.explanation} index={index} total={total} />
      <ControlsBar onStep={stepForward} onReset={reset} canStep={!atEnd} />
    </div>
  );
}
