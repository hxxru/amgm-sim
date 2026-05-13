# AM-GM Boundary Program: From Scratch

> **Status: Phase 3+ context, not the current build target.**
> The MVP (see `README.md`, `docs/spec.md`) is a four-phase cellular automaton that surfaces the spectral gap of an alive-cell graph Laplacian. It does **not** implement AM-GM regime classification. This document is the long-form theoretical destination — read it when planning the AM-GM diagnostics layer in Phase 3 (`docs/roadmap.md`).

This document introduces the AM-GM Boundary program for contributors working on the **Gridworld Boundary Diagnostics** web simulation. It is intended for coding agents and technical collaborators who need enough conceptual context to build the simulator responsibly, without needing to read the full internal memo stack.

The short version:

> The AM-GM program studies when a system can be treated as an individual for viability aggregation. Inside a candidate individual, losses and gains may compensate each other, so arithmetic-style pooling is appropriate. Across candidate individuals, losses may be non-transferable, so geometric-style aggregation is forced. The hard question is where the boundary lies, and whether the dynamics actually produce the scalar interface values that geometric aggregation requires.

The gridworld simulation is a pedagogical sandbox for that question. It should show users that a boundary is not just a line around a spatial cluster. A boundary is dynamically meaningful only when the internal process compresses, survives, and couples to the outside in the right way.

---

## 1. The Core Motivation

Many biological and social systems have nested organization:

- molecules inside cells;
- cells inside tissues;
- organisms inside groups;
- workers inside colonies;
- trees inside forests;
- local subpopulations inside ecosystems.

A recurring question is:

> At which scale should we treat something as one viability-bearing unit?

Naively, we might use physical enclosure: membranes, skins, colony boundaries, nests, or spatial clusters. But physical enclosure is not enough. A membrane can leak. A colony can have specialized workers whose losses are not interchangeable. A forest can contain local clusters that interact but do not form a unified survival unit.

The AM-GM program proposes a different diagnostic:

> A candidate unit is dynamically meaningful when its internal dynamics can compensate and compress before the relevant outer evaluation window.

This is a timescale-sensitive statement. The same spatial object might behave like one unit over a long timescale but like several partially independent components over a short timescale.

The key distinction is between two forms of aggregation:

### Arithmetic aggregation inside a compensatory domain

Inside a candidate block, resources, states, or survival contributions may be fungible. A loss in one internal location can be offset by a gain somewhere else before the outer environment evaluates the block.

This supports arithmetic-style pooling:

```text
inside-block compensation -> sums, averages, totals, linear pooling
```

### Geometric aggregation across non-transferable blocks

Across blocks, compensation may fail. If one deer dies, another deer cannot transfer its survival to replace the first. If one non-transferable branch fails, gains in another branch do not cancel that failure.

When blocks each contribute a positive scalar interface value and the outer evaluator respects composition, scale, and temporal sufficiency, the outer aggregation is geometric:

```text
across-block non-transferability -> products, log-additivity, geometric means
```

This is the program's name: the boundary between arithmetic and geometric aggregation is the boundary between compensation and non-transferability.

---

## 2. The Interface Question

The program is not simply saying:

```text
inside = arithmetic
outside = geometric
```

That slogan is too quick. The real question is:

> What object does a block present to the outside after its internal dynamics have run for the relevant cycle window?

This object is called an **interface value** or, in the finite-band extension, an **interface signature**.

In the scalar regime, a block presents a positive number:

```text
block i -> positive scalar A_i
```

Then an outer evaluator can combine the scalar values geometrically:

```text
A_outer = geometric mean or weighted product of the A_i
```

But many systems do not compress to one scalar. They may retain multiple modes, basin labels, cone-valued comparisons, or readout-dependent rankings. In those cases, the interface object is no longer a single positive number.

The gridworld simulation is designed to show this transition visually:

```text
spatial cluster -> killed dynamics -> survival modes -> interface signature
```

