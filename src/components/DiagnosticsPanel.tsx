import { Diagnostics } from "../model/types";

interface Props {
  diag: Diagnostics;
}

function regimeClass(regime: string): string {
  if (regime.startsWith("Scalar")) return "regime-scalar";
  if (regime.startsWith("Boundary")) return "regime-compromised";
  if (regime.startsWith("Finite-band: basin")) return "regime-basin";
  if (regime.startsWith("Finite-band")) return "regime-formal";
  return "regime-ambiguous";
}

export function DiagnosticsPanel({ diag }: Props) {
  const topModes = diag.decayRates.slice(0, Math.min(6, diag.decayRates.length));
  const maxA = Math.max(...topModes, 1e-6);

  return (
    <div className="diagnostics">
      <section className={"regime-card " + regimeClass(diag.regime)}>
        <div className="regime-label">Suggested regime</div>
        <div className="regime-value">{diag.regime}</div>
        <div className="regime-reason">{diag.reason}</div>
      </section>

      <section>
        <h3>Signature summary</h3>
        <table className="diag-table">
          <tbody>
            <tr>
              <th title="(a₂ − a₁) · Δ. Larger values mean stronger scalar compression.">
                Compression strength
              </th>
              <td>{diag.compressionStrength.toFixed(3)}</td>
            </tr>
            <tr>
              <th title="Heuristic rank-one approximation error of the survival profile.">
                Scalarity defect
              </th>
              <td>{diag.scalarityDefect.toFixed(3)}</td>
            </tr>
            <tr>
              <th title="Survival modes still visible on the cycle window.">
                Retained modes K
              </th>
              <td>{diag.retainedK}</td>
            </tr>
            <tr>
              <th title="Heuristic cross-boundary weight divided by compression gap.">
                Leakage ratio
              </th>
              <td>{diag.leakageRatio.toFixed(3)}</td>
            </tr>
            <tr>
              <th title="Rough localization heuristic on retained nonprincipal modes.">
                Basin witness
              </th>
              <td>{diag.basinWitness}</td>
            </tr>
          </tbody>
        </table>
        <p className="caveat">Heuristic diagnostics — pedagogical proxies, not theorem-level definitions.</p>
      </section>

      <section>
        <h3>Decay rates aᵢ = −λᵢ (top 6)</h3>
        <div className="bars">
          {topModes.map((a, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">a{i + 1}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(a / maxA) * 100}%` }}
                />
              </div>
              <span className="bar-value">{a.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
