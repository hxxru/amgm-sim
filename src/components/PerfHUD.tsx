interface Props {
  fps: number;
  actualStepsPerSec: number;
  targetStepsPerSec: number;
}

export function PerfHUD({ fps, actualStepsPerSec, targetStepsPerSec }: Props) {
  const lagging = actualStepsPerSec < targetStepsPerSec * 0.85;
  return (
    <div className={"perf-hud" + (lagging ? " perf-lag" : " perf-ok")}>
      <span>{fps.toFixed(0)} fps</span>
      <span>·</span>
      <span>
        {actualStepsPerSec.toFixed(0)} / {targetStepsPerSec} steps/s
      </span>
      <span>·</span>
      <span>{lagging ? "lagging" : "ok"}</span>
    </div>
  );
}
