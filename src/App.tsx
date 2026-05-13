import { useMemo, useState } from "react";
import { Controls } from "./components/Controls";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { Gridworld } from "./components/Gridworld";
import { computeDiagnostics } from "./model/diagnostics";
import { SliderState } from "./model/types";
import { PRESETS } from "./presets";

export function App() {
  const [activePresetId, setActivePresetId] = useState(PRESETS[0].id);
  const activePreset = PRESETS.find((p) => p.id === activePresetId)!;
  const [sliders, setSliders] = useState<SliderState>(activePreset.defaults);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPrincipalMode, setShowPrincipalMode] = useState(false);
  const [showBridges, setShowBridges] = useState(true);

  const onPresetChange = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setActivePresetId(id);
    setSliders(p.defaults);
  };

  const diag = useMemo(
    () => computeDiagnostics(activePreset.nodes, activePreset.edges, sliders),
    [activePreset, sliders],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gridworld Boundary Diagnostics</h1>
        <p>
          A spatial killed-process sandbox for exploring when candidate blocks
          behave like scalar AM-GM interfaces, finite-band signatures, or
          compromised boundaries.
        </p>
      </header>
      <main className="three-pane">
        <aside className="pane pane-controls">
          <Controls
            presets={PRESETS}
            activePresetId={activePresetId}
            onPresetChange={onPresetChange}
            sliders={sliders}
            onSliderChange={setSliders}
            showHeatmap={showHeatmap}
            showPrincipalMode={showPrincipalMode}
            showBridges={showBridges}
            onToggle={(key, value) => {
              if (key === "showHeatmap") setShowHeatmap(value);
              if (key === "showPrincipalMode") setShowPrincipalMode(value);
              if (key === "showBridges") setShowBridges(value);
            }}
          />
        </aside>
        <section className="pane pane-grid">
          <Gridworld
            nodes={activePreset.nodes}
            edges={activePreset.edges}
            eig={diag.eig}
            cycleLength={sliders.cycleLength}
            principalMode={diag.principalMode}
            showHeatmap={showHeatmap}
            showPrincipalMode={showPrincipalMode}
            showBridges={showBridges}
          />
        </section>
        <aside className="pane pane-diagnostics">
          <DiagnosticsPanel diag={diag} />
        </aside>
      </main>
      <footer className="app-footer">
        Regime labels are diagnostic suggestions, not ontology claims.
      </footer>
    </div>
  );
}
