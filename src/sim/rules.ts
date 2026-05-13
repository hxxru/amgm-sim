import { Rng } from "./rng";
import {
  cloneGrid,
  CouplingMap,
  DropFlash,
  Grid,
  Params,
  Phase,
  R_MAX,
  SimState,
  vitality,
  zeros2D,
} from "./state";

// Stochastic, token-conserving SHARE. We process all edges in a random
// order; for each edge with r_i ≠ r_j and at least one token on the
// higher side, with probability α · κ · g(r_i) · g(r_j) one token moves
// from the higher cell to the lower. State is updated in place as we
// go so cells can't be drained below zero.
function applyShare(
  grid: Grid,
  coupling: CouplingMap,
  params: Params,
  rng: Rng,
  flowDecayH: number[][],
  flowDecayV: number[][],
): { grid: Grid; flowH: number[][]; flowV: number[][] } {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  // Decay previous flow signal so flashes fade.
  const flowH = flowDecayH.map((row) => row.map((v) => v * 0.55));
  const flowV = flowDecayV.map((row) => row.map((v) => v * 0.55));

  const { alpha, vitalityR0, vitalityK } = params;

  // Build an edge list and shuffle (Fisher-Yates).
  type EdgeKind = 0 | 1; // 0 = horizontal, 1 = vertical
  const edges: [number, number, EdgeKind][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) edges.push([x, y, 0]);
  }
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) edges.push([x, y, 1]);
  }
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = edges[i];
    edges[i] = edges[j];
    edges[j] = tmp;
  }

  for (const [x, y, kind] of edges) {
    let kappa: number;
    let ax: number, ay: number, bx: number, by: number;
    if (kind === 0) {
      kappa = coupling.kappaH[y][x];
      ax = x; ay = y; bx = x + 1; by = y;
    } else {
      kappa = coupling.kappaV[y][x];
      ax = x; ay = y; bx = x; by = y + 1;
    }
    if (kappa <= 0) continue;
    const ra = next[ay][ax].r;
    const rb = next[by][bx].r;
    if (ra === rb) continue;
    const ga = vitality(ra, vitalityR0, vitalityK);
    const gb = vitality(rb, vitalityR0, vitalityK);
    const p = alpha * kappa * ga * gb;
    if (rng() >= p) continue;
    // Move one token from the higher cell to the lower.
    if (ra > rb) {
      next[ay][ax].r = ra - 1;
      next[by][bx].r = rb + 1;
    } else {
      next[ay][ax].r = ra + 1;
      next[by][bx].r = rb - 1;
    }
    if (kind === 0) flowH[y][x] += 1;
    else flowV[y][x] += 1;
  }

  return { grid: next, flowH, flowV };
}

// DECAY: each token in each cell independently has probability μ of
// evaporating to the reservoir. We sample Binomial(r, μ) cheaply for
// small r by summing μ-Bernoullis.
function applyDecay(
  grid: Grid,
  params: Params,
  reservoir: number,
  rng: Rng,
): { grid: Grid; reservoir: number } {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  const mu = params.mu;
  let evap = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = grid[y][x].r;
      if (r <= 0) continue;
      // Binomial(r, μ) by summing.
      let loss = 0;
      for (let k = 0; k < r; k++) {
        if (rng() < mu) loss++;
      }
      if (loss > 0) {
        next[y][x].r = r - loss;
        evap += loss;
      }
    }
  }
  return { grid: next, reservoir: reservoir + evap };
}

// DROP: distribute up to M tokens from the reservoir across cells.
// M = round(R_MAX / slack), clamped to [1, R_MAX]. Each token goes to a
// randomly picked cell that isn't already saturated; we make up to a
// few attempts before giving up to avoid pathological full-board cases.
function applyDrop(
  grid: Grid,
  params: Params,
  reservoir: number,
  rng: Rng,
  drops: DropFlash[],
): {
  grid: Grid;
  reservoir: number;
  dropped: boolean;
  drops: DropFlash[];
  ticksReset: boolean;
} {
  const M = Math.max(1, Math.min(R_MAX, Math.round(R_MAX / Math.max(params.slack, 1e-6))));
  if (reservoir < M) {
    return { grid, reservoir, dropped: false, drops, ticksReset: false };
  }

  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  let toDrop = M;
  let primaryX = -1;
  let primaryY = -1;
  const attemptsCap = 6 * M + 24;
  let attempts = 0;
  while (toDrop > 0 && attempts < attemptsCap) {
    attempts++;
    let x: number, y: number;
    if (params.dropBiasDormant) {
      // Two-shot weighted pick to keep it cheap.
      let bestX = 0, bestY = 0, bestW = -1;
      for (let s = 0; s < 4; s++) {
        const xx = Math.min(W - 1, Math.floor(rng() * W));
        const yy = Math.min(H - 1, Math.floor(rng() * H));
        const w = 1 - vitality(next[yy][xx].r, params.vitalityR0, params.vitalityK);
        if (w > bestW) { bestW = w; bestX = xx; bestY = yy; }
      }
      x = bestX; y = bestY;
    } else {
      x = Math.min(W - 1, Math.floor(rng() * W));
      y = Math.min(H - 1, Math.floor(rng() * H));
    }
    if (next[y][x].r >= R_MAX) continue;
    const amount = Math.min(toDrop, R_MAX - next[y][x].r);
    next[y][x].r += amount;
    toDrop -= amount;
    if (primaryX < 0) {
      primaryX = x;
      primaryY = y;
    }
  }
  const actuallyDropped = M - toDrop;
  if (actuallyDropped === 0) {
    return { grid, reservoir, dropped: false, drops, ticksReset: false };
  }

  const flash: DropFlash = {
    x: primaryX,
    y: primaryY,
    magnitude: actuallyDropped,
    framesRemaining: 14,
  };
  return {
    grid: next,
    reservoir: reservoir - actuallyDropped,
    dropped: true,
    drops: [...drops, flash],
    ticksReset: true,
  };
}

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
      const out = applyShare(grid, state.coupling, params, rng, edgeFlowH, edgeFlowV);
      grid = out.grid;
      edgeFlowH = out.flowH;
      edgeFlowV = out.flowV;
      ticksSinceDrop += 1;
      break;
    }
    case "DECAY": {
      const out = applyDecay(grid, params, reservoir, rng);
      grid = out.grid;
      reservoir = out.reservoir;
      break;
    }
    case "DROP": {
      const out = applyDrop(grid, params, reservoir, rng, drops);
      grid = out.grid;
      reservoir = out.reservoir;
      drops = out.drops;
      if (out.ticksReset) ticksSinceDrop = 0;
      break;
    }
  }

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

// Suppress unused-warning when zeros2D is imported elsewhere only.
void zeros2D;
