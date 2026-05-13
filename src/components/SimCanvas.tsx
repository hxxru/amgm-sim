import { useEffect, useRef } from "react";
import {
  DropFlash,
  Grid,
  CouplingMap,
  Phase,
  PHASES_ALL,
  SpectralSnapshot,
  vitality,
} from "../sim/state";

interface Props {
  grid: Grid;
  coupling: CouplingMap;
  lastPhase: Phase | null;
  spectral: SpectralSnapshot | null;
  edgeFlowH: number[][];
  edgeFlowV: number[][];
  drops: DropFlash[];
  vitalityR0: number;
  vitalityK: number;
  rMaxHint: number;
  showFiedler: boolean;
  showEdges: boolean;
  showPhaseStrip: boolean;
}

const TARGET_PX = 760;
const MIN_CELL = 9;
const MAX_CELL = 28;
const STRIP_H = 26;
const PAD = 6;

function cellSize(gridDim: number): number {
  const px = Math.floor(TARGET_PX / gridDim);
  return Math.max(MIN_CELL, Math.min(MAX_CELL, px));
}

// Viridis colormap. Five anchor points; we interpolate between them.
const VIRIDIS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 144, 141],
  [94, 201, 98],
  [253, 231, 37],
];

function viridis(t: number): [number, number, number] {
  const tt = Math.max(0, Math.min(1, t));
  const seg = tt * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function SimCanvas({
  grid,
  coupling,
  lastPhase,
  spectral,
  edgeFlowH,
  edgeFlowV,
  drops,
  vitalityR0,
  vitalityK,
  rMaxHint,
  showFiedler,
  showEdges,
  showPhaseStrip,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = grid.length;
    const W = grid[0].length;
    const stripH = showPhaseStrip ? STRIP_H : 0;
    const CELL = cellSize(Math.max(H, W));

    const cssW = W * CELL + PAD * 2;
    const cssH = H * CELL + PAD * 2 + stripH;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, cssW, cssH);

    // Integer r ∈ [0, 15]. Normalise against the fixed level count so
    // each token level maps to a stable viridis band regardless of the
    // current grid state.
    const maxR = Math.max(15, rMaxHint);

    const px = (x: number) => PAD + x * CELL + CELL / 2;
    const py = (y: number) => PAD + y * CELL + CELL / 2;

    // Cells (viridis on r/maxR).
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const r = grid[y][x].r;
        const t = r / maxR;
        const [cr, cg, cb] = viridis(t);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(
          PAD + x * CELL + 1,
          PAD + y * CELL + 1,
          CELL - 2,
          CELL - 2,
        );
      }
    }

    // Edges: bottom layer is static κ (thickness/opacity); top layer is
    // instantaneous flow magnitude (glow).
    if (showEdges) {
      const drawEdge = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        kappa: number,
        flow: number,
      ) => {
        if (kappa <= 0.01) return;
        // Static κ baseline.
        ctx.lineCap = "round";
        ctx.strokeStyle = `rgba(120, 130, 150, ${0.15 + 0.35 * kappa})`;
        ctx.lineWidth = 0.5 + 2.5 * kappa;
        ctx.beginPath();
        ctx.moveTo(px(x1), py(y1));
        ctx.lineTo(px(x2), py(y2));
        ctx.stroke();

        // Flow glow.
        const mag = Math.abs(flow);
        if (mag > 1e-5) {
          const intensity = Math.min(1, Math.log10(1 + mag * 200) / 2);
          ctx.strokeStyle = `rgba(255, 240, 180, ${0.2 + 0.6 * intensity})`;
          ctx.lineWidth = 1 + 3 * intensity;
          ctx.beginPath();
          ctx.moveTo(px(x1), py(y1));
          ctx.lineTo(px(x2), py(y2));
          ctx.stroke();
        }
      };

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W - 1; x++) {
          drawEdge(x, y, x + 1, y, coupling.kappaH[y][x], edgeFlowH[y][x]);
        }
      }
      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W; x++) {
          drawEdge(x, y, x, y + 1, coupling.kappaV[y][x], edgeFlowV[y][x]);
        }
      }
    }

    // Fiedler tint, painted on top of cells but under drops.
    if (showFiedler && spectral) {
      const phi2Map = new Map<number, number>();
      let maxAbs = 0;
      for (let i = 0; i < spectral.activeIndices.length; i++) {
        const v = spectral.phi2[i];
        phi2Map.set(spectral.activeIndices[i], v);
        if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
      }
      if (maxAbs < 1e-9) maxAbs = 1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const v = phi2Map.get(y * W + x);
          if (v === undefined) continue;
          const a = Math.min(0.55, (Math.abs(v) / maxAbs) * 0.6);
          ctx.fillStyle = v > 0
            ? `rgba(80, 160, 255, ${a})`
            : `rgba(255, 130, 60, ${a})`;
          ctx.fillRect(
            PAD + x * CELL + 1,
            PAD + y * CELL + 1,
            CELL - 2,
            CELL - 2,
          );
        }
      }
      // Contour along sign changes.
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const v = phi2Map.get(y * W + x);
          if (v === undefined) continue;
          if (x + 1 < W) {
            const vr = phi2Map.get(y * W + x + 1);
            if (vr !== undefined && v * vr < 0) {
              const sx = PAD + (x + 1) * CELL;
              ctx.moveTo(sx, PAD + y * CELL);
              ctx.lineTo(sx, PAD + (y + 1) * CELL);
            }
          }
          if (y + 1 < H) {
            const vd = phi2Map.get((y + 1) * W + x);
            if (vd !== undefined && v * vd < 0) {
              const sy = PAD + (y + 1) * CELL;
              ctx.moveTo(PAD + x * CELL, sy);
              ctx.lineTo(PAD + (x + 1) * CELL, sy);
            }
          }
        }
      }
      ctx.stroke();
    }

    // Drop flashes.
    for (const d of drops) {
      const t = 1 - d.framesRemaining / 12;
      const radius = CELL * (0.4 + 1.6 * t);
      const alpha = 0.7 * (1 - t);
      ctx.strokeStyle = `rgba(255, 235, 140, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px(d.x), py(d.y), radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Vitality dot — small dim mark for cells with g(r) < threshold.
    // (Helps see "where life is.")
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const g = vitality(grid[y][x].r, vitalityR0, vitalityK);
        if (g < 0.05) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(
            PAD + x * CELL + 1,
            PAD + y * CELL + 1,
            CELL - 2,
            CELL - 2,
          );
        }
      }
    }

    // Phase strip.
    if (showPhaseStrip) {
      const stripY = PAD * 2 + H * CELL;
      const segW = (cssW - PAD * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const phase = PHASES_ALL[i];
        const isActive = phase === lastPhase;
        ctx.fillStyle = isActive ? "#3b6cf2" : "#15171b";
        ctx.fillRect(PAD + i * segW, stripY, segW - 2, stripH);
        ctx.fillStyle = isActive ? "#fff" : "#6c727a";
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(phase, PAD + i * segW + segW / 2, stripY + stripH / 2);
      }
    }
  }, [
    grid,
    coupling,
    lastPhase,
    spectral,
    edgeFlowH,
    edgeFlowV,
    drops,
    vitalityR0,
    vitalityK,
    rMaxHint,
    showFiedler,
    showEdges,
    showPhaseStrip,
  ]);

  return <canvas ref={canvasRef} className="sim-canvas" />;
}
