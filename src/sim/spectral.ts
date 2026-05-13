// Jacobi eigendecomposition for small symmetric matrices, plus helpers
// for the spectral diagnostics surface.

import { OrthSample } from "./state";

export interface Eigen {
  values: number[]; // ascending
  vectors: number[][]; // vectors[i][k] = i-th component of k-th eigenvector
}

export function jacobiEigen(
  A: number[][],
  maxSweeps = 80,
  tol = 1e-10,
): Eigen {
  const n = A.length;
  if (n === 0) return { values: [], vectors: [] };
  const a: number[][] = A.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    }
    if (off < tol) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p][q];
        if (Math.abs(apq) < 1e-14) continue;
        const app = a[p][p];
        const aqq = a[q][q];
        const theta = (aqq - app) / (2 * apq);
        let t: number;
        if (Math.abs(theta) > 1e15) {
          t = 1 / (2 * theta);
        } else {
          t =
            theta >= 0
              ? 1 / (theta + Math.sqrt(1 + theta * theta))
              : 1 / (theta - Math.sqrt(1 + theta * theta));
        }
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        a[p][p] = app - t * apq;
        a[q][q] = aqq + t * apq;
        a[p][q] = 0;
        a[q][p] = 0;

        for (let i = 0; i < n; i++) {
          if (i !== p && i !== q) {
            const aip = a[i][p];
            const aiq = a[i][q];
            a[i][p] = c * aip - s * aiq;
            a[p][i] = a[i][p];
            a[i][q] = s * aip + c * aiq;
            a[q][i] = a[i][q];
          }
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }

  const values = a.map((row, i) => row[i]);
  const idx = values.map((_, i) => i).sort((i1, i2) => values[i1] - values[i2]);
  const sortedValues = idx.map((k) => values[k]);
  const sortedVectors: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0),
  );
  for (let k = 0; k < n; k++) {
    const col = idx[k];
    for (let i = 0; i < n; i++) sortedVectors[i][k] = v[i][col];
  }
  return { values: sortedValues, vectors: sortedVectors };
}

// Compute the smallest non-trivial eigenpair (Fiedler value + vector)
// of a graph Laplacian. Returns null when the component is too small.
export interface FiedlerResult {
  lambda2: number;
  phi2: number[];
}

export function fiedler(L: number[][]): FiedlerResult | null {
  if (L.length < 2) return null;
  const eig = jacobiEigen(L);
  if (eig.values.length < 2) return null;
  const phi2 = eig.vectors.map((row) => row[1]);
  return { lambda2: eig.values[1], phi2 };
}

