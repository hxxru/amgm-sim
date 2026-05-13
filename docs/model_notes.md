# Model Notes

## State

A 2D grid of cells, each:

```text
Cell = { r : integer ∈ [0, R_MAX] }    with R_MAX = LEVELS − 1 = 15
```

The grid is `N × N`. `N` is configurable (12–80; default 50). Adjacency is 4-neighbour (von Neumann).

Intrinsic coupling `κ_ij ∈ [0, 1]` lives on edges and is stored sparsely as two 2D arrays:

```text
kappaH[y][x]  = coupling between (x, y) and (x + 1, y)
kappaV[y][x]  = coupling between (x, y) and (x, y + 1)
```

In all v1 presets `κ = 1` uniformly. The structure is kept so future presets can introduce non-uniform substrates.

Vitality:

```text
g(r) = 1 / (1 + exp(−k · (r − r₀)))
```

with `r₀` (sigmoid centre, default 3) and `k` (steepness, default 1.5). `g(r)` is continuous in the integer `r`; `r = 0` → ≈ 0.011, `r = 3` → 0.5, `r = 15` → ≈ 1.

Conservation invariant:

```text
Σ_i r_i + reservoir = totalEnergy        all integers
```

Initial conditions: every cell receives `floor(totalEnergy / N²)` tokens; any rounding remainder lives in the reservoir. So `Σ r_i = (floor(total / N²)) · N²` and `reservoir = total − Σ r_i` at t = 0.

## Tick rule

One tick consists of three phases applied in order. Each "step" advances one phase. The `tick` counter increments at the end of `DROP`.

### 1. SHARE (every tick)

Build an edge list of all H × (W − 1) horizontal + (H − 1) × W vertical edges, shuffle with Fisher–Yates. For each edge `(a, b)` in the shuffled order, with state read in place:

```text
p = α · κ_ab · g(r_a) · g(r_b)
if Bernoulli(p) and r_a ≠ r_b:
  move 1 token from the higher cell to the lower
```

This is bilateral and token-conservative. Cells cannot go below zero because we never move a token from a cell with `r = 0` (the inequality requires `r > 0` on the source side).

Per-edge flow magnitudes are recorded in `edgeFlowH / edgeFlowV` with a decay factor of 0.55 each tick so the canvas can render fading trails.

### 2. DECAY (every tick)

For each cell `i` with `r_i > 0`:

```text
count ~ Binomial(r_i, μ)      (sampled by summing r_i Bernoullis)
r_i      ← r_i − count
reservoir ← reservoir + count
```

This is the only mechanism that removes tokens from cells.

### 3. DROP (every tick, conditional)

```text
M = round(R_MAX / slack), clamped to [1, R_MAX]

if reservoir < M:
  no-op; ticksSinceDrop stays
else:
  (site, source') = nextDropSite(dropSource, rng, H, W)
  primary = site
  visited = { primary };  queue = [ primary ];  remaining = M

  while remaining > 0 and queue not empty (capped at 6M + 32 attempts):
    pop cell c from front of queue
    if r_c < R_MAX:
      amount = min(remaining, R_MAX − r_c)
      r_c += amount
      remaining -= amount
    for each 4-neighbour n of c not yet visited:
      mark visited; push to back of queue

  reservoir -= (M − remaining)
  dropSource := source'
  ticksSinceDrop := 0
  record a drop flash at the primary site
```

BFS spilling means a single drop with large `M` paints a small splash around the primary site rather than wasting tokens if the cell is near-full.

The DropSource abstracts the "where" of each drop; see below.

## DropSource

A `DropSourceState` is a discriminated union (`src/sim/dropSource.ts`):

```text
{ kind: "uniform" }
{ kind: "twin",    sites: [{x,y}, {x,y}], turn: 0|1 }
{ kind: "wander",  x: int, y: int, pStay: number }
```

`nextDropSite(state, rng, H, W) → { site, state' }` advances the source and returns the next site. Each variant has its own clause.

- **uniform**: site is uniform random; state is unchanged.
- **twin**: alternates between `sites[turn]` and `sites[1-turn]`.
- **wander**: with probability `pStay` returns the current `(x, y)`; otherwise moves to a uniformly-chosen 4-neighbour, clamped to the grid.

Adding a new source is a discriminated-union extension + a `case` in the switch; about 20 lines. See `docs/roadmap.md` for queued additions.

## Stability of SHARE

The deterministic-expectation update is `E[Δr] = −L_eff · r` where `L_eff[i, j] = α · κ_ij · g(r_i) · g(r_j)` (off-diagonal) and the diagonal is the row sum. For any cell:

