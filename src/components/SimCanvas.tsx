import { useEffect, useRef } from "react";
import { Grid, Phase, PHASES_ALL, SpectralSnapshot } from "../sim/state";

interface Props {
  grid: Grid;
  lastPhase: Phase | null;
  spectral: SpectralSnapshot | null;
  showFiedler: boolean;
  showPhaseStrip: boolean;
}

const CELL = 22;
const STRIP_H = 28;

export function SimCanvas({
  grid,
  lastPhase,
  spectral,
  showFiedler,
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

    const dpr = window.devicePixelRatio || 1;
    const cssW = W * CELL;
    const cssH = H * CELL + stripH;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#15171b";
    ctx.fillRect(0, 0, cssW, cssH);

    let maxR = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x].alive && grid[y][x].r > maxR) maxR = grid[y][x].r;
      }
    }
    if (maxR < 1e-6) maxR = 1;

    const phi2Map = new Map<number, number>();
    let maxAbsPhi = 0;
    if (spectral && showFiedler) {
      for (let i = 0; i < spectral.largestComponentIndices.length; i++) {
        const idx = spectral.largestComponentIndices[i];
        const v = spectral.phi2[i];
        phi2Map.set(idx, v);
        if (Math.abs(v) > maxAbsPhi) maxAbsPhi = Math.abs(v);
      }
    }
    if (maxAbsPhi < 1e-9) maxAbsPhi = 1;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = grid[y][x];
        const px = x * CELL;
        const py = y * CELL;
        if (!cell.alive) {
          ctx.fillStyle = "#23262c";
        } else {
          const t = Math.min(1, cell.r / maxR);
          const r = Math.round(40 + 215 * t);
          const g = Math.round(50 + 110 * t);
          const b = Math.round(60 + 25 * t);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);

        if (showFiedler && cell.alive) {
          const idx = y * W + x;
          const v = phi2Map.get(idx);
          if (v !== undefined) {
            const a = Math.min(0.55, (Math.abs(v) / maxAbsPhi) * 0.65);
            ctx.fillStyle =
              v > 0
                ? `rgba(80, 160, 255, ${a})`
                : `rgba(255, 130, 60, ${a})`;
            ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
          }
        }
      }
    }

    if (showFiedler && spectral) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          const v = phi2Map.get(idx);
          if (v === undefined) continue;
          if (x + 1 < W) {
            const vr = phi2Map.get(idx + 1);
            if (vr !== undefined && v * vr < 0) {
              const sx = (x + 1) * CELL;
              ctx.moveTo(sx, y * CELL);
              ctx.lineTo(sx, y * CELL + CELL);
            }
          }
          if (y + 1 < H) {
            const vd = phi2Map.get(idx + W);
            if (vd !== undefined && v * vd < 0) {
              const sy = (y + 1) * CELL;
              ctx.moveTo(x * CELL, sy);
              ctx.lineTo(x * CELL + CELL, sy);
            }
          }
        }
      }
      ctx.stroke();
    }

    if (showPhaseStrip) {
      const stripY = H * CELL;
      const segW = cssW / 4;
      for (let i = 0; i < 4; i++) {
        const phase = PHASES_ALL[i];
        const isActive = phase === lastPhase;
        ctx.fillStyle = isActive ? "#3b6cf2" : "#1a1d22";
        ctx.fillRect(i * segW, stripY, segW - 1, stripH);
        ctx.fillStyle = isActive ? "#fff" : "#6c727a";
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(phase, i * segW + segW / 2, stripY + stripH / 2);
      }
    }
  }, [grid, lastPhase, spectral, showFiedler, showPhaseStrip]);

  return <canvas ref={canvasRef} className="sim-canvas" />;
}
