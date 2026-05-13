# Diagnostics

The MVP's diagnostic surface is three numbers, one overlay, and one live plot, all derived from the **vitality-weighted Laplacian** `L_w` of the largest active component and from samples of `log ‖r⟂(t)‖`.

## Spectral gap `λ₂`

Computed every `recomputeSpectralEvery` share-ticks (default 8):

1. Build the active mask: cells with `g(r_i) ≥ vitalityThreshold`.
2. Flood-fill the active subgraph respecting `κ > 0` edges.
3. Restrict to the largest component `C`.
4. Build the vitality-weighted Laplacian `L_w` on `C` with `L_w[i, j] = −κ_ij · g(r_i) · g(r_j)` (off-diagonal).
5. Solve for the smallest non-trivial eigenpair:
   - If `|C| ≤ 150`: full Jacobi eigendecomposition, take `(values[1], vectors[:, 1])`.
   - Else: sparse Lanczos with reorthogonalisation and constant-mode deflation.

Reported as `λ₂ (Laplacian)`.

## Fitted gap

After each SHARE phase we push a sample `{ t, logNorm, sinceEvent }`:

```text
mean    = (1 / |C|) · Σ_{i ∈ C} r_i
r⟂_norm = sqrt( Σ_{i ∈ C} (r_i − mean)² )
logNorm = log(r⟂_norm)      (or −Infinity if r⟂ = 0)
sinceEvent = ticksSinceDrop
```

`fitSlope` runs a least-squares line through the most recent `fitWindow` samples, but only if every sample's `logNorm` is finite **and** the latest sample's `sinceEvent ≥ fitWindow` (so no drop event interrupted the linear regime).

Given a successful fit with slope `s`:

```text
slope ≈ −α · λ₂ − μ          (from SHARE contraction × DECAY shrinkage)
gap_fit = (−slope − μ) / α
```

Reported as `gap (fitted)`. The `μ` correction is essential: without it the fit overstates λ₂ by `μ/α` (~30 % at default settings).

When the fit isn't valid (early ticks, drops happening more often than `fitWindow`, near-zero residual), `gap (fitted)` and `R²` display `—`.

## Convergence plot

The right-pane plot shows `log ‖r⟂(t)‖` over the last `plotWindow` ticks. When a valid fit exists, the orange dashed line is overlaid covering `[startT, endT]` of the fit window.

This is the single most pedagogically important diagnostic. The user drags slack and watches the slope visibly change.

## Disagreement %

`abs(gap_fit − λ₂) / λ₂`, reported as a percentage. Small (< 10 %) when the system is in the linear regime and the fit is well-conditioned; large or `—` otherwise. Pedagogically: when the two agree, the user can trust both as faithful reports of the same physical quantity.

## Connected component count

After each spectral recompute, the count of connected components in the active subgraph. Displayed with a "split" badge in red when ≥ 2. This is the structural-clustering signature: in Twin Springs at low slack the count goes from 1 to 2 as the cluster around each spring becomes isolated from the rest of the grid.

## Fiedler overlay

Two visual layers on the gridworld canvas:

- **Tint.** Each cell in `C` is tinted by `sign(φ_2[i])` — blue for positive, orange for negative. Intensity ∝ `|φ_2[i]| / max|φ_2|`. Cells outside `C` are left untinted.
- **Contour.** Along edges where `φ_2` changes sign between two adjacent in-`C` cells, draw a short perpendicular white segment. The collection traces the soft Fiedler cut.

The overlay is the spatial counterpart of the convergence plot's slope: same `λ₂`, painted in space rather than measured in time.

## Energy budget

A separate table reports the conservation state:

- **total** — `Σ r + reservoir`, invariant.
- **reservoir** — tokens currently in the atmosphere, waiting to drop.
- **M_drop** — tokens dispensed per drop event, `round(15 / slack)`.
- **τ_drop** — expected ticks between drop events at steady state, `M / (μ · (total − reservoir))`.
- **active cells** — count of cells above the vitality threshold.

These are not spectral quantities but they're the dials you need to interpret the spectral readouts.

## Perf HUD

Bottom-right of the grid pane:

```text
FPS · applied/target steps/s · ok | lagging
```

Computed once per second over the previous second's rAF callbacks. `lagging` if actual < 85 % of target.

## What the MVP does NOT compute

Resist the urge to layer these onto the MVP. They belong to Phase 3 (`docs/roadmap.md`):

- compression strength `(λ_2) · Δ`;
- scalarity defect (rank-one approximation error);
- retained-mode count K;
- leakage ratio (cross-boundary weight over gap);
- basin witness;
- AM-GM regime labels.

## Numerical sanity checks

Useful as development-time assertions; not surfaced in the UI:

- `Σ r + reservoir = totalEnergy` exactly. The smoke test asserts this is `0` to the bit.
- `λ₁` of `L_w` is `0` to within `1e-8` (constant-mode eigenvalue).
- `λ₂ ≥ 0`.
- `Σ_i φ_2[i] ≈ 0` on the largest component (Fiedler vector orthogonal to constant).
- Slope-fit `gap_fit ≈ λ₂` to within ~10 % once the system has settled and `sinceEvent ≥ fitWindow`. In practice this only holds for some windows during steady operation; the qualitative `slack → slope` coupling is the more reliable pedagogical hook.