```text
sum of expected out-flow per tick ≤ α · max-degree · max(κ · g²) ≤ α · 4 · 1
```

With `α < 0.25` no overflow can occur. Default `α = 0.15` sits comfortably below the bound. Because the actual rule moves at most one token per edge per tick, the conservation invariant is preserved exactly regardless.

## Relating SHARE to the Laplacian

Define the vitality-weighted Laplacian:

```text
L_w[i, j] = −κ_ij · g(r_i) · g(r_j)              for i ≠ j
L_w[i, i] =  Σ_{j ≠ i} κ_ij · g(r_i) · g(r_j)
```

`L_w` is symmetric and positive semi-definite. Its smallest eigenvalue is 0 with the constant vector as eigenvector; its second-smallest eigenvalue `λ₂` is the Fiedler value.

In the linear (expectation) limit, SHARE acts as `r ← (I − α · L_w) r`. So the relaxation of any component `c_k` along the k-th eigenvector decays per tick by factor `(1 − α · λ_k)`. Adding DECAY (which multiplies `r` by `(1 − μ)` uniformly) compounds:

```text
c_k(t + 1) ≈ (1 − α · λ_k) · (1 − μ) · c_k(t)
```

For the slow mode `k = 2`:

```text
log c_2(t + 1) − log c_2(t) ≈ −α · λ₂ − μ
```

So the slope of `log ‖r⟂(t)‖` per tick is approximately `−α · λ₂ − μ`, and `λ₂ ≈ (−slope − μ) / α`. That's the `gap_fit` displayed in the spectral panel.

## Spectral pipeline

**Active mask.** Cell is "active" iff `g(r_i) ≥ vitalityThreshold` (default 0.2 ⇒ roughly `r ≥ 2`).

**Components.** Flood fill on the active subgraph, treating any edge with `κ > 0` as connecting two active cells. The largest component is the focus for spectral analysis; the count is reported separately.

**Eigensolver.** Two implementations in `src/sim/spectral.ts`:

- `jacobiEigen(L)` — full symmetric eigendecomposition. O(N³). Used for active subgraphs with `N ≤ 150`.
- `fiedlerLanczos(N, matvec, K)` — Krylov method with full reorthogonalisation and constant-mode deflation. O(K · matvec_cost) for the smallest non-trivial eigenpair. Used for larger components.

`makeLaplacianMatvec(indices, coupling, vitalities)` (in `src/sim/graph.ts`) returns a closure that applies `L_w · x` in O(N) using only the sparse neighbour structure.

**Cadence.** λ₂ and φ₂ are recomputed every `recomputeSpectralEvery` share-ticks (default 8). The Fiedler overlay shows the latest snapshot in between recomputes.

## Slope fit

After each SHARE phase the App computes:

```text
mean   = (1 / |C|) · Σ_{i ∈ C} r_i     where C = largest active component
r⟂_norm = sqrt( Σ_{i ∈ C} (r_i − mean)² )
logNorm = log(r⟂_norm)
```

`orthLogNorm` (in `src/sim/spectral.ts`) does this; returns `−Infinity` when the residual norm is zero (which happens during the initial uniform-seed transient).

Samples `{ t, logNorm, sinceEvent }` are pushed into a circular buffer of length `plotWindow`. `sinceEvent` is `ticksSinceDrop` — it resets to 0 whenever a drop fires.

`fitSlope(samples, window)` returns a least-squares slope over the last `window` samples, only if:

- the buffer holds at least `window` samples;
- all samples in the window have finite `logNorm`;
- the most recent sample has `sinceEvent ≥ window` (the entire window post-dates the last drop).

These guards prevent the fit from straddling drop events that would inject a non-exponential transient.

## Performance notes

For 50×50 = 2500 cells:

- SHARE: ~5000 edges per share-tick → a few ms.
- DECAY: 2500 cells × avg `r` ≈ 4 Bernoullis = ~10 000 RNG calls → a few ms.
- DROP: BFS over at most `~10` cells per drop → microseconds.
- Spectral recompute (Lanczos with `K = 40`): ~10 ms.

At default `speed = 18 steps/s` the loop has ~55 ms per phase budget. Plenty of headroom. The perf HUD will flag if we ever bleed into it.

## Reproducibility

`makeRng(seed)` returns a Mulberry32 closure. Persist `seed` somewhere durable (URL hash is the planned escape hatch; not yet implemented). All stochastic phases consume from this same RNG instance, so `(preset, seed, slider state)` together determine the trajectory bit-for-bit.

`scripts/smoke.ts` exercises this: same seed produces same logs across runs.
