// Jacobi eigendecomposition for small symmetric matrices.
// Returns eigenvalues sorted descending (largest real part first)
// and the corresponding eigenvectors as columns of V (V[i][k] = i-th
// component of k-th eigenvector).

export interface Eigen {
  values: number[]; // sorted descending
  vectors: number[][]; // V[i][k]
}

export function jacobiEigen(A: number[][], maxSweeps = 100, tol = 1e-10): Eigen {
  const n = A.length;
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
  // sort indices by value descending
  const idx = values.map((_, i) => i).sort((a1, b1) => values[b1] - values[a1]);
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

// Compute survival profile q = exp(Delta * G) * ones using symmetric
// spectral reconstruction.  Assumes G is symmetric and `eig` was computed
// from it.
export function survivalProfile(eig: Eigen, delta: number): number[] {
  const n = eig.values.length;
  // expand ones in eigenbasis: c_k = sum_i V[i][k] * 1
  const c = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += eig.vectors[i][k];
    c[k] = s;
  }
  // q[i] = sum_k V[i][k] * exp(delta * lambda_k) * c[k]
  const q = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      s += eig.vectors[i][k] * Math.exp(delta * eig.values[k]) * c[k];
    }
    q[i] = s;
  }
  return q;
}
