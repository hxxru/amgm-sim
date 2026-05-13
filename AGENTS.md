# AGENTS.md

## Mission

Build a pedagogical web simulation of finite-state killed Markov dynamics on a grid/graph, with simplified AM-GM-inspired diagnostics.

The app is called **Gridworld Boundary Diagnostics**. It should help users see how internal mixing, cycle length, killing, barrier structure, and weak coupling affect whether a candidate block behaves like a scalar interface, a finite-band object, an interpretable basin-valued object, a cone/vector-valued object, or a compromised boundary.

## What you are building

A browser-based interactive simulation with:

1. a left panel showing a gridworld or graph with clusters, bridges, killing zones, and probability mass;
2. a center panel showing spectral/phase diagnostics;
3. a right panel showing an AM-GM diagnostic summary and suggested regime.

## What you are not building

Do **not** implement the full AM-GM theory.

Do **not** claim the app proves or classifies real biological individuality.

Do **not** overbuild the math engine before the UI is usable.

Do **not** import the whole internal memo suite. Use the curated context files in `docs/`.

## First milestone

Implement an MVP with:

- a small graph or grid, 25–64 states;
- three presets:
  - scalar block;
  - one-well finite-band artifact;
  - weak-coupling failure;
- sliders:
  - internal mixing;
  - bridge coupling;
  - killing intensity;
  - cycle length;
- a live gridworld visualization;
- simplified spectral diagnostics;
- a suggested regime label.

## Recommended stack

Use React + TypeScript + Vite unless there is a strong reason not to. Use SVG or Canvas for the gridworld. Use a lightweight plotting approach. For linear algebra, prefer a reliable small-matrix JS library; if not available, simplify the MVP to symmetric generators and use stable routines.

The app should run with standard commands such as:

```text
npm install
npm run dev
npm run build
```

## Modeling convention

Use a finite-state killed Markov generator:

```text
G = Q - diag(kappa)
```

where:

- `Q[i][j] >= 0` for `i != j`;
- `Q[i][i] = -sum_j Q[i][j]`;
- `kappa[i] >= 0`;
- `G[i][i] = Q[i][i] - kappa[i]`.

The survival semigroup is conceptually:

```text
S_Delta = exp(Delta * G)
```

For MVP, exact matrix exponential may be approximated if necessary. The more important requirement is that diagnostics move in the right qualitative direction.

## Diagnostic conventions

Use honest but simplified diagnostics:

- `compression_strength = (a2 - a1) * Delta`, where `a_i = -lambda_i` are decay rates from leading eigenvalues of `G`;
- `scalarity_defect` = relative error of rank-one survival-profile approximation;
- `retained_K` = number of visible modes above a tolerance;
- `leakage_ratio` = cross-boundary transition weight divided by a gap proxy;
- `basin_witness` = present / weak / absent using a simple localization heuristic;
- `suggested_regime` = cautious qualitative label.

Mark simplified quantities as “heuristic” in the UI when appropriate.

## Language rules

Use cautious diagnostic language.

Preferred:

```text
Suggested regime: scalar interface likely.
Reason: internal compression is fast relative to the cycle window.
```

Avoid:

```text
This is an individual.
This proves the boundary is real.
```

## UI priorities

1. Clarity over completeness.
2. Responsiveness over exactness.
3. Explain diagnostic movement when sliders change.
4. Keep formulas available, but hidden behind details/tooltips.
5. Preserve the distinction between visual clusters and dynamic signatures.

## Acceptance criteria

The MVP is successful if:

1. the app loads in a browser;
2. a user can select at least three presets;
3. a user can adjust internal mixing, bridge coupling, killing intensity, and cycle length;
4. the gridworld visualization updates;
5. the diagnostic panel updates;
6. the suggested regime changes in intuitive ways;
7. explanatory text uses cautious diagnostic language;
8. the code is clean enough to extend with better diagnostics later.

## Recommended implementation phases

1. Static graph/grid + sliders + preset switching.
2. Generator construction and sanity checks.
3. Basic eigenvalue/gap diagnostics.
4. Probability heatmap or particle animation.
5. Scalarity defect and retained mode count.
6. Leakage ratio and suggested regime.
7. Tooltips, phase diagram, and pedagogical polish.

## Files to read first

Read these before implementing:

1. `docs/spec.md`
2. `docs/amgm_context.md`
3. `docs/model_notes.md`
4. `docs/presets.md`
5. `docs/diagnostics.md`
6. `docs/acceptance_criteria.md`

The whiteboard sketch in `assets/whiteboard_sketch.jpg` shows the intended visual feel: circled clusters, internal arrows, and weak bridges.
