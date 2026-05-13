# UI Copy and Tooltips

## Header copy

**Gridworld Boundary Diagnostics**

A token-quantised cellular automaton where alive cells share a scarce resource. The simulation runs forward as a clearly readable local rule. Watch the convergence plot collapse to a straight line — its slope is the spectral gap of the current alive subgraph, and the Fiedler-cut contour shows that gap as a soft boundary on the grid.

## Short intro

Each tick, three things happen in order: **share** (tokens move between adjacent alive cells with a probability that grows with both cells' vitality), **decay** (each token in each cell has a small probability of evaporating into the reservoir), and **drop** (when the reservoir reaches `M_drop` tokens, dispense them at a site chosen by the current source). Energy is exactly conserved: `Σ tokens-in-cells + reservoir = total`.

Drag the **Slack** slider to change how concentrated each drop is. The diagnostics — convergence plot, λ₂, component count — respond visibly.

## Pedagogical anchors

Preferred copy:

```text
The slope of the convergence plot is the spectral gap of the current
alive subgraph. Drag the share-rate slider. The slope flattens, the
gap drops.
```

```text
The Fiedler contour marks the slowest direction of internal mixing.
That is where the graph would split if you forced a two-way cut.
```

```text
High slack → small drops scattered widely → tokens reach the whole
grid → one connected cluster.
Low slack → big bursts dumped at one place → most of the grid decays
into dormancy → the active component fragments.
```

Avoid (Phase 3 vocabulary; deferred until the AM-GM layer is back):

```text
This is an AM-GM block.
This proves the boundary is real.
This is a scalar interface.
Boundary integrity compromised.
```

## Tooltip text

### Slack

Drop magnitude knob. `M_drop = round(15 / slack)`. High slack → small drops → tokens scattered across many cells → one big cluster. Low slack → big drops → tokens concentrated → grid fragments.

### Share rate α

How aggressively each alive cell averages its resource with its alive neighbours. Higher α → faster equilibration within a connected region. Each edge fires with probability `α · κ_ij · g(r_i) · g(r_j)` per tick.

### Decay μ

Per-tick, per-token probability of evaporating into the reservoir. Higher μ → faster turnover, smaller steady-state token count in cells.

### Speed

Phase-steps per wall-clock second. Each tick has three phases (SHARE, DECAY, DROP), so 18 steps/s ≈ 6 ticks/s. Use lower speed to read individual phases; higher to settle the convergence plot quickly.

### Vitality r₀

Token count at which a cell is half-engaged (sigmoid centre). Cells with `r ≥ r₀` are mostly active; cells with `r ≤ r₀` are mostly dormant.

### Vitality k

Steepness of the vitality sigmoid in token units. Larger k → sharper on/off behaviour around r₀.

### Active threshold

Minimum vitality `g(r)` for a cell to count as "active" in the spectral diagnostics. Below threshold, the cell is invisible to the Laplacian and Fiedler computation.

### Grid size N

Side length of the square grid. Larger → richer cluster shapes but heavier compute. Takes effect on next Reset / preset change.

### Avg tokens / cell

Average tokens per cell at initialisation. Total energy = `round(this × N²)`. Takes effect on next Reset / preset change.

### Spectral cadence

Number of share-ticks between recomputes of λ₂ and φ₂. Smaller = more responsive Fiedler overlay; larger = cheaper.

### Fit window

Number of recent samples used to fit the convergence-plot slope. Must be smaller than the typical interval between drop events for the fit to ever land.

### Plot window

Maximum number of samples drawn on the convergence plot.

## Diagnostic copy

### λ₂ (Laplacian)

Second-smallest eigenvalue of the vitality-weighted Laplacian on the largest connected active component. Equal to the inverse of the equilibration timescale for token-sharing on that component.

### gap (fitted)

Slope of the convergence plot, corrected for per-tick decay: `(−slope − μ) / α`. After a transient and between drop events, this matches the Laplacian gap.

### disagreement %

`|gap_fit − λ₂| / λ₂`. Small (< 10 %) when the system is in the linear regime and the fit window is clean.

### components

Number of connected components in the active subgraph. When this is greater than 1, the reported gap refers to the largest component only; the rest of the graph is decoupled from it through the SHARE step. The "split" badge appears at 2+ as a visual cue.

### fit R²

Coefficient of determination for the slope fit. Close to 1 → strong linear regime; lower → noisy or out of the slow-mode regime.

### total / reservoir / M_drop / τ_drop / active cells

Energy budget. Total is invariant by construction. Reservoir is what's queued for future drops. M_drop and τ_drop are the magnitude and expected frequency of drops at steady state. Active cells is the count above vitality threshold.

## Phase strip labels

```text
SHARE     stochastic per-edge token transfer
DECAY     Binomial(r_i, μ) per cell, tokens to reservoir
DROP      dispense M tokens at the DropSource's chosen site
```

The currently firing phase is highlighted in accent colour each step.

## DropSource descriptions (in preset cards)

```text
Uniform Drops
  Drops at iid uniform random cells. No spatial or temporal
  correlation — the null hypothesis. With uniform κ, no cluster
  should form: tokens stay broadly distributed.

Twin Springs
  Drops alternate strictly between two fixed cells. Two competing
  clusters: when slack is small they merge into one connected
  medium; when slack is large they stay as separate hot spots with
  the rest of the grid dormant.

Wandering Source
  Drop site does a random walk on the grid (p_stay = 0.5). A single
  cluster forms and follows the drifting source. Watch the Fiedler
  contour migrate with it.
```

## Perf HUD copy

```text
60 fps · 18/18 steps/s · ok
60 fps · 11/18 steps/s · lagging
```

The HUD shows the previous second's average. "lagging" appears when actual is below 85 % of target.

## App footer

```text
Σ r + reservoir = total energy is invariant by construction.
Drops are the only randomness in DROP; SHARE and DECAY are
stochastic at the per-edge / per-token level. Cascade speed
matches α · λ₂ of the current weighted Laplacian.
```
