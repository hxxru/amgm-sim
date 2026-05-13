import { Edge, Node, PresetGraph, SliderState } from "../model/types";

function makeClusterGrid(
  clusterId: number,
  cols: number,
  rows: number,
  xOffset: number,
  yOffset: number,
  baseKilling = 0.05,
): { nodes: Node[]; edges: Edge[]; idByPos: Map<string, number> } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const idByPos = new Map<string, number>();
  let nextId = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = nextId++;
      idByPos.set(`${c},${r}`, id);
      nodes.push({
        id,
        x: xOffset + c,
        y: yOffset + r,
        clusterId,
        baseKilling,
      });
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here = idByPos.get(`${c},${r}`)!;
      if (c + 1 < cols) {
        edges.push({
          source: here,
          target: idByPos.get(`${c + 1},${r}`)!,
          baseWeight: 1.0,
          type: "internal",
        });
      }
      if (r + 1 < rows) {
        edges.push({
          source: here,
          target: idByPos.get(`${c},${r + 1}`)!,
          baseWeight: 1.0,
          type: "internal",
        });
      }
    }
  }
  return { nodes, edges, idByPos };
}

function shiftEdges(edges: Edge[], offset: number): Edge[] {
  return edges.map((e) => ({
    ...e,
    source: e.source + offset,
    target: e.target + offset,
  }));
}

// Preset A: two compact clusters, weak bridge, moderate killing.
function presetA(): PresetGraph {
  const left = makeClusterGrid(0, 3, 3, 0, 1);
  const right = makeClusterGrid(1, 3, 3, 5, 1);
  const offset = left.nodes.length;
  const nodes: Node[] = [
    ...left.nodes,
    ...right.nodes.map((n) => ({ ...n, id: n.id + offset })),
  ];
  const edges: Edge[] = [...left.edges, ...shiftEdges(right.edges, offset)];

  // single weak bridge between right edge of cluster 0 and left edge of cluster 1
  const a = left.idByPos.get("2,1")!;
  const b = right.idByPos.get("0,1")! + offset;
  edges.push({ source: a, target: b, baseWeight: 0.2, type: "bridge" });

  const defaults: SliderState = {
    internalMixing: 1.0,
    bridgeCoupling: 0.3,
    killingIntensity: 1.0,
    cycleLength: 4.0,
  };

  return {
    id: "scalar-block",
    name: "A · Scalar Block",
    description:
      "Two compact clusters with strong internal mixing and a weak bridge. Default cycle length is long enough for compression.",
    nodes,
    edges,
    defaults,
  };
}

// Preset B: single elongated cluster with internal bottleneck.
function presetB(): PresetGraph {
  // 7 columns, 2 rows, clusterId 0 throughout. Bottleneck between c=2-3 and 3-4.
  const cols = 7;
  const rows = 2;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const idByPos = new Map<string, number>();
  let next = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = next++;
      idByPos.set(`${c},${r}`, id);
      nodes.push({ id, x: c, y: r + 1, clusterId: 0, baseKilling: 0.05 });
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here = idByPos.get(`${c},${r}`)!;
      if (c + 1 < cols) {
        const isBottleneck = c === 2 || c === 3;
        edges.push({
          source: here,
          target: idByPos.get(`${c + 1},${r}`)!,
          baseWeight: isBottleneck ? 0.35 : 1.0,
          type: isBottleneck ? "bottleneck" : "internal",
        });
      }
      if (r + 1 < rows) {
        edges.push({
          source: here,
          target: idByPos.get(`${c},${r + 1}`)!,
          baseWeight: 1.0,
          type: "internal",
        });
      }
    }
  }

  const defaults: SliderState = {
    internalMixing: 0.6,
    bridgeCoupling: 0.0,
    killingIntensity: 1.0,
    cycleLength: 2.0,
  };

  return {
    id: "one-well-finite-band",
    name: "B · One-Well Finite-Band",
    description:
      "Single elongated cluster with an internal bottleneck. Intermediate cycle length leaves an intra-well relaxation mode visible.",
    nodes,
    edges,
    defaults,
  };
}

// Preset C: two scalar clusters joined by an emphasized bridge.
function presetC(): PresetGraph {
  const left = makeClusterGrid(0, 3, 3, 0, 1);
  const right = makeClusterGrid(1, 3, 3, 5, 1);
  const offset = left.nodes.length;
  const nodes: Node[] = [
    ...left.nodes,
    ...right.nodes.map((n) => ({ ...n, id: n.id + offset })),
  ];
  const edges: Edge[] = [...left.edges, ...shiftEdges(right.edges, offset)];

  // Two bridges to emphasize coupling-as-control
  edges.push({
    source: left.idByPos.get("2,0")!,
    target: right.idByPos.get("0,0")! + offset,
    baseWeight: 0.5,
    type: "bridge",
  });
  edges.push({
    source: left.idByPos.get("2,1")!,
    target: right.idByPos.get("0,1")! + offset,
    baseWeight: 0.5,
    type: "bridge",
  });
  edges.push({
    source: left.idByPos.get("2,2")!,
    target: right.idByPos.get("0,2")! + offset,
    baseWeight: 0.5,
    type: "bridge",
  });

  const defaults: SliderState = {
    internalMixing: 1.0,
    bridgeCoupling: 0.8,
    killingIntensity: 1.0,
    cycleLength: 4.0,
  };

  return {
    id: "weak-coupling-failure",
    name: "C · Weak-Coupling Failure",
    description:
      "Two compact clusters joined by a tunable bridge. Move the bridge-coupling slider to watch boundary integrity break down.",
    nodes,
    edges,
    defaults,
  };
}

export const PRESETS: PresetGraph[] = [presetA(), presetB(), presetC()];
