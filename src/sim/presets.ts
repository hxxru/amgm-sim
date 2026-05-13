import { Rng } from "./rng";
import { DropSourceState } from "./dropSource";
import {
  CouplingMap,
  Grid,
  makeEmptyGrid,
  Params,
  uniformCoupling,
} from "./state";

export interface Preset {
  id: string;
  name: string;
  description: string;
  // Build the initial substrate, initial grid, drop source, and the
  // starting reservoir level. By default we put the entire energy budget
  // in the reservoir so the user watches drops *build* the structure.
  makeInitial: (
    H: number,
    W: number,
    rng: Rng,
    params: Params,
  ) => {
    grid: Grid;
    coupling: CouplingMap;
    dropSource: DropSourceState;
    reservoir: number;
  };
  params: Partial<Params>;
}

export const DEFAULT_PARAMS: Params = {
  // 6 ticks/s = 18 steps/s (3 phases per tick).
  speed: 18,
  // Slack 1.5 → M = round(15/1.5) = 10 tokens per drop (large bursts).
  slack: 1.5,
  alpha: 0.15,
  // Vitality sigmoid in token units: g(0)=0.011, g(2)=0.18, g(3)=0.5,
  // g(4)=0.82, g(R_MAX)≈1. Cells become "engaged" at r ≥ 3.
  vitalityR0: 3,
  vitalityK: 1.5,
  vitalityThreshold: 0.2,
  mu: 0.004,
  recomputeSpectralEvery: 8,
  fitWindow: 25,
  plotWindow: 240,
  // ~4 tokens per cell on a 30×30 grid.
  totalEnergyTarget: 3600,
};

function uniformDropPreset(_H: number, W: number, _rng: Rng, params: Params) {
  const grid = makeEmptyGrid(_H, W);
  return {
    grid,
    coupling: uniformCoupling(_H, W, 1.0),
    dropSource: { kind: "uniform" as const },
    reservoir: params.totalEnergyTarget,
  };
}

function twinSpringsPreset(H: number, W: number, _rng: Rng, params: Params) {
  const grid = makeEmptyGrid(H, W);
  const left = { x: Math.floor(W * 0.25), y: Math.floor(H / 2) };
  const right = { x: Math.floor(W * 0.75), y: Math.floor(H / 2) };
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "twin" as const,
      sites: [left, right] as [{ x: number; y: number }, { x: number; y: number }],
      turn: 0 as 0 | 1,
    },
    reservoir: params.totalEnergyTarget,
  };
}

function wanderingSourcePreset(
  H: number,
  W: number,
  _rng: Rng,
  params: Params,
) {
  const grid = makeEmptyGrid(H, W);
  return {
    grid,
    coupling: uniformCoupling(H, W, 1.0),
    dropSource: {
      kind: "wander" as const,
      x: Math.floor(W / 2),
      y: Math.floor(H / 2),
      pStay: 0.5,
    },
    reservoir: params.totalEnergyTarget,
  };
}

export const PRESETS: Preset[] = [
  {
    id: "uniform-drops",
    name: "Uniform Drops",
    description:
      "Drops at iid uniform random cells. No spatial or temporal correlation — the null hypothesis. With uniform κ, no cluster should form: tokens stay broadly distributed.",
    makeInitial: uniformDropPreset,
    params: {},
  },
  {
    id: "twin-springs",
    name: "Twin Springs",
    description:
      "Drops alternate strictly between two fixed cells. Two competing clusters: when slack is small they merge into one connected medium; when slack is large they stay as separate hot spots with the rest of the grid dormant.",
    makeInitial: twinSpringsPreset,
    params: {},
  },
  {
    id: "wandering-source",
    name: "Wandering Source",
    description:
      "Drop site does a random walk on the grid (p_stay = 0.5). A single cluster forms and follows the drifting source. Watch the Fiedler contour migrate with it.",
    makeInitial: wanderingSourcePreset,
    params: {},
  },
];

export function mergeParams(base: Params, override: Partial<Params>): Params {
  return { ...base, ...override };
}
