// Core state types for the gridworld CA.

export interface Cell {
  alive: boolean;
  r: number;
}

export type Grid = Cell[][]; // grid[y][x]

export type Phase = "SHARE" | "DISCOVER" | "CULL" | "BIRTH";

export const PHASES_ALL: Phase[] = ["SHARE", "DISCOVER", "CULL", "BIRTH"];

export interface Params {
  // Basic (exposed in the default control panel)
  alpha: number; // share rate
  pFood: number; // food discovery probability per cell per tick
  rDeath: number; // death threshold
  rBirth: number; // birth-eligibility threshold for "healthy" neighbour
  speed: number; // steps per second (UI-only)

  // Advanced (hidden behind an "advanced" expander by default)
  epsilon: number; // food pulse magnitude
  beta: number; // death steepness (max prob when r = 0)
  gamma: number; // per-cell-per-(birth-tick) birth probability
  k: number; // healthy alive neighbours required for birth
  rSeed: number; // newborn resource
  tDb: number; // ticks between CULL/BIRTH phases
  rMax: number; // soft cap on resource (Infinity disables)
  decay: number; // per-tick exponential decay applied during SHARE
  foodOnAliveOnly: boolean; // if true, DISCOVER only feeds alive cells
  freezeTopology: boolean; // if true, CULL/BIRTH are skipped — clean spectral
  recomputeSpectralEvery: number; // share-ticks between spectral recomputes
  fitWindow: number; // samples used for the slope fit
  plotWindow: number; // samples shown on the convergence plot
  initialDensity: number; // for the Random Scatter preset
  initialRMin: number;
  initialRMax: number;
}

export interface OrthSample {
  t: number;
  logNorm: number;
  sinceEvent: number; // ticks since last CULL/BIRTH
}

export interface SpectralSnapshot {
  computedAtTick: number;
  largestComponentIndices: number[]; // linear (y*W + x) indices
  phi2: number[]; // length = largestComponentIndices.length
  lambda2: number;
  componentCount: number;
}

export interface SimState {
  grid: Grid;
  H: number;
  W: number;
  tick: number; // number of completed SHARE phases
  nextPhase: Phase;
  ticksSinceEvent: number;
  orthSamples: OrthSample[];
  spectral: SpectralSnapshot | null;
  lastPhase: Phase | null; // the phase that produced the current grid
}

export function makeEmptyGrid(H: number, W: number): Grid {
  return Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ alive: false, r: 0 })),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function linearIndex(W: number, x: number, y: number): number {
  return y * W + x;
}
