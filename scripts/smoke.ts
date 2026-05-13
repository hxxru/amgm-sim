// Numerical sanity check: load each preset, run with topology frozen so
// SHARE is the only active phase, and verify the slope-fit gap matches
// the Laplacian λ₂ within a tight tolerance. This is what the spectral
// pipeline is supposed to deliver under the user's "Freeze" toggle.

import { makeRng } from "../src/sim/rng.ts";
import {
  DEFAULT_PARAMS,
  mergeParams,
  PRESETS,
} from "../src/sim/presets.ts";
import { step } from "../src/sim/rules.ts";
import { components, buildLaplacian } from "../src/sim/graph.ts";
import { fiedler, fitSlope, orthLogNorm } from "../src/sim/spectral.ts";
import { OrthSample, SimState } from "../src/sim/state.ts";

const H = 20;
const W = 20;

for (const preset of PRESETS) {
  const params = mergeParams(DEFAULT_PARAMS, {
    ...preset.params,
    freezeTopology: true,
  });
  const rng = makeRng(42);
  const grid = preset.makeGrid(H, W, rng, params);
  let state: SimState = {
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

  const samples: OrthSample[] = [];
  for (let i = 0; i < 5000; i++) {
    state = step(state, params, rng);
    if (state.lastPhase === "SHARE") {
      const comps = components(state.grid);
      const largest = comps[0] ?? [];
      const rs = largest.map((idx) => {
        const y = Math.floor(idx / W);
        const x = idx - y * W;
        return state.grid[y][x].r;
      });
      samples.push({
        t: state.tick,
        logNorm: orthLogNorm(rs),
        sinceEvent: state.ticksSinceEvent,
      });
    }
    if (samples.length > 400) break;
  }

  const comps = components(state.grid);
  const largest = comps[0] ?? [];
  const L = buildLaplacian(state.grid, largest);
  const f = fiedler(L);
  const fit = fitSlope(samples, params.fitWindow);
  const fittedGap = fit ? -fit.slope / params.alpha : null;
  const lambda2 = f?.lambda2 ?? 0;
  const disagreement =
    fittedGap != null && lambda2 > 1e-9
      ? Math.abs(fittedGap - lambda2) / lambda2
      : null;

  const ok =
    disagreement != null && disagreement < 0.05
      ? "OK"
      : disagreement != null
        ? `LARGE (${(disagreement * 100).toFixed(1)}%)`
        : "NO FIT";

  console.log(`\n=== ${preset.name} === [${ok}]`);
  console.log(`  alive: ${largest.length} cells, ${comps.length} components`);
  console.log(`  λ₂ (Laplacian) : ${lambda2.toFixed(4)}`);
  console.log(`  gap (fit)      : ${fittedGap != null ? fittedGap.toFixed(4) : "—"}`);
  console.log(`  R²             : ${fit ? fit.r2.toFixed(4) : "—"}`);
}
