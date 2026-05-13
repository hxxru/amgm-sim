# Roadmap

The MVP makes the spectral gap visible and lets the user manipulate it via the slack knob and the choice of DropSource. This document collects the natural next moves so we can resist them while shipping the MVP and have them ready when the MVP is done.

## Phase 2 — More DropSources

The DropSource abstraction is the natural extension point. Each new source is a discriminated-union variant + ~20 lines in `src/sim/dropSource.ts` + a preset entry.

Highest payoff, in order:

- **Hawkes / spatial self-excitation.** Each drop biases the next drop toward its own neighbourhood. State carries `(lastX, lastY, decayedExcitation)`. Site sampled from a Gaussian centred on `(lastX, lastY)` whose σ shrinks as excitation rises. Produces runaway clusters that grow, peak, then collapse when decay catches up.
- **Regime-switching Markov.** Hidden state ∈ {1, …, K}; each state has its own spatial drop distribution (e.g., a centroid + spread). Transitions every tick with a small `p_switch`. The cluster regime visibly *switches* on a slow timescale — Fiedler cut reorients each switch. Closest to the AM-GM picture of multiple basins.
- **State-coupled foraging.** Drop site sampled with weight `∝ (1 − g(r))` — preferentially feed dormant cells. Generates a "feeding front" that migrates across the grid as previously-bright regions decay. Genuinely state-coupled forcing.

Other DropSource ideas, lower priority:

- **Tribe** — drops at N fixed sites, chosen uniformly each drop. Generalises Twin Springs.
- **Lévy flight** — most drops near the previous, occasional long jumps. Heavy-tailed spatial correlation.
- **Periodic** — drop site cycles through a fixed path (e.g., the grid perimeter). Pedagogically odd but a good control.

## Phase 3 — AM-GM diagnostics layer

Re-introduce the AM-GM language as an *interpretive* layer on top of the spectral observables. Hidden behind a toggle so the MVP story is preserved.

- **Compression strength** `λ_2 · Δ` where `Δ` is a user-set cycle length (defaults to fit window).
- **Scalarity defect** from rank-one approximation of a survival-style profile.
- **Retained-mode count K** at a tolerance, surfaced via an eigenmode browser.
- **Leakage ratio** between connected components when there are multiple — quantifies how "almost-disconnected" near-clusters are.
- **Suggested regime label** ("scalar interface likely / finite-band / boundary compromised"), with the cautious copy from `docs/amgm_from_scratch.md`.
- **Basin witness** — heuristic localisation of higher eigenmodes on sub-regions.

## Phase 4 — Substrate variation

Reintroduce non-uniform κ-maps as an optional axis alongside the drop pattern. Composed presets like "Twin Springs on Twin Blocks" (drops alternating between two springs on a substrate with a low-κ ridge between them) get genuinely rich.

- κ slider palette (off / weak / medium / strong) for hand-painted substrates.
- Built-in κ generators: random, blocked, gradient, radial.
- Composability: each preset names a DropSource AND a κ-map generator.

## Phase 5 — User intervention

Move from observer mode to painter mode. Adds engagement, costs some math clarity.

- **Click to drop food** — manual pulses (skip the queue).
- **Click to kill** — force a cell's r to 0.
- **Drag to draw walls** — mark cells with κ_ij = 0 for incident edges.
- **Drag to draw a partition** — user proposes a candidate cut; the app scores it against `φ_2` (cosine similarity) and computes the partition's empirical leakage.

## Phase 6 — Spectral richness

- **Higher modes.** Display `λ_3`, `λ_4`, … and their eigenvectors as alternative tints.
- **Per-component diagnostics.** When components ≥ 2, allow the user to select which component to inspect.
- **Eigenmode browser.** Dropdown to view `φ_k` for any `k ≤ 5`.
- **Time-of-equilibration overlay.** Per-cell estimated time to reach `e⁻¹` of its current deviation from the local mean.

## Phase 7 — Reproducibility and sharing

- **URL state encoding.** `preset + seed + slider state` in the URL hash. Paste a link → reproduce a snapshot.
- **Export run as JSON.** State trajectory + spectral history; analyse in a notebook.
- **Side-by-side comparison.** Two simulations on the same page with synchronised tick.

## Phase 8 — Performance

- **Lanczos in a Web Worker.** Frees the main thread for rendering at large N.
- **Uint8Array for r.** Replaces the per-cell object literal; cuts allocation pressure substantially.
- **Spatial-temporal coarsening for the spectral pipeline.** Downsample to a coarser grid before computing Laplacian if `N > 80`.

## Phase 9 — Estimation from trajectories

The long-horizon item: recover `λ₂` from sampled trajectories (Document 3-style). Beyond the current MVP scope; this is its own conceptual stack.

## Parameters we may want to expose later

Collected here so we don't have to invent them again:

- Asymmetric `κ` per edge direction (e.g., terrain).
- Non-uniform `μ` per cell (some cells are "harder to kill").
- Variable `α` per region (some areas mix faster).
- Resource cap per cell ≠ R_MAX (heterogeneous capacity).
- Variable `T_share / T_decay / T_drop` (the phases fire at different rates).
- Stress events that temporarily raise `μ` globally or locally.
- Configurable initial-condition pulses (start the system from a delta on a chosen cell).

## What we will *not* do

To keep the MVP scope honest, the following are out:

- Real biology / population genetics. The model is intentionally toy.
- Continuous-time stochastic simulation (Gillespie). The discrete tick rule is the whole point.
- "Solving" AM-GM rigorously. This is a pedagogical sandbox.
- Mobile-first design. Desktop browser is the target.
- 3D rendering.