---

## 3. Killed Processes: The Basic Mathematical Model

The computational sandbox should use finite-state killed Markov dynamics.

A finite Markov process moves among states. A **killed** Markov process also has failure or extinction. At each state, the process can transition to neighboring states, or it can be killed.

The generator has the form:

```text
G = Q - diag(kappa)
```

where:

- `Q` is the ordinary transition generator;
- `kappa[i] >= 0` is the killing or failure rate at state `i`;
- `G` is the killed generator.

The survival profile after a cycle of length `Delta` is governed by:

```text
exp(Delta * G)
```

For the web app, the gridworld is just a visualization of this finite generator. Each grid cell or graph node is a state. Edges are transition rates. Killing zones are locations where `kappa` is high.

### Why killing matters

Without killing, ordinary Markov mixing only describes where mass goes. With killing, the process also selects for paths that avoid failure. The leading survival modes of the killed generator tell us what kinds of internal states survive over the cycle window.

This is why the spectral structure of `G` matters.

---

## 4. Spectral Compression and the Rank-One Scalar Regime

A killed generator has eigenmodes. Roughly:

- the principal mode is the slowest-decaying survival profile;
- the next modes describe additional survival-relevant structure;
- the spectral gap controls how quickly the principal mode separates from the others.

Let the decay rates be:

```text
a_1 < a_2 < a_3 < ...
```

where `a_1` is the principal decay rate. The key compression quantity is:

```text
(a_2 - a_1) * Delta
```

If this quantity is large, then the second mode and higher modes decay away relative to the principal mode during the cycle. The block effectively presents one positive scalar survival value to the outside.

That is the **rank-one scalar regime**.

In user-facing language:

> The inside has mixed and filtered itself enough that the outside only sees one survival-relevant number.

In diagnostics language:

```text
large compression strength
low scalarity defect
rank-one scalar interface likely
```

### What the gridworld should show

When internal mixing is strong and the cycle length is long enough, probability mass or survival mass inside a cluster should smooth out into a stable profile. The diagnostics should indicate scalar compression.

A user should be able to increase internal mixing or increase `Delta` and see the block become more scalar-like.

---

## 5. Why Geometric Aggregation Appears

Once each block presents a positive scalar interface value, the outer problem becomes:

> How should multiple non-transferable scalar values be aggregated?

The AM-GM program uses axioms such as scale behavior, compositionality, and temporal interface sufficiency to characterize the outer evaluator. Under those conditions, the evaluator is geometric: products or weighted geometric means.

The important computational point is:

> The geometric outer evaluator is type-correct only when the inputs are positive scalar interface values.

If a block does not compress to a scalar, it cannot simply be fed into the scalar geometric theorem without additional readout or compatibility data.

The web app should therefore avoid saying:

```text
this spatial cluster gets geometrically aggregated
```

It should instead say:

```text
this partition currently supports a scalar interface signature
```

or:

```text
this partition currently does not support scalar compression
```

---

## 6. Why Scalarity Can Fail

Scalarity fails when more than one survival-relevant mode remains visible over the cycle window.

This can happen for several reasons:

- internal mixing is too slow;
- the cycle window is too short;
- the block contains metastable sub-basins;
- killing selects multiple distinct survival profiles;
- weak coupling leaks information across the candidate boundary;
- modes nearly tie or cross dynamically.

When scalarity fails, the interface object becomes finite-dimensional. This is the starting point for Document 2's finite-band typology.

In simulation terms:

```text
retained mode count K > 1
scalarity defect high
finite-band memory present
```

But not all finite-band cases mean the same thing.

---

## 7. The Finite-Band Typology

Document 2 reframes the interface object as a signature:

```text
Sigma(S, P, Delta, V) = (K, a, epsilon_scalar, epsilon_band, R, C, eta; J)
```

The exact mathematical definition is not needed for the MVP, but the pieces matter conceptually.

