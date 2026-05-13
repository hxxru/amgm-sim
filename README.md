# Gridworld Boundary Diagnostics

A 2D cellular automaton in which alive cells share a scarce resource, are stochastically fed by foragers, and die or birth in proportion to local resource health. The simulation runs forward as a clearly readable local rule. The pedagogical payoff is that the **spectral gap** of the alive-cell graph becomes visible — first as an emergent equilibration timescale, then as a rough boundary painted on the gridworld plane.

This is the **front door** for a longer-term program (the AM-GM Boundary program; see `docs/amgm_context.md`, `docs/amgm_from_scratch.md`). The MVP does not implement AM-GM diagnostics. It earns the right to talk about spectral gaps first.

## What the user sees

Three synchronized regions:

- **Center (the gridworld):** a 20×20 canvas. Each cell is empty, or alive with a continuous resource level rendered as heat. As the simulation runs, cells share resources with alive neighbors, foragers drop pulses of resource, and birth/death slowly reshape the alive subgraph. Once a Fiedler-cut overlay is enabled, the cells are tinted on either side of a soft contour that marks the slowest direction of internal mixing.
- **Right (the convergence plot):** a small live chart of `log ‖r⟂(t)‖` versus time — the part of the resource vector orthogonal to the principal mode. After a transient, it traces a straight line whose slope is the spectral gap. The fitted slope is reported alongside the plot.
- **Left (controls):** preset selector, random-initialization density, sliders for share rate, food discovery rate, death threshold, birth threshold, and a global speed control.

A "phase strip" along the bottom of the canvas lights up one of four labels each tick — **share / discover / cull / birth** — so the rule is visible while it runs.

## The CA rule, in four phases per tick

```text
1. SHARE   (deterministic, every tick)
   r_i ← r_i + α · Σ_{j alive neighbor of i} (r_j − r_i)

2. DISCOVER (stochastic, every tick)
   each cell: with probability p_food, r_i += ε

3. CULL    (stochastic, every T_db ticks; T_db ≈ 10)
   each alive cell with r < r_death:
     die with probability β · (r_death − r) / r_death

4. BIRTH   (stochastic, every T_db ticks)
   each empty cell with ≥ k alive neighbors having r > r_birth:
     born with probability γ; new r = r_seed
```

Birth and death fire on a slower cadence than sharing so the alive subgraph is quasi-static for ~10 share ticks at a stretch. That separation of timescales is what makes the spectral picture stable enough to point at.

## Where the spectral gap comes from

The **share** step alone is a linear update on the resource vector restricted to the alive subgraph. It is governed by the graph Laplacian `L` of that subgraph. Its smallest eigenvalue `λ_1 = 0` corresponds to the constant mode (and is degenerate when there are multiple connected components). The next eigenvalue `λ_2` is the **Fiedler value**, equal to the spectral gap, and its eigenvector `φ_2` is the **Fiedler vector** — positive on one half of the (largest) component and negative on the other.

The MVP reports `λ_2` two ways at once:

- as a number, computed periodically from the current alive subgraph;
- as a slope, fitted live to the convergence plot.

Agreement between the two — and the way both move when sliders move — is the pedagogical point.

## Suggested stack

```text
React + TypeScript + Vite
HTML5 Canvas for the gridworld (faster than SVG at 400 cells × 60 fps)
A small symmetric eigensolver for the smallest two eigenvalues of L
```

Deployment is GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

## Non-goals for the MVP

- Do **not** implement AM-GM diagnostics (compression strength, scalarity defect, leakage ratio, regime labels). Those belong to a later phase; see `docs/roadmap.md`.
- Do **not** support user click-to-paint interventions in the MVP. Observer mode only.
- Do **not** support arbitrary partitioning by the user. The only partition shown is the Fiedler cut.
- Do **not** chase realism beyond what the rule already encodes. This is a math sandbox, not an ecology simulator.

## Repository contents

```text
AGENTS.md                         Coding-agent instructions and guardrails
README.md                         Project overview (this file)
docs/spec.md                      Product/design spec for the CA
docs/model_notes.md               CA rule, Laplacian, Fiedler conventions
docs/diagnostics.md               Spectral diagnostics (gap, convergence fit)
docs/presets.md                   Preset configurations and expected behavior
docs/acceptance_criteria.md       MVP acceptance criteria and tests
docs/ui_copy.md                   Suggested explanatory copy and tooltips
docs/roadmap.md                   Phase 2+ features and future parameters
docs/amgm_context.md              Long-term AM-GM context (future phase)
docs/amgm_from_scratch.md         Long-form AM-GM primer (future phase)
docs/project_context_packet.md    Context briefing for coding agents
prompts/coding_agent_prompt.md    First milestone prompt (now stale; see spec.md)
assets/whiteboard_sketch.jpg      Whiteboard sketch motivating the layout
src/                              App source
public/                           Static assets
```
