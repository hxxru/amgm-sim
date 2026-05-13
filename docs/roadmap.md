# Roadmap

The MVP makes the spectral gap visible and nothing else. Everything else is downstream of that. This document collects the natural next moves so we can resist them while building the MVP and have them ready when the MVP is done.

## Phase 2 — Spectral richness

Layer additional observables on the same CA, before introducing any AM-GM framing.

- **Higher modes.** Display `λ_3`, `λ_4`, … and the corresponding eigenvectors as additional tints. Mostly pedagogical, but useful for showing why the gap matters.
- **Per-component diagnostics.** When components ≥ 2, allow the user to select which component to inspect.
- **Eigenmode browser.** A small dropdown that lets the user view `φ_k` for any `k ≤ 5`. Connect it to a side text explaining what each mode represents.
- **Cheaper spectral solver.** Lanczos with reorthogonalisation or shift-invert power iteration if the Jacobi cost becomes noticeable.
- **Time-of-equilibration overlay.** Per-cell estimated time to reach `e^-1` of its initial deviation from the mean. The "thermal" geometry counterpart of the Fiedler cut.

## Phase 3 — AM-GM diagnostics layer

Reintroduce the AM-GM language as an *interpretive* layer on top of the spectral observables. Hidden behind a toggle so the MVP story is preserved.

- **Compression strength** `(λ_2) · Δ` where `Δ` is a user-set cycle length (or a fixed read-out).
- **Scalarity defect** from rank-one approximation of a survival-style profile.
- **Retained-mode count** at a tolerance, surfaced via the eigenmode browser.
- **Leakage ratio**: identify "bridges" as edges whose removal raises `λ_2` most. Quantify cross-cut weight versus within-component gap. Replaces the supplied-bridge convention of the previous MVP with an emergent-bridge identification.
- **Suggested regime label**: only after the above are computed, with the cautious copy from `docs/amgm_from_scratch.md`.
- **Basin witness**: heuristic localisation of higher modes on candidate sub-regions.

## Phase 4 — User intervention

Move from observer mode to painter mode. Adds engagement, costs some math clarity.

- **Click to drop food** — manual pulses of `ε` on chosen cells.
- **Click to kill** — force-cull a cell.
- **Drag to draw walls** — mark cells permanently empty so structure can be sculpted.
- **Drag to draw a partition** — user proposes a candidate cut; the app scores it against `φ_2` (cosine similarity) and computes the partition's empirical leakage.

## Phase 5 — Stochastic / particle layer

Replace or augment the deterministic share with a particle/walker visualisation.

- **Walkers.** A small population of stochastic walkers performing random walks on the alive subgraph with killing. The macroscopic resource heat is recovered as walker density.
- **Forager animation.** Render food discovery as a brief sparkle on the chosen cell with a tiny "trail" suggesting a forager landed there.
- **Per-tick flow arrows.** During SHARE, draw subtle directional arrows showing net flow between cells. Off by default; useful for the rule-explanation mode.

## Phase 6 — Time-scale and read-out controls

Tools for exploring the AM-GM intuition that "boundary type depends on the cycle window."

- **Δ-sweep panel.** A small chart that fixes the current alive graph and sweeps `Δ`, showing how compression strength varies. Implements the lesson in `docs/amgm_from_scratch.md` §10.
- **Toggle: deterministic vs. stochastic share.** Same expected behaviour, but the stochastic version is the literal microscopic CA; the deterministic one is the mean-field limit.
- **Toggle: synchronous vs. asynchronous CULL/BIRTH.** Mostly a robustness experiment.

## Phase 7 — Topology

Stop assuming a square 4-neighbour grid.

- **Hex grid** (6-neighbour). Different Laplacian spectrum; the Fiedler cut looks different.
- **Continuous-position nodes.** Cells become points with arbitrary positions; adjacency is range-based.
- **Larger grids** (40×40, 64×64). Requires a real eigensolver (Lanczos).
- **Non-Euclidean adjacency.** Edges can have weights from terrain or barrier maps.

## Phase 8 — Reproducibility and sharing

- **Seed + preset + slider state in URL hash.** Already mentioned in the MVP; revisit if the MVP shipped without it.
- **Export run as JSON.** State trajectory + spectral history; analyse in a notebook.
- **Side-by-side comparison.** Two simulations on the same screen with synchronised tick.

## Phase 9 — Estimation from trajectories

The path toward Document 3-style empirical extraction.

- Sample sparse trajectories from the running CA.
- Estimate `λ_2` of the underlying generator from those trajectories using a finite-window estimator.
- Compare the estimated gap to the true `λ_2` for various sampling densities.
- This is the longest-horizon item; it has its own conceptual stack.

## Parameters we may want to expose later

Collected here so we do not have to invent them again:

- Asymmetric `α` per edge (e.g., terrain).
- Non-uniform `r_death` per cell (some cells are "harder to kill").
- Heterogeneous `p_food` map (some regions are more forageable).
- Resource decay coefficient: `r_i ← r_i · (1 − decay)` independent of sharing.
- Maximum capacity `r_max` with capped DISCOVER pulses.
- Variable `T_db` schedule (e.g., birth/death faster early, slower later).
- A "stress" event slider that temporarily raises `r_death`.
- Configurable initial-condition pulse for the convergence-plot tracker — start the system from a delta function on a chosen cell to demonstrate spreading explicitly.

## What we will *not* do

To keep the MVP scope honest, the following are out:

- Real biology / population genetics. The model is intentionally toy.
- Continuous-time stochastic simulation (Gillespie). The discrete tick rule is the whole point.
- "Solving" AM-GM rigorously. This is a pedagogical sandbox.
- Mobile-first design. Desktop browser is the target.
- 3D rendering. The 2D plane is the model.
