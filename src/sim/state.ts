// Token-quantised slime-mold CA.
//
// Each cell holds an integer token count r ∈ {0, ..., L-1}. Conservation
// is exact: Σ r_i + reservoir = totalEnergy (all integers). SHARE
// transfers single tokens stochastically across edges; DECAY moves
// individual tokens to a reservoir; DROP pours the reservoir back at
// stochastically-chosen sites determined by the current DropSource.

import { DropSourceState } from "./dropSource";

export const LEVELS = 16;
export const R_MAX = LEVELS - 1;

export interface Cell {
  r: number; // integer in [0, R_MAX]
}

export type Grid = Cell[][];

export type Phase = "SHARE" | "DECAY" | "DROP";

export const PHASES_ALL: Phase[] = ["SHARE", "DECAY", "DROP"];

// Coupling map: intrinsic edge weights κ_ij ∈ [0, 1]. Stored as two 2D
// arrays — one for horizontal edges (right of each cell), one for vertical
// (below each cell). kappaH[y][x] is the edge between (x,y) and (x+1,y).
// Edges along the right and bottom borders are unused (kept for shape).
export interface CouplingMap {
  H: number;
  W: number;
  kappaH: number[][]; // [H][W-1]   — extended to [H][W] with last column unused
  kappaV: number[][]; // [H-1][W]   — extended to [H][W] with last row unused
}

export interface OrthSample {
  t: number;
  logNorm: number;
  sinceEvent: number; // ticks since last DROP — DROPs reset the linear regime
}

export interface SpectralSnapshot {
  computedAtTick: number;
  activeIndices: number[]; // cells with g(r) above the vitality threshold
  phi2: number[];          // Fiedler vector, same length as activeIndices
  lambda2: number;         // weighted Laplacian's second-smallest eigenvalue
  componentCount: number;  // connected components of the active subgraph
}

export interface DropFlash {
  x: number;
  y: number;
  magnitude: number;
  framesRemaining: number;
}

export interface Params {
  // Headline knob. High slack → small drop magnitude → tokens dispersed
  // → most cells stay above vitality threshold → one connected cluster.
  // Low slack → large drop magnitude → tokens concentrated → rest of
  // grid decays below threshold → fragmentation.
  // Internally: M_drop = round((R_MAX) / slack), clamped to [1, R_MAX].
  slack: number;

  // Sharing
  alpha: number;        // base SHARE probability scale per edge per tick
  vitalityR0: number;   // sigmoid centre, in r-units
  vitalityK: number;    // sigmoid steepness

  // Hazard
  mu: number;           // per-tick per-token probability of decay

  // Run
  speed: number;        // steps per second (UI)

  // Spectral
  vitalityThreshold: number;     // g threshold for "active" cells
  recomputeSpectralEvery: number;
  fitWindow: number;
  plotWindow: number;

  // Initialisation (when reseeding the preset). Integer; reset on Reset.
  totalEnergyTarget: number;
}

export interface SimState {
  grid: Grid;
  coupling: CouplingMap;
  dropSource: DropSourceState;
  H: number;
  W: number;

  tick: number;
  nextPhase: Phase;
  lastPhase: Phase | null;

  // Conservation: Σ r_i + reservoir = totalEnergy (invariant).
  reservoir: number;
  totalEnergy: number;

  // Edge-flow magnitudes captured during the most recent SHARE step.
  // Stored signed so the canvas can paint a direction gradient.
  edgeFlowH: number[][];
  edgeFlowV: number[][];

  // Most recent drops, kept for a few frames so the canvas can flash them.
  drops: DropFlash[];

  // Convergence-plot bookkeeping.
  orthSamples: OrthSample[];
  spectral: SpectralSnapshot | null;
  ticksSinceDrop: number;
}

export function makeEmptyGrid(H: number, W: number): Grid {
  return Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ r: 0 })),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ r: cell.r })));
}

export function zeros2D(H: number, W: number): number[][] {
  return Array.from({ length: H }, () => new Array(W).fill(0));
}

export function linearIndex(W: number, x: number, y: number): number {
  return y * W + x;
}

// Smooth vitality function: sigmoid centred at r0 with steepness k.
// Continuous, monotonically increasing in r, asymptotes to 0 and 1.
export function vitality(r: number, r0: number, k: number): number {
  return 1 / (1 + Math.exp(-k * (r - r0)));
}

// Uniform coupling map at a chosen κ.
export function uniformCoupling(H: number, W: number, kappa: number): CouplingMap {
  const kappaH = Array.from({ length: H }, () => new Array(W).fill(kappa));
  const kappaV = Array.from({ length: H }, () => new Array(W).fill(kappa));
  // Border edges aren't real edges — zero them out for cleanliness.
  for (let y = 0; y < H; y++) kappaH[y][W - 1] = 0;
  for (let x = 0; x < W; x++) kappaV[H - 1][x] = 0;
  return { H, W, kappaH, kappaV };
}
