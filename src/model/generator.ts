import { Edge, Node, SliderState } from "./types";

export interface BuiltGenerator {
  G: number[][];
  Q: number[][];
  kappa: number[];
  N: number;
}

export function buildGenerator(
  nodes: Node[],
  edges: Edge[],
  sliders: SliderState,
): BuiltGenerator {
  const N = nodes.length;
  const Q: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  for (const edge of edges) {
    const { source, target, baseWeight, type } = edge;
    let w = baseWeight;
    if (type === "internal") w *= sliders.internalMixing;
    else if (type === "bridge") w *= sliders.bridgeCoupling;
    else if (type === "bottleneck") w *= sliders.internalMixing * 0.25;
    // symmetric off-diagonal contribution
    Q[source][target] += w;
    Q[target][source] += w;
  }

  // row sums => diagonal
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let j = 0; j < N; j++) {
      if (j !== i) s += Q[i][j];
    }
    Q[i][i] = -s;
  }

  const kappa = nodes.map((n) => n.baseKilling * sliders.killingIntensity);
  const G: number[][] = Q.map((row, i) =>
    row.map((v, j) => (i === j ? v - kappa[i] : v)),
  );

  return { G, Q, kappa, N };
}

export function validateGenerator(gen: BuiltGenerator): string[] {
  const issues: string[] = [];
  const { Q, kappa, N } = gen;
  const eps = 1e-8;
  for (let i = 0; i < N; i++) {
    if (kappa[i] < -eps) issues.push(`negative killing at ${i}`);
    let rowSum = 0;
    for (let j = 0; j < N; j++) {
      if (i !== j && Q[i][j] < -eps) {
        issues.push(`negative off-diagonal Q[${i}][${j}]`);
      }
      rowSum += Q[i][j];
    }
    if (Math.abs(rowSum) > 1e-6) {
      issues.push(`Q row ${i} sum ${rowSum.toFixed(6)} not ~0`);
    }
  }
  return issues;
}
