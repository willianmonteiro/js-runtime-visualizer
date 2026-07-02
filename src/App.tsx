import Header from "./components/Header";
import EditorPanel from "./components/EditorPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import ControlsBar from "./components/ControlsBar";

export default function App() {
  return (
    <div className="flex h-full flex-col bg-surface">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <EditorPanel />
        <VisualizationPanel />
      </main>
      <ControlsBar />
    </div>
  );
}
