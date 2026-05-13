# UI Copy and Tooltips

## Header copy

**Gridworld Boundary Diagnostics**

A spatial killed-process sandbox for exploring when candidate blocks behave like scalar AM-GM interfaces, finite-band signatures, or compromised boundaries.

## Short intro

This simulation shows a small system with local mixing, killing/failure, and weak bridges between clusters. Move the sliders to see how internal compression, cycle length, and boundary leakage change the diagnostic signature.

## Suggested-regime copy

Use cautious language:

```text
Suggested regime: Scalar interface likely
```

Do not say:

```text
This is an individual
```

## Reason templates

### Scalar interface likely

Internal compression is fast relative to the cycle window, and boundary leakage is low.

### Finite-band formal/non-diagnostic

More than one survival mode remains visible, but the retained structure does not align with a clear basin witness.

### Finite-band basin-interpretable

More than one survival mode remains visible, and retained modes appear localized around basin-like regions.

### Cone/vector-valued plural regime

Several retained directions matter and rankings are sensitive to the chosen readout.

### Boundary integrity compromised

Cross-boundary leakage is large relative to the internal compression scale.

### Ambiguous / transition zone

The current parameters lie near a diagnostic boundary. Small changes in tolerance, readout, or cycle length may change the suggested regime.

## Tooltip text

### Internal mixing

How quickly probability moves within a cluster. Higher internal mixing usually helps a block compress to a scalar interface value.

### Bridge coupling

How strongly probability leaks between candidate blocks. Coupling is not automatically fatal, but large leakage can compromise boundary integrity.

### Killing intensity

How strongly states are removed by failure or viability loss.

### Cycle length Δ

The time window over which the system must internally compress before being evaluated from outside.

### Compression strength

The spectral gap between the leading survival mode and the next mode, multiplied by the cycle length. Larger values mean stronger scalar compression.

### Scalarity defect

A heuristic measure of how much of the survival profile is missed by a one-mode approximation.

### Retained modes

The number of survival modes still visible on the cycle window.

### Leakage ratio

A heuristic measure of cross-boundary coupling relative to internal compression.

### Basin witness

A rough indication of whether retained modes correspond to localized basin-like regions.
