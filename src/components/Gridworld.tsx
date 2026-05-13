import { Edge, Node } from "../model/types";

interface Props {
  nodes: Node[];
  edges: Edge[];
  survivalProfile: number[];
  principalMode: number[];
  showHeatmap: boolean;
  showPrincipalMode: boolean;
  showBridges: boolean;
}

const CELL = 56;
const PAD = 32;

export function Gridworld({
  nodes,
  edges,
  survivalProfile,
  principalMode,
  showHeatmap,
  showPrincipalMode,
  showBridges,
}: Props) {
  if (nodes.length === 0) return null;

  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const width = (maxX + 1) * CELL + PAD * 2;
  const height = (maxY + 2) * CELL + PAD * 2;

  const px = (n: Node) => PAD + n.x * CELL + CELL / 2;
  const py = (n: Node) => PAD + n.y * CELL + CELL / 2;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const heatSource = showPrincipalMode
    ? principalMode.map((v) => Math.abs(v))
    : survivalProfile;
  const heatMax = Math.max(...heatSource, 1e-9);
  const heatMin = Math.min(...heatSource);
  const span = Math.max(heatMax - heatMin, 1e-9);
  const intensity = (i: number) =>
    Math.max(0, Math.min(1, (heatSource[i] - heatMin) / span));

  const clusterColor = (id: number) => (id === 0 ? "#3b6cf2" : "#e2773e");

  return (
    <svg
      className="gridworld-svg"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Edges */}
      {edges.map((e, idx) => {
        const a = nodeById.get(e.source)!;
        const b = nodeById.get(e.target)!;
        if (!showBridges && e.type === "bridge") return null;
        const stroke =
          e.type === "bridge"
            ? "#c33"
            : e.type === "bottleneck"
              ? "#a07a00"
              : "#888";
        const strokeWidth =
          e.type === "bridge" ? 2.5 : e.type === "bottleneck" ? 2 : 1.5;
        const dash = e.type === "bridge" ? "5,4" : undefined;
        return (
          <line
            key={`e-${idx}`}
            x1={px(a)}
            y1={py(a)}
            x2={px(b)}
            y2={py(b)}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
            opacity={0.85}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const r = 18;
        const inten = showHeatmap ? intensity(n.id) : 0;
        const fill = showHeatmap
          ? `rgba(${showPrincipalMode ? "60,180,75" : "30,90,200"}, ${0.15 + 0.8 * inten})`
          : "#fafafa";
        return (
          <g key={`n-${n.id}`}>
            <circle
              cx={px(n)}
              cy={py(n)}
              r={r}
              fill={fill}
              stroke={clusterColor(n.clusterId)}
              strokeWidth={2}
            />
            {n.baseKilling > 0.08 && (
              <circle
                cx={px(n) + 13}
                cy={py(n) - 13}
                r={4}
                fill="#b00"
                opacity={0.7}
              />
            )}
          </g>
        );
      })}

      {/* Cluster legend */}
      <g transform={`translate(${PAD}, ${height - PAD + 4})`}>
        <text fontSize={12} fill="#444">
          Edges: gray = internal, gold = bottleneck, red-dashed = bridge.
          Killing nodes marked with a small red dot.
        </text>
      </g>
    </svg>
  );
}
