import { CATALOG, CATEGORIES } from "../core/catalog";
import { renderSound, summarize } from "../core/render";
import { BIT_DEPTH, SAMPLE_RATE, type CatalogResponse, type SoundSummary } from "../core/types";
import { encodeWav } from "../core/wav";
import { createZip } from "../core/zip";
import index from "../web/index.html";

interface LibraryEntry {
  readonly summary: SoundSummary;
  readonly wav: Uint8Array;
}

const started = performance.now();

// Render once at boot. Output is deterministic, so this is also the cache.
const library = new Map<string, LibraryEntry>();
for (const def of CATALOG) {
  const rendered = renderSound(def);
  library.set(def.id, {
    summary: summarize(rendered),
    wav: encodeWav(rendered.samples, SAMPLE_RATE),
  });
}

const summaries = [...library.values()].map((entry) => entry.summary);
const catalog: CatalogResponse = {
  sampleRate: SAMPLE_RATE,
  bitDepth: BIT_DEPTH,
  channels: 1,
  totalBytes: summaries.reduce((sum, s) => sum + s.bytes, 0),
  categories: CATEGORIES,
  sounds: summaries,
};

let packCache: Uint8Array | null = null;
function pack(): Uint8Array {
  packCache ??= createZip(
    [...library.entries()].map(([id, entry]) => ({ name: `${id}.wav`, data: entry.wav })),
  );
  return packCache;
}

const notFound = () => new Response("Not found", { status: 404 });

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/": index,

    "/api/health": () => Response.json({ ok: true, sounds: library.size }),

    "/api/sounds": () => Response.json(catalog, { headers: { "cache-control": "no-cache" } }),

    "/api/sounds/:file": (req) => {
      const file = req.params.file;
      if (!file.endsWith(".wav")) return notFound();
      const id = file.slice(0, -4);
      const entry = library.get(id);
      if (!entry) return notFound();

      const download = new URL(req.url).searchParams.has("download");
      return new Response(entry.wav, {
        headers: {
          "content-type": "audio/wav",
          "content-length": String(entry.wav.byteLength),
          "content-disposition": `${download ? "attachment" : "inline"}; filename="${id}.wav"`,
          "cache-control": "public, max-age=3600",
        },
      });
    },

    "/api/pack.zip": () => {
      const bytes = pack();
      return new Response(bytes, {
        headers: {
          "content-type": "application/zip",
          "content-length": String(bytes.byteLength),
          "content-disposition": 'attachment; filename="verdant-sounds.zip"',
        },
      });
    },
  },
  fetch: notFound,
});

console.log(
  `verdant  ${server.url}  ·  ${library.size} sounds rendered in ${(performance.now() - started).toFixed(0)} ms`,
);
