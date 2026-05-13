# Gridworld Boundary Diagnostics — Product Spec

## Purpose

A lightweight web simulation that lets a user watch a four-phase cellular automaton on a 2D grid and *discover the spectral gap* of the resulting alive-cell graph. The discovery happens two ways:

1. as a fitted slope on a live convergence plot;
2. as a Fiedler-cut contour painted on the gridworld plane itself.

The MVP earns the right to talk about spectral gaps. AM-GM diagnostics, partition scoring, and richer interventions are deferred to later phases (`docs/roadmap.md`).

## Core layout

Single-page, three-pane layout.

### Left pane: controls

- Preset selector.
- Random-init density slider.
- Slider: share rate `α`.
- Slider: food discovery rate `p_food`.
- Slider: death threshold `r_death` (and steepness `β`).
- Slider: birth threshold `r_birth` (and probability `γ`).
- Slider: global speed (ticks per second).
- Toggle: pause/play.
- Button: reseed random / reset.

### Center pane: gridworld canvas

- 20×20 cells rendered to `<canvas>`.
- Empty cells drawn as a faint background; alive cells filled with a heat colour proportional to resource level.
- Phase strip along the bottom: four labels — **share**, **discover**, **cull**, **birth** — with the currently firing phase highlighted.
- Fiedler-cut overlay (toggleable): each alive cell tinted by the sign of `φ_2`; a contour drawn along sign changes.
- Optional: a thin marker showing the connected component count for the current alive subgraph.

### Right pane: spectral diagnostics

- **Convergence plot**: `log ‖r⟂(t)‖` versus `t`, where `r⟂` is the part of the resource vector orthogonal to the principal mode `φ_1`. After a transient, this is a line with slope `−λ_2`.
- **Fitted gap**: least-squares slope over the most recent sliding window, displayed as a number with units of inverse ticks.
- **Computed gap**: `λ_2` of the current alive-subgraph Laplacian, recomputed every `N_spec` ticks.
- **Component count**: number of connected components in the alive subgraph; flags when the graph splits (and `λ_2` becomes a per-component quantity).

## Main controls

### Sliders

| Slider          | Symbol     | Default | Notes                                                            |
| --------------- | ---------- | ------- | ---------------------------------------------------------------- |
| Share rate      | `α`        | 0.15    | Must satisfy `α · max_degree < 0.5` to keep the share step stable. |
| Food discovery  | `p_food`   | 0.01    | Per-cell-per-tick probability of a forager event.                |
| Discovery size  | `ε`        | 0.5     | Magnitude of each food pulse.                                    |
| Death threshold | `r_death`  | 0.2     | Below this, cells start dying.                                   |
| Death steepness | `β`        | 0.3     | Maximum per-(death-tick) probability of dying when r = 0.        |
| Birth threshold | `r_birth`  | 0.6     | Neighbours above this count as "healthy."                        |
| Birth rate      | `γ`        | 0.05    | Per-empty-cell-per-(birth-tick) probability of birth, given k healthy neighbours. |
| Healthy k       | `k`        | 2       | Minimum healthy alive neighbours for an empty cell to be eligible. |
| Seed resource   | `r_seed`   | 0.5     | Resource level of a newly born cell.                             |
| Speed           | (ticks/s)  | 30      | Rendering and tick rate.                                         |

### Toggles

- Show resource heatmap.
- Show Fiedler tint.
- Show Fiedler contour.
- Show phase strip.
- Show component-count badge.

## Presets

MVP presets, all on the same 20×20 grid:

1. **Random scatter** — uniform alive density, used to demonstrate spontaneous structure formation.
2. **Twin blobs** — two ~50-cell blobs joined by a 2-cell neck. The canonical "watch the gap appear" preset.
3. **Single neck** — one elongated blob with an internal bottleneck. Shows finite-band-style memory inside a single connected component.
4. **Archipelago** — three or four small disconnected blobs. `λ_2` is dominated by the *largest* component; component count > 1 is flagged.

Each preset supplies an initial `Grid` and a set of slider defaults that produce its canonical behaviour.

## Pedagogical script

The app is considered to "work" if a curious viewer can run through the following in five minutes:

1. Load Twin Blobs. Hit play. The population stabilises within a few seconds.
2. The convergence plot drops fast at first (initial pulse spreading across each blob), then settles into a straight line. The slope is reported.
3. Toggle the Fiedler overlay. The two blobs are tinted differently and a contour appears along the neck.
4. Drag the share-rate slider down. The convergence-plot slope flattens. The number drops. The user has watched the gap *become* a thing.
5. Switch to Single neck. Repeat. The Fiedler cut now runs across the bottleneck *inside* a single connected component.

## Non-goals for the MVP

- AM-GM regime classification (compression strength, scalarity defect, leakage ratio, regime labels). These are a later phase; see `docs/roadmap.md`.
- User-drawn partitions or click-to-paint interventions.
- Particle / walker overlay.
- Hexagonal or non-grid topologies.
- Trajectory estimation, parameter inference, or Doc-3-style empirical extraction.
- Headless / batch simulation mode.

## Implementation phases

1. State types + presets + random init.
2. Four-phase `tick` function (deterministic share, stochastic discover/cull/birth with a seedable RNG).
3. Canvas render + phase strip + speed control.
4. Alive-subgraph Laplacian + smallest-two eigenpair solver.
5. Fiedler tint + contour overlay.
6. `r⟂(t)` tracker + sliding-window slope fit + convergence plot.
7. Spectral readout panel + component-count badge.
8. Tooltips, tuned slider defaults, README polish.

Each phase is independently shippable and worth verifying in a browser before moving on.
