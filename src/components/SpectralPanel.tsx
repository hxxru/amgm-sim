import { SpectralSnapshot } from "../sim/state";
import { SlopeFit } from "../sim/spectral";

interface Props {
  spectral: SpectralSnapshot | null;
  fit: SlopeFit | null;
  alpha: number;
}

function fmt(n: number, d = 4): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

export function SpectralPanel({ spectral, fit, alpha }: Props) {
  const fittedGap = fit ? -fit.slope / Math.max(alpha, 1e-9) : null;
  const lambda2 = spectral?.lambda2 ?? null;
  const componentCount = spectral?.componentCount ?? null;

  let agreement = "—";
  if (fittedGap != null && lambda2 != null && lambda2 > 1e-6) {
    const rel = Math.abs(fittedGap - lambda2) / lambda2;
    agreement = `${(rel * 100).toFixed(1)}%`;
  }

  return (
    <div className="spectral-panel">
      <h3>Spectral diagnostics</h3>
      <table className="spectral-table">
        <tbody>
          <tr>
            <th title="Second-smallest eigenvalue of the symmetric Laplacian on the largest connected component.">
              λ₂ (Laplacian)
            </th>
            <td>{fmt(lambda2 ?? NaN)}</td>
          </tr>
          <tr>
            <th title="Convergence-plot slope divided by −α. Matches λ₂ after a transient between birth/death events.">
              gap (fitted)
            </th>
            <td>{fittedGap == null ? "—" : fmt(fittedGap)}</td>
          </tr>
          <tr>
            <th title="Relative disagreement between the two gap measurements.">
              disagreement
            </th>
            <td>{agreement}</td>
          </tr>
          <tr>
            <th title="Connected components of the alive subgraph. Reported gap is for the largest only.">
              components
            </th>
            <td>
              {componentCount ?? "—"}
              {componentCount != null && componentCount > 1 && (
                <span className="badge"> split</span>
              )}
            </td>
          </tr>
          <tr>
            <th title="R² of the slope fit. Closer to 1 means the convergence is in the linear regime.">
              fit R²
            </th>
            <td>{fit ? fmt(fit.r2, 3) : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        Drag the share-rate slider. The convergence slope changes and the
        fitted gap moves with it. After a transient and away from CULL/BIRTH
        events, the fitted gap matches the Laplacian gap.
      </p>
    </div>
  );
}
