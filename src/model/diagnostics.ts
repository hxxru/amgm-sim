import { Edge, Node, SliderState, Diagnostics, RegimeLabel } from "./types";
import { buildGenerator } from "./generator";
import { jacobiEigen, survivalProfile } from "./eigen";

export interface Thresholds {
  scalarityDefectLow: number;
  compressionStrengthHigh: number;
  leakageHigh: number;
  retainedModeTolerance: number;
  basinLocalizationRatio: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  scalarityDefectLow: 0.15,
  compressionStrengthHigh: 1.5,
  leakageHigh: 1.0,
  retainedModeTolerance: 0.1,
  basinLocalizationRatio: 0.55,
};

// Build the within-cluster sub-generator: keep only internal/bottleneck edges
// whose endpoints share a cluster.  Bridges are dropped.  Used to compute the
// within-block compression gap, which is the appropriate denominator for
// leakage ratio and the appropriate numerator for "internal compression."
function withinBlockGapAverage(
  nodes: Node[],
  edges: Edge[],
  sliders: SliderState,
): number {
  const clusters = Array.from(new Set(nodes.map((n) => n.clusterId)));
  const gaps: number[] = [];
  for (const c of clusters) {
    const subNodes = nodes.filter((n) => n.clusterId === c);
    if (subNodes.length < 2) continue;
    const idMap = new Map(subNodes.map((n, i) => [n.id, i]));
    const subEdges = edges
      .filter(
        (e) =>
          e.type !== "bridge" &&
          idMap.has(e.source) &&
          idMap.has(e.target),
      )
      .map((e) => ({
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        baseWeight: e.baseWeight,
        type: e.type,
      }));
    const renumberedNodes = subNodes.map((n, i) => ({ ...n, id: i }));
    const sub = buildGenerator(renumberedNodes, subEdges, sliders);
    const eig = jacobiEigen(sub.G);
    const a = eig.values.map((l) => -l);
    if (a.length >= 2) gaps.push(a[1] - a[0]);
  }
  if (gaps.length === 0) return 0;
  return gaps.reduce((s, v) => s + v, 0) / gaps.length;
}

