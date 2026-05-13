# Gridworld Boundary Diagnostics

A token-quantised, conservation-preserving cellular automaton in which energy *flows* between cells according to local height differences and per-edge coupling. Energy decays into a reservoir, the reservoir drips back as discrete "drops" at sites chosen by a stochastic process, and the cycle repeats — total energy is invariant by construction. The pedagogical payoff is that the **spectral gap** of the vitality-weighted graph Laplacian becomes a visible, manipulable thing: drag a single slider (slack) and watch one connected medium fragment into separate clusters, or coalesce back.

This is the **front door** to a longer-term research program (the AM-GM Boundary program; see `docs/amgm_context.md`, `docs/amgm_from_scratch.md`). The MVP doesn't ship the AM-GM regime classification — it earns the right to talk about spectral gaps and emergent individuality first; AM-GM language is the deferred Phase 3 layer.

## What the user sees

Three synchronised regions on a single page.

**Centre — the gridworld (canvas).** A square grid (50×50 by default; 12–80 configurable) of cells. Each cell holds an integer token count `r ∈ {0, …, 15}`. Cell colour is `r` mapped through the viridis colormap; dormant cells (`g(r) < 5%`) get a dark overlay so you can read "where life is" at a glance. Edges are drawn between adjacent cells with thickness proportional to intrinsic coupling `κ_ij` and a yellow glow proportional to recent token flow on that edge. Drop events flash an expanding yellow ring at the destination cell. A four-segment phase strip at the bottom highlights which of `SHARE / DECAY / DROP` just fired. With the Fiedler overlay enabled, alive cells in the largest connected active component are tinted on either side of the contour where the Fiedler vector `φ_2` changes sign — that contour is the soft AM-GM-style "boundary" between would-be sub-units.

**Right — spectral diagnostics.** A live plot of `log ‖r⟂(t)‖` over the last few hundred share-ticks, with an overlaid least-squares fit line whenever it's valid. Below the plot: numerical readouts of `λ₂` of the current weighted Laplacian, the `μ`-corrected fitted gap, fit `R²`, and the connected-component count (with a "split" badge when ≥ 2). A second table reports the energy budget: total tokens (invariant), reservoir, M_drop, expected ticks between drop events, and active cell count.

**Left — controls.** Preset selector, run buttons (play/pause/step/reset/reseed), and the basic slider deck. The headline slider is **slack**; the others are share rate `α`, decay rate `μ`, and speed. An "Advanced" expander reveals vitality `r₀` and `k`, the active threshold, grid size, avg-tokens-per-cell, spectral recompute cadence, fit / plot window sizes. Visualisation toggles for Fiedler tint+contour, κ + flow edges, and phase strip.

A perf HUD in the bottom-right of the grid pane shows live FPS and applied vs target steps/s, so you can tell when the sim is keeping up.

## The rule, in three phases per tick

```text
1. SHARE   (stochastic; every tick)
   For each edge (i, j) in random order:
     p = α · κ_ij · g(r_i) · g(r_j)
     With probability p, move 1 token from the higher cell to the lower.
   (Bilateral, conservation-preserving. r never goes negative because edges
   read state in-place.)

2. DECAY   (stochastic; every tick)
   For each cell i with r_i > 0:
     count ~ Binomial(r_i, μ)
     r_i ← r_i − count;  reservoir ← reservoir + count.

3. DROP    (stochastic; every tick, conditional)
   M = round(R_MAX / slack), clamped to [1, R_MAX].
   If reservoir ≥ M:
     Ask the current DropSource for a site (x, y).
     Dispense M tokens at (x, y); spill overflow to BFS-ordered neighbours
       until either M tokens are placed or all cells are saturated.
     reservoir -= placed.
```

`g(r) = sigmoid((r − r₀) · k)` is the **vitality** of a cell. Couplings, decay, and drop probabilities all read `g`, so a depleted cell is effectively decoupled from the dynamics without ever being formally killed. Birth and death are not phases; they emerge from the vitality threshold being crossed by changes in `r`.