// Lanczos algorithm for the smallest non-trivial eigenpair of a symmetric
// PSD operator. Use this instead of Fiedler when N is large (> ~150).
// `matvec` is a function that computes L · x for any input vector x.
// `n` is the dimension. The principal eigenvector φ_1 (here, the constant
// vector on each component, but we treat it as the constant on the whole
// space) is projected out at every step so the smallest returned eigenpair
// is the Fiedler.
export function fiedlerLanczos(
  n: number,
  matvec: (x: number[]) => number[],
  maxIters = 40,
  tol = 1e-7,
): FiedlerResult | null {
  if (n < 2) return null;
  const k = Math.min(maxIters, Math.max(8, n));

  // Initial random vector, projected orthogonal to the constant mode.
  const q: number[][] = [];
  const v0 = new Array(n);
  let seed = 0x9e3779b9;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) | 0;
    v0[i] = ((seed >>> 0) / 4294967296) - 0.5;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += v0[i];
  mean /= n;
  let norm = 0;
  for (let i = 0; i < n; i++) {
    v0[i] -= mean;
    norm += v0[i] * v0[i];
  }
  norm = Math.sqrt(norm);
  if (norm < 1e-12) return null;
  for (let i = 0; i < n; i++) v0[i] /= norm;
  q.push(v0);

  const alpha: number[] = [];
  const beta: number[] = [];
  let qPrev: number[] | null = null;

  for (let j = 0; j < k; j++) {
    const w = matvec(q[j]).slice();
    // Project out the constant mode (deflation against φ_1 = 1/√n · 1).
    let m = 0;
    for (let i = 0; i < n; i++) m += w[i];
    m /= n;
    for (let i = 0; i < n; i++) w[i] -= m;
    // α_j = q_j · w
    let a = 0;
    for (let i = 0; i < n; i++) a += q[j][i] * w[i];
    alpha.push(a);
    // w ← w − α_j q_j − β_{j-1} q_{j-1}
    for (let i = 0; i < n; i++) w[i] -= a * q[j][i];
    if (qPrev && j > 0) {
      const b = beta[j - 1];
      for (let i = 0; i < n; i++) w[i] -= b * qPrev[i];
    }
    // Full reorthogonalisation against all previous q's (cheap at this scale).
    for (let p = 0; p < q.length; p++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += q[p][i] * w[i];
      for (let i = 0; i < n; i++) w[i] -= dot * q[p][i];
    }
    let bnorm = 0;
    for (let i = 0; i < n; i++) bnorm += w[i] * w[i];
    bnorm = Math.sqrt(bnorm);
    if (bnorm < tol) break;
    beta.push(bnorm);
    const qNext = new Array(n);
    for (let i = 0; i < n; i++) qNext[i] = w[i] / bnorm;
    qPrev = q[j];
    q.push(qNext);
  }

  // Build the tridiagonal T (size m × m).
  const m = alpha.length;
  if (m === 0) return null;
  const T: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    T[i][i] = alpha[i];
    if (i + 1 < m) {
      T[i][i + 1] = beta[i];
      T[i + 1][i] = beta[i];
    }
  }
  const tEig = jacobiEigen(T);
  if (tEig.values.length === 0) return null;
  // Smallest eigenvalue of T ≈ Fiedler (since constant mode was deflated).
  const lambda2 = tEig.values[0];
  // Eigenvector in the original space: Q · y where y is the smallest
  // eigenvector of T.
  const y = tEig.vectors.map((row) => row[0]);
  const phi2 = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let p = 0; p < m; p++) s += q[p][i] * y[p];
    phi2[i] = s;
  }
  return { lambda2, phi2 };
}

// Sample of r_perp on a component: log ||r - mean(r)||.
export function orthLogNorm(rs: number[]): number {
  const n = rs.length;
  if (n === 0) return -Infinity;
  let mean = 0;
  for (const r of rs) mean += r;
  mean /= n;
  let sq = 0;
  for (const r of rs) {
    const d = r - mean;
    sq += d * d;
  }
  if (sq <= 0) return -Infinity;
  return 0.5 * Math.log(sq);
}

// Least-squares slope fit through the last `window` samples. Only returns
// a fit when every sample in the window has sinceEvent >= window (i.e.,
// no CULL/BIRTH event interrupted the linear regime).
export interface SlopeFit {
  slope: number;
  intercept: number;
  r2: number;
  startT: number;
  endT: number;
}

export function fitSlope(
  samples: OrthSample[],
  window: number,
): SlopeFit | null {
  if (samples.length < window) return null;
  const tail = samples.slice(samples.length - window);
  for (const s of tail) {
    if (!Number.isFinite(s.logNorm)) return null;
  }
  // The fit window must post-date the last CULL/BIRTH event. Equivalent to
  // asking the most recent sample's "ticks since event" exceeds the window.
  if (tail[tail.length - 1].sinceEvent < window) return null;
  let sumT = 0,
    sumY = 0,
    sumTT = 0,
    sumTY = 0;
  const n = tail.length;
  for (const s of tail) {
    sumT += s.t;
    sumY += s.logNorm;
    sumTT += s.t * s.t;
    sumTY += s.t * s.logNorm;
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom <= 0) return null;
  const slope = (n * sumTY - sumT * sumY) / denom;
  const intercept = (sumY - slope * sumT) / n;
  let ssRes = 0,
    ssTot = 0;
  const meanY = sumY / n;
  for (const s of tail) {
    const pred = slope * s.t + intercept;
    ssRes += (s.logNorm - pred) ** 2;
    ssTot += (s.logNorm - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  return {
    slope,
    intercept,
    r2,
    startT: tail[0].t,
    endT: tail[n - 1].t,
  };
}
