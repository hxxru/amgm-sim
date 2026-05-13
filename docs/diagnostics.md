# Diagnostics

The MVP's entire diagnostic surface is three numbers and one overlay, all derived from the alive-subgraph graph Laplacian `L` and the running resource vector `r(t)`.

## Spectral gap `λ_2`

Computed every `N_spec` ticks (default 5) from the current alive subgraph:

1. Identify connected components of the alive subgraph by flood fill.
2. Restrict to the largest component (call it `C`).
3. Build the symmetric Laplacian `L_C = D_C − A_C`.
4. Compute the two smallest eigenpairs `(λ_1, φ_1)` and `(λ_2, φ_2)`. `λ_1 = 0` and `φ_1 ∝ 1`. `λ_2` is the gap.

Report `λ_2` as a number on the spectral panel. Cache `φ_2` for the Fiedler overlay.

## Fitted slope

Maintain a circular buffer of recent samples of `log ‖r⟂(t)‖`, where

```text
r⟂(t) = r(t) − ((1/|C|) Σ_{i ∈ C} r_i(t)) · 1_C
```

(i.e., subtract the mean over the largest component). After each share tick, push a sample.

Fit a least-squares line over the most recent `W_fit` samples (default 60). The slope is `−α λ_2` to leading order in `α λ_2` (see `docs/model_notes.md`). Report the *gap-equivalent* slope, defined as

```text
gap_fit = −slope / α
```

Display "—" when:

- the buffer is not yet full;
- a `CULL` or `BIRTH` phase fired anywhere within the buffer window (use a flag);
- the residual standard error of the fit exceeds a tolerance.

## Convergence plot

Plot `log ‖r⟂(t)‖` versus `t` for the last `W_plot` (default 240) ticks. Overlay the fitted line whenever a fit is valid. The pedagogical point is that an arbitrary initial condition collapses to a line whose slope is `−α λ_2`.

A small annotation next to the plot reads:

```text
gap (fitted) = 0.062 / tick
gap (Laplacian) = 0.058 / tick
```

Agreement between the two confirms the model.

## Fiedler overlay

Two layers on the gridworld canvas:

1. **Tint**: each alive cell in `C` is tinted by `sign(φ_2[i])`. Cells with `φ_2[i] > 0` get one hue; cells with `φ_2[i] < 0` get the complementary hue. Tint intensity proportional to `|φ_2[i]|`.
2. **Contour**: along edges where `φ_2` changes sign between two adjacent alive cells, draw a short perpendicular line segment between their centres. The collection of segments traces the soft Fiedler cut.

Cells outside the largest component receive a neutral tint so the contour is visually unambiguous.

## Connected component count

Report `|components|`. Flag (badge / warning colour) when count ≥ 2. This is the only way to interpret a sudden jump in `λ_2`: when the graph splits, the largest-component gap can rise (the largest piece is now smaller and possibly more compact) while the second-smallest eigenvalue of the full Laplacian is 0.

## What the MVP does NOT compute

Resist the urge to layer the following on the MVP. They belong to later phases (`docs/roadmap.md`):

- compression strength `(a_2 − a_1) · Δ`;
- scalarity defect;
- retained mode count K;
- leakage ratio (cross-boundary weight over gap);
- basin witness;
- AM-GM regime labels.

The MVP teaches one concept by direct observation. Reach for more diagnostics only after that concept lands.

## Numerical sanity checks

- `λ_1` should be `0` to within `1e-8`.
- `λ_2 ≥ 0` always.
- For a connected `C` of size `N`, the sum of eigenvalues equals the trace of `L_C` equals `2 · |edges in C|`.
- The Fiedler vector should be approximately orthogonal to the constant: `Σ_i φ_2[i] ≈ 0`.
- The fitted slope and the computed `λ_2` should agree within ~10 % when no birth/death has fired inside the buffer window and the buffer is past the transient.

These checks are useful as `console.warn`-style assertions during development; do not surface them in the user UI.
