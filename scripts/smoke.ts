import { PRESETS } from "../src/presets/index.ts";
import { computeDiagnostics } from "../src/model/diagnostics.ts";

for (const p of PRESETS) {
  const d = computeDiagnostics(p.nodes, p.edges, p.defaults);
  console.log(`\n=== ${p.name} (N=${p.nodes.length}) ===`);
  console.log(`  regime         : ${d.regime}`);
  console.log(`  reason         : ${d.reason}`);
  console.log(`  compression    : ${d.compressionStrength.toFixed(3)}`);
  console.log(`  scalarityDefect: ${d.scalarityDefect.toFixed(3)}`);
  console.log(`  retainedK      : ${d.retainedK}`);
  console.log(`  leakageRatio   : ${d.leakageRatio.toFixed(3)}`);
  console.log(`  basinWitness   : ${d.basinWitness}`);
  console.log(`  decayRates (top5): ${d.decayRates.slice(0, 5).map((x) => x.toFixed(3)).join(", ")}`);
}
