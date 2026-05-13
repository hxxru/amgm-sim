# AGENTS.md

## Mission

Build a 2D cellular automaton that makes the **spectral gap** visible. Resource sharing, stochastic foraging, threshold-based death and birth combine into a four-phase tick rule that any viewer can read off the screen. The spectral gap of the alive-cell graph Laplacian is then surfaced two ways at once: as a live slope-fit on a convergence plot, and as a Fiedler-cut contour painted on the gridworld.

The app is called **Gridworld Boundary Diagnostics**. The MVP earns the right to name the spectral gap; AM-GM diagnostics are a later phase (see `docs/roadmap.md` and `docs/amgm_context.md`).

## What you are building

A browser-based interactive simulation with:

1. a center canvas showing the 20×20 gridworld with resource heat, a phase strip indicating which CA phase is currently firing, and (after the spectral pass kicks in) a Fiedler-cut overlay;
2. a right-hand convergence plot of `log ‖r⟂(t)‖` versus time, with a live fitted slope reported as the current gap estimate;
3. a left-hand control panel with a preset selector, random-init density, sliders for share rate, food discovery rate, death threshold, birth threshold, and a global speed.

## What you are not building

Do **not** implement AM-GM regime classification (compression strength, scalarity defect, leakage ratio, regime labels). The previous MVP had this; it has been deliberately removed. AM-GM is for a later phase.

Do **not** add user click-to-paint interventions. Observer mode only.

Do **not** implement particle / walker overlays in the MVP. Those are in the roadmap, but the share step is deterministic and the resource heatmap is the primary visualization.

Do **not** scale beyond a 20×20 grid for the MVP. The spectral solver and the render budget are tuned to that size.

Do **not** import the AM-GM monograph or the full internal memo suite. Use the curated context files in `docs/`.

## First milestone

Implement the MVP in roughly this order:

1. `Cell` and `Grid` state types; random and preset initializers.
2. The four-phase `tick` function as a pure transformation `(grid, params, rng) → grid`.
3. Canvas render of resource heat + alive/empty + phase strip.
4. Build the alive-subgraph Laplacian; compute the two smallest eigenpairs.
5. Paint the Fiedler sign as a tint on alive cells; draw a contour at sign changes.
6. Maintain a sliding window of `r⟂(t)` samples; fit a slope; render a convergence plot with the slope number.
7. Presets: random scatter, twin blobs with a neck, single elongated bottleneck, archipelago.
8. UI polish: tooltips, slider feel, speed control.

## Recommended stack

Use React + TypeScript + Vite. Use **HTML5 Canvas** for the gridworld (faster than SVG at 400 cells × 60 fps with overlays). Use a small symmetric eigensolver for the smallest two eigenvalues — Lanczos with reorthogonalisation is overkill at this size, so deflated shift-invert power iteration or even Jacobi on a 100×100 Laplacian is fine. For the slope fit, a windowed least-squares line through `log ‖r⟂‖` samples is enough.

Standard commands:

```text
npm install
npm run dev
npm run build
npm run preview
```

## Modeling convention

Discrete time. State per cell: `{ alive: boolean, r: number }`. Resource is non-conserved — foragers inject mass; deaths remove cells (and their mass) from the system.

The four-phase tick is:

```text
1. SHARE   (deterministic, every tick)
     r_i ← r_i + α · Σ_{j alive neighbor of i} (r_j − r_i)

2. DISCOVER (stochastic, every tick)
     each cell: with probability p_food, r_i += ε

3. CULL    (stochastic, every T_db ticks; T_db ≈ 10)
     each alive cell with r < r_death:
       die with probability β · (r_death − r) / r_death

4. BIRTH   (stochastic, every T_db ticks)
     each empty cell with ≥ k alive neighbors having r > r_birth:
       born with probability γ; r ← r_seed
```

The slow cadence on CULL and BIRTH is essential: it keeps the alive subgraph quasi-static for long enough that the share-step Laplacian has a well-defined gap to report. See `docs/model_notes.md` for the full conventions and `docs/diagnostics.md` for the spectral overlay.

## Diagnostic conventions

The MVP reports just three numbers and one overlay:

- **`λ_2`** — the spectral gap of the share-step Laplacian on the largest connected alive component, recomputed every `N_spec` ticks.
- **Fitted slope** — least-squares slope of `log ‖r⟂(t)‖` over the last sliding window. After a transient, this matches `−λ_2`.
- **Component count** — number of connected components of alive cells (helps explain why `λ_2` may suddenly drop to ~0 when the graph splits).
- **Fiedler overlay** — sign of `φ_2` painted on alive cells, with a contour at sign changes.

That is the entire diagnostic surface for the MVP. No regime labels, no scalarity defect, no leakage ratio. Resist the urge to layer AM-GM on top before this works.

## Language rules

The MVP teaches one concept by observation: the spectral gap is the inverse equilibration time of resource sharing on the alive subgraph. Copy should reinforce that.

Preferred:

```text
The slope of the convergence plot is the spectral gap of the current alive subgraph.
Watch it change as you widen or close the neck between clusters.
```

Avoid:

```text
This is an AM-GM block.
This proves the boundary is real.
```

## UI priorities

1. The CA rule must be readable from the screen. Phase strip is non-negotiable.
2. The gap-as-slope demo (convergence plot) must work before the gap-as-number is computed. The convergence plot is the pedagogical anchor.
3. Spectral overlay updates on a slower cadence than the CA tick; that is fine, even desirable.
4. Visual responsiveness over numerical exactness.

## Acceptance criteria

See `docs/acceptance_criteria.md` for the full list. In short: the CA evolves visibly; the phase strip tracks the rule; presets load and stabilize; the convergence plot's fitted slope matches the computed `λ_2` after a transient on the Twin Blobs preset; the Fiedler cut runs through the neck.

## Recommended implementation phases

1. Static grid render + state types + preset initializers.
2. Four-phase tick (no spectral analysis yet).
3. Phase strip + speed control + random init.
4. Alive-subgraph Laplacian and smallest-two eigenpair solver.
5. Fiedler overlay (tint + contour).
6. `r⟂(t)` tracker + sliding-window slope fit + convergence plot.
7. Spectral readout panel (gap number, component count, agreement check).
8. Tuned presets and tooltips.

## Files to read first

1. `docs/spec.md`
2. `docs/model_notes.md`
3. `docs/diagnostics.md`
4. `docs/presets.md`
5. `docs/acceptance_criteria.md`

The whiteboard sketch in `assets/whiteboard_sketch.jpg` shows the *original* AM-GM layout. It is no longer the immediate build target, but it sketches the visual feel of clusters and necks that the MVP should still evoke.
