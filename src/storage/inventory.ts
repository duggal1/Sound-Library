import {readFile,realpath} from "node:fs/promises";
import {resolve,join,sep} from "node:path";
import type {CatalogResponse} from "../core/types";
import {assetKey,releaseId,sha256,HASH} from "./release";
import {createZip,type ZipEntry} from "../core/zip";

export interface ReleaseObject {key:string;bytes:Uint8Array;hash:string;type:string;disposition?:string}
const obj=(key:string,bytes:Uint8Array,type:string,disposition?:string):ReleaseObject=>({key,bytes,hash:sha256(bytes),type,disposition});
const encode=(s:string)=>new TextEncoder().encode(s);
export async function buildInventory(root=resolve(".generated-public/sounds")){
 const base=await realpath(root);
 const safeRead=async(name:string)=>{
  if(!/^[a-z0-9][a-z0-9.-]*$/i.test(name))throw new Error("Invalid asset filename");
  const path=await realpath(join(base,name));
  if(!path.startsWith(base+sep))throw new Error("Asset escapes release directory");
  return readFile(path);
 };
 const raw=JSON.parse((await safeRead("catalog.json")).toString("utf8")) as CatalogResponse;
 const {storage:_,...catalog}=raw;
 if(catalog.sampleRate!==48000||catalog.bitDepth!==16||catalog.channels!==1||!Array.isArray(catalog.sounds)||!catalog.sounds.length)throw new Error("Invalid catalog");
 const pack=await safeRead("pack.zip"),credits=await safeRead("credits.md"),license=await safeRead("trazo-MIT.txt");
 const canonical=JSON.stringify(catalog),release=releaseId(canonical,pack,credits,license);
 const unique=new Map<string,ReleaseObject>(),ids=new Set<string>(),records=[];
 let logicalBytes=0;
 const zipEntries:ZipEntry[]=[];
 for(const sound of catalog.sounds){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sound.id)||ids.has(sound.id)||!sound.sha256||!HASH.test(sound.sha256)||sound.importedMouse||sound.keyboardTheme==="modern")throw new Error("Invalid or preview-only catalog entry");
  if(sound.source&&sound.source.license!=="CC0-1.0")throw new Error("Non-redistributable source");
  ids.add(sound.id);
  const bytes=await safeRead(sound.id+".wav");
  if(bytes.byteLength!==sound.bytes||sha256(bytes)!==sound.sha256)throw new Error("WAV checksum mismatch: "+sound.id);
  logicalBytes+=bytes.byteLength;
  zipEntries.push({name:sound.id+".wav",data:bytes});
  const key=assetKey(sound.sha256);
  if(!unique.has(key))unique.set(key,obj(key,bytes,"audio/wav"));
  records.push({...sound,assetKey:key,previewUrl:key,downloadUrl:key,filename:sound.id+".wav",sampleRate:48000,channels:1,mimeType:"audio/wav"});
 }
 if(logicalBytes!==catalog.totalBytes)throw new Error("Catalog byte count mismatch");
 zipEntries.push({name:"Sound credits.md",data:credits},{name:"trazo-MIT.txt",data:license});
 if(sha256(createZip(zipEntries,new Date(1980,0,1)))!==sha256(pack))throw new Error("ZIP contents do not match catalog");
 const prefix="releases/"+release+"/";
 const packKey=prefix+"pack.zip";
 const files=[...unique.values()];
 const metadata=[
  obj(packKey,pack,"application/zip",'attachment; filename="verdant-sounds.zip"'),
  obj(prefix+"credits.md",credits,"text/markdown; charset=utf-8"),
  obj(prefix+"trazo-MIT.txt",license,"text/plain; charset=utf-8"),
  obj(prefix+"catalog.json",encode(JSON.stringify({...catalog,schemaVersion:1,releaseId:release,packKey,sounds:records})),"application/json"),
  obj(prefix+"catalog.jsonl",encode(records.map(record=>JSON.stringify(record)).join("\n")+"\n"),"application/x-ndjson")
 ];
 const inventory= [...files,...metadata].map(({key,hash,bytes,type})=>({key,sha256:hash,bytes:bytes.byteLength,type}));
 metadata.push(obj(prefix+"inventory.json",encode(JSON.stringify({schemaVersion:1,releaseId:release,catalogSha256:sha256(canonical),soundCount:ids.size,uniqueAudio:unique.size,logicalBytes,objects:inventory})),"application/json"));
 return {release,files,metadata,soundCount:ids.size,uniqueAudio:unique.size,logicalBytes,packHash:sha256(pack)};
}
