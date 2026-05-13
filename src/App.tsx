import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimCanvas } from "./components/SimCanvas";
import { ConvergencePlot } from "./components/ConvergencePlot";
import { SpectralPanel } from "./components/SpectralPanel";
import { SimControls } from "./components/SimControls";
import { makeRng, Rng } from "./sim/rng";
import {
  fitSlope,
  jacobiEigen,
  orthLogNorm,
  SlopeFit,
} from "./sim/spectral";
import {
  activeMask,
  buildWeightedLaplacian,
  components,
} from "./sim/graph";
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
  vitality,
  zeros2D,
} from "./sim/state";

const H = 20;
const W = 20;

function makeInitial(
  preset: Preset,
  params: Params,
  seed: number,
): { state: SimState; rng: Rng } {
  const rng = makeRng(seed);
  const { grid, coupling } = preset.makeInitial(H, W, rng, params);
  let total = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) total += grid[y][x].r;
  }
  const state: SimState = {
    grid,
    coupling,
    H,
    W,
    tick: 0,
    nextPhase: "SHARE",
    lastPhase: null,
    reservoir: 0,
    totalEnergy: total,
    edgeFlowH: zeros2D(H, W),
    edgeFlowV: zeros2D(H, W),
    drops: [],
    orthSamples: [],
    spectral: null,
    ticksSinceDrop: 0,
  };
  return { state, rng };
}

function pushSample(samples: OrthSample[], s: OrthSample, max: number): OrthSample[] {
  const next =
    samples.length >= max
      ? samples.slice(samples.length - max + 1)
      : samples.slice();
  next.push(s);
  return next;
}

function recomputeSpectral(state: SimState, params: Params): SpectralSnapshot | null {
  const mask = activeMask(
    state.grid,
    params.vitalityR0,
    params.vitalityK,
    params.vitalityThreshold,
  );
  const comps = components(mask, state.coupling);
  if (comps.length === 0) return null;
  const largest = comps[0];
  if (largest.length < 2) {
    return {
      computedAtTick: state.tick,
      activeIndices: largest,
      phi2: largest.map(() => 0),
      lambda2: 0,
      componentCount: comps.length,
    };
  }
  const vits: number[] = new Array(state.H * state.W).fill(0);
  for (let y = 0; y < state.H; y++) {
    for (let x = 0; x < state.W; x++) {
      vits[y * state.W + x] = vitality(
        state.grid[y][x].r,
        params.vitalityR0,
        params.vitalityK,
      );
    }
  }
  const L = buildWeightedLaplacian(largest, state.coupling, vits);
  const eig = jacobiEigen(L);
  if (eig.values.length < 2) return null;
  const phi2 = eig.vectors.map((row) => row[1]);
  return {
    computedAtTick: state.tick,
    activeIndices: largest,
    phi2,
    lambda2: eig.values[1],
    componentCount: comps.length,
  };
}

function postShareHousekeeping(state: SimState, params: Params): SimState {
  const mask = activeMask(
    state.grid,
    params.vitalityR0,
    params.vitalityK,
    params.vitalityThreshold,
  );
  const comps = components(mask, state.coupling);
  const largest = comps[0] ?? [];
  const rs: number[] = [];
  for (const idx of largest) {
    const y = Math.floor(idx / W);
    const x = idx - y * W;
    rs.push(state.grid[y][x].r);
  }
  const logNorm = orthLogNorm(rs);
  const sample: OrthSample = {
    t: state.tick,
    logNorm,
    sinceEvent: state.ticksSinceDrop,
  };
  const orthSamples = pushSample(state.orthSamples, sample, params.plotWindow);

  let spectral = state.spectral;
  if (
    state.tick > 0 &&
    state.tick % params.recomputeSpectralEvery === 0
  ) {
    const snap = recomputeSpectral(state, params);
    if (snap) spectral = snap;
  }

  return { ...state, orthSamples, spectral };
}

