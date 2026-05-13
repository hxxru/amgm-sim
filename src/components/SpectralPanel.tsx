import { SpectralSnapshot } from "../sim/state";
import { SlopeFit } from "../sim/spectral";

interface Props {
  spectral: SpectralSnapshot | null;
  fit: SlopeFit | null;
  alpha: number;
  mu: number;
  totalEnergy: number;
  slack: number;
  reservoir: number;
  activeCount: number;
}

function fmt(n: number, d = 4): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

export function SpectralPanel({
  spectral,
  fit,
  alpha,
  mu,
  totalEnergy,
  slack,
  reservoir,
  activeCount,
}: Props) {
  // Slope per *tick* = log(1 − α·λ₂) + log(1 − μ) ≈ −α·λ₂ − μ.
  // So gap = (−slope − μ) / α.
  const fittedGap = fit ? (-fit.slope - mu) / Math.max(alpha, 1e-9) : null;
  const lambda2 = spectral?.lambda2 ?? null;
  const componentCount = spectral?.componentCount ?? null;
  const mDrop = Math.max(1, Math.min(15, Math.round(15 / Math.max(slack, 1e-6))));
  const expectedTokensPerTick = mu * Math.max(totalEnergy - reservoir, 1);
  const dropPeriod = mDrop / Math.max(expectedTokensPerTick, 1e-6);

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
            <th title="Second-smallest eigenvalue of the κ-weighted Laplacian on the largest connected active component.">
              λ₂ (Laplacian)
            </th>
            <td>{fmt(lambda2 ?? NaN)}</td>
          </tr>
          <tr>
            <th title="(−slope − μ) / α, corrected for the per-tick decay contribution.">
              gap (fitted)
            </th>
            <td>{fittedGap == null ? "—" : fmt(fittedGap)}</td>
          </tr>
          <tr>
            <th>disagreement</th>
            <td>{agreement}</td>
          </tr>
          <tr>
            <th title="Connected components of the cells whose vitality g(r) exceeds threshold.">
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
            <th title="R² of the slope fit.">fit R²</th>
            <td>{fit ? fmt(fit.r2, 3) : "—"}</td>
          </tr>
        </tbody>
      </table>

      <h3>Energy budget (tokens)</h3>
      <table className="spectral-table">
        <tbody>
          <tr>
            <th title="Conserved integer: Σ r + reservoir.">total</th>
            <td>{totalEnergy}</td>
          </tr>
          <tr>
            <th title="Tokens currently in the atmosphere.">reservoir</th>
            <td>{reservoir}</td>
          </tr>
          <tr>
            <th title="Tokens dispensed per drop event. M = round(15 / slack).">
              M_drop
            </th>
            <td>{mDrop}</td>
          </tr>
          <tr>
            <th title="Expected ticks between drop events at steady state.">
              τ_drop (≈ ticks)
            </th>
            <td>{Number.isFinite(dropPeriod) ? fmt(dropPeriod, 1) : "—"}</td>
          </tr>
          <tr>
            <th title="Cells with vitality above threshold.">active cells</th>
            <td>{activeCount}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        Drag <strong>Slack</strong> to change how bursty the energy supply
        is. High slack → many small drops → energy reaches the whole grid
        → λ₂ stays positive and consistent. Low slack → rare big drops →
        the system fragments between bursts → components &gt; 1.
      </p>
    </div>
  );
}
