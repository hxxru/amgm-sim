import { Rng } from "./rng";
import { Grid, vitality } from "./state";

// A DropSource is a stateful stochastic process that produces drop sites.
// Presets configure the source's *kind* and its initial state; step()'s
// DROP phase calls nextDropSite to advance the source and read off the
// next site. Different sources give qualitatively different emergent
// structure: a single fixed source gives a pinned cluster, twin sources
// give competing clusters, a wandering source gives a drifting cluster,
// foraging picks dim cells, regime-switching switches between basins,
// Hawkes self-excites in space.

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
      pStay: number;
    }
  | {
      // Pick a few random cells and drop at the one with lowest vitality.
      kind: "forage";
      sampleSize: number;
    }
  | {
      // Hidden state ∈ {0..K-1}; each state has its own (centre, σ);
      // each call has probability pSwitch of moving to a different state;
      // site is sampled from a Gaussian on the current centre.
      kind: "markov";
      states: { centerX: number; centerY: number; sigma: number }[];
      currentState: number;
      pSwitch: number;
    }
  | {
      // Spatial self-excitation: each drop biases the next toward (lastX,
      // lastY) with Gaussian σ = localityRadius. With probability
      // resetProb, jump back to iid uniform (resets the chain).
      kind: "hawkes";
      lastX: number;
      lastY: number;
      localityRadius: number;
      resetProb: number;
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
    case "forage":
      return {
        short: `forage (k=${s.sampleSize})`,
        long: "pick sampleSize random candidates per drop; place at the one with lowest vitality g(r). Generates a migrating feeding front.",
      };
    case "markov": {
      const cur = s.states[s.currentState];
      return {
        short: `markov[${s.currentState}/${s.states.length}] @ (${cur.centerX},${cur.centerY})`,
        long: "hidden Markov chain over centroids; each state has its own Gaussian-distributed drop region; transitions every call with probability pSwitch",
      };
    }
    case "hawkes":
      return {
        short: `hawkes @ (${s.lastX},${s.lastY}), σ=${s.localityRadius.toFixed(1)}`,
        long: "spatial self-excitation: next drop sampled from a Gaussian around the previous site; occasional resets to iid uniform",
      };
  }
}

// Sample one Gaussian random number via Box-Muller, using two rng draws.
function gauss(rng: Rng): number {
  let u = rng();
  let v = rng();
  if (u < 1e-12) u = 1e-12;
  if (v < 1e-12) v = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function nextDropSite(
  source: DropSourceState,
  rng: Rng,
  H: number,
  W: number,
  grid?: Grid,
  vitalityParams?: { r0: number; k: number },
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
      const nx = clamp(source.x + dx, 0, W - 1);
      const ny = clamp(source.y + dy, 0, H - 1);
      return {
        site: { x: nx, y: ny },
        source: { ...source, x: nx, y: ny },
      };
    }
    case "forage": {
      const r0 = vitalityParams?.r0 ?? 3;
      const k = vitalityParams?.k ?? 1.5;
      let bestX = 0;
      let bestY = 0;
      let bestVit = Infinity;
      for (let i = 0; i < source.sampleSize; i++) {
        const xx = Math.min(W - 1, Math.floor(rng() * W));
        const yy = Math.min(H - 1, Math.floor(rng() * H));
        const v = grid ? vitality(grid[yy][xx].r, r0, k) : rng();
        if (v < bestVit) {
          bestVit = v;
          bestX = xx;
          bestY = yy;
        }
      }
      return { site: { x: bestX, y: bestY }, source };
    }
    case "markov": {
      let currentState = source.currentState;
      if (rng() < source.pSwitch && source.states.length > 1) {
        // Transition to a uniformly-chosen *other* state.
        let next = Math.min(
          source.states.length - 1,
          Math.floor(rng() * (source.states.length - 1)),
        );
        if (next >= currentState) next += 1;
        currentState = Math.min(source.states.length - 1, next);
      }
      const st = source.states[currentState];
      const x = clamp(Math.round(st.centerX + gauss(rng) * st.sigma), 0, W - 1);
      const y = clamp(Math.round(st.centerY + gauss(rng) * st.sigma), 0, H - 1);
      return { site: { x, y }, source: { ...source, currentState } };
    }
    case "hawkes": {
      if (rng() < source.resetProb) {
        const x = Math.min(W - 1, Math.floor(rng() * W));
        const y = Math.min(H - 1, Math.floor(rng() * H));
        return { site: { x, y }, source: { ...source, lastX: x, lastY: y } };
      }
      const x = clamp(
        Math.round(source.lastX + gauss(rng) * source.localityRadius),
        0,
        W - 1,
      );
      const y = clamp(
        Math.round(source.lastY + gauss(rng) * source.localityRadius),
        0,
        H - 1,
      );
      return {
        site: { x, y },
        source: { ...source, lastX: x, lastY: y },
      };
    }
  }
}
