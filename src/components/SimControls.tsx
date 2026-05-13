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
}

const BASIC_SLIDERS: SliderRow[] = [
  {
    key: "alpha",
    label: "Share rate α",
    min: 0,
    max: 0.25,
    step: 0.005,
    tooltip:
      "How aggressively each alive cell averages with its alive neighbours. Higher α → faster equilibration → steeper convergence slope.",
  },
  {
    key: "pFood",
    label: "Food rate p_food",
    min: 0,
    max: 0.05,
    step: 0.001,
    tooltip:
      "Per-cell-per-tick probability of a forager event. The only source of new resource.",
  },
  {
    key: "rDeath",
    label: "Death threshold r_death",
    min: 0,
    max: 1,
    step: 0.01,
    tooltip:
      "Cells with resource below this start dying. Death probability scales with depletion.",
  },
  {
    key: "rBirth",
    label: "Birth threshold r_birth",
    min: 0,
    max: 1.5,
    step: 0.01,
    tooltip:
      "Neighbours above this threshold count as healthy. Empty cells need k healthy neighbours to be born.",
  },
  {
    key: "speed",
    label: "Speed (steps/s)",
    min: 1,
    max: 120,
    step: 1,
    tooltip:
      "Steps per wall-clock second. Each step is one phase (SHARE, DISCOVER, CULL, BIRTH).",
  },
];

const ADVANCED_SLIDERS: SliderRow[] = [
  {
    key: "epsilon",
    label: "Food pulse ε",
    min: 0,
    max: 2,
    step: 0.05,
    tooltip: "Magnitude of each forager pulse.",
  },
  {
    key: "beta",
    label: "Death steepness β",
    min: 0,
    max: 1,
    step: 0.01,
    tooltip:
      "Maximum per-(death-tick) probability of dying, achieved at r = 0.",
  },
  {
    key: "gamma",
    label: "Birth rate γ",
    min: 0,
    max: 0.5,
    step: 0.005,
    tooltip:
      "Per-empty-cell-per-(birth-tick) probability of being born given k healthy neighbours.",
  },
  {
    key: "k",
    label: "Healthy k",
    min: 1,
    max: 4,
    step: 1,
    tooltip: "Minimum healthy alive neighbours required for birth.",
  },
  {
    key: "rSeed",
    label: "Seed resource r_seed",
    min: 0,
    max: 1.5,
    step: 0.05,
    tooltip: "Resource level of a newly born cell.",
  },
  {
    key: "tDb",
    label: "T_db (cadence)",
    min: 1,
    max: 50,
    step: 1,
    tooltip:
      "Number of share-ticks between CULL/BIRTH phases. Larger = more stable topology, cleaner spectral signal.",
  },
  {
    key: "rMax",
    label: "r_max",
    min: 0.5,
    max: 5,
    step: 0.1,
    tooltip: "Soft cap on per-cell resource.",
  },
  {
    key: "decay",
    label: "Per-tick decay",
    min: 0,
    max: 0.05,
    step: 0.001,
    tooltip:
      "Per-tick exponential decay applied to every alive cell during SHARE. 0 disables.",
  },
  {
    key: "recomputeSpectralEvery",
    label: "Spectral cadence",
    min: 1,
    max: 30,
    step: 1,
    tooltip:
      "How often to recompute λ₂ and φ₂ (in share-ticks). Smaller = more responsive overlay; larger = cheaper.",
  },
  {
    key: "fitWindow",
    label: "Fit window",
    min: 10,
    max: 200,
    step: 5,
    tooltip:
      "Number of recent samples used for the slope fit. Larger = smoother fit, slower response to slider changes.",
  },
  {
    key: "plotWindow",
    label: "Plot window",
    min: 60,
    max: 600,
    step: 10,
    tooltip: "Maximum samples shown on the convergence plot.",
  },
  {
    key: "initialDensity",
    label: "Init density",
    min: 0,
    max: 1,
    step: 0.05,
    tooltip:
      "Random-scatter preset only: probability each cell is initially alive.",
  },
];

function Slider({
  row,
  value,
  onChange,
}: {
  row: SliderRow;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row" title={row.tooltip}>
      <label>
        <span className="slider-label">{row.label}</span>
        <span className="slider-value">{value.toFixed(row.step < 0.01 ? 3 : 2)}</span>
      </label>
      <input
        type="range"
        min={row.min}
        max={row.max}
        step={row.step}
        value={value}
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
  showPhaseStrip,
  onTogglePhaseStrip,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const active = presets.find((p) => p.id === activePresetId);

  const setParam = (key: keyof Params) => (v: number) =>
    onParamsChange({ ...params, [key]: v });

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
          <button onClick={onStep} disabled={playing} title="Advance one phase.">
            Step
          </button>
          <button onClick={onReset} title="Reset to the preset's initial state.">
            Reset
          </button>
          <button onClick={onReseed} title="New random seed.">
            Reseed
          </button>
        </div>
        <p className="seed-readout">seed = {seed}</p>
      </section>

      <section>
        <h3>Sliders</h3>
        {BASIC_SLIDERS.map((row) => (
          <Slider
            key={row.key}
            row={row}
            value={params[row.key] as number}
            onChange={setParam(row.key)}
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
            {ADVANCED_SLIDERS.map((row) => (
              <Slider
                key={row.key}
                row={row}
                value={params[row.key] as number}
                onChange={setParam(row.key)}
              />
            ))}
            <label className="toggle">
              <input
                type="checkbox"
                checked={params.foodOnAliveOnly}
                onChange={(e) =>
                  onParamsChange({
                    ...params,
                    foodOnAliveOnly: e.target.checked,
                  })
                }
              />
              Food lands on alive cells only
            </label>
            <label
              className="toggle"
              title="Skip CULL and BIRTH phases. Use to measure λ₂ cleanly: pause topology change, let the system settle, then read the slope."
            >
              <input
                type="checkbox"
                checked={params.freezeTopology}
                onChange={(e) =>
                  onParamsChange({
                    ...params,
                    freezeTopology: e.target.checked,
                  })
                }
              />
              Freeze (pauses DISCOVER + CULL + BIRTH; SHARE only — clean λ₂)
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
            checked={showPhaseStrip}
            onChange={(e) => onTogglePhaseStrip(e.target.checked)}
          />
          Phase strip
        </label>
      </section>
    </div>
  );
}
