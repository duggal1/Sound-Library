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
const htmlPage = async (path: string) => { const file=Bun.file(join(output,path+".html")); return await file.exists()?new Response(file,{headers:revalidate}):notFound(); };
const serve = (path: string, headers: HeadersInit = revalidate) => new Response(Bun.file(join(output, path)), {headers});

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/": page, "/library": () => htmlPage("library"), "/studio": () => htmlPage("studio"), "/saved": () => htmlPage("saved"),
    "/agents": () => htmlPage("agents"),
    "/agents/catalog.json": () => serve("agents/catalog.json"),
    "/agents/v1/:file": req => ["catalog.json","catalog.jsonl","latest.json","SKILL.md","plugin.zip","verdant.mjs"].includes(req.params.file)?serve("agents/v1/"+req.params.file):notFound(),
    "/agents/v1/audio/:file": async req=>{const file=req.params.file;if(!/^[a-f0-9]{64}\.wav$/.test(file))return notFound();const path="agents/v1/audio/"+file;return await Bun.file(join(output,path)).exists()?serve(path,immutable):notFound();},
    "/agents/v1/releases/:id/:file": async req=>{const {id,file}=req.params;if(!/^[a-f0-9]{64}$/.test(id)||!["catalog.json","catalog.jsonl","pack.zip"].includes(file))return notFound();const path="agents/v1/releases/"+id+"/"+file;return await Bun.file(join(output,path)).exists()?serve(path,immutable):notFound();},
    "/llms.txt": () => serve("llms.txt"), "/robots.txt": () => serve("robots.txt"), "/sitemap.xml": () => serve("sitemap.xml"), "/social-card.png": () => serve("social-card.png"),
    "/effects/category/:category": req => /^[a-z0-9-]+$/.test(req.params.category)?htmlPage("effects/category/"+req.params.category):notFound(),
    "/effects/:id": req => /^[a-z0-9-]+$/.test(req.params.id)?htmlPage("effects/"+req.params.id):notFound(),
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
