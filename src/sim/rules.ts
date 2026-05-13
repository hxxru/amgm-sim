import { Rng } from "./rng";
import {
  cloneGrid,
  CouplingMap,
  DropFlash,
  Grid,
  Params,
  Phase,
  SimState,
  vitality,
  zeros2D,
} from "./state";

// Apply one SHARE phase. Each edge transfers a bilateral, conservation-
// preserving fraction of the height difference, weighted by intrinsic κ_ij
// and the vitality of both endpoints. Edge flow magnitudes are recorded
// so the canvas can animate them. Returns both the new grid and the edge
// flow maps.
function applyShare(
  grid: Grid,
  coupling: CouplingMap,
  params: Params,
): { grid: Grid; flowH: number[][]; flowV: number[][] } {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  const flowH = zeros2D(H, W);
  const flowV = zeros2D(H, W);

  const { alpha, vitalityR0, vitalityK } = params;

  // Pre-compute vitality per cell once.
  const g: number[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => vitality(grid[y][x].r, vitalityR0, vitalityK)),
  );

  // Horizontal edges: between (x, y) and (x+1, y).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      const kappa = coupling.kappaH[y][x];
      if (kappa === 0) continue;
      const w = alpha * kappa * g[y][x] * g[y][x + 1];
      if (w === 0) continue;
      const diff = grid[y][x + 1].r - grid[y][x].r;
      const flow = w * diff;
      // Positive flow → mass moves from right to left (since left gains).
      // Sign convention: flowH > 0 means left cell is gaining (right→left).
      flowH[y][x] = flow;
      next[y][x].r += flow;
      next[y][x + 1].r -= flow;
    }
  }
  // Vertical edges: between (x, y) and (x, y+1).
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      const kappa = coupling.kappaV[y][x];
      if (kappa === 0) continue;
      const w = alpha * kappa * g[y][x] * g[y + 1][x];
      if (w === 0) continue;
      const diff = grid[y + 1][x].r - grid[y][x].r;
      const flow = w * diff;
      flowV[y][x] = flow;
      next[y][x].r += flow;
      next[y + 1][x].r -= flow;
    }
  }

  // Clamp tiny negative drift from numerical error.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (next[y][x].r < 0 && next[y][x].r > -1e-9) next[y][x].r = 0;
    }
  }

  return { grid: next, flowH, flowV };
}

// DECAY: each cell loses fraction μ of its current resource to the
// reservoir. Conservation: cells lose μ·Σr, reservoir gains μ·Σr.
function applyDecay(
  grid: Grid,
  params: Params,
  reservoir: number,
): { grid: Grid; reservoir: number } {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  const mu = params.mu;
  let evaporated = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = grid[y][x].r;
      if (r <= 0) continue;
      const dr = r * mu;
      evaporated += dr;
      next[y][x].r = r - dr;
    }
  }
  return { grid: next, reservoir: reservoir + evaporated };
}

// DROP: if the reservoir is large enough, choose a destination cell and
// pour the entire reservoir there. Threshold is ε_drop = totalEnergy / slack.
function applyDrop(
  grid: Grid,
  params: Params,
  reservoir: number,
  totalEnergy: number,
  rng: Rng,
  drops: DropFlash[],
): { grid: Grid; reservoir: number; dropped: boolean; drops: DropFlash[]; ticksReset: boolean } {
  const epsilonDrop = totalEnergy / Math.max(params.slack, 1e-6);
  if (reservoir < epsilonDrop) {
    return { grid, reservoir, dropped: false, drops, ticksReset: false };
  }

  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);

  // Choose destination cell. By default uniform-random; with dropBiasDormant
  // weight by (1 − g(r)) so foragers preferentially feed depleted cells.
  let x = 0;
  let y = 0;
  if (params.dropBiasDormant) {
    const weights: number[] = new Array(H * W);
    let sum = 0;
    for (let yy = 0; yy < H; yy++) {
      for (let xx = 0; xx < W; xx++) {
        const w = 1 - vitality(grid[yy][xx].r, params.vitalityR0, params.vitalityK);
        weights[yy * W + xx] = w;
        sum += w;
      }
    }
    let target = rng() * sum;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      target -= weights[idx];
      if (target <= 0) break;
    }
    if (idx >= weights.length) idx = weights.length - 1;
    y = Math.floor(idx / W);
    x = idx - y * W;
  } else {
    x = Math.floor(rng() * W);
    y = Math.floor(rng() * H);
    if (x === W) x = W - 1;
    if (y === H) y = H - 1;
  }

  next[y][x].r += reservoir;
  const flash: DropFlash = {
    x,
    y,
    magnitude: reservoir,
    framesRemaining: 12,
  };
  return {
    grid: next,
    reservoir: 0,
    dropped: true,
    drops: [...drops, flash],
    ticksReset: true,
  };
}

// One simulation step: applies the next phase and returns the new state.
// Phase cycle: SHARE → DECAY → DROP → SHARE → ... DROP is conditional but
// always advances the phase index so the strip remains readable.
export function step(state: SimState, params: Params, rng: Rng): SimState {
  const phase: Phase = state.nextPhase;
  let grid = state.grid;
  let reservoir = state.reservoir;
  let edgeFlowH = state.edgeFlowH;
  let edgeFlowV = state.edgeFlowV;
  let drops = state.drops;
  let ticksSinceDrop = state.ticksSinceDrop;
  let tick = state.tick;

  switch (phase) {
    case "SHARE": {
      const out = applyShare(grid, state.coupling, params);
      grid = out.grid;
      edgeFlowH = out.flowH;
      edgeFlowV = out.flowV;
      ticksSinceDrop += 1;
      break;
    }
    case "DECAY": {
      const out = applyDecay(grid, params, reservoir);
      grid = out.grid;
      reservoir = out.reservoir;
      break;
    }
    case "DROP": {
      const out = applyDrop(
        grid,
        params,
        reservoir,
        state.totalEnergy,
        rng,
        drops,
      );
      grid = out.grid;
      reservoir = out.reservoir;
      drops = out.drops;
      if (out.ticksReset) ticksSinceDrop = 0;
      break;
    }
  }

  // Decay drop flashes by one frame regardless of phase.
  drops = drops
    .map((d) => ({ ...d, framesRemaining: d.framesRemaining - 1 }))
    .filter((d) => d.framesRemaining > 0);

  let nextPhase: Phase;
  switch (phase) {
    case "SHARE":
      nextPhase = "DECAY";
      break;
    case "DECAY":
      nextPhase = "DROP";
      break;
    case "DROP":
      tick = tick + 1;
      nextPhase = "SHARE";
      break;
  }

  return {
    ...state,
    grid,
    reservoir,
    edgeFlowH,
    edgeFlowV,
    drops,
    ticksSinceDrop,
    tick,
    nextPhase,
    lastPhase: phase,
  };
}
