# AGENTS.md

## Mission

Build and maintain **Gridworld Boundary Diagnostics** — a token-quantised cellular automaton that makes the spectral gap of a vitality-weighted graph Laplacian visible, manipulable, and pedagogically convincing.

The MVP earns the right to talk about spectral gaps and emergent individuality. AM-GM regime classification is a later phase; do not introduce it without explicit instruction.

## What you are building

A single-page browser app with three synchronised regions:

1. **Centre canvas (gridworld).** A square grid of cells, each holding an integer token count `r ∈ {0, …, 15}`. Cells coloured by viridis. Edges drawn with thickness ∝ intrinsic `κ_ij` and a yellow glow ∝ recent token flow. Optional Fiedler-cut overlay (tint by `sign(φ_2)` and a contour at sign changes). Drop events flash a yellow ring. Phase strip shows `SHARE / DECAY / DROP`.

2. **Right diagnostics.** Live convergence plot of `log ‖r⟂(t)‖`, with overlaid fitted line. Numerical readouts: `λ₂` (Laplacian), `gap_fit = (−slope − μ)/α`, disagreement %, components count (with "split" badge ≥ 2), fit `R²`. Energy-budget table: total, reservoir, M_drop, expected τ_drop, active cells. A small perf HUD shows FPS and applied/target steps per second.

3. **Left controls.** Preset selector + run buttons + basic sliders (slack, α, μ, speed). An advanced expander exposes vitality `r₀` and `k`, active threshold, grid size, avg tokens per cell, spectral cadence, fit/plot window sizes. Visualisation toggles for Fiedler overlay, edges, phase strip.

## What you are not building

- **No binary alive/dead flag, no CULL/BIRTH phases, no κ-map presets.** Those were earlier MVPs. Vitality is a continuous function of `r`; birth and death are emergent from threshold crossings.
- **No AM-GM regime labels** (scalar interface, finite-band, boundary compromised). Deferred to Phase 3; the spectral story is the headline.
- **No user click-to-paint interventions.** Observer-only.
- **No particle / walker overlay.** The integer-token heatmap is the headline visual; edge glow is the headline animation.
- **No grids > 80×80**, no hexagonal grids, no 3D.

## Modelling convention

Discrete time. Three phases per tick: `SHARE`, `DECAY`, `DROP`. Each "step" advances one phase.

State per cell: `{ r: integer }`. Vitality `g(r) = 1 / (1 + exp(−k · (r − r₀)))` — a smooth sigmoid in token units.

Per-edge intrinsic coupling `κ_ij ∈ [0, 1]` stored sparsely as two 2D arrays (horizontal and vertical edges). Currently uniform = 1 across all presets.

Conservation invariant:
```text
Σ r_i + reservoir = totalEnergy, exact integer
```

Tick rule (precise):
```text
SHARE:
  shuffle all edges; for each edge (i, j) in the order, in-place:
    p = α · κ_ij · g(r_i) · g(r_j)
    if Bernoulli(p) and r_i ≠ r_j:
      move 1 token from the higher cell to the lower.

DECAY:
  for each cell i with r_i > 0:
    count ~ Binomial(r_i, μ)
    r_i -= count
    reservoir += count

DROP:
  M = round(R_MAX / slack), clamped to [1, R_MAX]
  if reservoir < M: do nothing
  else:
    (site, source') = nextDropSite(currentDropSource, rng, H, W)
    BFS from site; for each visited cell, place min(remaining, R_MAX − r_cell)
    tokens until M placed or BFS exhausted.
    reservoir -= placed
    record drop flash at the primary site.
```

`R_MAX = LEVELS − 1 = 15`. `LEVELS` is exported from `src/sim/state.ts`.

Stability of SHARE: with α · max_degree · max(κ · g²) < 1, no overflow can occur. For 4-neighbour grids with κ ≤ 1 and g ≤ 1, α < 0.25 is always safe.

## DropSource abstraction

`DropSourceState` is a discriminated union (`src/sim/dropSource.ts`). Each variant has its own state shape and its own `nextDropSite(source, rng, H, W) → { site, source }` clause. Current variants:

- `{ kind: "uniform" }` — iid uniform random cell.
- `{ kind: "twin", sites, turn }` — strict alternation between two fixed sites.
- `{ kind: "wander", x, y, pStay }` — random walk on the grid.

Adding a new source: extend the discriminated union, add a `case` to the switch in `nextDropSite`, write a preset entry in `src/sim/presets.ts`. About 20 lines. The DROP phase doesn't change.

## Spectral pipeline

Active subgraph = cells with `g(r) ≥ vitalityThreshold` (default 0.2). Components are computed by flood-fill on the active subgraph respecting `κ > 0` edges.

Weighted Laplacian `L_w[i, j] = −κ_ij · g(r_i) · g(r_j)` (off-diagonal) and `L_w[i, i] = Σ_j κ_ij · g(r_i) · g(r_j)`. λ₂ is the second-smallest eigenvalue.

Eigensolver selection: Jacobi for `N ≤ 150`, sparse Lanczos with reorthogonalisation and constant-mode deflation for larger `N`. Lanczos is in `src/sim/spectral.ts:fiedlerLanczos`; the sparse matvec is `src/sim/graph.ts:makeLaplacianMatvec`.

Convergence-plot slope-fit:
```text
slope ≈ −α · λ₂ − μ
gap_fit = (−slope − μ) / α
```

Fit is only valid when the last sample's `ticksSinceDrop ≥ fitWindow` (so no drop event interrupted the linear regime).

## First milestone (already shipped)

The "working pedagogical demo" is shipped: three presets, the slack knob, the perf HUD, conservation Δ = 0 in the smoke test. Future work is described in `docs/roadmap.md`.

## Recommended stack

React + TypeScript + Vite. HTML5 Canvas for the gridworld and the convergence plot — SVG is too slow at 50² cells × 60 fps. Mulberry32 PRNG (seedable, replaces `Math.random` everywhere in `src/sim/*`).

Standard commands:
```text
npm install
npm run dev
npm run build
npm run preview
npx tsx scripts/smoke.ts
```

## Language rules

The MVP teaches one concept by direct observation: the spectral gap of the vitality-weighted Laplacian is the inverse equilibration timescale, and it changes visibly as you move the slack slider or switch drop patterns.

Preferred:

```text
Drag slack to change drop magnitude. Tokens become more / less
concentrated in space; cells fall above or below the vitality
threshold; the active subgraph reshapes; λ₂ changes.
```

Avoid (Phase 3 vocabulary):

```text
Scalar interface likely.
This block is one individual.
Boundary integrity compromised.
```

## UI priorities

1. The four-phase rule is readable from the screen (phase strip is non-negotiable).
2. Slack is the single most important slider and lives in the basic deck.
3. Token conservation is exact and visible (energy budget table).
4. Visual responsiveness over numerical exactness — the qualitative slider→slope coupling is what makes the demo work.

## Files to read first

For everyday work:
1. `README.md`
2. `AGENTS.md` (this file)
3. `docs/spec.md`
4. `docs/model_notes.md`
5. `docs/diagnostics.md`
6. `docs/presets.md`
7. `docs/acceptance_criteria.md`

For Phase 3 (AM-GM diagnostics layer), additionally:
- `docs/amgm_context.md`
- `docs/amgm_from_scratch.md`

The whiteboard sketch in `assets/whiteboard_sketch.jpg` is the *original* motivating image; it still captures the visual feel of clusters and bridges that the simulation evokes.
