# Project Context Packet for Coding Agents

This file describes what project context a coding agent should receive when picking up work on the **Gridworld Boundary Diagnostics** simulation.

## What is being built

A token-quantised cellular automaton on a 50×50 (configurable 12–80) square grid. Each cell holds an integer token count `r ∈ {0, …, 15}`. Three phases per tick (`SHARE / DECAY / DROP`) move tokens around with exact integer conservation. Drops are placed by a configurable stochastic process (DropSource). The spectral gap of the vitality-weighted Laplacian of the largest active component is surfaced two ways: a Fiedler-cut overlay on the grid and a live slope-fit on a `log ‖r⟂(t)‖` plot. The headline pedagogical knob is **slack** (drop magnitude).

The AM-GM regime classification is a deferred Phase 3 layer; the current MVP earns the right to talk about spectral gaps and emergent individuality first.

## Give the coding agent (MVP work)

1. This starter repo.
2. `README.md` for the overall framing.
3. `AGENTS.md` for the build mission, guardrails, and modelling convention.
4. `docs/spec.md` for the product/design spec.
5. `docs/model_notes.md` for the tick rule, Laplacian, conservation, slope-fit math.
6. `docs/diagnostics.md` for the spectral observables and what they mean.
7. `docs/presets.md` for the DropSource presets and their expected behaviour.
8. `docs/acceptance_criteria.md` for the test checklist.
9. `docs/ui_copy.md` for tooltips and pedagogical phrasing.
10. `docs/roadmap.md` only as a "what we are *not* building yet" reference.

For Phase 3 work (AM-GM diagnostics layer), additionally:

- `docs/amgm_context.md` and `docs/amgm_from_scratch.md` as the conceptual destination.

## Do not give the coding agent (during MVP work)

- The full AM-GM monograph.
- The full finite-band typology paper.
- The full internal memo suite.
- The full proof of readout rigidity.
- Philosophical positioning documents.
- Anything from `docs/amgm_*.md` — those are deliberately Phase 3 context, not MVP context. The MVP language is purely observational; AM-GM labels are off-limits until the Phase 3 layer is invoked.

The agent should build a pedagogical CA sandbox that makes spectral gaps visible, not become the theorist.

## Context length target

The MVP packet is about 10–14 pages equivalent:

```text
1. README.md
2. AGENTS.md
3. docs/spec.md
4. docs/model_notes.md
5. docs/diagnostics.md
6. docs/presets.md          (skim)
7. docs/acceptance_criteria.md (skim)
8. docs/ui_copy.md          (reference)
9. assets/whiteboard_sketch.jpg
```

The Phase 3 packet adds `docs/amgm_context.md` and `docs/amgm_from_scratch.md`.

## Key code orientation

```text
src/sim/
  state.ts           Cell / Grid / Params / SimState; vitality function
  rng.ts             Mulberry32 seedable PRNG
  rules.ts           Pure step() applying SHARE / DECAY / DROP
  graph.ts           Active mask, components, sparse + dense Laplacians
  spectral.ts        Jacobi + Lanczos eigensolvers, orthLogNorm, fitSlope
  dropSource.ts      DropSourceState discriminated union, nextDropSite
  presets.ts         DEFAULT_PARAMS + Preset list

src/components/
  SimCanvas.tsx      Cells + edges + Fiedler overlay + drops + phase strip
  ConvergencePlot.tsx
  SpectralPanel.tsx
  SimControls.tsx
  PerfHUD.tsx

src/App.tsx          rAF loop, spectral cadence, preset wiring
scripts/smoke.ts     Conservation + spectral pipeline sanity (run via tsx)
```

## How to extend

The most common task — adding a new DropSource — is well-supported:

1. Extend `DropSourceState` (discriminated union) in `src/sim/dropSource.ts`.
2. Add a `case` to `nextDropSite` for the new variant.
3. Add an entry to `PRESETS` in `src/sim/presets.ts` with `makeInitial` returning the new source state.
4. Run `npx tsx scripts/smoke.ts` to verify the spectral pipeline doesn't crash.
5. Build and visually verify in `npm run dev`.

Other extensions (eigenmodes, AM-GM diagnostics, painter mode) are described in `docs/roadmap.md`.
