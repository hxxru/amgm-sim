import { Rng } from "./rng";
import { DropSourceState } from "./dropSource";
import {
  CouplingMap,
  Grid,
  makeEmptyGrid,
  Params,
  uniformCoupling,
} from "./state";

export interface Preset {
  id: string;
  name: string;
  description: string;
  // Build the initial substrate, initial grid, drop source, and the
  // starting reservoir level. By default we put the entire energy budget
  // in the reservoir so the user watches drops *build* the structure.
  makeInitial: (
    H: number,
    W: number,
    rng: Rng,
    params: Params,
  ) => {
    grid: Grid;
    coupling: CouplingMap;
    dropSource: DropSourceState;
    reservoir: number;
  };
  params: Partial<Params>;
}

export const DEFAULT_PARAMS: Params = {
  // 6 ticks/s = 18 steps/s (3 phases per tick).
  speed: 18,
  // Slack 1.5 → M = round(15/1.5) = 10 tokens per drop (large bursts).
  slack: 1.5,
  alpha: 0.15,
  // Vitality sigmoid in token units: g(0)=0.011, g(2)=0.18, g(3)=0.5,
  // g(4)=0.82, g(R_MAX)≈1. Cells become "engaged" at r ≥ 3.
  vitalityR0: 3,
  vitalityK: 1.5,
  vitalityThreshold: 0.2,
  mu: 0.004,
  recomputeSpectralEvery: 8,
  fitWindow: 25,
  plotWindow: 240,
  gridSize: 50,
  tokensPerCellTarget: 4,
};

// Distribute the integer token budget uniformly across all cells; any
// rounding remainder is taken up by the reservoir so totals stay exact.
function seedUniformGrid(H: number, W: number, total: number): { grid: Grid; reservoir: number } {
  const grid = makeEmptyGrid(H, W);
  const N = H * W;
  const base = Math.floor(total / N);
  const capped = Math.min(base, 15);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) grid[y][x].r = capped;
  }
  const placed = capped * N;
  return { grid, reservoir: Math.max(0, total - placed) };
}

function totalTokensFor(H: number, W: number, params: Params): number {
  return Math.max(0, Math.round(params.tokensPerCellTarget * H * W));
}

function uniformDropPreset(H: number, W: number, _rng: Rng, params: Params) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: { kind: "uniform" as const },
    reservoir,
  };
}

function twinSpringsPreset(H: number, W: number, _rng: Rng, params: Params) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  const left = { x: Math.floor(W * 0.25), y: Math.floor(H / 2) };
  const right = { x: Math.floor(W * 0.75), y: Math.floor(H / 2) };
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "twin" as const,
      sites: [left, right] as [{ x: number; y: number }, { x: number; y: number }],
      turn: 0 as 0 | 1,
    },
    reservoir,
  };
}

function wanderingSourcePreset(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "wander" as const,
      x: Math.floor(W / 2),
      y: Math.floor(H / 2),
      pStay: 0.5,
    },
    reservoir,
  };
}

function foragingPreset(H: number, W: number, _rng: Rng, params: Params) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "forage" as const,
      sampleSize: 6,
    },
    reservoir,
  };
}

function regimeMarkovPreset(H: number, W: number, _rng: Rng, params: Params) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  // Three regimes — corners of an equilateral triangle, each with a tight
  // spatial spread. Long dwell time (~200 drops between switches at
  // pSwitch = 0.005) so a cluster forms in one regime before flipping.
  const states = [
    { centerX: Math.floor(W * 0.25), centerY: Math.floor(H * 0.3), sigma: 2.5 },
    { centerX: Math.floor(W * 0.75), centerY: Math.floor(H * 0.3), sigma: 2.5 },
    { centerX: Math.floor(W * 0.5),  centerY: Math.floor(H * 0.75), sigma: 2.5 },
  ];
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "markov" as const,
      states,
      currentState: 0,
      pSwitch: 0.005,
    },
    reservoir,
  };
}

function hawkesPreset(H: number, W: number, _rng: Rng, params: Params) {
  const { grid, reservoir } = seedUniformGrid(H, W, totalTokensFor(H, W, params));
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "hawkes" as const,
      lastX: Math.floor(W / 2),
      lastY: Math.floor(H / 2),
      localityRadius: 2.5,
      resetProb: 0.03,
    },
    reservoir,
  };
}

export const PRESETS: Preset[] = [
  {
    id: "uniform-drops",
    name: "Uniform Drops",
    description:
      "Drops at iid uniform random cells. No spatial or temporal correlation — the null hypothesis. With uniform κ, no cluster should form: tokens stay broadly distributed.",
    makeInitial: uniformDropPreset,
    params: {},
  },
  {
    id: "twin-springs",
    name: "Twin Springs",
    description:
      "Drops alternate strictly between two fixed cells. Two competing clusters: when slack is small they merge into one connected medium; when slack is large they stay as separate hot spots with the rest of the grid dormant.",
    makeInitial: twinSpringsPreset,
    params: {},
  },
  {
    id: "wandering-source",
    name: "Wandering Source",
    description:
      "Drop site does a random walk on the grid (p_stay = 0.5). A single cluster forms and follows the drifting source. Watch the Fiedler contour migrate with it.",
    makeInitial: wanderingSourcePreset,
    params: {},
  },
  {
    id: "foraging",
    name: "Foraging",
    description:
      "State-coupled: each drop samples a handful of cells and lands at the dimmest. The cluster migrates as a feeding front — bright regions get starved as drops avoid them; dim regions get fed.",
    makeInitial: foragingPreset,
    params: {},
  },
  {
    id: "regime-markov",
    name: "Regime Markov",
    description:
      "Hidden three-state Markov chain over Gaussian drop regions, pSwitch = 0.005. The cluster lives in one region for a long stretch, then teleports to another — the Fiedler cut reorients each switch.",
    makeInitial: regimeMarkovPreset,
    params: {},
  },
  {
    id: "hawkes",
    name: "Hawkes Cluster",
    description:
      "Spatial self-excitation: each drop biases the next toward its own neighbourhood. Clusters grow runaway around the chain's current location, with occasional resets (resetProb = 0.03) to a fresh iid site.",
    makeInitial: hawkesPreset,
    params: {},
  },
];

export function mergeParams(base: Params, override: Partial<Params>): Params {
  return { ...base, ...override };
}
