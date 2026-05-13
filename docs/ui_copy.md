# UI Copy and Tooltips

## Header copy

**Gridworld Boundary Diagnostics**

A four-phase cellular automaton where alive cells share a scarce resource. The simulation runs forward as a clearly readable local rule. Watch the convergence plot collapse to a straight line — its slope is the spectral gap of the current alive subgraph, and the Fiedler-cut contour shows that gap as a soft boundary on the grid.

## Short intro

Each tick, four things happen in order: cells share resources with their alive neighbours; foragers stochastically drop new resource; every few ticks, depleted cells may die; and empty cells with healthy neighbours may be born. Move the sliders to change those rates. The convergence plot and the Fiedler overlay both surface the same number — the spectral gap of the alive-cell graph — as the dynamics evolve.

## Pedagogical anchors

Preferred copy:

```text
The slope of the convergence plot is the spectral gap of the current alive subgraph.
Drag the share-rate slider. The slope flattens, the gap drops.
```

```text
The Fiedler contour marks the slowest direction of internal mixing.
That is where the graph would split if you forced a two-way cut.
```

Avoid (these belong to a later phase):

```text
This is an AM-GM block.
This proves the boundary is real.
This is a scalar interface.
```

## Tooltip text

### Share rate `α`

How aggressively each alive cell averages its resource with its alive neighbours. Higher share rates produce faster equilibration within a connected region.

### Food discovery rate `p_food`

The per-cell, per-tick probability of receiving a resource pulse from a forager event. The only source of new resource in the system.

### Discovery size `ε`

The magnitude of each forager pulse. Larger pulses lift more cells above the birth threshold but also more above the death threshold.

### Death threshold `r_death`

Alive cells with resource below this threshold start dying. The death probability scales with how depleted the cell is.

### Death steepness `β`

The maximum per-(death-tick) probability of dying, achieved when a cell has zero resource.

### Birth threshold `r_birth`

A neighbour counts as "healthy" only if its resource is above this threshold. Empty cells need at least *k* healthy neighbours to be eligible for birth.

### Birth rate `γ`

The per-empty-cell, per-(birth-tick) probability of being born, given that at least *k* healthy neighbours are present.

### Healthy neighbours k

The minimum number of healthy neighbours required for an empty cell to be a birth candidate.

### Speed

Ticks per second. Lower speeds make the four-phase rule easier to read; higher speeds let the spectral plot settle faster.

### Random density

Probability that each cell is initially alive when the Random Scatter preset is reseeded.

## Diagnostic copy

### Spectral gap (Laplacian)

The second-smallest eigenvalue `λ_2` of the symmetric graph Laplacian on the largest connected alive component. Equal to the inverse of the equilibration timescale for resource sharing on that component.

### Spectral gap (fitted)

The slope of the convergence plot, divided by `−α`. After a transient and between birth/death events, this matches the Laplacian gap.

### Convergence plot

`log ‖r⟂(t)‖` versus time, where `r⟂` is the part of the current resource vector orthogonal to the constant mode on the largest connected component. After an initial transient, the plot is a straight line whose slope is `−α · λ_2`.

### Component count

Number of connected components in the alive subgraph. When this is greater than 1, the reported gap refers to the largest component only; the rest of the graph is decoupled from it through the share step.

### Fiedler tint and contour

Each alive cell is tinted by the sign of the second-smallest Laplacian eigenvector `φ_2`. The contour marks edges where neighbouring cells disagree on the sign of `φ_2`. This is the slowest direction of internal mixing — the soft boundary along which resources flow most reluctantly.

## Phase strip labels

```text
SHARE     · every tick · cells average their resource with alive neighbours
DISCOVER  · every tick · foragers may drop a resource pulse
CULL      · slow cadence · depleted cells may die
BIRTH     · slow cadence · empty cells with healthy neighbours may be born
```

Highlight the currently firing phase. CULL and BIRTH fire on a slower cadence (controlled by `T_db`); during the in-between share ticks, the strip shows SHARE / DISCOVER lit and CULL / BIRTH dim.
