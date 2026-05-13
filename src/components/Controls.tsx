import { PresetGraph, SliderState } from "../model/types";

interface Props {
  presets: PresetGraph[];
  activePresetId: string;
  onPresetChange: (id: string) => void;
  sliders: SliderState;
  onSliderChange: (next: SliderState) => void;
  showHeatmap: boolean;
  showPrincipalMode: boolean;
  showBridges: boolean;
  onToggle: (
    key: "showHeatmap" | "showPrincipalMode" | "showBridges",
    value: boolean,
  ) => void;
}

interface SliderRow {
  key: keyof SliderState;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
}

const SLIDERS: SliderRow[] = [
  {
    key: "internalMixing",
    label: "Internal mixing",
    min: 0,
    max: 2,
    step: 0.05,
    tooltip:
      "How quickly probability moves within a cluster. Higher mixing usually helps a block compress to a scalar interface value.",
  },
  {
    key: "bridgeCoupling",
    label: "Bridge coupling",
    min: 0,
    max: 2,
    step: 0.05,
    tooltip:
      "How strongly probability leaks between candidate blocks. Coupling is not automatically fatal, but large leakage can compromise boundary integrity.",
  },
  {
    key: "killingIntensity",
    label: "Killing intensity",
    min: 0,
    max: 3,
    step: 0.05,
    tooltip: "How strongly states are removed by failure or viability loss.",
  },
  {
    key: "cycleLength",
    label: "Cycle length Δ",
    min: 0.1,
    max: 10,
    step: 0.1,
    tooltip:
      "The time window over which the system must internally compress before being evaluated from outside.",
  },
];

export function Controls({
  presets,
  activePresetId,
  onPresetChange,
  sliders,
  onSliderChange,
  showHeatmap,
  showPrincipalMode,
  showBridges,
  onToggle,
}: Props) {
  return (
    <div className="controls">
      <section>
        <h3>Preset</h3>
        <div className="preset-list">
          {presets.map((p) => (
            <button
              key={p.id}
              className={
                "preset-button" + (p.id === activePresetId ? " active" : "")
              }
              onClick={() => onPresetChange(p.id)}
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="preset-desc">
          {presets.find((p) => p.id === activePresetId)?.description}
        </p>
      </section>

      <section>
        <h3>Sliders</h3>
        {SLIDERS.map((row) => (
          <div className="slider-row" key={row.key}>
            <label title={row.tooltip}>
              <span className="slider-label">{row.label}</span>
              <span className="slider-value">
                {sliders[row.key].toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min={row.min}
              max={row.max}
              step={row.step}
              value={sliders[row.key]}
              onChange={(e) =>
                onSliderChange({
                  ...sliders,
                  [row.key]: Number(e.target.value),
                })
              }
            />
          </div>
        ))}
      </section>

      <section>
        <h3>Visualization</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => onToggle("showHeatmap", e.target.checked)}
          />
          Show survival heatmap
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showPrincipalMode}
            onChange={(e) => onToggle("showPrincipalMode", e.target.checked)}
          />
          Show principal mode (φ₁) instead
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showBridges}
            onChange={(e) => onToggle("showBridges", e.target.checked)}
          />
          Show bridge edges
        </label>
      </section>
    </div>
  );
}
