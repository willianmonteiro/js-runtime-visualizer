import { useCallback, useState } from "react";
import Header from "./components/Header";
import EditorPanel from "./components/EditorPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import StatusBar from "./components/StatusBar";
import ControlsBar from "./components/ControlsBar";
import { useSimulation } from "./hooks/useSimulation";
import { DEFAULT_PRESET, PRESETS } from "./engine/presets";

export default function App() {
  const [source, setSource] = useState(DEFAULT_PRESET.source);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    DEFAULT_PRESET.id,
  );

  const { step, index, total, atEnd, stepForward, reset } =
    useSimulation(source);

  const handleSourceChange = useCallback((value: string) => {
    setSource(value);
    setActivePresetId(null);
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    const preset = PRESETS.find((candidate) => candidate.id === id);
    if (!preset) return;
    setSource(preset.source);
    setActivePresetId(preset.id);
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <EditorPanel
          source={source}
          onSourceChange={handleSourceChange}
          currentLine={step.currentLine}
          consoleOutput={step.consoleOutput}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
        />
        <VisualizationPanel step={step} />
      </main>
      <StatusBar explanation={step.explanation} index={index} total={total} />
      <ControlsBar onStep={stepForward} onReset={reset} canStep={!atEnd} />
    </div>
  );
}
