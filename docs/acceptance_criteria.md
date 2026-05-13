# Acceptance Criteria and Tests

## MVP acceptance criteria

The first version is acceptable if:

1. The app loads in a browser.
2. The user can select at least three presets.
3. The user can adjust internal mixing, bridge coupling, killing intensity, and cycle length.
4. The gridworld visualization updates when controls change.
5. The diagnostic panel updates when controls change.
6. The suggested regime changes in intuitive ways for the presets.
7. The app includes short explanatory text and tooltips.
8. The app uses cautious diagnostic language.
9. The implementation is clean enough to extend.

## Generator validity checks

For every generated model:

- off-diagonal entries of `Q` are nonnegative;
- row sums of `Q` are approximately zero;
- killing rates are nonnegative;
- diagonal entries of `G` include killing;
- no NaNs or infinite values appear.

## Eigenvalue convention checks

- Eigenvalues of `G` are sorted from largest real part to smaller.
- Decay rates are `a_i = -lambda_i`.
- Compression gap is `a2 - a1`.
- Compression strength is `(a2 - a1) * Delta`.

## Preset sanity checks

### Preset A: Scalar Block

Should load as:

```text
Scalar interface likely
```

or at least near-scalar.

Increasing internal mixing or cycle length should improve scalarity.

### Preset B: One-Well Finite-Band Artifact

Should load as:

```text
Finite-band: formal/non-diagnostic
```

or transition-zone finite-band.

Increasing cycle length should eventually push toward scalar compression.

### Preset C: Weak-Coupling Failure

At low bridge coupling:

```text
Scalar interface likely
```

At high bridge coupling:

```text
Boundary integrity compromised
```

## Slider sanity checks

- Increasing `Delta` should usually increase compression strength.
- Increasing internal mixing should usually lower scalarity defect.
- Increasing bridge coupling should usually increase leakage ratio.
- Increasing killing intensity should visibly alter survival mass and may change mode structure.

## UI checks

- The current preset name is visible.
- The current regime label is visible.
- The reason for the regime label is visible.
- Tooltips or info text explain the main diagnostics.
- Color is not the only carrier of information.

## Performance target

For `N <= 64`, slider movement should feel responsive.

If diagnostics are expensive, debounce recomputation or recompute on slider release.