Conservation is exact and integer-valued: `Σ r_i + reservoir = totalEnergy` is preserved to the bit.

## Where the spectral gap lives

The SHARE step, viewed as a linear operator on `r`, is `r ← (I − L_eff) r` with `L_eff` the weighted Laplacian whose edge weights are `α · κ_ij · g(r_i) · g(r_j)`. Its trivial eigenvalue is 0 with constant-mode eigenvector; the second-smallest eigenvalue is `α · λ₂`, where `λ₂` is the Fiedler value of the vitality-weighted Laplacian. That `λ₂` is the inverse equilibration timescale of resource sharing on the current alive subgraph — and it's what the convergence plot's slope reports, after correcting for the per-tick decay contribution:

```text
slope per tick ≈ −α · λ₂ − μ
gap_fit = (−slope − μ) / α
```

Between DROP events, the system relaxes exponentially and `gap_fit` matches `λ₂` of the spectral computation. Drops perturb the system and reset the fit window, so the slope is only displayed when the most recent samples post-date the last drop.

## DropSources — the structural axis

Presets differ only in the stochastic process that chooses drop sites. The substrate `κ_ij` is uniform = 1 across all current presets.

```text
Uniform Drops        iid uniform site per drop. Null hypothesis;
                     no spatial or temporal correlation.

Twin Springs         drops alternate strictly between two fixed sites.
                     Two competing clusters whose merge/split depends
                     on slack.

Wandering Source     drop site does a Markov walk on the grid
                     (p_stay = 0.5). One cluster drifts with the source.
```

See `docs/presets.md` for the expected behaviour per preset, and `docs/roadmap.md` for the next sources we're adding (Hawkes self-excitation, regime-switching Markov chain, state-coupled foraging).

## Suggested stack

```text
React + TypeScript + Vite
HTML5 Canvas for the gridworld and the convergence plot
Sparse Lanczos eigensolver for the smallest non-trivial eigenpair
   (Jacobi for active subgraphs ≤ 150 cells; Lanczos otherwise)
Mulberry32 seedable PRNG so trajectories are reproducible
```

Deployment is GitHub Pages via `.github/workflows/deploy.yml`.

## Non-goals for the MVP

- **AM-GM regime classification** (compression strength, scalarity defect, leakage ratio, regime labels). That's Phase 3; see `docs/roadmap.md`.
- **User intervention** (click to add food, click to kill, drag to draw walls). Observer-only.
- **Continuous-time stochastic simulation** (Gillespie). The integer-token, discrete-tick rule is the whole point.
- **Particle / walker overlay**. The viridis heatmap on integer levels is the headline visualisation.
- **Hexagonal or non-grid topologies**. Square 4-neighbour grid only.
- **3D rendering**.

## Repository contents

```text
AGENTS.md                         Coding-agent instructions and guardrails
README.md                         Project overview (this file)
docs/spec.md                      Product/design spec for the CA
docs/model_notes.md               Tick rule, Laplacian, conservation, slope-fit
docs/diagnostics.md               Spectral diagnostics (gap, fit, components)
docs/presets.md                   DropSource presets and expected behaviour
docs/acceptance_criteria.md       MVP acceptance criteria and tests
docs/ui_copy.md                   Suggested explanatory copy and tooltips
docs/roadmap.md                   Next DropSources and Phase 3+ ideas
docs/amgm_context.md              Long-term AM-GM context (Phase 3)
docs/amgm_from_scratch.md         Long-form AM-GM primer (Phase 3)
docs/project_context_packet.md    Context briefing for coding agents
src/sim/                          CA core (state, rules, graph, spectral, drop sources)
src/components/                   React UI (canvas, controls, plot, panels)
scripts/smoke.ts                  Numerical sanity check (run with `npx tsx`)
.github/workflows/deploy.yml      GitHub Pages CI
```