export function computeDiagnostics(
  nodes: Node[],
  edges: Edge[],
  sliders: SliderState,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Diagnostics {
  const { G } = buildGenerator(nodes, edges, sliders);
  const eig = jacobiEigen(G);
  const delta = sliders.cycleLength;

  const lambdas = eig.values; // sorted descending (largest real part first)
  const a = lambdas.map((l) => -l); // decay rates ascending
  const a1 = a[0] ?? 0;
  // Within-block compression: the gap relevant to "does each candidate block
  // compress to a scalar before Δ?".  In a multi-cluster system the global
  // a2 - a1 is the inter-cluster splitting (always small for weak bridges),
  // which is not what the AM-GM compression diagnostic intends.
  const withinBlockGap = withinBlockGapAverage(nodes, edges, sliders);
  const compressionStrength = withinBlockGap * delta;

  // survival profile
  const q = survivalProfile(eig, delta);

  // principal eigenvector (column 0 of V)
  const phi1 = eig.vectors.map((row) => row[0]);
  const phi1Norm = Math.sqrt(phi1.reduce((s, v) => s + v * v, 0)) || 1;
  const phi1Hat = phi1.map((v) => v / phi1Norm);

  // scalarity defect: ||q - (q·phi1Hat) phi1Hat|| / ||q||
  const qNorm = Math.sqrt(q.reduce((s, v) => s + v * v, 0)) || 1;
  const proj = q.reduce((s, v, i) => s + v * phi1Hat[i], 0);
  const residual = q.map((v, i) => v - proj * phi1Hat[i]);
  const resNorm = Math.sqrt(residual.reduce((s, v) => s + v * v, 0));
  const scalarityDefect = resNorm / qNorm;

  // retained K: count modes whose decay relative to leading is < tolerance
  // visible if exp(-(a_i - a_1) * Delta) > tol
  let retainedK = 0;
  for (let i = 0; i < a.length; i++) {
    if (Math.exp(-(a[i] - a1) * delta) > thresholds.retainedModeTolerance) {
      retainedK++;
    } else {
      break;
    }
  }
  if (retainedK === 0) retainedK = 1;

  // leakage ratio: cross-boundary weight / within-block gap proxy.
  let rawLeakage = 0;
  for (const e of edges) {
    if (e.type === "bridge") {
      rawLeakage += e.baseWeight * sliders.bridgeCoupling;
    }
  }
  const gapProxy = Math.max(withinBlockGap, 1e-6);
  const leakageRatio = rawLeakage / gapProxy;

  // basin witness: look at second eigenvector localization across clusters
  const basinWitness = basinLocalization(
    eig.vectors,
    nodes,
    retainedK,
    thresholds.basinLocalizationRatio,
  );

  const { regime, reason } = decideRegime({
    compressionStrength,
    scalarityDefect,
    retainedK,
    leakageRatio,
    basinWitness,
    thresholds,
  });

  return {
    eigenvalues: lambdas,
    decayRates: a,
    compressionStrength,
    scalarityDefect,
    retainedK,
    leakageRatio,
    basinWitness,
    survivalProfile: q,
    principalMode: phi1Hat,
    eig,
    regime,
    reason,
  };
}

function basinLocalization(
  V: number[][],
  nodes: Node[],
  retainedK: number,
  ratio: number,
): "present" | "weak/absent" | "not applicable" {
  if (retainedK <= 1) return "not applicable";
  // For each retained nonprincipal mode, compute fraction of squared mass
  // concentrated in the dominant cluster.  If most retained modes are
  // strongly localized in distinct clusters, witness is present.
  const clusters = Array.from(new Set(nodes.map((n) => n.clusterId)));
  const localized: number[] = []; // which cluster dominates each retained mode
  for (let k = 1; k < retainedK; k++) {
    const mass: Record<number, number> = {};
    let total = 0;
    for (let i = 0; i < nodes.length; i++) {
      const w = V[i][k] * V[i][k];
      mass[nodes[i].clusterId] = (mass[nodes[i].clusterId] ?? 0) + w;
      total += w;
    }
    if (total <= 0) continue;
    let dominantCluster = clusters[0];
    let dominantFrac = 0;
    for (const c of clusters) {
      const f = (mass[c] ?? 0) / total;
      if (f > dominantFrac) {
        dominantFrac = f;
        dominantCluster = c;
      }
    }
    if (dominantFrac >= ratio) localized.push(dominantCluster);
  }
  // Basin witness requires retained modes to localize in MULTIPLE distinct
  // candidate blocks.  A single-cluster system therefore always reports
  // "weak/absent" — finite-band structure inside a single well is not, on
  // this heuristic, treated as basin-interpretable.
  if (localized.length === 0) return "weak/absent";
  const distinct = new Set(localized).size;
  return distinct >= 2 ? "present" : "weak/absent";
}

interface DecideArgs {
  compressionStrength: number;
  scalarityDefect: number;
  retainedK: number;
  leakageRatio: number;
  basinWitness: "present" | "weak/absent" | "not applicable";
  thresholds: Thresholds;
}

function decideRegime(d: DecideArgs): { regime: RegimeLabel; reason: string } {
  const t = d.thresholds;
  if (d.leakageRatio >= t.leakageHigh) {
    return {
      regime: "Boundary integrity compromised",
      reason:
        "Cross-boundary leakage is large relative to internal compression.",
    };
  }
  if (
    d.scalarityDefect <= t.scalarityDefectLow &&
    d.compressionStrength >= t.compressionStrengthHigh
  ) {
    return {
      regime: "Scalar interface likely",
      reason:
        "Internal compression is fast relative to the cycle window, and boundary leakage is low.",
    };
  }
  if (d.retainedK > 1 && d.basinWitness === "present") {
    return {
      regime: "Finite-band: basin-interpretable",
      reason:
        "More than one survival mode remains visible, and retained modes appear localized around basin-like regions.",
    };
  }
  if (d.retainedK > 1) {
    return {
      regime: "Finite-band: formal/non-diagnostic",
      reason:
        "More than one survival mode remains visible, but the retained structure does not align with a clear basin witness.",
    };
  }
  return {
    regime: "Ambiguous / transition zone",
    reason:
      "Diagnostics are near threshold. Small changes in cycle length, killing, or coupling may shift the suggested regime.",
  };
}
