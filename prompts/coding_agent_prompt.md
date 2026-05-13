# First Milestone Prompt for Coding Agent

Build an MVP static web app for **Gridworld Boundary Diagnostics**.

Use React + TypeScript + Vite unless there is a strong reason not to.

The app should simulate a small finite-state killed Markov process on a graph/grid. It should include three presets:

1. scalar block;
2. one-well finite-band artifact;
3. weak-coupling failure.

It should expose sliders for:

- internal mixing;
- bridge coupling;
- killing intensity;
- cycle length.

It should visualize the gridworld, compute simplified spectral diagnostics, and display a cautious suggested AM-GM regime.

Do not implement the full AM-GM theory. Use heuristic diagnostics:

- compression strength from the leading spectral gap times cycle length;
- scalarity defect from rank-one survival-profile reconstruction error;
- retained mode count from visible modes;
- leakage ratio from cross-boundary transition weight divided by a gap proxy;
- basin witness as a simple localization heuristic.

Prioritize interpretability and extensibility over mathematical completeness.

Read these files before implementing:

```text
README.md
AGENTS.md
docs/spec.md
docs/amgm_context.md
docs/model_notes.md
docs/diagnostics.md
docs/presets.md
docs/acceptance_criteria.md
```
