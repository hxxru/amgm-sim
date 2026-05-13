# Preset Scenarios

All v1 presets share the same substrate (uniform `κ = 1` on the configured `N × N` grid) and the same initial condition (`r = floor(total / N²)` per cell, with any rounding remainder in the reservoir). They differ **only in the DropSource** — the stochastic process that chooses where each drop lands. This isolates one variable: the spatiotemporal pattern of the forcing.

The headline pedagogical lever for every preset is **slack**:

- High slack → `M_drop` small → tokens dispersed across many cells → most cells stay above vitality threshold → one connected active component → moderate `λ₂`.
- Low slack → `M_drop` large → tokens concentrated → most cells decay below threshold → fragmented dormant landscape with hot islands → small `λ₂` per island and `components ≥ 2`.

## Preset 1: Uniform Drops

### DropSource

```text
{ kind: "uniform" }
nextDropSite: uniform random over all cells, iid each drop.
```

No spatial or temporal correlation.

### Expected behaviour

The null hypothesis. Tokens get scattered uniformly over time. With μ small relative to drop rate, the grid stays near its initial uniform state; with μ large, you see a noisy bath of randomly-bright cells. No coherent cluster ever forms.

### Expected diagnostics at defaults

```text
components       : 1 (one big component covering most of the grid, with
                   transient holes where decay temporarily wins)
λ₂ (Laplacian)   : ~0.005–0.015 — dominated by uniform-grid geometry,
                   not by any cluster structure
gap (fitted)     : approximately matches λ₂ when fit window is clean
Fiedler contour  : a roughly straight bisection of the grid, drifting
                   over time as noise reshuffles φ_2
```

### Pedagogical point

Tokens *flowing freely* and *being deposited randomly* aren't enough to make individuality structure. You need correlation in the forcing — or pre-existing substrate structure — for a cluster to crystallise.

## Preset 2: Twin Springs

### DropSource

```text
{ kind: "twin",
  sites: [(W·0.25, H/2), (W·0.75, H/2)],
  turn:  0 | 1 }
nextDropSite: alternates strictly between sites[0] and sites[1].
```

### Expected behaviour

At default slack ≈ 1.5, the alternation feeds the same neighbourhood every two ticks; a coherent cluster forms around each spring. The two clusters compete: if slack is high enough that drops spread tokens across many cells (M small), the two clusters merge into one connected medium. If slack is low (M large, ~14–15), each drop dumps near-saturation onto its spring's local cell and the rest of the grid decays into dormancy → two isolated islands.

### Expected diagnostics at defaults

```text
components       : 1 at moderate slack, 2 at low slack
λ₂ (Laplacian)   : 0.003–0.02 depending on slack
Fiedler contour  : runs near the vertical midline of the grid,
                   bisecting the two clusters when they're distinct
```

### Pedagogical point

Two periodically-fed sites are the simplest spatially-correlated forcing. The merge/split transition as slack changes is the canonical pedagogical demo: drag slack and watch the count switch.

## Preset 3: Wandering Source

### DropSource

```text
{ kind: "wander", x: floor(W/2), y: floor(H/2), pStay: 0.5 }
nextDropSite:
  with probability pStay → return (x, y)
  else                    → step to a uniformly-chosen 4-neighbour
                             (clamped to the grid)
```

The drop site is a random walk on the grid with average step length `(1 − pStay)`.

### Expected behaviour

A single coherent cluster forms around the current source location and drifts as the source walks. At low slack, the cluster is intense but moves slowly relative to its decay timescale, so it leaves a slowly-fading trail behind. At high slack the cluster is more diffuse and the trail blurs out.

### Expected diagnostics at defaults

```text
components       : 1 — single moving cluster
λ₂ (Laplacian)   : varies smoothly as the cluster's shape changes
Fiedler contour  : tracks the drift direction; oriented perpendicular
                   to the cluster's motion (the "in front of" vs
                   "behind" halves of the moving cluster)
```

### Pedagogical point

The spectral structure isn't an immutable property of the grid; it's an immutable property of the *current dynamics*. As the cluster moves, `λ₂` and `φ_2` smoothly move with it.

## Tuning notes

For all presets, the key parameter triplet is `(slack, α, μ)`:

- **Slack** controls drop magnitude and therefore spatial concentration.
- **α** controls how fast tokens flow between cells given a heightdifference. High α → equilibration faster than decay → clusters spread out.
- **μ** controls how fast unspent tokens leave cells. High μ → fast turnover → small steady-state `Σ r`.

If you want **sharper** clusters: lower slack (bigger drops) and lower α (slower sharing) and higher μ (faster decay outside the drop region).

If you want **smoother** clusters: higher slack (smaller drops) and higher α (faster sharing) and lower μ (slower decay).

## Future presets (not in v1)

See `docs/roadmap.md`. Queued for v2:

- **Hawkes** — spatial self-excitation: each drop biases the next toward its neighbourhood; clusters grow runaway.
- **Regime-switching Markov** — hidden state ∈ {1, …, K}; each state has its own spatial drop distribution; transitions slowly. Most "AM-GM-like" preset — multiple basins with interpretable regime semantics.
- **Foraging** — drops biased toward low-`g(r)` (dormant) cells; the cluster migrates as a feeding front.
