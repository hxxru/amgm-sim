import { Grid, linearIndex } from "./state";

const N4: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// Returns connected components of the alive subgraph, sorted largest first.
// Each component is a list of linear indices (y * W + x).
export function components(grid: Grid): number[][] {
  const H = grid.length;
  const W = grid[0].length;
  const visited = new Uint8Array(H * W);
  const comps: number[][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!grid[y][x].alive) continue;
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
        for (const [dx, dy] of N4) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (!grid[ny][nx].alive) continue;
          const ni = linearIndex(W, nx, ny);
          if (visited[ni]) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }
      comps.push(comp);
    }
  }
  comps.sort((a, b) => b.length - a.length);
  return comps;
}

// Build the symmetric graph Laplacian L = D - A on a subset of cells.
export function buildLaplacian(
  grid: Grid,
  indices: number[],
): number[][] {
  const W = grid[0].length;
  const N = indices.length;
  const local = new Map<number, number>();
  for (let i = 0; i < N; i++) local.set(indices[i], i);
  const L: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    const idx = indices[i];
    const cy = Math.floor(idx / W);
    const cx = idx - cy * W;
    let deg = 0;
    for (const [dx, dy] of N4) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= W) continue;
      const ni = ny * W + nx;
      const j = local.get(ni);
      if (j === undefined) continue;
      L[i][j] = -1;
      deg += 1;
    }
    L[i][i] = deg;
  }
  return L;
}
