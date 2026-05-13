# Model Notes

## Finite-state killed process

Use a finite graph or grid with `N` states. The system is represented by a killed generator:

```text
G = Q - diag(kappa)
```

where:

- `Q[i][j] >= 0` for `i != j`;
- `Q[i][i] = -sum_{j != i} Q[i][j]`;
- `kappa[i] >= 0`;
- `G[i][i] = Q[i][i] - kappa[i]`.

The survival semigroup is conceptually:

```text
S_Delta = exp(Delta * G)
```

and the survival profile from a uniform initial/readout vector can be approximated by:

```text
q = S_Delta * ones
```

## Recommended MVP construction

Use symmetric edge weights for numerical stability.

Each node:

```text
id
x, y
clusterId
baseKilling
currentMass
```

Each edge:

```text
source
target
baseWeight
type: internal | bridge | bottleneck
```

Construct rates from sliders:

```text
internal edge weight = baseWeight * internalMixing
bridge edge weight = baseWeight * bridgeCoupling
bottleneck edge weight = baseWeight / barrierHeight
killing = baseKilling * killingIntensity
```

## Eigenvalue convention

For a killed generator `G`, leading eigenvalues are negative or nonpositive. Sort eigenvalues from largest to smaller:

```text
lambda_1 > lambda_2 > lambda_3 > ...
```

Define decay rates:

```text
a_i = -lambda_i
```

Then the compression gap is:

```text
gap = a_2 - a_1
compression_strength = gap * Delta
```

Large compression strength suggests rank-one scalar compression by time `Delta`.

## Matrix exponential

Preferred: use a reliable small-matrix library for `exp(Delta * G)`.

Acceptable MVP fallback:

- approximate probability animation with Euler steps;
- compute diagnostics from eigenvalues/eigenvectors;
- use a simple spectral reconstruction if `G` is symmetric.

## Block partition

Use cluster IDs as candidate blocks. Bridge edges are edges crossing cluster IDs.

For the MVP, the block partition is supplied by the preset. Later versions can allow user-drawn partitions.

## Performance

Keep `N <= 64` for real-time interaction.

Debounce expensive recomputation if needed. The animation can update more often than the diagnostics.
