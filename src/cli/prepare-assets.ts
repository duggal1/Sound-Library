/** Build-only audio publication. The approved baseline WAVs are copied byte-for-byte.
 * Rebuild only seven revised sounds, then publish matching metadata, ZIP and a
 * content-addressed preview bank. No runtime synthesis or server required.
 */
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { CATALOG, CATEGORIES } from "../core/catalog";
import { renderSound, summarize } from "../core/render";
import { SAMPLE_RATE, BIT_DEPTH, type CatalogResponse, type SoundSummary } from "../core/types";
import { encodeWav } from "../core/wav";
import { createZip, type ZipEntry } from "../core/zip";

const rejected = new Set(["drag", "hover", "send", "dismiss", "swipe", "close", "open"]);
const source = resolve("public");
const output = resolve(".generated-public");
const baseline = JSON.parse(await readFile(join(source,"sounds/catalog.json"),"utf8")) as CatalogResponse;
const byId = new Map(baseline.sounds.map(sound => [sound.id,sound]));
await rm(output,{recursive:true,force:true});
await cp(source,output,{recursive:true});
const directory = join(output,"sounds");
const entries: ZipEntry[] = [];
const sounds: SoundSummary[] = [];
for (const def of CATALOG) {
  let wav: Uint8Array;
  let summary: SoundSummary;
  if (rejected.has(def.id)) {
    const rendered=renderSound(def);
    wav=encodeWav(rendered.samples,SAMPLE_RATE);
    summary=summarize(rendered);
    if (!Number.isFinite(summary.rms) || summary.peak > .55 || summary.duration > .32 || summary.rms <= 0)
      throw new Error("Invalid replacement: "+def.id);
    await writeFile(join(directory,def.id+".wav"),wav);
  } else {
    const original=byId.get(def.id);
    if (!original) throw new Error("Missing approved baseline: "+def.id);
    summary=original;
    wav=await readFile(join(source,"sounds",def.id+".wav"));
  }
  if(wav.byteLength!==summary.bytes)throw new Error("Asset/catalog mismatch: "+def.id);
  entries.push({name:def.id+".wav",data:wav});
  sounds.push(summary);
}
const totalBytes=sounds.reduce((sum,sound)=>sum+sound.bytes,0);
const bank=new Uint8Array(totalBytes);
let cursor=0;
for(const entry of entries){bank.set(entry.data,cursor);cursor+=entry.data.byteLength;}
const hash=createHash("sha256").update(bank).digest("hex").slice(0,24);
const previewBank="/sounds/bank/"+hash+".bin";
await mkdir(join(directory,"bank"),{recursive:true});
await writeFile(join(output,previewBank.slice(1)),bank);
const result:CatalogResponse={sampleRate:SAMPLE_RATE,bitDepth:BIT_DEPTH,channels:1,totalBytes,categories:CATEGORIES,sounds,previewBank};
await Promise.all([
  writeFile(join(directory,"catalog.json"),JSON.stringify(result,null,2)),
  writeFile(join(directory,"pack.zip"),createZip(entries,new Date(1980,0,1))),
]);
console.log("Published "+sounds.length+" sounds; "+rejected.size+" replacements; "+totalBytes+" byte preview bank.");
