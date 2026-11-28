import { join, resolve } from "node:path";
import type { CatalogResponse } from "../core/types";

const output = resolve(import.meta.dirname, "../../dist");
const index = Bun.file(join(output, "index.html"));
const manifest = Bun.file(join(output, "sounds/catalog.json"));
if (!await index.exists() || !await manifest.exists()) throw new Error("Run bun run build before starting the server.");

const catalog = await manifest.json() as CatalogResponse;
const assets = new Set(catalog.sounds.map(sound => sound.id + ".wav"));
const previews = new Set(catalog.sounds.map(sound => sound.previewUrl?.split("/").at(-1)));
const revalidate = {"cache-control": "public, max-age=0, must-revalidate"};
const immutable = {"cache-control": "public, max-age=31536000, immutable"};
const notFound = () => new Response("Not found", {status: 404});
const page = () => new Response(index, {headers: revalidate});
const serve = (path: string, headers: HeadersInit = revalidate) => new Response(Bun.file(join(output, path)), {headers});

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/": page, "/library": page, "/studio": page, "/saved": page,
    "/api/health": () => Response.json({ok: true, sounds: catalog.sounds.length}),
    "/api/sounds": () => new Response(manifest, {headers: revalidate}),
    "/api/sounds/:file": req => {
      const file = req.params.file;
      if (!assets.has(file)) return notFound();
      const disposition = new URL(req.url).searchParams.has("download") ? "attachment" : "inline";
      return serve("sounds/" + file, {...revalidate, "content-disposition": `${disposition}; filename="${file}"`});
    },
    "/api/pack.zip": () => serve("sounds/pack.zip", {...revalidate, "content-disposition": 'attachment; filename="verdant-sounds.zip"'}),
    "/sounds/:file": req => {
      const {file} = req.params;
      return assets.has(file) || ["catalog.json", "pack.zip", "credits.md", "trazo-MIT.txt"].includes(file) ? serve("sounds/" + file) : notFound();
    },
    "/sounds/catalog/:file": req => ["config.json","audio.ogg"].includes(req.params.file) ? serve("sounds/catalog/"+req.params.file) : notFound(),
    "/sounds/catalog/mouse/collection/:folder/:file": req => {const {folder,file}=req.params;if(!/^sound-[1-4]$/.test(folder)||!(/^(config\.json|[1-5]\.mp3|audio\.(mp3|ogg)|concatenated_audio\.wav)$/.test(file)))return notFound();return serve("sounds/catalog/mouse/collection/"+folder+"/"+file);},
    "/sounds/preview/:file": req => previews.has(req.params.file) ? serve("sounds/preview/" + req.params.file, immutable) : notFound(),
    "/assets/:file": async req => {
      const {file} = req.params;
      if (!/^[\w-]+\.[\w]+$/.test(file)) return notFound();
      const path = Bun.file(join(output, "assets", file));
      return await path.exists() ? new Response(path, {headers: immutable}) : notFound();
    },
  },
  fetch: notFound,
});

console.log(`Verdant available at ${server.url} with ${catalog.sounds.length} sounds.`);
