# AM-GM Context for Implementers

This is the minimum conceptual background needed to build the simulation. The coding agent should not need the full internal document suite.

## Program idea

The AM-GM Boundary program studies when local viability dynamics can be aggregated across boundaries.

Inside a block, if internal compensation or mixing occurs before the relevant outer cycle window, the block may compress to a positive scalar interface value. Across blocks whose failures or viability constraints are non-transferable, scalar interface values combine geometrically.

When scalar compression fails but a finite band of survival modes remains, the interface is no longer just one number. It may be:

- basin-interpretable, if retained modes correspond to meaningful metastable basins;
- formal but non-diagnostic, if finite-band structure exists without interpretability;
- cone/vector-valued, if comparisons depend on an admissible readout or partial order.

Weak coupling does not automatically destroy a boundary. It matters when leakage is large relative to internal compression or when survival-weighted product composition is disrupted.

## Core lesson for this app

A spatial cluster is not automatically an AM-GM boundary. The app should teach that a candidate boundary is diagnostic only when internal dynamics and timescales support it.

## Key concepts

### Killed process

A Markov process with absorbing failure or killing. In finite-state form:

```text
G = Q - diag(kappa)
```

where `Q` moves probability between states and `kappa` removes probability through killing/failure.

### Cycle length Δ

The time window over which the system must internally compress before being evaluated from outside.

### Scalar compression

A block behaves like one positive number when the leading survival mode dominates by time `Δ`.

A useful diagnostic is:

```text
compression_strength = (a2 - a1) * Delta
```

Large compression strength suggests scalar behavior.

### Finite-band memory

If the second, third, or later modes remain visible on the cycle window, the block retains finite-dimensional internal memory. It should not be treated automatically as one scalar.

### Basin witness

Finite-band structure is interpretable when retained modes correspond to meaningful metastable basins or basin-local survival profiles.

### Formal-cone non-diagnostic

Finite-band structure may exist mathematically without a meaningful basin interpretation. The simulation should include this as a distinct teaching case.

### Cone/vector-valued pluralism

Some finite-band systems may have structural partial orders but no canonical scalar ranking. Different admissible readouts can rank states differently.

### Weak-coupling integrity

Boundaries can leak. Coupling matters when cross-boundary leakage is large relative to internal compression. The MVP can use a heuristic leakage ratio.

## What not to say

Do not say “this is an individual.”

Say “this partition currently supports a scalar interface signature,” or “this configuration currently suggests finite-band memory.”

## Minimal notation glossary

```text
G        killed generator
Q        transition generator
kappa    killing / failure rate
Delta    cycle length
a_i      decay rates, usually a_i = -lambda_i
K        retained band dimension
eps_scalar   scalarity defect
eps_band     band defect
R        admissible readout class
C        compatibility data
J        dynamic regime label
```

## Extended introduction

For a fuller, from-scratch explanation of the AM-GM Boundary program and how it maps to the gridworld simulator, read [`amgm_from_scratch.md`](./amgm_from_scratch.md). That file is the recommended first context document for coding agents before they implement diagnostics.

