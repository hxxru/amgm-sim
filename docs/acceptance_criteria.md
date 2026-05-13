# Acceptance Criteria and Tests

## MVP acceptance criteria

The first version is acceptable if **all** of the following hold:

1. The app loads in a browser via `npm run dev` and via `npm run build && npm run preview`.
2. A user can select at least three presets: Uniform Drops, Twin Springs, Wandering Source.
3. The Reseed button generates a fresh seed; same `(preset, seed, sliders)` reproduces the same trajectory bit-for-bit.
4. The three-phase rule is visible via a phase strip whose currently-firing phase (`SHARE / DECAY / DROP`) is highlighted.
5. A user can adjust at minimum: **slack**, share rate `α`, decay `μ`, simulation speed.
6. Grid size is configurable from the advanced panel; the default is 50×50.
7. The gridworld canvas renders cells with viridis on `r / R_MAX`, with a dark overlay for dormant cells (`g(r) < 5 %`).
8. Edges are drawn between adjacent cells, with thickness ∝ `κ_ij` and a yellow glow ∝ recent token flow (decays over a few frames).
9. Drop events flash an expanding yellow ring at the primary drop site.
10. The Fiedler overlay (toggleable) tints alive cells in the largest active component by `sign(φ_2)` and draws a contour at sign changes.
11. The convergence plot updates live with `log ‖r⟂(t)‖` versus time, and overlays a dashed fit line whenever a fit is valid.
12. The spectral panel displays `λ₂` (Laplacian), `gap (fitted)`, disagreement %, component count (with "split" badge ≥ 2), fit `R²`.
13. The energy-budget panel displays total tokens (invariant), reservoir, M_drop, τ_drop, active cells.
14. A perf HUD shows FPS and applied/target steps per second, with an "ok / lagging" badge.
15. UI copy uses cautious observational language (see `docs/ui_copy.md`) and avoids AM-GM regime claims.
16. The codebase is structured for incremental extension: adding a new DropSource is a discriminated-union extension + a `case` in the switch + a preset entry, roughly 20–30 lines.

## Tick rule validity checks

For every emitted tick:

- Every cell has integer `r ≥ 0`.
- The SHARE step preserves `Σ r_i + reservoir` exactly.
- The DECAY step preserves `Σ r_i + reservoir` exactly (tokens move from cells to reservoir).
- The DROP step preserves `Σ r_i + reservoir` exactly (tokens move from reservoir to cells, capped at `R_MAX` per cell).
- A cell that receives a drop was either at `r < R_MAX` before the placement, or remains at `r = R_MAX` with the would-be overflow staying in the BFS queue.
- No NaNs or `−Infinity` outside of `orthLogNorm` (which legitimately returns `−Infinity` when `r⟂ = 0`).

## Laplacian and spectral checks

Inside development-only assertions:

- `L_w` is symmetric: `L_w[i, j] = L_w[j, i]` to within `1e-9`.
- `L_w` is PSD: smallest eigenvalue ≥ `−1e-8`.
- For the largest connected component, smallest eigenvalue is `0` to within `1e-8`.
- `λ₂ ≥ 0`.
- `Σ_i φ_2[i] ≈ 0` on the largest component (Fiedler orthogonal to constant).
- Lanczos result matches Jacobi result to within ~1 % for `N ≤ 200` test matrices.

## Slope-fit checks

- The fit is only displayed when the slope-fit buffer is full **and** the latest sample's `sinceEvent ≥ fitWindow` **and** all samples in the window have finite `logNorm`.
- In a noise-free linear regime (e.g., a deliberately-perturbed Uniform Drops with drops suppressed), `gap_fit ≈ λ₂` to within ~5 %.

## Preset sanity checks

### Uniform Drops

```text
After warm-up:
- components: usually 1 (occasionally 2 transiently)
- λ₂: small, geometry-dominated; ≈ 0.005–0.02 depending on slack
- no persistent cluster
```

Dragging slack should change `λ₂` and `M_drop` simultaneously; the *shape* of the active subgraph remains roughly uniform.

### Twin Springs

```text
At default slack ≈ 1.5:
- components: 1 (the two clusters are still connected through the
  uniformly-fed background)
- Fiedler contour bisects the grid vertically between the springs

At low slack ≈ 0.5:
- components: 2 (each spring isolated as a hot island)
- λ₂ drops significantly
- the rest of the grid is dormant
```

### Wandering Source

```text
After ~50 share-ticks of warm-up:
- components: 1
- the bright cluster visibly drifts on the canvas
- the Fiedler contour reorients to follow the drift direction
```

## Slider sanity checks

- Reducing **α** flattens the convergence-plot slope; `λ₂` of `L_w` *also* changes because `L_w` scales with `g²` (but not with `α`); `gap_fit = (−slope − μ)/α` is approximately invariant under α in the linear regime.
- Increasing **μ** steepens the convergence slope; `gap_fit` falls accordingly (because we subtract μ in the formula).
- Reducing **slack** raises `M_drop` and drops fire more bursty; `components` count rises in Twin Springs / Wandering once the dormant gaps open up.
- Increasing **grid size N** (after Reset) increases compute load roughly linearly; perf HUD should still report "ok" at default settings up to N ≈ 60 on a modern laptop.

## Conservation smoke

`scripts/smoke.ts` runs the simulation under default params (with drops on) for each preset and asserts:

- `Σ r_i + reservoir = totalEnergy` exactly throughout (`Δ = 0`).
- Lanczos / Jacobi spectral pipeline runs without crashing.
- Sim time per preset stays under a few hundred ms at N = 50.

Latest run (post grid-size bump to 50):

```text
Uniform Drops     : 2047 active, 8 components,  Δ = 0, 323 ms
Twin Springs      : 1934 active, 10 components, Δ = 0, 240 ms
Wandering Source  : 1966 active, 14 components, Δ = 0, 233 ms
```

## UI checks

- The current preset name is visible at all times.
- The current `λ₂` and `gap_fit` are visible at all times.
- Tooltips explain each slider and each diagnostic in cautious observational language.
- Colour is not the only carrier of information (Fiedler tint paired with a contour line; component-count badge has text).

## Performance target

For `N = 50` at default settings, the perf HUD should report ≥ 90 % of target steps/s on a modern laptop. For `N = 80`, ≥ 60 %; if it drops below that we revisit the spectral cadence or move Lanczos to a Web Worker.

## Reproducibility

A given `(preset, seed, slider snapshot at t = 0)` must produce a bit-identical trajectory. The smoke test exercises this for default sliders.

URL-based state encoding (so users can paste a link that reproduces a snapshot) is queued for v2 (`docs/roadmap.md`).
