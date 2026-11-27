import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CATALOG, CATEGORIES } from "../core/catalog";
import { renderSound, summarize } from "../core/render";
import { BIT_DEPTH, SAMPLE_RATE, type CatalogResponse, type SoundSummary } from "../core/types";
import { encodeWav } from "../core/wav";
import { createZip, type ZipEntry } from "../core/zip";

// bun run generate [outDir]
const out = resolve(process.argv[2] ?? process.env.OUT_DIR ?? "public/sounds");
await mkdir(out, { recursive: true });

const sounds: SoundSummary[] = [];
const entries: ZipEntry[] = [];
for (const def of CATALOG) {
  const rendered = renderSound(def);
  const destination = join(out, `${def.id}.wav`);
  const wav = encodeWav(rendered.samples, SAMPLE_RATE);
  await writeFile(destination, wav);
  entries.push({ name: `${def.id}.wav`, data: wav });

  const { duration, peak } = rendered.metrics;
  console.log(`${`${def.id}.wav`.padEnd(24)} ${duration.toFixed(2)}s, peak ${(peak * 100).toFixed(2)}%`);
  sounds.push(summarize(rendered));
}

const catalog: CatalogResponse = {
  sampleRate: SAMPLE_RATE,
  bitDepth: BIT_DEPTH,
  channels: 1,
  totalBytes: sounds.reduce((sum, sound) => sum + sound.bytes, 0),
  categories: CATEGORIES,
  sounds,
};
await writeFile(join(out, "catalog.json"), JSON.stringify(catalog, null, 2));
await writeFile(join(out, "pack.zip"), createZip(entries, new Date(1980, 0, 1)));
console.log(`\n${CATALOG.length} files -> ${out}`);
