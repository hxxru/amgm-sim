# Preset Scenarios

All presets share the 20×20 grid and the four-phase tick. They differ in their initial `alive` mask, initial resource levels, and slider defaults tuned for clarity.

## Preset 1: Random Scatter

### Setup

Each cell is independently alive with probability `p_alive = 0.35`. Initial resource drawn uniformly from `[0.2, 0.8]`.

### Slider defaults

```text
α        = 0.15
p_food   = 0.01
ε        = 0.5
r_death  = 0.2
β        = 0.3
r_birth  = 0.6
γ        = 0.05
k        = 2
r_seed   = 0.5
T_db     = 10
```

### Expected behaviour

For the first 30–60 ticks, isolated alive cells die off (no healthy neighbours) and pockets of denser scatter consolidate into small blobs. The number of connected components decreases over time and then stabilises. The convergence plot is jagged during this transient and may not produce a stable slope fit.

### Pedagogical point

Structure emerges from purely local rules; the user is not asked to draw it.

## Preset 2: Twin Blobs

### Setup

Two compact alive blobs: roughly a 6×6 square centred at `(4,10)` and a 6×6 square centred at `(15,10)`. Joined by a 2-cell-wide neck along row 10 between columns 7 and 12. Initial resource `r = 0.5` everywhere alive.

### Slider defaults

```text
α        = 0.15
p_food   = 0.005     (lower than random scatter; blobs are already fed)
ε        = 0.5
r_death  = 0.15
β        = 0.2
r_birth  = 0.7
γ        = 0.02       (lower; we want topology stable, not growing)
k        = 3
r_seed   = 0.5
T_db     = 20         (slower than random; quasi-static is the point)
```

### Expected behaviour

Topology is essentially fixed for many ticks. Within each blob, resources equilibrate rapidly under the share step; across the neck, equilibration is slow. The convergence plot settles into a clean line within 30 ticks. The Fiedler overlay tints the left blob one colour, the right blob the other, with a contour through the neck.

### Expected diagnostics

```text
λ_2 (computed)       : 0.04–0.08
fitted slope         : matches λ_2 within ~10% after the transient
component count      : 1
Fiedler-cut location : through the neck
```

### Pedagogical point

This is the canonical "watch the gap appear" preset. Dragging share rate `α` down flattens the convergence slope and shrinks the reported gap; dragging it up steepens the slope. Closing the neck (e.g., raising `r_birth` so neck cells die) drops `λ_2` further.

## Preset 3: Single Neck

### Setup

One elongated alive region: a `4 × 15` horizontal bar with an internal pinch at columns 7–8 reduced to a single row. All resource initialised to `r = 0.5`.

### Slider defaults

```text
α        = 0.15
p_food   = 0.005
ε        = 0.5
r_death  = 0.15
β        = 0.2
r_birth  = 0.7
γ        = 0.02
k        = 3
r_seed   = 0.5
T_db     = 20
```

### Expected behaviour

Only one connected component. Internal Laplacian gap is dominated by the long path through the pinch. Convergence plot settles, slope is moderately small. Fiedler vector splits the bar at the pinch, so the contour lies inside a single component.

### Expected diagnostics

```text
λ_2 (computed)       : 0.06–0.10
fitted slope         : matches λ_2 within ~10% after the transient
component count      : 1
Fiedler-cut location : at the pinch
```

### Pedagogical point

Spectral bisection is not about "two clusters" — it is about the slowest direction of internal mixing, which can sit inside a single visible component when the geometry has a bottleneck.

## Preset 4: Archipelago

### Setup

Three or four small disconnected blobs of 6–12 cells each, separated by entirely-empty corridors. Initial resource `r = 0.5`.

### Slider defaults

```text
α        = 0.15
p_food   = 0.005
ε        = 0.5
r_death  = 0.1
β        = 0.2
r_birth  = 0.8       (high; we don't want bridging births in the MVP)
γ        = 0.01
k        = 3
r_seed   = 0.5
T_db     = 30        (very slow; we want stable archipelago)
```

### Expected behaviour

Multiple disconnected components. The Laplacian has multiplicity > 1 at zero. `λ_2` (the second-smallest eigenvalue overall) is therefore also 0, but the MVP reports `λ_2` of the *largest* component, which is well-defined and finite. The component-count badge displays 3 or 4.

### Expected diagnostics

```text
λ_2 (largest comp.)  : depends on the largest blob's shape
component count      : 3 or 4
Fiedler-cut location : inside the largest blob (since the cross-component
                       Fiedler is degenerate, we restrict to the largest
                       component)
```

### Pedagogical point

When the graph already splits, "spectral bisection" reduces to "inside the biggest piece, which way does it want to split?" Disconnection is its own diagnostic, separate from gap size, and the MVP reports both.

## Future presets (not in MVP)

See `docs/roadmap.md`:

- Multi-basin interpretable (two basins inside a single component, sharper than Single Neck).
- Cycle-time transition (same spatial configuration; only `T_db` and `α` vary).
- Forager-driven instability (high `p_food` localised in a corner, demonstrating sustained asymmetry).
