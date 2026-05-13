# Gridworld Boundary Diagnostics — Product Spec

## Purpose

A lightweight web simulation that lets a user watch a three-phase, token-quantised cellular automaton on a 2D grid and *discover the spectral gap* of its vitality-weighted Laplacian. The discovery happens three ways:

1. as a fitted slope on a live convergence plot;
2. as a Fiedler-cut contour painted on the gridworld plane itself;
3. as a connected-component count badge that flags when the active subgraph splits.

The MVP earns the right to talk about spectral gaps and emergent individuality. AM-GM diagnostics, partition scoring, and richer interventions are deferred (see `docs/roadmap.md`).

## Core layout

Single-page, three-pane layout.

### Left pane — controls

- Preset selector.
- Run buttons: Play / Pause, Step (single phase), Reset, Reseed.
- Seed readout.
- **Basic sliders:**
  - **Slack** (log scale, ~0.4–25) — the headline knob. `M_drop = round(15 / slack)`. High slack → small drops → tokens dispersed → one connected cluster. Low slack → large drops → tokens concentrated → fragmented dormant landscape.
  - **Share rate α** (0.01–0.24).
  - **Decay μ** (0.001–0.1).
  - **Speed** (1–180 steps/s).
- **Visualisation toggles:** Fiedler tint + contour, κ + flow edges, phase strip.
- **Advanced expander:**
  - Vitality `r₀` and `k`.
  - Active threshold.
  - **Grid size** `N×N` (12–80, takes effect on Reset).
  - **Avg tokens / cell** (1–12, takes effect on Reset).
  - Spectral recompute cadence.
  - Fit window, plot window.

### Centre pane — gridworld canvas

- `N × N` cells rendered to `<canvas>` (cell size auto-scales to fit a ~760 px box; clamped to 9–28 px).
- Each cell's colour is `viridis(r / 15)`. Dormant cells (`g(r) < 5 %`) get a dark overlay.
- Edges drawn between alive 4-neighbour pairs: line thickness/opacity ∝ `κ_ij`, yellow glow ∝ recent token flow (decays over ~5 frames).
- Drop events flash an expanding yellow ring at the primary site.
- Fiedler overlay (toggleable): alive cells in the largest active component tinted by `sign(φ_2)` with alpha ∝ `|φ_2|/max|φ_2|`; a white contour traces edges where `φ_2` changes sign.
- Phase strip below the grid highlights `SHARE / DECAY / DROP`.
- Below the canvas: a one-line readout — `tick · next phase · reservoir tokens · M_drop · active/total`.
- Perf HUD overlay (bottom-right): `FPS · applied/target steps/s · ok | lagging`.

### Right pane — diagnostics

- **Spectral table:**
  - `λ₂` (Laplacian) — second-smallest eigenvalue of the vitality-weighted Laplacian on the largest active component.
  - `gap (fitted)` — `(−slope − μ) / α` from the convergence plot.
  - Disagreement % between the two.
  - Components count (badged "split" when ≥ 2).
  - Fit `R²`.
- **Energy budget table:**
  - Total tokens (conserved integer).
  - Reservoir (tokens currently in the atmosphere).
  - `M_drop` (tokens dispensed per drop event).
  - `τ_drop` (expected ticks between drop events at steady state).
  - Active cells.
- **Convergence plot** — `log ‖r⟂(t)‖` over the last `plotWindow` ticks, with an overlaid orange dashed fit line whenever the fit is valid.
- A short observational copy paragraph reinforcing the slack→slope link.

## Sliders, in detail

| Slider          | Symbol  | Default | Range          | Notes |
| --------------- | ------- | ------- | -------------- | ----- |
| Slack           | —       | 1.5     | log [0.4, 25]  | `M = round(15 / slack)`; clamped to `[1, 15]`. |
| Share rate      | α       | 0.15    | [0.01, 0.24]   | Stability: α · max-degree · max(κ · g²) < 1. |
| Decay           | μ       | 0.004   | [0.001, 0.1]   | Per-tick, per-token probability of evaporating to reservoir. |
| Speed           | —       | 18 s/s  | [1, 180]       | 3 phases per tick; default ≈ 6 ticks/s. |
| Vitality r₀     | r₀      | 3       | [0.5, 12]      | Sigmoid centre, in token units. |
| Vitality k      | k       | 1.5     | [0.2, 6]       | Sigmoid steepness. |
| Active threshold | —      | 0.2     | [0.01, 0.5]    | g(r) above this → cell counted in spectral. |
| Grid size N     | —       | 50      | [12, 80]       | Square grid. Resets on change. |
| Avg tokens/cell | —       | 4       | [1, 12]        | `totalEnergy = N² · this`. Resets on change. |
| Spectral cadence | —      | 8       | [1, 60] ticks  | How often λ₂ / φ₂ are recomputed. |
| Fit window      | —       | 25      | [6, 200]       | Samples in the slope fit. |
| Plot window     | —       | 240     | [60, 600]      | Samples drawn on the convergence plot. |

## Presets (v1)

All current presets use uniform κ = 1 and a uniformly-seeded initial grid (`r = floor(total / N²)` per cell). They differ only in the DropSource.

1. **Uniform Drops** — iid uniform site per drop. Null hypothesis; no cluster forms.
2. **Twin Springs** — strict alternation between two fixed cells.
3. **Wandering Source** — random walk on the grid (`p_stay = 0.5`).

See `docs/presets.md` for the expected qualitative behaviour and `docs/roadmap.md` for queued additions (Hawkes self-excitation, regime-switching Markov, state-coupled foraging).

## Pedagogical script

The app is considered to "work" if a curious viewer can run through the following in under five minutes:

1. Load Twin Springs. The grid is uniformly lit; drops alternate at two visible sites.
2. Drag slack down (slider left). M_drop grows; drops dump big bursts. Cells around the two sites brighten dramatically; the rest of the grid darkens as μ drains tokens that no longer get replenished. Component count goes 1 → 2. Fiedler contour appears between the two clusters. λ₂ drops.
3. Drag slack back up. M_drop falls; drops sprinkle widely; cells return to baseline; component count goes 2 → 1; λ₂ recovers.
4. Switch to Wandering Source. Watch a single cluster drift with the moving drop site. Fiedler vector is meaningless (single cluster) or follows the drift direction.
5. Switch to Uniform Drops. The system equilibrates to a noisy near-uniform state; no persistent cluster forms. `λ₂` may still be reported but is dominated by uniform-grid geometry.

## Non-goals for the MVP

See `README.md` for the full list. The high-level ones:

- AM-GM regime classification.
- User intervention (click-to-add-food, click-to-kill, drag-to-paint-walls).
- Particle / walker overlay.
- Hex grids, non-Euclidean topologies.
- Headless / batch run mode.

## Implementation phases

These are the natural increments; the present codebase has cleared phase 8.

1. State types + presets + seedable PRNG.
2. Three-phase pure `step()` function.
3. Canvas render + phase strip + speed control.
4. DropSource abstraction.
5. Active-subgraph builder + Jacobi eigensolver for `N ≤ 150`.
6. Lanczos eigensolver for larger grids; sparse matvec.
7. Fiedler tint + contour overlay.
8. `r⟂(t)` tracker + sliding-window slope fit + convergence plot.
9. Spectral readout panel + component-count badge.
10. Perf HUD + configurable grid size.
11. Drop-pattern presets (uniform, twin, wander).

Phase 12 and beyond are in `docs/roadmap.md`.
