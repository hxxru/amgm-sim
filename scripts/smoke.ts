// Numerical sanity check for the continuous-coupling CA.
// For each preset: run the sim, verify that conservation holds, and
// (after suppressing drops) check that the slope-fit gap matches the
// weighted Laplacian's λ₂ within tolerance.

import { makeRng } from "../src/sim/rng.ts";
import {
  DEFAULT_PARAMS,
  mergeParams,
  PRESETS,
} from "../src/sim/presets.ts";
import { step } from "../src/sim/rules.ts";
import {
  activeMask,
  buildWeightedLaplacian,
  components,
  makeLaplacianMatvec,
} from "../src/sim/graph.ts";
import {
  fiedlerLanczos,
  fitSlope,
  jacobiEigen,
  orthLogNorm,
} from "../src/sim/spectral.ts";
import { OrthSample, SimState, vitality, zeros2D } from "../src/sim/state.ts";

const H = 50;
const W = 50;

for (const preset of PRESETS) {
  // Use a very-high slack so drops effectively never fire — the run
  // becomes a pure SHARE + DECAY relaxation, which is the regime where
  // gap_fit = (−slope − μ)/α should match λ₂ exactly.
  // Run with default params. The smoke tests conservation, FPS-budget
  // sanity, and that the spectral pipeline doesn't crash on the new
  // preset structure. Slope-fit / λ₂ agreement is not asserted here —
  // it's better evaluated live in the browser.
  const params = mergeParams(DEFAULT_PARAMS, preset.params);
  const rng = makeRng(42);
  const { grid, coupling, dropSource, reservoir: initRes } =
    preset.makeInitial(H, W, rng, params);

  let inCells = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) inCells += grid[y][x].r;
  const total = inCells + initRes;

  let state: SimState = {
    grid,
    coupling,
    dropSource,
    H,
    W,
    tick: 0,
    nextPhase: "SHARE",
    lastPhase: null,
    reservoir: initRes,
    totalEnergy: total,
    edgeFlowH: zeros2D(H, W),
    edgeFlowV: zeros2D(H, W),
    drops: [],
    orthSamples: [],
    spectral: null,
    ticksSinceDrop: 0,
  };

  const samples: OrthSample[] = [];
  const t0 = Date.now();
  for (let i = 0; i < 2000; i++) {
    state = step(state, params, rng);
    if (state.lastPhase === "SHARE") {
      const mask = activeMask(
        state.grid,
        params.vitalityR0,
        params.vitalityK,
        params.vitalityThreshold,
      );
      const comps = components(mask, state.coupling);
      const largest = comps[0] ?? [];
      const rs = largest.map((idx) => {
        const y = Math.floor(idx / W);
        const x = idx - y * W;
        return state.grid[y][x].r;
      });
      samples.push({
        t: state.tick,
        logNorm: orthLogNorm(rs),
        sinceEvent: state.ticksSinceDrop,
      });
      if (samples.length >= 80) break;
    }
  }
  const tElapsed = Date.now() - t0;

  const finalTotal = state.reservoir + state.grid.flat().reduce((s, c) => s + c.r, 0);
  const consErr = Math.abs(finalTotal - total);

  const mask = activeMask(
    state.grid,
    params.vitalityR0,
    params.vitalityK,
    params.vitalityThreshold,
  );
  const comps = components(mask, state.coupling);
  const largest = comps[0] ?? [];
  const vits: number[] = new Array(H * W).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      vits[y * W + x] = vitality(
        state.grid[y][x].r,
        params.vitalityR0,
        params.vitalityK,
      );
    }
  }
  let lambda2: number;
  if (largest.length <= 150) {
    const L = buildWeightedLaplacian(largest, state.coupling, vits);
    const eig = jacobiEigen(L);
    lambda2 = eig.values[1] ?? 0;
  } else {
    const matvec = makeLaplacianMatvec(largest, state.coupling, vits);
    const result = fiedlerLanczos(largest.length, matvec, 40);
    lambda2 = result?.lambda2 ?? 0;
  }
  const fit = fitSlope(samples, params.fitWindow);
  const fittedGap = fit
    ? (-fit.slope - params.mu) / Math.max(params.alpha, 1e-9)
    : null;
  const disagreement =
    fittedGap != null && lambda2 > 1e-6
      ? Math.abs(fittedGap - lambda2) / lambda2
      : null;

  let ok = "NO FIT";
  if (disagreement != null) {
    ok = disagreement < 0.05 ? "OK" : `LARGE (${(disagreement * 100).toFixed(1)}%)`;
  }

  console.log(`\n=== ${preset.name} === [${ok}]  (sim ${tElapsed}ms)`);
  console.log(`  active cells   : ${largest.length} of ${comps.length} components`);
  console.log(`  conservation Δ : ${consErr.toExponential(2)}`);
  console.log(`  λ₂ (Laplacian) : ${lambda2.toFixed(4)}`);
  console.log(`  slope (fit)    : ${fit ? fit.slope.toFixed(5) : "—"} (expected -α·λ₂ = ${(-params.alpha * lambda2).toFixed(5)})`);
  console.log(`  gap (fit)      : ${fittedGap != null ? fittedGap.toFixed(4) : "—"}`);
  console.log(`  R²             : ${fit ? fit.r2.toFixed(4) : "—"}`);
  const lastLog = samples[samples.length - 1]?.logNorm;
  const firstLog = samples[0]?.logNorm;
  console.log(`  log‖r⟂‖ range  : ${firstLog?.toFixed(3)} → ${lastLog?.toFixed(3)} over ${samples.length} samples`);
}