### Signature components

- `K`: retained band dimension, or how many modes remain relevant.
- `a`: retained decay rates.
- `epsilon_scalar`: scalarity defect; how badly a one-mode approximation fails.
- `epsilon_band`: band defect; how much is lost by keeping only the retained band.
- `R`: admissible readout class; which scalar measurements are allowed.
- `C`: compatibility data; how interface objects may be composed or compared.
- `eta`: tolerance threshold.
- `J`: dynamic regime label.

The simulation should compute simplified versions of some of these. It should not claim to implement the entire typology rigorously.

---

## 8. The Main Regimes the Simulation Should Teach

### 8.1 Scalar interface likely

This is the rank-one regime.

Diagnostic pattern:

```text
K approximately 1
large compression strength
low scalarity defect
weak leakage
```

Pedagogical message:

> The block has compressed to a positive scalar interface value over this cycle window.

### 8.2 Finite-band formal / non-diagnostic

This is a subtle but important case. A system may have multiple retained modes, and one may be able to define formal cones or order structures, but the extra modes do not correspond to meaningful basins or interpretable subunits.

Example: a one-well system with an internal relaxation mode.

Diagnostic pattern:

```text
K > 1
scalarity defect elevated
basin witness absent
finite-band structure present but not interpretable
```

Pedagogical message:

> Extra modes are real, but they do not automatically mean the block has meaningful sub-individual structure.

This distinction is crucial. Formal mathematical structure is not the same thing as an interpretable interface.

### 8.3 Finite-band basin-interpretable, also called stratum 2a

A system may fail scalar compression because it contains several metastable basins. In that case, the retained modes may recombine into basin-local profiles. The finite-band object has an interpretation.

Diagnostic pattern:

```text
K > 1
modes localize around basins
basin labels stable
basin witness present
```

Pedagogical message:

> The block does not reduce to one scalar, but the retained finite-band structure has meaningful basin coordinates.

### 8.4 Cone/vector-valued plural regime, also called stratum 3

Sometimes scalarity fails and no clean basin witness exists. The interface may still have structure: some states or blocks may be comparable under a cone order, while others require a declared readout.

Diagnostic pattern:

```text
K > 1
basin witness absent or weak
rankings vary under plausible readouts
partial order or readout sensitivity present
```

Pedagogical message:

> The system has genuine finite-dimensional comparison structure, but no canonical scalar summary.

For the MVP, this can remain mostly conceptual or be represented by readout-sensitivity heuristics.

### 8.5 Boundary integrity compromised

Weak coupling can destroy the meaningfulness of a candidate boundary. The issue is not whether coupling is exactly zero. Real systems leak. The issue is whether leakage is small in the right coordinates.

Diagnostic pattern:

```text
bridge coupling high relative to compression gap
leakage ratio high
scalarity defect rises
product/composition intuition breaks down
```

Pedagogical message:

> This candidate boundary is too porous relative to its internal compression.

---

## 9. Weak Coupling and Boundary Porosity

A major upgrade in the newer monograph is the weak-coupling picture.

Earlier versions of the intuition might sound like blocks must be perfectly isolated. That is too strict. Real boundaries are almost never perfectly sealed.

The refined view is perturbative:

> A boundary can be meaningful even with leakage, if leakage is small relative to internal compression and does not destroy product composition over the outer cycle.

For the MVP, use a simplified leakage ratio:

```text
leakage_ratio = cross_boundary_transition_weight / compression_gap_proxy
```

In later versions, this can be replaced by projected leakage:

```text
lambda_perp / g_tilde
```

where:

- `lambda_perp` measures leakage from the principal mode into nonprincipal directions;
- `g_tilde` is the surviving compression gap.

### User-facing explanation

Good copy:

```text
The bridge is not fatal just because it exists. It becomes a problem when cross-boundary leakage is large compared with the block's internal compression rate.
```

Avoid:

```text
Any coupling means no boundary.
```

---

## 10. Dynamic Dependence on Cycle Length

The cycle length `Delta` is central.

A spatial system is not assigned a regime once and for all. Its interface type depends on the time window over which the outside evaluates it.

Short cycle:

```text
not enough time for compression
finite-band memory remains
```

Long cycle:

```text
nonprincipal modes decay away
scalar compression more likely
```

The web app should make this discovery easy. A user should be able to hold the grid fixed, drag the `Cycle length` slider, and watch the diagnostic regime change.

This is one of the most important lessons for new users:

> AM-GM individuality is indexed by partition, viability readout, and timescale.

---

## 11. The Role of Viability Readout

The program is about viability dynamics, not arbitrary clustering.

A viability readout specifies what counts as survival, persistence, or failure. In the killed-process model, this is represented by killing rates `kappa` and survival profiles.

Changing the killing landscape can change the signature even when the transition graph stays the same.

Example:

- If killing is concentrated outside a cluster, the cluster may appear strongly survival-relevant.
- If killing splits a cluster into two distinct safe zones, multiple survival modes may remain.
- If killing is uniform and weak, spatial clusters may not matter much for viability.

The simulator should expose killing intensity and killing zones because they represent the viability readout in a simple visual form.

---

## 12. Mapping AM-GM Ideas to the Gridworld

| AM-GM concept | Gridworld representation | User intuition |
|---|---|---|
| Candidate block | A circled cluster or partition region | “Maybe this is one unit.” |
| Internal compensation | Fast internal transitions | Local losses can be redistributed. |
| Non-transferability | Weak or absent bridges | Other blocks cannot fully compensate. |
| Killing / failure | Hazard zones or death rates | Viability pressure. |
| Cycle length | Time window slider | How long the block has to compress. |
| Principal mode | Dominant survival heatmap | What survives after filtering. |
| Spectral gap | Compression strength | How fast one survival profile dominates. |
| Scalarity defect | One-mode approximation error | Whether one number is enough. |
| Retained band | Multiple visible modes | The block remembers more than one pattern. |
| Basin witness | Stable localized modes | Finite-band structure has meaning. |
| Weak coupling | Bridge between clusters | Boundary porosity. |
| Leakage ratio | Bridge strength divided by gap | Whether porosity matters. |
| Stratum assignment | Suggested regime label | Diagnostic summary, not ontology. |

---

## 13. What the Simulator Should Not Claim

The simulator should be careful. It is pedagogical, not definitive.

Avoid claims like:

```text
This is an individual.
This is not an individual.
This proves AM-GM.
This implements the full theory.
```

Use claims like:

```text
This partition currently supports a scalar interface signature.
This partition currently shows finite-band memory.
This finite-band structure appears basin-interpretable.
This candidate boundary appears compromised by leakage.
This regime is ambiguous near the threshold.
```

The simulation should present regime assignments as diagnostic suggestions.

---

## 14. Recommended UI Language

### Scalar interface likely

```text
The leading survival mode dominates over this cycle window. The block is currently well-described by a positive scalar interface value.
```

### Finite-band formal / non-diagnostic

```text
More than one survival mode remains visible, but the extra structure does not align with stable basin-like regions. Treat this as finite-band memory without an interpretive witness.
```

### Basin-interpretable finite band

```text
Multiple retained modes align with stable basin-like regions. Scalar compression fails, but the finite-band structure has interpretable coordinates.
```

### Cone/vector-valued plural regime

```text
The interface is not naturally summarized by one scalar. Different admissible readouts may rank states differently.
```

### Boundary integrity compromised

```text
Cross-boundary leakage is large relative to internal compression. This partition may not support a stable interface signature over the chosen cycle window.
```

### Ambiguous / transition zone

```text
Diagnostics are near threshold. Small changes in cycle length, killing, or coupling may change the suggested regime.
```

---

