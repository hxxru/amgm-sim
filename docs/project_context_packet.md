# Project Context Packet for Coding Agents

This file describes what project context a coding agent should receive when picking up work on the **Gridworld Boundary Diagnostics** simulation.

## Give the coding agent

For the MVP (Phase 1: spectral gap discovery via a four-phase CA):

1. This starter repo.
2. `README.md` for the overall framing.
3. `AGENTS.md` for the build mission and guardrails.
4. `docs/spec.md` for the product/design spec.
5. `docs/model_notes.md` for the CA tick rule and Laplacian conventions.
6. `docs/diagnostics.md` for the spectral observables.
7. `docs/presets.md` for the preset configurations.
8. `docs/acceptance_criteria.md` for the test checklist.
9. `docs/ui_copy.md` for tooltips and pedagogical phrasing.
10. `docs/roadmap.md` only as a "what we are not building yet" reference.

For Phase 3 work (AM-GM diagnostics layer), additionally:

- `docs/amgm_context.md` and `docs/amgm_from_scratch.md` as the conceptual destination.

## Do not give the coding agent

While building the MVP:

- The full AM-GM monograph.
- The full finite-band typology paper.
- The full internal memo suite.
- The full proof of readout rigidity.
- Philosophical positioning documents.
- Anything from `docs/amgm_*.md` — those are deliberately Phase 3 context, not MVP context.

The agent should build a pedagogical CA sandbox that surfaces the spectral gap, not become the theorist.

## Context length target

The total MVP context packet should be about 8–12 pages equivalent:

```text
1. README.md
2. AGENTS.md
3. docs/spec.md
4. docs/model_notes.md
5. docs/diagnostics.md
6. docs/presets.md (skim)
7. docs/acceptance_criteria.md (skim)
8. docs/ui_copy.md (reference)
9. assets/whiteboard_sketch.jpg
```

The Phase 3 packet adds `docs/amgm_context.md` and `docs/amgm_from_scratch.md`.
