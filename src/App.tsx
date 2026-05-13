import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimCanvas } from "./components/SimCanvas";
import { ConvergencePlot } from "./components/ConvergencePlot";
import { SpectralPanel } from "./components/SpectralPanel";
import { SimControls } from "./components/SimControls";
import { makeRng, Rng } from "./sim/rng";
import {
  fiedler,
  fitSlope,
  orthLogNorm,
  SlopeFit,
} from "./sim/spectral";
import { components, buildLaplacian } from "./sim/graph";
import { step } from "./sim/rules";
import {
  DEFAULT_PARAMS,
  mergeParams,
  Preset,
  PRESETS,
} from "./sim/presets";
import {
  OrthSample,
  Params,
  SimState,
  SpectralSnapshot,
} from "./sim/state";

const H = 20;
const W = 20;

function makeInitialState(preset: Preset, params: Params, seed: number): {
  state: SimState;
  rng: Rng;
} {
  const rng = makeRng(seed);
  const grid = preset.makeGrid(H, W, rng, params);
  const state: SimState = {
    grid,
    H,
    W,
    tick: 0,
    nextPhase: "SHARE",
    ticksSinceEvent: 0,
    orthSamples: [],
    spectral: null,
    lastPhase: null,
  };
  return { state, rng };
}

function pushSample(samples: OrthSample[], s: OrthSample, max: number): OrthSample[] {
  const next = samples.length >= max ? samples.slice(samples.length - max + 1) : samples.slice();
  next.push(s);
  return next;
}

function recomputeSpectral(state: SimState): SpectralSnapshot | null {
  const comps = components(state.grid);
  if (comps.length === 0) return null;
  const largest = comps[0];
  if (largest.length < 2) {
    return {
      computedAtTick: state.tick,
      largestComponentIndices: largest,
      phi2: largest.map(() => 0),
      lambda2: 0,
      componentCount: comps.length,
    };
  }
  const L = buildLaplacian(state.grid, largest);
  const f = fiedler(L);
  if (!f) return null;
  return {
    computedAtTick: state.tick,
    largestComponentIndices: largest,
    phi2: f.phi2,
    lambda2: f.lambda2,
    componentCount: comps.length,
  };
}

function postShareHousekeeping(
  state: SimState,
  params: Params,
): SimState {
  const comps = components(state.grid);
  const largest = comps[0] ?? [];
  const W_ = state.W;
  const rs: number[] = [];
  for (const idx of largest) {
    const y = Math.floor(idx / W_);
    const x = idx - y * W_;
    rs.push(state.grid[y][x].r);
  }
  const logNorm = orthLogNorm(rs);
  const sample: OrthSample = {
    t: state.tick,
    logNorm,
    sinceEvent: state.ticksSinceEvent,
  };
  const orthSamples = pushSample(state.orthSamples, sample, params.plotWindow);

  let spectral = state.spectral;
  if (
    state.tick > 0 &&
    state.tick % params.recomputeSpectralEvery === 0
  ) {
    const snap = recomputeSpectral(state);
    if (snap) spectral = snap;
  }

  return { ...state, orthSamples, spectral };
}

export function App() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [seed, setSeed] = useState(12345);
  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const [params, setParams] = useState<Params>(() =>
    mergeParams(DEFAULT_PARAMS, preset.params),
  );

  const [simState, setSimState] = useState<SimState>(() => {
    const { state } = makeInitialState(preset, params, seed);
    return state;
  });
  const rngRef = useRef<Rng>(makeRng(seed));

  const [playing, setPlaying] = useState(true);
  const [showFiedler, setShowFiedler] = useState(true);
  const [showPhaseStrip, setShowPhaseStrip] = useState(true);

  // Refs that mirror reactive state for the rAF loop.
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  // Reset whenever preset changes (load preset defaults + fresh grid).
  useEffect(() => {
    const merged = mergeParams(DEFAULT_PARAMS, preset.params);
    setParams(merged);
    const { state, rng } = makeInitialState(preset, merged, seed);
    rngRef.current = rng;
    const initial = postShareHousekeeping(
      { ...state, lastPhase: "SHARE", tick: 0 },
      merged,
    );
    setSimState({
      ...initial,
      lastPhase: null,
      tick: 0,
      nextPhase: "SHARE",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const doReseed = useCallback(() => {
    setSeed((s) => (s * 1103515245 + 12345) >>> 0);
  }, []);

  const doReset = useCallback(() => {
    const { state, rng } = makeInitialState(preset, params, seed);
    rngRef.current = rng;
    setSimState(state);
  }, [preset, params, seed]);

  // Apply the seed change.
  useEffect(() => {
    const { state, rng } = makeInitialState(preset, paramsRef.current, seed);
    rngRef.current = rng;
    setSimState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const doOneStep = useCallback(() => {
    const cur = simStateRef.current;
    const nxt = step(cur, paramsRef.current, rngRef.current);
    const after =
      nxt.lastPhase === "SHARE"
        ? postShareHousekeeping(nxt, paramsRef.current)
        : nxt;
    setSimState(after);
  }, []);

  // Main loop.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      accum += dt;
      const stepMs = 1000 / Math.max(1, paramsRef.current.speed);
      let n = 0;
      const maxStepsPerFrame = 32;
      while (accum >= stepMs && n < maxStepsPerFrame) {
        accum -= stepMs;
        const cur = simStateRef.current;
        const nxt = step(cur, paramsRef.current, rngRef.current);
        const after =
          nxt.lastPhase === "SHARE"
            ? postShareHousekeeping(nxt, paramsRef.current)
            : nxt;
        simStateRef.current = after;
        n++;
      }
      if (n > 0) setSimState(simStateRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const slopeFit: SlopeFit | null = useMemo(
    () => fitSlope(simState.orthSamples, params.fitWindow),
    [simState.orthSamples, params.fitWindow],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gridworld Boundary Diagnostics</h1>
        <p>
          A four-phase cellular automaton on a 20×20 grid. The convergence
          plot's slope is the spectral gap of the current alive subgraph; the
          Fiedler contour shows that gap as a soft boundary on the plane.
        </p>
      </header>
      <main className="three-pane">
        <aside className="pane pane-controls">
          <SimControls
            presets={PRESETS}
            activePresetId={presetId}
            onPresetChange={setPresetId}
            params={params}
            onParamsChange={setParams}
            seed={seed}
            onReseed={doReseed}
            playing={playing}
            onTogglePlay={() => setPlaying((v) => !v)}
            onStep={doOneStep}
            onReset={doReset}
            showFiedler={showFiedler}
            onToggleFiedler={setShowFiedler}
            showPhaseStrip={showPhaseStrip}
            onTogglePhaseStrip={setShowPhaseStrip}
          />
        </aside>
        <section className="pane pane-grid">
          <SimCanvas
            grid={simState.grid}
            lastPhase={simState.lastPhase}
            spectral={simState.spectral}
            showFiedler={showFiedler}
            showPhaseStrip={showPhaseStrip}
          />
          <p className="tick-readout">
            tick {simState.tick} · next: {simState.nextPhase}
          </p>
        </section>
        <aside className="pane pane-diagnostics">
          <SpectralPanel
            spectral={simState.spectral}
            fit={slopeFit}
            alpha={params.alpha}
          />
          <ConvergencePlot samples={simState.orthSamples} fit={slopeFit} />
        </aside>
      </main>
      <footer className="app-footer">
        Observational language only. The slope of the convergence plot is the
        spectral gap of the current alive subgraph — nothing more is claimed.
      </footer>
    </div>
  );
}
