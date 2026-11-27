import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CATALOG } from "../core/catalog";
import { renderSound, summarize } from "../core/render";
import { SAMPLE_RATE } from "../core/types";
import { encodeWav } from "../core/wav";

// bun run generate [outDir]
const out = resolve(process.argv[2] ?? process.env.OUT_DIR ?? "generated-sounds");
await mkdir(out, { recursive: true });

const manifest = [];
for (const def of CATALOG) {
  const rendered = renderSound(def);
  const destination = join(out, `${def.id}.wav`);
  await writeFile(destination, encodeWav(rendered.samples, SAMPLE_RATE));

  const { duration, peak } = rendered.metrics;
  console.log(`${`${def.id}.wav`.padEnd(24)} ${duration.toFixed(2)}s, peak ${(peak * 100).toFixed(2)}%`);
  manifest.push(summarize(rendered));
}

await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${CATALOG.length} files -> ${out}`);
