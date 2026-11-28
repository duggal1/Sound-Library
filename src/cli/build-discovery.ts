/** Generate crawlable HTML and agent discovery assets from the published catalog. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { socialCard } from "./social-card";
import type { CatalogResponse, SoundSummary } from "../core/types";
import { BRAND, DESCRIPTION, siteOrigin, pages, categoryNames, eligibleSounds, soundPath, categoryPath, agentCatalog, metadata, sitemap, escapeHtml as e, type Page } from "../core/discovery";

const root=resolve("dist");
const origin=siteOrigin(process.env.SITE_URL);
const approved=JSON.parse(await readFile(join(root,"agents/v1/catalog.json"),"utf8")) as import("../agent/service").Release;
const catalog=JSON.parse(await readFile(join(root,"sounds/catalog.json"),"utf8")) as CatalogResponse;
const sounds=eligibleSounds(catalog);
const html=await readFile(join(root,"index.html"),"utf8");
const indexable:string[]=[];
const write=async(path:string,content:string|Uint8Array)=>{
  const file=join(root,path); await mkdir(resolve(file,".."),{recursive:true}); await writeFile(file,content);
};
const link=(path:string,label:string)=>'<a href="'+e(path)+'">'+e(label)+'</a>';
const nav='<nav aria-label="Discovery">'+link("/","Verdant")+' · '+link("/library","Library")+' · '+link("/studio","Studio")+' · '+link("/agents","For agents")+'</nav>';
const list=(items:readonly SoundSummary[])=>'<ul>'+items.map(s=>'<li>'+link(soundPath(s),s.name)+' — '+e(s.description)+'</li>').join("")+'</ul>';
const categories=()=>'<ul>'+catalog.categories.map(c=>'<li>'+link(categoryPath(c.id),categoryNames[c.id]??c.label)+'</li>').join("")+'</ul>';
const website={"@context":"https://schema.org","@type":"WebSite","name":BRAND,"url":origin,"description":DESCRIPTION};
const collection=(page:Page,items:readonly SoundSummary[])=>({"@context":"https://schema.org","@type":"CollectionPage","name":page.heading,"description":page.description,"url":origin+page.path,"isPartOf":{"@type":"WebSite","name":BRAND,"url":origin},"mainEntity":{"@type":"ItemList","itemListElement":items.map((s,i)=>({"@type":"ListItem","position":i+1,"url":origin+soundPath(s),"name":s.name}))}});
const pageStyle='<style>body.discovery{font:16px/1.6 system-ui,sans-serif;color:#202020;background:#fff;margin:0} .discovery main,.discovery nav{max-width:760px;margin:auto;padding:24px} .discovery h1{font-size:clamp(28px,5vw,44px);line-height:1.15;font-weight:500} .discovery a{color:#225b45} .discovery li{margin:9px 0} .discovery audio{display:block;max-width:100%;margin:20px 0} .discovery dd{margin-bottom:10px} .discovery p{max-width:65ch}</style>';
async function publish(page:Page,content:string,schema:unknown,app=false){
  const head=metadata(page,origin,schema);
  const body=nav+'<main><h1>'+e(page.heading)+'</h1>'+content+'</main>';
  // App routes carry useful fallback HTML in the root. React replaces it with the existing interactive UI.
  const document=app?html.replace(/<title>[\s\S]*?<\/title>/,()=>head).replace('<div id="root"></div>','<div id="root" class="discovery">'+body+'</div>').replace('</head>',pageStyle.replace(/body\.discovery/g,"#root.discovery")+ '</head>'):
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head+pageStyle+'</head><body class="discovery">'+body+'</body></html>';
  // Replace root fallback styling when React mounts, without leaking styles into the application.
  const result=app?document.replace('id="root" class="discovery"','id="root"').replace(pageStyle.replace(/body\.discovery/g,"#root.discovery"),""):document;
  await write(page.path==="/"?"index.html":page.path.slice(1)+".html",result);
  if(!page.noindex)indexable.push(page.path);
}
for(const page of pages){
  let content='<p>'+e(page.description)+'</p>';
  if(page.path==="/")content+='<p>Interface sounds are often scattered across general-purpose sound libraries. Verdant brings UI-specific recordings and synthesized effects together in a searchable collection with consistent WAV files, measured audio properties and source information.</p><p>'+link("/library","Browse the library")+' · '+link("/agents","Use sounds with coding agents")+'</p>'+categories();
  if(page.path==="/library")content+=categories()+list(sounds);
  if(page.path==="/studio")content+='<p>'+link("/library","Choose a sound to audition")+'</p>';
  if(page.path==="/agents")content+='<h2>Install Verdant for coding agents</h2><p>One portable skill, a read-only MCP service and a local verified installer. The release is '+e(approved.status)+'.</p><p>'+link("/agents/v1/SKILL.md","Read the skill")+' · '+link("/agents/v1/plugin.zip","Download plugin bundle")+' · '+link("/agents/v1/catalog.json","Approved catalog")+' · '+link("/agents/v1/catalog.jsonl","JSONL")+'</p><p>Use the MCP endpoint /api/mcp to search or resolve a pack. Verify the exact WAV hash before installing.</p>';
  await publish(page,content,page.path==="/"?website:page.path==="/library"?collection(page,sounds):{"@context":"https://schema.org","@type":"WebPage","name":page.heading,"description":page.description,"url":origin+page.path},true);
}
for(const category of catalog.categories){
  const items=sounds.filter(s=>s.category===category.id);
  if(!items.length)continue;
  const name=categoryNames[category.id]??category.label;
  const page={path:categoryPath(category.id),title:name+" — WAV for Software | Verdant",description:"Browse "+name.toLowerCase()+" for software interfaces. Preview WAV files and check duration, measured audio properties and provenance.",heading:name};
  await publish(page,'<p>'+e(page.description)+'</p>'+list(items)+'<p>'+link("/agents","Retrieve sounds programmatically")+'</p>',collection(page,items));
}
for(const s of sounds){
  const page={path:soundPath(s),title:s.name+" — UI Sound Effect WAV | Verdant",description:s.description+" Preview and download this interface sound in WAV format.",heading:s.name+" sound effect"};
  const download="/sounds/"+s.id+".wav";
  const preview=s.previewUrl?.startsWith("/sounds/preview/")?s.previewUrl:download;
  const license=s.source?.license??"Not recorded; verify rights before redistribution";
  const review=s.review??"Not recorded";
  const details='<p>'+e(s.description)+'</p><audio controls preload="none" src="'+e(preview)+'"></audio><p><a href="'+e(download)+'" download>Download WAV</a></p><dl><dt>Category</dt><dd>'+link(categoryPath(s.category),categoryNames[s.category]??s.category)+'</dd><dt>Duration</dt><dd>'+Math.round(s.duration*1000)+' ms</dd><dt>Format</dt><dd>'+catalog.sampleRate+' Hz, '+catalog.bitDepth+'-bit mono WAV</dd><dt>License</dt><dd>'+e(license)+'</dd><dt>Listening review</dt><dd>'+e(review)+'</dd>'+(s.source?'<dt>Source</dt><dd>'+e(s.source.name)+' — '+e(s.source.author)+'</dd>':'')+'</dl><p>'+link("/library","Browse all sounds")+' · '+link("/agents","Agent integration")+'</p>';
  await publish(page,details,{"@context":"https://schema.org","@type":"AudioObject","name":s.name,"description":s.description,"url":origin+page.path,"contentUrl":origin+download,"encodingFormat":"audio/wav","duration":"PT"+s.duration+"S",...(s.source?.license==="CC0-1.0"?{license:"https://creativecommons.org/publicdomain/zero/1.0/"}:{})});
}
await write("agents/catalog.json",JSON.stringify({...agentCatalog(catalog,origin),releaseId:approved.releaseId,status:approved.status,sounds:approved.sounds.map(s=>({...s,durationSeconds:s.durationMs/1000,downloadUrl:s.primaryUrl,previewUrl:s.primaryUrl,review:"approved"}))},null,2));
await write("llms.txt","# Verdant\n\n> "+DESCRIPTION+"\n\n- [MCP endpoint]("+origin+"/api/mcp): Read-only sound tools.\n- [Agent skill]("+origin+"/agents/v1/SKILL.md): Installation and integration guidance.\n- [Agent integration]("+origin+"/agents): Retrieval instructions and license checks.\n- [Sound catalog]("+origin+"/agents/catalog.json): Stable IDs, WAV links, duration, hashes and provenance.\n- [Library]("+origin+"/library): Browse sounds.\n- [Source credits]("+origin+"/sounds/credits.md): Rights and review status.\n\nDo not assume an unspecified license grants redistribution rights.\n");
await write("social-card.png",socialCard());
await write("sitemap.xml",sitemap(origin,indexable));
await write("robots.txt","User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml\n");
console.log("Published "+indexable.length+" indexable pages and "+sounds.length+" agent catalog records.");
