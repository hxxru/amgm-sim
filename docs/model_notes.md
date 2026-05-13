# Model Notes

## State

A 2D grid of `Cell`s, each:

```text
Cell = {
  alive: boolean
  r:     number  ∈ [0, r_max], 0 if not alive
}
```

The grid is `H × W`, with `H = W = 20` for the MVP. Adjacency is 4-neighbour (von Neumann). The "alive subgraph" is the subgraph of the grid induced by the alive cells.

The resource vector is `r ∈ ℝ^N_+` where `N` is the number of alive cells; rows/columns of any matrix below are restricted to alive cells unless otherwise stated.

## Tick rule

Each tick is exactly four phases, in order:

```text
1. SHARE   (deterministic, every tick)
   For each alive cell i:
     Δr_i = α · Σ_{j alive neighbor of i} (r_j − r_i)
   Then r ← r + Δr.

2. DISCOVER (stochastic, every tick)
   For each cell (alive or empty) independently:
     with probability p_food, r += ε.
     If the cell was empty, it remains empty: only alive cells can hold r.
     (Alternative: discoveries only land on alive cells. The MVP picks the
     "alive only" variant to keep r meaningful and to keep food from
     accumulating on dead cells.)

3. CULL    (stochastic, every T_db ticks; default T_db = 10)
   For each alive cell i with r_i < r_death:
     death_prob = β · (r_death − r_i) / r_death
     With probability death_prob, set alive ← false and r ← 0.

4. BIRTH   (stochastic, every T_db ticks)
   For each empty cell c with at least k alive neighbours j having r_j > r_birth:
     With probability γ, set alive ← true and r ← r_seed.
```

Order matters: `SHARE` smooths first, so the values used by `CULL` and `BIRTH` are already-mixed. `DISCOVER` fires between share and cull so a freshly fed cell can avoid death the same tick. `BIRTH` fires last so it cannot use values produced by its own phase.

### Why the timescale separation?

`CULL` and `BIRTH` fire only every `T_db` share ticks (default 10). This keeps the alive subgraph quasi-static for ~10 share ticks at a stretch, which is what gives the share-step Laplacian a well-defined gap to report. With `T_db = 1` the topology is constantly churning and the convergence plot can never settle into a clean line.

### Stability bound on the share step

The deterministic share is a forward Euler step of the heat equation on the alive subgraph. For stability on a degree-`d_max` graph it must satisfy

```text
α · d_max < 1            (strict bound)
α · d_max < 0.5          (recommended; leaves headroom for boundary effects)
```

For a 4-neighbour grid this means `α < 0.125` is always safe. The MVP defaults to `α = 0.15` — slightly above the strict-square-grid bound but fine in practice because alive cells rarely all have four alive neighbours.

## Alive-subgraph Laplacian

Let `A` be the `N × N` adjacency matrix of the alive subgraph (`A_ij = 1` iff cells `i` and `j` are 4-neighbours and both alive). Let `D = diag(degree)`. The symmetric graph Laplacian is

```text
L = D − A
```

`L` is symmetric positive semi-definite. Its eigenvalues, sorted in increasing order, are

```text
0 = λ_1 ≤ λ_2 ≤ … ≤ λ_N.
```

`λ_1 = 0` is the trivial mode (constant on each connected component). The multiplicity of zero equals the number of connected components.

The MVP cares about `λ_2` and its eigenvector `φ_2` only.

## Relating the share step to `L`

The share update is

```text
Δr = α · (A r − D r) = − α · L r.
```

So `r(t+1) = (I − α L) r(t)`. The principal eigenpair of `(I − α L)` is `(1, φ_1)` (the constant mode), the next is `(1 − α λ_2, φ_2)`, etc. The relaxation toward the principal mode therefore decays per tick like

```text
‖r⟂(t+1)‖ ≈ (1 − α λ_2) · ‖r⟂(t)‖
```

Taking logs, after `t` ticks of pure sharing,

```text
log ‖r⟂(t)‖ ≈ log ‖r⟂(0)‖ + t · log(1 − α λ_2)
            ≈ log ‖r⟂(0)‖ − t · α λ_2     for small α λ_2.
```

This is the line the convergence plot fits. The slope is `−α λ_2`. The "gap" reported on screen is normalised back to `λ_2 = −slope / α`.

## Computing `λ_2` and `φ_2`

For the MVP, `N` is at most 400 and typically 80–200 (depending on alive density). Two acceptable approaches:

1. **Full Jacobi eigendecomposition** of the dense `L`. Already implemented in `src/model/eigen.ts` from the previous MVP; reuse. `O(N^3)`, fine at this scale.
2. **Shift-invert power iteration** for the smallest non-zero eigenpair, deflating against the constant mode (or against the indicator of each connected component if there are several). Cheaper if `N` grows.

The MVP can ship with (1); upgrade to (2) only if profiling shows a hot path.

Recompute on a cadence (default every 5 share ticks). Keep the previous `φ_2` around so the canvas does not flicker between updates.

## Connected components

Compute components by flood fill on the alive subgraph each time `λ_2` is recomputed. The MVP reports `λ_2` for the *largest* component only; the side panel displays the total component count so a viewer can interpret a sudden drop to ~0 when the graph splits.

## `r⟂(t)` tracker

After each share tick, compute

```text
r̄    = (1/N) Σ_i r_i              (over alive cells in the largest component)
r⟂   = r − r̄ · 1
samp = log ‖r⟂‖
```

Push `samp` into a circular buffer of length `W_fit` (default 60). Fit a least-squares line over the buffer; report the slope, multiplied by `−1 / α`, as the live gap estimate. Drop the fit (display "—") when:

- the buffer is not yet full;
- the residual variance is large (the system is still in the transient);
- a CULL or BIRTH phase fired within the buffer window — those events break the linear regime.

## Numerical and reproducibility notes

- Use a seedable PRNG (`src/sim/rng.ts`). Persist the seed in the URL hash so a snapshot is reproducible.
- All stochastic phases must consume from the same RNG; do not call `Math.random()` directly.
- The share update is deterministic; identical state and identical seed therefore give identical trajectories.
- Cull and birth fire only every `T_db` ticks, so the slope-fit window must be at least `T_db + W_fit` ticks long to give a clean stretch of pure share dynamics between births/deaths.
