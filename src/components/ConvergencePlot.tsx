import { useEffect, useRef } from "react";
import { OrthSample } from "../sim/state";
import { SlopeFit } from "../sim/spectral";

interface Props {
  samples: OrthSample[];
  fit: SlopeFit | null;
  width?: number;
  height?: number;
}

export function ConvergencePlot({
  samples,
  fit,
  width = 320,
  height = 180,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#15171b";
    ctx.fillRect(0, 0, width, height);

    const pad = { l: 36, r: 8, t: 12, b: 22 };

    const finite = samples.filter((s) => Number.isFinite(s.logNorm));
    if (finite.length < 2) {
      ctx.fillStyle = "#6c727a";
      ctx.font = "12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("waiting for samples…", width / 2, height / 2);
      return;
    }

    const tMin = finite[0].t;
    const tMax = finite[finite.length - 1].t;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const s of finite) {
      if (s.logNorm < yMin) yMin = s.logNorm;
      if (s.logNorm > yMax) yMax = s.logNorm;
    }
    if (yMax - yMin < 1e-6) {
      yMin -= 0.5;
      yMax += 0.5;
    }
    const yPad = (yMax - yMin) * 0.1;
    yMin -= yPad;
    yMax += yPad;

    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    const xAt = (t: number) =>
      pad.l + ((t - tMin) / Math.max(1, tMax - tMin)) * plotW;
    const yAt = (y: number) =>
      pad.t + (1 - (y - yMin) / (yMax - yMin)) * plotH;

    // axes
    ctx.strokeStyle = "#383d44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    ctx.fillStyle = "#6c727a";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(yMax.toFixed(2), pad.l - 4, pad.t);
    ctx.fillText(yMin.toFixed(2), pad.l - 4, pad.t + plotH);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`t=${tMin}`, pad.l, pad.t + plotH + 4);
    ctx.fillText(`t=${tMax}`, pad.l + plotW, pad.t + plotH + 4);

    ctx.fillStyle = "#6c727a";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("log ‖r⟂‖", pad.l, 0);

    // sample line
    ctx.strokeStyle = "#9ec5ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (const s of finite) {
      const px = xAt(s.t);
      const py = yAt(s.logNorm);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // fit overlay
    if (fit) {
      ctx.strokeStyle = "#ffb84d";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(xAt(fit.startT), yAt(fit.slope * fit.startT + fit.intercept));
      ctx.lineTo(xAt(fit.endT), yAt(fit.slope * fit.endT + fit.intercept));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [samples, fit, width, height]);

  return <canvas ref={canvasRef} className="convergence-plot" />;
}
