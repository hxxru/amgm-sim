import { useState } from "react";
import { Params } from "../sim/state";
import { Preset } from "../sim/presets";

interface Props {
  presets: Preset[];
  activePresetId: string;
  onPresetChange: (id: string) => void;

  params: Params;
  onParamsChange: (next: Params) => void;

  seed: number;
  onReseed: () => void;

  playing: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;

  showFiedler: boolean;
  onToggleFiedler: (v: boolean) => void;
  showEdges: boolean;
  onToggleEdges: (v: boolean) => void;
  showPhaseStrip: boolean;
  onTogglePhaseStrip: (v: boolean) => void;
}

interface SliderRow {
  key: keyof Params;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  log?: boolean;
}

const BASIC: SliderRow[] = [
  {
    key: "slack",
    label: "Slack  τ_haz / τ_drop",
    min: -1,
    max: 2,
    step: 0.05,
    tooltip:
      "Ratio of decay timescale to drop interval. High slack → frequent small drops → energy reaches everywhere → large stable clusters. Low slack → rare big drops → fragmented landscape between bursts.",
    log: true,
  },
  {
    key: "alpha",
    label: "Share rate α",
    min: 0.01,
    max: 0.24,
    step: 0.005,
    tooltip:
      "Base share coefficient. Stability requires α · max-degree < 1 (≤ 0.25 on a 4-neighbour grid).",
  },
  {
    key: "mu",
    label: "Decay μ",
    min: 0.001,
    max: 0.1,
    step: 0.001,
    tooltip:
      "Per-tick fraction of each cell's resource that evaporates into the reservoir. Larger μ → faster turnover.",
  },
  {
    key: "speed",
    label: "Speed (steps/s)",
    min: 1,
    max: 240,
    step: 1,
    tooltip: "Phase-steps per wall-clock second.",
  },
];

const ADVANCED: SliderRow[] = [
  {
    key: "vitalityR0",
    label: "Vitality r₀",
    min: 0.01,
    max: 1,
    step: 0.01,
    tooltip: "Resource level at which a cell is half-engaged (sigmoid centre).",
  },
  {
    key: "vitalityK",
    label: "Vitality k",
    min: 1,
    max: 60,
    step: 1,
    tooltip: "Steepness of the vitality sigmoid. Higher k → sharper on/off behaviour.",
  },
  {
    key: "vitalityThreshold",
    label: "Active threshold",
    min: 0.01,
    max: 0.5,
    step: 0.01,
    tooltip: "g(r) above this counts as an 'active' cell for the spectral diagnostics.",
  },
  {
    key: "totalEnergyTarget",
    label: "Total energy (resets)",
    min: 10,
    max: 400,
    step: 5,
    tooltip:
      "Conserved energy budget. Σ r + reservoir = this. Only takes effect on the next Reset / preset change.",
  },
  {
    key: "recomputeSpectralEvery",
    label: "Spectral cadence",
    min: 1,
    max: 60,
    step: 1,
    tooltip: "Ticks between Laplacian/Fiedler recomputes.",
  },
  {
    key: "fitWindow",
    label: "Fit window",
    min: 6,
    max: 200,
    step: 1,
    tooltip: "Samples used for the slope fit.",
  },
  {
    key: "plotWindow",
    label: "Plot window",
    min: 60,
    max: 600,
    step: 10,
    tooltip: "Samples shown on the convergence plot.",
  },
];

function Slider({
  row,
  rawValue,
  onChange,
}: {
  row: SliderRow;
  rawValue: number;
  onChange: (v: number) => void;
}) {
  const isLog = !!row.log;
  const displayed = isLog ? Math.pow(10, rawValue) : rawValue;
  return (
    <div className="slider-row" title={row.tooltip}>
      <label>
        <span className="slider-label">{row.label}</span>
        <span className="slider-value">
          {displayed.toFixed(displayed >= 10 ? 1 : displayed >= 1 ? 2 : 3)}
        </span>
      </label>
      <input
        type="range"
        min={row.min}
        max={row.max}
        step={row.step}
        value={rawValue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SimControls({
  presets,
  activePresetId,
  onPresetChange,
  params,
  onParamsChange,
  seed,
  onReseed,
  playing,
  onTogglePlay,
  onStep,
  onReset,
  showFiedler,
  onToggleFiedler,
  showEdges,
  onToggleEdges,
  showPhaseStrip,
  onTogglePhaseStrip,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const active = presets.find((p) => p.id === activePresetId);

  const setParam = (row: SliderRow) => (v: number) => {
    const stored = row.log ? Math.pow(10, v) : v;
    onParamsChange({ ...params, [row.key]: stored });
  };

  const rawFor = (row: SliderRow) => {
    const stored = params[row.key] as number;
    return row.log ? Math.log10(Math.max(stored, 1e-9)) : stored;
  };

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
        {active && <p className="preset-desc">{active.description}</p>}
      </section>

      <section>
        <h3>Run</h3>
        <div className="button-row">
          <button onClick={onTogglePlay} className="primary">
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={onStep} disabled={playing}>
            Step
          </button>
          <button onClick={onReset}>Reset</button>
          <button onClick={onReseed}>Reseed</button>
        </div>
        <p className="seed-readout">seed = {seed}</p>
      </section>

      <section>
        <h3>Sliders</h3>
        {BASIC.map((row) => (
          <Slider
            key={row.key}
            row={row}
            rawValue={rawFor(row)}
            onChange={setParam(row)}
          />
        ))}
      </section>

      <section>
        <button
          className="advanced-toggle"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? "▾" : "▸"} Advanced settings
        </button>
        {advancedOpen && (
          <div className="advanced">
            {ADVANCED.map((row) => (
              <Slider
                key={row.key}
                row={row}
                rawValue={rawFor(row)}
                onChange={setParam(row)}
              />
            ))}
            <label
              className="toggle"
              title="Pick drop sites with probability ∝ (1 − g(r)) — preferentially feed dormant cells."
            >
              <input
                type="checkbox"
                checked={params.dropBiasDormant}
                onChange={(e) =>
                  onParamsChange({
                    ...params,
                    dropBiasDormant: e.target.checked,
                  })
                }
              />
              Bias drops toward dormant cells
            </label>
          </div>
        )}
      </section>

      <section>
        <h3>Visualization</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showFiedler}
            onChange={(e) => onToggleFiedler(e.target.checked)}
          />
          Fiedler tint + contour
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={(e) => onToggleEdges(e.target.checked)}
          />
          Edges (κ baseline + flow glow)
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showPhaseStrip}
            onChange={(e) => onTogglePhaseStrip(e.target.checked)}
          />
          Phase strip
        </label>
      </section>
    </div>
  );
}
