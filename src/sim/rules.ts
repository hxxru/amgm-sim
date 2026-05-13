import { Rng } from "./rng";
import { DropSourceState, nextDropSite } from "./dropSource";
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

// DROP: dispense up to M tokens at the site chosen by the current
// DropSource. M = round(R_MAX / slack), clamped to [1, R_MAX]. The
// primary site receives as much as it can hold; any overflow spills to
// the 8-neighbourhood and beyond, so a single drop event can paint a
// small splash when M > the headroom of the chosen cell. Returns the
// (possibly advanced) DropSourceState.
function applyDrop(
  grid: Grid,
  params: Params,
  reservoir: number,
  rng: Rng,
  drops: DropFlash[],
  dropSource: DropSourceState,
): {
  grid: Grid;
  reservoir: number;
  dropped: boolean;
  drops: DropFlash[];
  ticksReset: boolean;
  dropSource: DropSourceState;
} {
  const M = Math.max(1, Math.min(R_MAX, Math.round(R_MAX / Math.max(params.slack, 1e-6))));
  if (reservoir < M) {
    return { grid, reservoir, dropped: false, drops, ticksReset: false, dropSource };
  }

  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  const { site, source: newSource } = nextDropSite(dropSource, rng, H, W);
  const primaryX = site.x;
  const primaryY = site.y;

  // Drop M tokens, starting at the primary site and spilling outwards
  // in a spiral when the cell can't hold more.
  let toDrop = M;
  const visited = new Uint8Array(H * W);
  const queue: [number, number][] = [[primaryX, primaryY]];
  visited[primaryY * W + primaryX] = 1;
  const attemptsCap = 6 * M + 32;
  let attempts = 0;
  while (toDrop > 0 && queue.length > 0 && attempts < attemptsCap) {
    attempts++;
    const [x, y] = queue.shift()!;
    if (next[y][x].r < R_MAX) {
      const amount = Math.min(toDrop, R_MAX - next[y][x].r);
      next[y][x].r += amount;
      toDrop -= amount;
    }
    // Enqueue 4-neighbours in case we still have tokens to place.
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const li = ny * W + nx;
      if (visited[li]) continue;
      visited[li] = 1;
      queue.push([nx, ny]);
    }
  }

  const actuallyDropped = M - toDrop;
  if (actuallyDropped === 0) {
    // Couldn't place any token (board saturated). Don't reset event clock.
    return { grid, reservoir, dropped: false, drops, ticksReset: false, dropSource: newSource };
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
    dropSource: newSource,
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
  let dropSource = state.dropSource;

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
      const out = applyDrop(grid, params, reservoir, rng, drops, dropSource);
      grid = out.grid;
      reservoir = out.reservoir;
      drops = out.drops;
      dropSource = out.dropSource;
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
    dropSource,
  };
}

// Suppress unused-warning when zeros2D is imported elsewhere only.
void zeros2D;
