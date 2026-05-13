import { Rng } from "./rng";
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
  makeInitial: (
    H: number,
    W: number,
    rng: Rng,
    params: Params,
  ) => { grid: Grid; coupling: CouplingMap };
  params: Partial<Params>;
}

export const DEFAULT_PARAMS: Params = {
  slack: 10,
  alpha: 0.18,
  vitalityR0: 0.15,
  vitalityK: 18,
  mu: 0.02,
  dropBiasDormant: false,
  speed: 60,
  vitalityThreshold: 0.15,
  recomputeSpectralEvery: 8,
  fitWindow: 15,
  plotWindow: 240,
  totalEnergyTarget: 80, // ~0.2 × cell count if uniformly distributed
};

// Distribute the target total energy uniformly across all cells.
function seedUniform(H: number, W: number, total: number): Grid {
  const grid = makeEmptyGrid(H, W);
  const per = total / (H * W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) grid[y][x].r = per;
  }
  return grid;
}

// Concentrate the target total at one (or a few) seed cells.
function seedAt(H: number, W: number, total: number, seeds: [number, number][]): Grid {
  const grid = makeEmptyGrid(H, W);
  const per = total / seeds.length;
  for (const [x, y] of seeds) grid[y][x].r = per;
  return grid;
}

// Build a coupling map with a single low-κ "ridge" along a column.
function couplingWithVerticalRidge(
  H: number,
  W: number,
  ridgeX: number,
  insideKappa: number,
  ridgeKappa: number,
): CouplingMap {
  const map = uniformCoupling(H, W, insideKappa);
  // Horizontal edges that cross the ridge get the lower coupling.
  for (let y = 0; y < H; y++) {
    if (ridgeX - 1 >= 0 && ridgeX - 1 < W - 1)
      map.kappaH[y][ridgeX - 1] = ridgeKappa;
  }
  return map;
}

// Coupling with two ridges, partitioning the grid into three vertical bands.
function couplingWithTwoRidges(
  H: number,
  W: number,
  ridge1X: number,
  ridge2X: number,
  insideKappa: number,
  ridgeKappa: number,
): CouplingMap {
  const map = uniformCoupling(H, W, insideKappa);
  for (let y = 0; y < H; y++) {
    if (ridge1X - 1 >= 0 && ridge1X - 1 < W - 1)
      map.kappaH[y][ridge1X - 1] = ridgeKappa;
    if (ridge2X - 1 >= 0 && ridge2X - 1 < W - 1)
      map.kappaH[y][ridge2X - 1] = ridgeKappa;
  }
  return map;
}

// Coupling with a soft circular "barrier" — κ scales with distance from a
// chosen ridge polygon. Smoother than the hard ridges above.
function couplingWithSpot(
  H: number,
  W: number,
  cx: number,
  cy: number,
  innerKappa: number,
  outerKappa: number,
  radius: number,
): CouplingMap {
  const map = uniformCoupling(H, W, outerKappa);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      const mx = x + 0.5;
      const my = y;
      const d = Math.hypot(mx - cx, my - cy);
      const t = Math.max(0, Math.min(1, 1 - d / radius));
      map.kappaH[y][x] = outerKappa + (innerKappa - outerKappa) * t;
    }
  }
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      const mx = x;
      const my = y + 0.5;
      const d = Math.hypot(mx - cx, my - cy);
      const t = Math.max(0, Math.min(1, 1 - d / radius));
      map.kappaV[y][x] = outerKappa + (innerKappa - outerKappa) * t;
    }
  }
  return map;
}

function uniformBoard(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
): { grid: Grid; coupling: CouplingMap } {
  return {
    grid: seedUniform(H, W, params.totalEnergyTarget),
    coupling: uniformCoupling(H, W, 1.0),
  };
}

function singleSpring(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
): { grid: Grid; coupling: CouplingMap } {
  return {
    grid: seedAt(H, W, params.totalEnergyTarget, [[Math.floor(W / 2), Math.floor(H / 2)]]),
    coupling: uniformCoupling(H, W, 1.0),
  };
}

function twinBlocks(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
): { grid: Grid; coupling: CouplingMap } {
  return {
    grid: seedUniform(H, W, params.totalEnergyTarget),
    coupling: couplingWithVerticalRidge(H, W, Math.floor(W / 2), 1.0, 0.05),
  };
}

function triBlocks(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
): { grid: Grid; coupling: CouplingMap } {
  return {
    grid: seedUniform(H, W, params.totalEnergyTarget),
    coupling: couplingWithTwoRidges(
      H,
      W,
      Math.floor(W / 3),
      Math.floor((2 * W) / 3),
      1.0,
      0.05,
    ),
  };
}

function softBasin(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
): { grid: Grid; coupling: CouplingMap } {
  return {
    grid: seedUniform(H, W, params.totalEnergyTarget),
    coupling: couplingWithSpot(H, W, W / 2, H / 2, 1.0, 0.1, Math.max(H, W) / 2.5),
  };
}

export const PRESETS: Preset[] = [
  {
    id: "uniform",
    name: "Uniform Board",
    description:
      "Identical κ on every edge. Drag the slack slider to see a single connected medium fragment or coalesce based on drop rhythm.",
    makeInitial: uniformBoard,
    params: {},
  },
  {
    id: "single-spring",
    name: "Single Spring",
    description:
      "All initial energy at one cell. Watch the cascade radiate. Energy is then redistributed by the conserved decay/drop cycle.",
    makeInitial: singleSpring,
    params: {},
  },
  {
    id: "twin-blocks",
    name: "Twin Blocks",
    description:
      "Two strongly-coupled bands joined by one low-κ ridge. Each block mixes fast; cross-ridge equilibration is slow.",
    makeInitial: twinBlocks,
    params: {},
  },
  {
    id: "tri-blocks",
    name: "Three Blocks",
    description:
      "Three strongly-coupled vertical bands. Spectral gap reflects the slowest cross-ridge timescale.",
    makeInitial: triBlocks,
    params: {},
  },
  {
    id: "soft-basin",
    name: "Soft Basin",
    description:
      "Smooth radial κ — fast mixing near the centre, weakly-coupled periphery. Tests vitality-driven structure.",
    makeInitial: softBasin,
    params: {},
  },
];

export function mergeParams(base: Params, override: Partial<Params>): Params {
  return { ...base, ...override };
}
