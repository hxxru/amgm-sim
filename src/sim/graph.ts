import {
  CouplingMap,
  Grid,
  linearIndex,
  vitality,
} from "./state";

// "Active" cells are those whose vitality g(r) is above a threshold.
// Spectral diagnostics live on the subgraph induced by active cells,
// using the κ-weighted edge weights (without the vitality multiplier
// — once a cell is "in", its coupling is whatever κ_ij says).
export function activeMask(
  grid: Grid,
  r0: number,
  k: number,
  threshold: number,
): boolean[][] {
  const H = grid.length;
  const W = grid[0].length;
  const mask: boolean[][] = Array.from({ length: H }, () => new Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      mask[y][x] = vitality(grid[y][x].r, r0, k) >= threshold;
    }
  }
  return mask;
}

// Connected components of the active subgraph, weighted-edge agnostic:
// we treat any edge with κ > 0 between two active cells as connecting them.
export function components(
  mask: boolean[][],
  coupling: CouplingMap,
): number[][] {
  const H = mask.length;
  const W = mask[0].length;
  const visited = new Uint8Array(H * W);
  const comps: number[][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y][x]) continue;
      const li = linearIndex(W, x, y);
      if (visited[li]) continue;
      const queue: number[] = [li];
      visited[li] = 1;
      const comp: number[] = [];
      while (queue.length > 0) {
        const idx = queue.pop()!;
        comp.push(idx);
        const cy = Math.floor(idx / W);
        const cx = idx - cy * W;
        const tryEdge = (nx: number, ny: number, kappa: number) => {
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) return;
          if (!mask[ny][nx]) return;
          if (kappa <= 0) return;
          const ni = linearIndex(W, nx, ny);
          if (visited[ni]) return;
          visited[ni] = 1;
          queue.push(ni);
        };
        if (cx + 1 < W) tryEdge(cx + 1, cy, coupling.kappaH[cy][cx]);
        if (cx - 1 >= 0) tryEdge(cx - 1, cy, coupling.kappaH[cy][cx - 1]);
        if (cy + 1 < H) tryEdge(cx, cy + 1, coupling.kappaV[cy][cx]);
        if (cy - 1 >= 0) tryEdge(cx, cy - 1, coupling.kappaV[cy - 1][cx]);
      }
      comps.push(comp);
    }
  }
  comps.sort((a, b) => b.length - a.length);
  return comps;
}

// Build a sparse Laplacian *matvec* closure: returns a function that
// applies L_w · x to any vector x of length indices.length. Cheap for
// large grids; never materializes the dense matrix.
export function makeLaplacianMatvec(
  indices: number[],
  coupling: CouplingMap,
  vitalities: number[],
): (x: number[]) => number[] {
  const W = coupling.W;
  const N = indices.length;
  const local = new Map<number, number>();
  for (let i = 0; i < N; i++) local.set(indices[i], i);

  // Pre-extract the neighbour list with effective weights.
  const neighbours: { j: number; w: number }[][] = Array.from(
    { length: N },
    () => [],
  );
  const diag = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const idx = indices[i];
    const cy = Math.floor(idx / W);
    const cx = idx - cy * W;
    const gi = vitalities[idx];
    const consider = (nx: number, ny: number, kappa: number) => {
      if (kappa <= 0) return;
      const ni = ny * W + nx;
      const j = local.get(ni);
      if (j === undefined) return;
      const gj = vitalities[ni];
      const w = kappa * gi * gj;
      if (w <= 0) return;
      neighbours[i].push({ j, w });
      diag[i] += w;
    };
    if (cx + 1 < coupling.W) consider(cx + 1, cy, coupling.kappaH[cy][cx]);
    if (cx - 1 >= 0) consider(cx - 1, cy, coupling.kappaH[cy][cx - 1]);
    if (cy + 1 < coupling.H) consider(cx, cy + 1, coupling.kappaV[cy][cx]);
    if (cy - 1 >= 0) consider(cx, cy - 1, coupling.kappaV[cy - 1][cx]);
  }

  return (x: number[]) => {
    const y = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let s = diag[i] * x[i];
      for (const { j, w } of neighbours[i]) {
        s -= w * x[j];
      }
      y[i] = s;
    }
    return y;
  };
}

// Build the symmetric weighted graph Laplacian L_w = D_w − A_w on a list
// of active-cell indices. Edge weight = κ_ij · g(r_i) · g(r_j), so the
// returned gap matches the share-step contraction rate (divided by α).
// Pass an array vitalities[index] aligned to coupling.W.
export function buildWeightedLaplacian(
  indices: number[],
  coupling: CouplingMap,
  vitalities: number[],
): number[][] {
  const W = coupling.W;
  const N = indices.length;
  const local = new Map<number, number>();
  for (let i = 0; i < N; i++) local.set(indices[i], i);
  const L: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    const idx = indices[i];
    const cy = Math.floor(idx / W);
    const cx = idx - cy * W;
    const gi = vitalities[idx];
    const consider = (nx: number, ny: number, kappa: number) => {
      if (kappa <= 0) return;
      const ni = ny * W + nx;
      const j = local.get(ni);
      if (j === undefined) return;
      const gj = vitalities[ni];
      const w = kappa * gi * gj;
      if (w <= 0) return;
      L[i][j] -= w;
      L[i][i] += w;
    };
    if (cx + 1 < coupling.W) consider(cx + 1, cy, coupling.kappaH[cy][cx]);
    if (cx - 1 >= 0) consider(cx - 1, cy, coupling.kappaH[cy][cx - 1]);
    if (cy + 1 < coupling.H) consider(cx, cy + 1, coupling.kappaV[cy][cx]);
    if (cy - 1 >= 0) consider(cx, cy - 1, coupling.kappaV[cy - 1][cx]);
  }
  return L;
}