## 15. Minimal Mathematical Glossary

### `G`: killed generator

The matrix describing transitions and killing.

### `Q`: transition generator

The matrix describing movement between non-killed states.

### `kappa`: killing rate

The local failure or extinction rate.

### `Delta`: cycle length

The time window over which the block is evaluated.

### `a_i`: decay rates

Rates at which survival modes decay. Lower decay means more persistent.

### `(a_2 - a_1) Delta`: compression strength

A rough measure of how strongly the principal survival mode separates from the next mode over the cycle.

### `epsilon_scalar`: scalarity defect

How much information is lost by approximating the survival profile with one principal mode.

### `epsilon_band`: band defect

How much information is lost by retaining only the visible finite band.

### `K`: retained band dimension

Number of survival modes kept as relevant over the cycle.

### `R`: admissible readout class

The family of scalar measurements allowed for comparing finite-band states.

### `C`: compatibility data

Extra data that says how interface objects can be compared or composed.

### `J`: dynamic regime label

A label for whether the environment/coarse state is quasi-static, fast-mixing, or intermediate.

---

## 16. What the Coding Agent Needs to Understand

The coding agent does not need to know the full AM-GM theory. They need to understand these implementation-relevant principles:

1. The app simulates a finite killed Markov process on a grid or graph.
2. The app computes simplified spectral diagnostics.
3. The main educational target is scalar compression versus finite-band memory.
4. Weak coupling should be measured relative to internal compression, not treated as all-or-nothing.
5. Regime labels are diagnostic suggestions, not definitive ontology.
6. The app should make timescale dependence obvious through the `Delta` slider.
7. The app should keep mathematical details available but not overwhelming.

---

## 17. Example User Journey

A user opens the site and sees two clusters connected by a faint bridge.

The suggested regime says:

```text
Scalar interface likely
```

They increase bridge coupling. At first, nothing dramatic happens. The regime remains scalar-like. The explanation says leakage is still small relative to compression.

They keep increasing bridge coupling. The leakage ratio crosses a threshold. The scalarity defect rises. The regime changes to:

```text
Boundary integrity compromised
```

Then they reduce bridge coupling but shorten the cycle length. Now the bridge is weak, but there is not enough time for internal compression. The regime changes to:

```text
Finite-band formal/non-diagnostic
```

Then they switch to the multi-basin preset. The retained modes localize into two basin-like regions. The regime changes to:

```text
Finite-band basin-interpretable
```

In five minutes, they have learned the central AM-GM lesson:

> Boundaries depend on dynamics, timescale, viability pressure, and coupling. They are not just spatial outlines.

---

## 18. Future Extensions

The web simulator should begin modestly. Later extensions could include:

- user-drawn partitions;
- trajectory sampling and estimation;
- more accurate projected leakage diagnostics;
- Feynman-Kac product defect visualization;
- readout sensitivity and cone-comparability demos;
- Active Inference / Markov blanket cross-diagnostics;
- exportable model JSON for notebook analysis;
- side-by-side comparison of two partitions on the same grid.

The most important future extension is estimation. Once the known-generator version works, the next question is:

> Can we recover the same signature from sampled trajectories?

That is the path from this web simulation toward Document 3-style empirical extraction.

---

## 19. Summary

The AM-GM Boundary program asks when local viability dynamics can be compressed into interface values and aggregated across non-transferable boundaries. The scalar regime appears when internal killed dynamics compress to one positive survival mode before the outer cycle. When that compression fails, finite-band structure remains; it may be interpretable, formal-but-nondiagnostic, or cone/vector-valued. Weak coupling is not automatically fatal, but it matters when leakage is large relative to internal compression.

The Gridworld Boundary Diagnostics app should make these ideas visible. It should let users manipulate internal mixing, killing, cycle length, barriers, and bridge coupling, while watching simplified AM-GM diagnostics update in real time.

The app is not the full theory. It is the front door.
