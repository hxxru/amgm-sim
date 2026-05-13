# Preset Scenarios

The app should open with presets. A blank sandbox is less pedagogically effective.

## Preset A: Well-Mixed Scalar Block

### Setup

Two or three compact clusters. Internal edges are strong. Bridge coupling is weak. Killing is moderate. Cycle length is long enough for compression.

### Expected behavior

Internal probability mass smooths out quickly within clusters. Leading survival mode dominates by `Delta`.

### Expected diagnostics

```text
compression_strength: high
scalarity_defect: low
retained_K: 1 or near 1
leakage_ratio: low
suggested regime: Scalar interface likely
```

### Pedagogical point

A scalar interface value emerges dynamically. It is not assigned just because a spatial cluster exists.

## Preset B: One-Well Finite-Band Artifact

### Setup

One larger cluster with an internal bottleneck or elongated geometry. No clean metastable basin labels. Bridge coupling is zero or low. Cycle length is intermediate.

### Expected behavior

A second mode remains visible, but it reflects intrawell relaxation rather than a meaningful basin structure.

### Expected diagnostics

```text
compression_strength: moderate/low
scalarity_defect: elevated
retained_K: > 1
basin_witness: weak/absent
suggested regime: Finite-band: formal/non-diagnostic
```

### Pedagogical point

Finite-dimensional structure does not automatically imply interpretable interface structure.

## Preset C: Weak-Coupling Failure

### Setup

Two initially scalar clusters joined by a bridge. Bridge coupling slider is emphasized.

### Expected behavior

At low bridge coupling, scalar blocks remain meaningful. As bridge coupling grows, leakage contaminates boundary integrity.

### Expected diagnostics

Low bridge:

```text
leakage_ratio: low
scalarity_defect: low
suggested regime: Scalar interface likely
```

High bridge:

```text
leakage_ratio: high
scalarity_defect: elevated or boundary unstable
suggested regime: Boundary integrity compromised
```

### Pedagogical point

Nonzero coupling is not automatically fatal. Coupling matters relative to internal compression.

## Preset D: Multi-Basin Interpretable 2a, optional

### Setup

One larger candidate block contains two or three metastable basins separated by barriers.

### Expected behavior

Scalar compression fails, but retained modes localize around meaningful basin regions.

### Expected diagnostics

```text
retained_K: > 1
scalarity_defect: elevated
basin_witness: present
suggested regime: Finite-band: basin-interpretable
```

### Pedagogical point

Finite-band memory can be meaningful when it corresponds to basin-local survival structure.

## Preset E: Cycle-Time Transition, optional

### Setup

Use the same spatial system while varying only `Delta`.

### Expected behavior

Short cycle length preserves finite-band memory. Long cycle length produces scalar compression.

### Pedagogical point

Boundary type depends on timescale, not just geometry.
