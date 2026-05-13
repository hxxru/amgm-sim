import { Rng } from "./rng";
import {
  Grid,
  makeEmptyGrid,
  Params,
} from "./state";

export interface Preset {
  id: string;
  name: string;
  description: string;
  makeGrid: (H: number, W: number, rng: Rng, params: Params) => Grid;
  params: Partial<Params>;
}

export const DEFAULT_PARAMS: Params = {
  alpha: 0.15,
  pFood: 0.01,
  rDeath: 0.2,
  rBirth: 0.6,
  speed: 30,

  epsilon: 0.5,
  beta: 0.3,
  gamma: 0.05,
  k: 2,
  rSeed: 0.5,
  tDb: 30,
  rMax: 2.0,
  decay: 0,
  foodOnAliveOnly: true,
  freezeTopology: false,
  recomputeSpectralEvery: 5,
  fitWindow: 15,
  plotWindow: 240,
  initialDensity: 0.35,
  initialRMin: 0.3,
  initialRMax: 0.7,
};

function randomScatter(H: number, W: number, rng: Rng, p: Params): Grid {
  const grid = makeEmptyGrid(H, W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rng() < p.initialDensity) {
        grid[y][x].alive = true;
        grid[y][x].r =
          p.initialRMin + rng() * (p.initialRMax - p.initialRMin);
      }
    }
  }
  return grid;
}

// Fill a rectangle [x0, x1) × [y0, y1) with alive cells at resource r0,
// with a small per-cell jitter so r_perp ≠ 0 at t = 0 (otherwise the
// convergence plot would have nothing to decay).
function fillRect(
  grid: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r0: number,
  rng: Rng,
  jitter = 0.2,
) {
  const H = grid.length;
  const W = grid[0].length;
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      grid[y][x].alive = true;
      grid[y][x].r = r0 + jitter * (rng() - 0.5);
    }
  }
}

function twinBlobs(H: number, W: number, rng: Rng, _p: Params): Grid {
  const grid = makeEmptyGrid(H, W);
  // Two 6×6 blobs with a thin 1-row × 3-col neck between them.
  fillRect(grid, 2, 7, 8, 13, 0.5, rng);
  fillRect(grid, 12, 7, 18, 13, 0.5, rng);
  fillRect(grid, 8, 10, 12, 11, 0.5, rng);
  return grid;
}

function singleNeck(H: number, W: number, rng: Rng, _p: Params): Grid {
  const grid = makeEmptyGrid(H, W);
  fillRect(grid, 2, 8, 18, 12, 0.5, rng);
  for (const x of [9, 10]) {
    grid[8][x].alive = false;
    grid[11][x].alive = false;
    grid[8][x].r = 0;
    grid[11][x].r = 0;
  }
  return grid;
}

function archipelago(H: number, W: number, rng: Rng, _p: Params): Grid {
  const grid = makeEmptyGrid(H, W);
  fillRect(grid, 1, 1, 5, 5, 0.5, rng);
  fillRect(grid, 14, 2, 19, 6, 0.5, rng);
  fillRect(grid, 3, 13, 8, 18, 0.5, rng);
  fillRect(grid, 13, 14, 18, 19, 0.5, rng);
  return grid;
}

export const PRESETS: Preset[] = [
  {
    id: "twin-blobs",
    name: "Twin Blobs",
    description:
      "Two ~6×6 blobs joined by a 2-cell neck. Canonical 'watch the gap appear' preset.",
    makeGrid: twinBlobs,
    params: {
      pFood: 0.005,
      rDeath: 0.15,
      rBirth: 0.7,
      beta: 0.2,
      gamma: 0.02,
      k: 3,
      tDb: 30,
      speed: 30,
    },
  },
  {
    id: "single-neck",
    name: "Single Neck",
    description:
      "Elongated bar with an internal pinch. Fiedler cut sits inside a single connected component.",
    makeGrid: singleNeck,
    params: {
      pFood: 0.005,
      rDeath: 0.15,
      rBirth: 0.7,
      beta: 0.2,
      gamma: 0.02,
      k: 3,
      tDb: 30,
      speed: 30,
    },
  },
  {
    id: "archipelago",
    name: "Archipelago",
    description:
      "Three or four disconnected blobs. Reported gap refers to the largest component.",
    makeGrid: archipelago,
    params: {
      pFood: 0.005,
      rDeath: 0.1,
      rBirth: 0.8,
      beta: 0.2,
      gamma: 0.01,
      k: 3,
      tDb: 30,
      speed: 30,
    },
  },
  {
    id: "random-scatter",
    name: "Random Scatter",
    description:
      "Uniform alive density. Watch structure emerge from purely local rules.",
    makeGrid: randomScatter,
    params: {
      pFood: 0.015,
      initialDensity: 0.35,
      speed: 30,
    },
  },
];

export function mergeParams(base: Params, override: Partial<Params>): Params {
  return { ...base, ...override };
}
