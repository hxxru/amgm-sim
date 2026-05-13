import { useEffect, useRef, useState } from "react";
import { Edge, Node } from "../model/types";
import { Eigen, survivalProfile } from "../model/eigen";

interface Props {
  nodes: Node[];
  edges: Edge[];
  eig: Eigen;
  cycleLength: number;
  principalMode: number[];
  showHeatmap: boolean;
  showPrincipalMode: boolean;
  showBridges: boolean;
}

const CELL = 56;
const PAD = 32;
// Seconds of wall-clock time to traverse t ∈ [0, Δ] once.
const LOOP_SECONDS = 3;

export function Gridworld({
  nodes,
  edges,
  eig,
  cycleLength,
  principalMode,
  showHeatmap,
  showPrincipalMode,
  showBridges,
}: Props) {
  const [animating, setAnimating] = useState(true);
  const [t, setT] = useState(cycleLength);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // Reset the time cursor whenever the underlying system changes.
  useEffect(() => {
    setT(animating ? 0 : cycleLength);
    startRef.current = null;
  }, [eig, cycleLength, animating]);

  useEffect(() => {
    if (!animating || showPrincipalMode) return;
    const step = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const phase = (elapsed % LOOP_SECONDS) / LOOP_SECONDS;
      setT(phase * cycleLength);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
  }, [animating, cycleLength, showPrincipalMode]);

  if (nodes.length === 0) return null;

  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const width = (maxX + 1) * CELL + PAD * 2;
  const height = (maxY + 2) * CELL + PAD * 2;

  const px = (n: Node) => PAD + n.x * CELL + CELL / 2;
  const py = (n: Node) => PAD + n.y * CELL + CELL / 2;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // What gets colored: either the principal eigenvector |phi1| (static), or
  // the current-time survival profile p(t) = exp(t * G) * ones.
  const profile = showPrincipalMode
    ? principalMode.map((v) => Math.abs(v))
    : survivalProfile(eig, t);
  const heatMax = Math.max(...profile, 1e-9);
  const heatMin = Math.min(...profile);
  const span = Math.max(heatMax - heatMin, 1e-9);
  const intensity = (i: number) =>
    Math.max(0, Math.min(1, (profile[i] - heatMin) / span));

  const clusterColor = (id: number) => (id === 0 ? "#3b6cf2" : "#e2773e");

  return (
    <div className="gridworld">
      <div className="gridworld-toolbar">
        <button
          className="anim-button"
          onClick={() => setAnimating((a) => !a)}
          disabled={showPrincipalMode}
          title={
            showPrincipalMode
              ? "Switch off principal-mode view to animate."
              : "Toggle the killed-process animation."
          }
        >
          {animating && !showPrincipalMode ? "⏸ Pause" : "▶ Play"}
        </button>
        <span className="anim-time">
          {showPrincipalMode
            ? "φ₁ (static)"
            : `t = ${t.toFixed(2)} / Δ = ${cycleLength.toFixed(2)}`}
        </span>
        <input
          type="range"
          min={0}
          max={cycleLength}
          step={cycleLength / 200}
          value={t}
          disabled={animating || showPrincipalMode}
          onChange={(e) => setT(Number(e.target.value))}
          className="anim-scrubber"
        />
      </div>

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
    </div>
  );
}
