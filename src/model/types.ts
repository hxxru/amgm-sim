import { Eigen } from "./eigen";

export type EdgeType = "internal" | "bridge" | "bottleneck";

export interface Node {
  id: number;
  x: number;
  y: number;
  clusterId: number;
  baseKilling: number;
}

export interface Edge {
  source: number;
  target: number;
  baseWeight: number;
  type: EdgeType;
}

export interface PresetGraph {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  defaults: SliderState;
}

export interface SliderState {
  internalMixing: number;
  bridgeCoupling: number;
  killingIntensity: number;
  cycleLength: number;
}

export type RegimeLabel =
  | "Scalar interface likely"
  | "Finite-band: basin-interpretable"
  | "Finite-band: formal/non-diagnostic"
  | "Boundary integrity compromised"
  | "Ambiguous / transition zone";

export interface Diagnostics {
  eigenvalues: number[];
  decayRates: number[];
  compressionStrength: number;
  scalarityDefect: number;
  retainedK: number;
  leakageRatio: number;
  basinWitness: "present" | "weak/absent" | "not applicable";
  survivalProfile: number[];
  principalMode: number[];
  eig: Eigen;
  regime: RegimeLabel;
  reason: string;
}
