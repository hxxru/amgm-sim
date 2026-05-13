# Diagnostics

This document defines simplified diagnostics for the MVP. These are pedagogical proxies, not final AM-GM theorem-level definitions.

## Compression strength

Compute leading decay rates `a1`, `a2` from eigenvalues of `G`.

```text
compression_strength = (a2 - a1) * Delta
```

Interpretation:

```text
large  → leading survival mode dominates by cycle time
small  → finite-band memory may remain
```

## Scalarity defect

Use a rank-one approximation error.

Conceptual steps:

1. Compute survival profile `q = exp(Delta * G) * ones`.
2. Compute principal eigenvector `phi1`.
3. Project `q` onto `phi1`.
4. Compute relative residual error.

```text
scalarity_defect = norm(q - projection_onto_phi1(q)) / norm(q)
```

Interpretation:

```text
low   → scalar interface likely
high  → scalar compression fails or is incomplete
```

Label as “heuristic scalarity defect” in the UI.

## Retained mode count

Count modes visible relative to the principal mode at time `Delta`.

One simple rule:

```text
mode_i_visible if exp(-(a_i - a_1) * Delta) > tolerance
```

Then:

```text
retained_K = number of visible modes
```

Interpretation:

```text
K = 1      → scalar candidate
K > 1      → finite-band memory
```

## Band defect

If retained modes are computed, measure reconstruction error using the first `K` modes.

```text
band_defect = norm(q - reconstruction_using_K_modes) / norm(q)
```

This can be deferred if scalarity and `retained_K` are enough for MVP.

## Leakage ratio

MVP proxy:

```text
raw_leakage = sum of transition weights crossing candidate block boundaries
leakage_ratio = raw_leakage / max(gap_proxy, small_number)
```

Where `gap_proxy` can be the average within-block compression gap or a global gap.

Interpretation:

```text
low   → boundary perturbatively stable, heuristically
high  → boundary integrity compromised, heuristically
```

Label as “heuristic leakage ratio.”

Later versions can replace this with projected leakage into nonprincipal directions.

## Basin witness heuristic

The MVP can use a simple localization rule.

Possible heuristic:

```text
if retained_K > 1 and retained modes are spatially localized in distinct subregions:
    basin_witness = present
elif retained_K > 1:
    basin_witness = weak/absent
else:
    basin_witness = not applicable
```

This is intentionally rough. The app should present it as a diagnostic suggestion.

## Readout sensitivity proxy

Optional for MVP.

Sample several simple readouts, such as:

- total mass in left cluster;
- total mass in right cluster;
- mass near killing zone;
- basin-specific mass.

Rank a set of sampled survival states. If rankings vary strongly across readouts, mark readout sensitivity high.

This can support the “cone/vector-valued plural regime” label in later versions.

## Suggested regime decision tree

Simple MVP decision tree:

```text
if leakage_ratio is high:
    Boundary integrity compromised

else if scalarity_defect is low and compression_strength is high:
    Scalar interface likely

else if retained_K > 1 and basin_witness is present:
    Finite-band: basin-interpretable

else if retained_K > 1 and basin_witness is weak/absent:
    Finite-band: formal/non-diagnostic

else:
    Ambiguous / transition zone
```

The thresholds should be adjustable constants, not hard-coded magic throughout the app.