function maxR(state: SimState): number {
  let m = 0;
  for (let y = 0; y < state.H; y++) {
    for (let x = 0; x < state.W; x++) {
      if (state.grid[y][x].r > m) m = state.grid[y][x].r;
    }
  }
  return m;
}

function activeCellCount(state: SimState, params: Params): number {
  let n = 0;
  for (let y = 0; y < state.H; y++) {
    for (let x = 0; x < state.W; x++) {
      if (
        vitality(state.grid[y][x].r, params.vitalityR0, params.vitalityK) >=
        params.vitalityThreshold
      )
        n++;
    }
  }
  return n;
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
    const { state } = makeInitial(preset, params, seed);
    return state;
  });
  const rngRef = useRef<Rng>(makeRng(seed));

  const [playing, setPlaying] = useState(true);
  const [showFiedler, setShowFiedler] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showPhaseStrip, setShowPhaseStrip] = useState(true);

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  // Reload preset when it changes.
  useEffect(() => {
    const merged = mergeParams(DEFAULT_PARAMS, preset.params);
    setParams(merged);
    const { state, rng } = makeInitial(preset, merged, seed);
    rngRef.current = rng;
    setSimState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Reseed without changing preset.
  useEffect(() => {
    const { state, rng } = makeInitial(preset, paramsRef.current, seed);
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

  const doReseed = useCallback(() => {
    setSeed((s) => (s * 1103515245 + 12345) >>> 0);
  }, []);

  const doReset = useCallback(() => {
    const { state, rng } = makeInitial(preset, paramsRef.current, seed);
    rngRef.current = rng;
    setSimState(state);
  }, [preset, seed]);

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
      const maxStepsPerFrame = 60;
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

  const rMaxHint = maxR(simState);
  const activeCount = activeCellCount(simState, params);
  const epsilonDrop = simState.totalEnergy / Math.max(params.slack, 1e-6);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gridworld Boundary Diagnostics</h1>
        <p>
          A continuous-coupling slime-mold CA. Each cell holds an energy r;
          coupling is modulated by vitality g(r); decay feeds a reservoir
          that drips back at random sites. Drag <strong>Slack</strong> to
          watch the individuality structure fragment or coalesce.
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
            showEdges={showEdges}
            onToggleEdges={setShowEdges}
            showPhaseStrip={showPhaseStrip}
            onTogglePhaseStrip={setShowPhaseStrip}
          />
        </aside>
        <section className="pane pane-grid">
          <SimCanvas
            grid={simState.grid}
            coupling={simState.coupling}
            lastPhase={simState.lastPhase}
            spectral={simState.spectral}
            edgeFlowH={simState.edgeFlowH}
            edgeFlowV={simState.edgeFlowV}
            drops={simState.drops}
            vitalityR0={params.vitalityR0}
            vitalityK={params.vitalityK}
            rMaxHint={rMaxHint}
            showFiedler={showFiedler}
            showEdges={showEdges}
            showPhaseStrip={showPhaseStrip}
          />
          <p className="tick-readout">
            tick {simState.tick} · next: {simState.nextPhase} · reservoir{" "}
            {simState.reservoir.toFixed(2)} · ε_drop{" "}
            {epsilonDrop.toFixed(2)} · active {activeCount}/
            {simState.H * simState.W}
          </p>
        </section>
        <aside className="pane pane-diagnostics">
          <SpectralPanel
            spectral={simState.spectral}
            fit={slopeFit}
            alpha={params.alpha}
            mu={params.mu}
            totalEnergy={simState.totalEnergy}
            slack={params.slack}
            reservoir={simState.reservoir}
            activeCount={activeCount}
          />
          <ConvergencePlot samples={simState.orthSamples} fit={slopeFit} />
        </aside>
      </main>
      <footer className="app-footer">
        Σ r + reservoir = total energy is invariant by construction.
        Drops are the only randomness. Cascade speed = α · λ₂ of the
        current weighted Laplacian.
      </footer>
    </div>
  );
}
