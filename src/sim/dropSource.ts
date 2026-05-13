import { Rng } from "./rng";

// A DropSource is a stateful stochastic process that produces drop sites.
// Presets configure the source's *kind* and its initial state; step()'s
// DROP phase calls nextDropSite to advance the source and read off the
// next site. Different sources give qualitatively different emergent
// structure: a single fixed source gives a pinned cluster, twin sources
// give competing clusters, a wandering source gives a drifting cluster.

export type DropSourceState =
  | { kind: "uniform" }
  | {
      kind: "twin";
      sites: [{ x: number; y: number }, { x: number; y: number }];
      turn: 0 | 1;
    }
  | {
      kind: "wander";
      x: number;
      y: number;
      pStay: number; // per-call probability of staying at the current cell
    };

export interface DropSourceLabel {
  short: string;
  long: string;
}

export function describeDropSource(s: DropSourceState): DropSourceLabel {
  switch (s.kind) {
    case "uniform":
      return {
        short: "uniform",
        long: "drops at iid uniform random cells; no spatial or temporal correlation",
      };
    case "twin":
      return {
        short: `twin (${s.sites[0].x},${s.sites[0].y}) ↔ (${s.sites[1].x},${s.sites[1].y})`,
        long: "drops alternate strictly between two fixed cells",
      };
    case "wander":
      return {
        short: `wander @ (${s.x},${s.y}), p_stay=${s.pStay.toFixed(2)}`,
        long: "drop site is a random walk; with probability p_stay it stays at the current cell, otherwise it moves to a uniformly-chosen 4-neighbour",
      };
  }
}

export function nextDropSite(
  source: DropSourceState,
  rng: Rng,
  H: number,
  W: number,
): { site: { x: number; y: number }; source: DropSourceState } {
  switch (source.kind) {
    case "uniform": {
      const x = Math.min(W - 1, Math.floor(rng() * W));
      const y = Math.min(H - 1, Math.floor(rng() * H));
      return { site: { x, y }, source };
    }
    case "twin": {
      const site = source.sites[source.turn];
      return {
        site: { x: site.x, y: site.y },
        source: { ...source, turn: source.turn === 0 ? 1 : 0 },
      };
    }
    case "wander": {
      if (rng() < source.pStay) {
        return { site: { x: source.x, y: source.y }, source };
      }
      const dirs: [number, number][] = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      const [dx, dy] = dirs[Math.min(3, Math.floor(rng() * 4))];
      const nx = Math.max(0, Math.min(W - 1, source.x + dx));
      const ny = Math.max(0, Math.min(H - 1, source.y + dy));
      return {
        site: { x: nx, y: ny },
        source: { ...source, x: nx, y: ny },
      };
    }
  }
}
