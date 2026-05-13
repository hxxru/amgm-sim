# Acceptance Criteria and Tests

## MVP acceptance criteria

The first version is acceptable if **all** of the following hold:

1. The app loads in a browser via `npm run dev` and `npm run build && npm run preview`.
2. A user can select at least four presets: Random Scatter, Twin Blobs, Single Neck, Archipelago.
3. A "reseed" button generates a fresh random scatter with a visible new seed.
4. The four-phase tick (SHARE / DISCOVER / CULL / BIRTH) is visible via a phase strip whose currently firing phase is highlighted.
5. A user can adjust at minimum: share rate `α`, food discovery rate `p_food`, death threshold `r_death`, birth threshold `r_birth`, simulation speed.
6. The gridworld canvas renders alive cells with a heat colour proportional to resource and empty cells as a neutral background.
7. The Fiedler overlay (toggleable) tints alive cells by `sign(φ_2)` and draws a contour at sign changes.
8. The convergence plot updates live with `log ‖r⟂(t)‖` versus time, and overlays a fitted line whenever a fit is valid.
9. The spectral panel displays:
   - `λ_2` (computed) for the largest component;
   - `gap_fit` = `−slope / α` from the convergence plot;
   - connected component count;
   - a visible badge when components ≥ 2.
10. On Twin Blobs at default sliders, after the system has been running long enough for the buffer to fill and no recent CULL/BIRTH event, `λ_2` and `gap_fit` agree within ~10 %.
11. On Twin Blobs at default sliders, the Fiedler contour visibly runs across the neck.
12. UI copy uses cautious observational language ("the slope of this plot is the spectral gap of the current alive subgraph") and avoids AM-GM regime claims.
13. The implementation is clean enough to layer AM-GM diagnostics on top later (see `docs/roadmap.md`).

## Tick rule validity checks

For every emitted tick:

- Every alive cell has `r ≥ 0`.
- The share step preserves non-negativity: with the configured `α`, no cell drops below 0 due to the linear update.
- A cell that dies is no longer adjacent to itself in the alive subgraph for subsequent ticks.
- A cell that is born has `r = r_seed` and was empty in the previous tick.
- No NaNs or infinite values appear in `r`.

## Laplacian and spectral checks

Inside `console.warn`-level assertions during development:

- `L` is symmetric: `L_ij = L_ji` for all `i, j`.
- `L` is PSD: smallest eigenvalue ≥ `−1e-8`.
- For the largest connected component, smallest eigenvalue is `0` to within `1e-8`.
- `λ_2 ≥ 0`.
- `Σ_i φ_2[i] ≈ 0` on the largest component.
- Trace of `L_C` equals `2 · |edges in C|`.

## Slope-fit checks

- The fit is only displayed when the slope-fit buffer is full and no `CULL` / `BIRTH` event has fired inside the buffer window.
- When displayed, `|gap_fit − λ_2| / λ_2 < 0.15` on Twin Blobs at default sliders after the system has equilibrated.

## Preset sanity checks

### Twin Blobs

```text
After ~30 ticks at default sliders:
- component count = 1
- λ_2 ∈ [0.04, 0.08]
- gap_fit ≈ λ_2
- Fiedler contour crosses the neck
```

Increasing `α` should increase the magnitude of the convergence slope without changing `λ_2`. The two should remain consistent because `gap_fit = −slope / α`.

### Single Neck

```text
After ~30 ticks at default sliders:
- component count = 1
- λ_2 ∈ [0.06, 0.10]
- Fiedler contour at the pinch (columns 7–8)
```

### Archipelago

```text
After ~30 ticks at default sliders:
- component count = 3 or 4
- λ_2 reported for the largest component is finite and positive
- A component-count badge is visible
```

### Random Scatter

```text
After ~100 ticks:
- some isolated cells have died off
- at least one stable blob has formed
- the convergence plot may or may not show a clean slope depending
  on how fast topology is still changing; "—" is acceptable here
```

## Slider sanity checks

- Reducing share rate `α` reduces the magnitude of the convergence-plot slope. `gap_fit` and `λ_2` move *together* (the gap of `L` is unchanged but the fit divides by `α`, so they should agree).
- Increasing food discovery rate `p_food` increases mean resource and reduces the death rate.
- Increasing death threshold `r_death` increases the cull rate and shrinks the alive subgraph over time.
- Increasing birth threshold `r_birth` reduces the birth rate.
- Pausing freezes all phases; the canvas is steady.

## UI checks

- The current preset name is visible.
- The current spectral gap is visible.
- Tooltips explain each slider and each diagnostic in cautious observational language.
- Colour is not the only carrier of information (Fiedler tint also paired with a contour line; component-count badge has text).

## Performance target

For a 20×20 grid with ~150 alive cells and a recompute cadence of 5 ticks, slider movement should feel responsive at 30 ticks/s. The Laplacian + smallest-two-eigenpair pass should complete in under 20 ms on a modern laptop. Profile if it exceeds 50 ms.

## Reproducibility

A given seed plus preset must produce a bit-identical trajectory. Persist the seed in the URL hash so a viewer can share a snapshot.
