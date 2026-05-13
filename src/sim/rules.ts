import { Rng } from "./rng";
import {
  Cell,
  cloneGrid,
  Grid,
  Params,
  Phase,
  SimState,
} from "./state";

const N4: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function neighbors(grid: Grid, x: number, y: number): Cell[] {
  const H = grid.length;
  const W = grid[0].length;
  const out: Cell[] = [];
  for (const [dx, dy] of N4) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    out.push(grid[ny][nx]);
  }
  return out;
}

function applyShare(grid: Grid, p: Params): Grid {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid[y][x];
      if (!cell.alive) continue;
      let delta = 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const other = grid[ny][nx];
        if (!other.alive) continue;
        delta += other.r - cell.r;
      }
      let r = cell.r + p.alpha * delta;
      if (p.decay > 0) r *= 1 - p.decay;
      if (Number.isFinite(p.rMax)) r = Math.min(r, p.rMax);
      if (r < 0) r = 0;
      next[y][x].r = r;
    }
  }
  return next;
}

function applyDiscover(grid: Grid, p: Params, rng: Rng): Grid {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid[y][x];
      if (p.foodOnAliveOnly && !cell.alive) continue;
      if (rng() < p.pFood) {
        if (!cell.alive && !p.foodOnAliveOnly) continue;
        let r = cell.r + p.epsilon;
        if (Number.isFinite(p.rMax)) r = Math.min(r, p.rMax);
        next[y][x].r = r;
      }
    }
  }
  return next;
}

function applyCull(grid: Grid, p: Params, rng: Rng): Grid {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid[y][x];
      if (!cell.alive) continue;
      if (cell.r >= p.rDeath) continue;
      const deathProb = p.beta * (p.rDeath - cell.r) / p.rDeath;
      if (rng() < deathProb) {
        next[y][x].alive = false;
        next[y][x].r = 0;
      }
    }
  }
  return next;
}

function applyBirth(grid: Grid, p: Params, rng: Rng): Grid {
  const H = grid.length;
  const W = grid[0].length;
  const next = cloneGrid(grid);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid[y][x];
      if (cell.alive) continue;
      let healthy = 0;
      for (const n of neighbors(grid, x, y)) {
        if (n.alive && n.r > p.rBirth) healthy++;
      }
      if (healthy < p.k) continue;
      if (rng() < p.gamma) {
        next[y][x].alive = true;
        next[y][x].r = p.rSeed;
      }
    }
  }
  return next;
}

// One simulation step: applies the next phase, returns the new state.
// Phase ordering: SHARE → DISCOVER, then (if tick % tDb === 0) → CULL → BIRTH.
// The "tick" counter increments after DISCOVER completes.
export function step(
  state: SimState,
  params: Params,
  rng: Rng,
): SimState {
  const phase: Phase = state.nextPhase;
  let grid = state.grid;
  let tick = state.tick;
  let ticksSinceEvent = state.ticksSinceEvent;

  switch (phase) {
    case "SHARE":
      grid = applyShare(grid, params);
      ticksSinceEvent += 1;
      break;
    case "DISCOVER":
      if (!params.freezeTopology) grid = applyDiscover(grid, params, rng);
      break;
    case "CULL":
      grid = applyCull(grid, params, rng);
      ticksSinceEvent = 0;
      break;
    case "BIRTH":
      grid = applyBirth(grid, params, rng);
      break;
  }

  let nextPhase: Phase;
  switch (phase) {
    case "SHARE":
      nextPhase = "DISCOVER";
      break;
    case "DISCOVER":
      tick = tick + 1;
      nextPhase =
        !params.freezeTopology && tick > 0 && tick % params.tDb === 0
          ? "CULL"
          : "SHARE";
      break;
    case "CULL":
      nextPhase = "BIRTH";
      break;
    case "BIRTH":
      nextPhase = "SHARE";
      break;
  }

  return {
    ...state,
    grid,
    tick,
    nextPhase,
    ticksSinceEvent,
    lastPhase: phase,
  };
}
