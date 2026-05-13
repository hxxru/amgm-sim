# Gridworld Boundary Diagnostics — Product Spec

## Purpose

Create a lightweight web simulation that lets users manipulate a spatial/gridworld system of coupled clusters and immediately see simplified AM-GM boundary diagnostics.

The app is a pedagogical front door. It should make the AM-GM boundary idea visible, not implement the entire research program.

## Core layout

Use a single-page layout with three synchronized regions.

### Left panel: gridworld / cluster simulation

A 2D grid or graph with:

- visible clusters or candidate blocks;
- internal transition links;
- weak bridge links between clusters;
- killing/failure zones;
- probability mass heatmap or particles;
- optional candidate block outlines.

### Center panel: phase / spectral diagnostics

At MVP level:

- eigenvalue or decay-rate bars;
- compression strength indicator;
- maybe a compression-vs-leakage phase plot.

### Right panel: signature summary

Show:

```text
Suggested regime
Reason
Compression strength
Scalarity defect
Retained mode count
Leakage ratio
Basin witness
```

Keep it readable. Formulas should be available in tooltips or details sections.

## Main controls

### Sliders

- Internal mixing
- Bridge coupling
- Killing intensity
- Cycle length Δ
- Barrier height / basin separation, optional for MVP
- Disorder/noise, optional for MVP

### Toggles

- Show probability heatmap
- Show particles
- Show candidate block boundaries
- Show killing zones
- Show eigenmodes
- Show advanced diagnostics

## Presets

MVP presets:

1. Scalar block
2. One-well finite-band artifact
3. Weak-coupling failure

Optional next presets:

4. Multi-basin interpretable 2a
5. Generic cone/vector-valued pluralism
6. Cycle-time transition

## Regime labels

Use cautious suggested-regime language:

```text
Scalar interface likely
Finite-band: formal/non-diagnostic
Finite-band: basin-interpretable
Cone/vector-valued plural regime
Boundary integrity compromised
Ambiguous / transition zone
```

Do not use definitive ontology claims.

## MVP requirements

The MVP should include:

- one-page browser app;
- small graph/grid, 25–64 states;
- preset selector;
- internal mixing slider;
- bridge coupling slider;
- killing intensity slider;
- cycle length slider;
- gridworld visualization;
- spectral/compression diagnostic;
- scalarity defect diagnostic;
- heuristic leakage ratio;
- suggested regime label.

## Deferred features

Do not implement in MVP:

- full Doc 2 signature object;
- rigorous cone-comparability;
- Feynman-Kac product defect;
- Active Inference / FEP crosswalk;
- estimation from trajectories;
- user-drawn partitions;
- high-dimensional systems.
