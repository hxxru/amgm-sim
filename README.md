# Gridworld Boundary Diagnostics

A starter repo for a lightweight web simulation that makes AM-GM interface signatures visually and computationally intuitive.

The intended app is a single-page interactive gridworld / graph simulation of a finite-state killed Markov process. Users manipulate internal mixing, bridge coupling, killing intensity, barrier height, and cycle length, while simplified AM-GM diagnostics update live.

The project is meant to be a **front-door simulation** for the computational leg of the AM-GM Boundary program, not a full theorem checker or empirical extraction pipeline.

## Core idea

A visible spatial cluster is not automatically an AM-GM interface. A candidate boundary becomes diagnostically meaningful when internal survival dynamics compress on the relevant cycle window and cross-boundary leakage is small in the relevant spectral / survival-weighted coordinates.

The app should let a user discover this by moving sliders:

```text
fast internal mixing + long cycle + weak bridge
→ scalar interface likely

short cycle or slow internal mixing
→ finite-band memory

metastable internal basins
→ basin-interpretable finite-band regime

several retained modes without clean basin semantics
→ cone/vector-valued plural regime

strong bridge leakage
→ boundary integrity compromised
```

## Recommended first milestone

Build an MVP static web app with:

- a small finite graph or grid, preferably 25–64 states;
- three presets: scalar block, one-well finite-band artifact, weak-coupling failure;
- sliders for internal mixing, bridge coupling, killing intensity, and cycle length;
- a gridworld visualization;
- simplified spectral diagnostics;
- a cautious suggested regime label.

## Repository contents

```text
AGENTS.md                         Coding-agent instructions and guardrails
README.md                         Project overview
docs/amgm_context.md              Short AM-GM context packet for implementers
docs/spec.md                      Product/design spec
docs/model_notes.md               Killed Markov model and diagnostic conventions
docs/presets.md                   Preset scenarios and expected behavior
docs/diagnostics.md               MVP diagnostic definitions
docs/ui_copy.md                   Suggested explanatory copy and tooltips
docs/acceptance_criteria.md       MVP acceptance criteria and tests
docs/project_context_packet.md    What context to give coding agents
prompts/coding_agent_prompt.md    First milestone prompt for an agent
assets/whiteboard_sketch.jpg      Whiteboard sketch motivating the layout
src/.gitkeep                      Placeholder for app source
public/.gitkeep                   Placeholder for static assets
```

## Suggested stack

Recommended, but not mandatory:

```text
React + TypeScript + Vite
SVG or Canvas for the gridworld
D3, Plotly, or custom SVG for small plots
A small JS linear algebra library, or symmetric-matrix routines for MVP
```

Keep deployment simple: GitHub Pages, Netlify, or Vercel.

## Non-goals for MVP

- Do not implement the full AM-GM typology.
- Do not build a biological model.
- Do not build a general cellular automaton framework.
- Do not implement Document 3-style estimation from data.
- Do not claim final individuality assignments.

Use diagnostic language such as “scalar interface likely,” “finite-band memory,” or “boundary integrity compromised,” not “this is an individual.”
