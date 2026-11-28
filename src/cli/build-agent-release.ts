/** Only explicit hash-bound rights and listening approval can activate agent delivery. */
import {mkdir,readFile,writeFile,rm} from "node:fs/promises";
import {resolve,join} from "node:path";
import {sha256} from "../storage/release";
import {createZip,type ZipEntry} from "../core/zip";
import {siteOrigin} from "../core/discovery";
import type {CatalogResponse} from "../core/types";
import {validateRelease,HASH,type Asset,type Release} from "../agent/service";
const root=resolve(".generated-public"),folder=join(root,"agents/v1");
const catalog=JSON.parse(await readFile(join(root,"sounds/catalog.json"),"utf8")) as CatalogResponse;
const ledger=JSON.parse(await readFile("licenses/agent-approvals.json","utf8")) as {schemaVersion:number;approvals:Record<string,{sha256:string;license:string;rightsEvidence:string;reviewEvidence:string;events:string[];tags:string[];family:string;repeatSafe:boolean}>};
if(ledger.schemaVersion!==1||!ledger.approvals||Array.isArray(ledger.approvals))throw Error("Invalid approval ledger");
const origin=siteOrigin(process.env.SITE_URL);
if(!origin.startsWith("https://"))throw Error("Agent release needs HTTPS origin");
await rm(folder,{recursive:true,force:true});await mkdir(join(folder,"audio"),{recursive:true});
const sounds:Asset[]=[],entries:ZipEntry[]=[];
for(const s of catalog.sounds){
 const a=Object.hasOwn(ledger.approvals,s.id)?ledger.approvals[s.id]:undefined;if(!a)continue;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id))throw Error("Unsafe approved ID");
 if(s.importedMouse||s.keyboardTheme==="modern"||!s.sha256||!HASH.test(s.sha256)||a.sha256!==s.sha256||!a.rightsEvidence?.trim()||!a.reviewEvidence?.trim())throw Error("Invalid approval: "+s.id);
 if(s.source&&a.license!==s.source.license)throw Error("Conflicting rights: "+s.id);
 const bytes=await readFile(join(root,"sounds",s.id+".wav"));
 if(bytes.byteLength!==s.bytes||sha256(bytes)!==s.sha256)throw Error("Asset hash mismatch: "+s.id);
 const fallbackUrl=origin+"/agents/v1/audio/"+s.sha256+".wav";
 const primaryUrl=catalog.storage?catalog.storage.publicBase+"/audio/"+s.sha256+".wav":fallbackUrl;
 const asset:Asset={id:s.id,name:s.name,description:s.description,category:s.category,sha256:s.sha256,bytes:s.bytes,durationMs:Math.round(s.duration*1000),peakDb:s.peakDb,rmsDb:s.rmsDb,license:a.license,source:a.rightsEvidence,reviewEvidence:a.reviewEvidence,events:a.events,tags:a.tags,family:a.family,repeatSafe:a.repeatSafe,primaryUrl,fallbackUrl};
 sounds.push(asset);entries.push({name:s.id+".wav",data:bytes});await writeFile(join(folder,"audio",s.sha256+".wav"),bytes);
}
for(const id of Object.keys(ledger.approvals))if(!sounds.some(s=>s.id===id))throw Error("Stale approval: "+id);
sounds.sort((a,b)=>a.id<b.id?-1:1);
entries.sort((a,b)=>a.name<b.name?-1:1);
let packUrl:string|null=null,packSha256:string|null=null,releaseId:string|null=null;
if(sounds.length){
 entries.push({name:"provenance.json",data:new TextEncoder().encode(JSON.stringify(sounds))});
 for(const name of ["sound-collection.md","trazo-MIT.txt"])entries.push({name,data:await readFile(join("licenses",name))});
 const zip=createZip(entries,new Date(1980,0,1));packSha256=sha256(zip);releaseId=sha256(JSON.stringify({schemaVersion:1,sounds,packSha256}));packUrl=origin+"/agents/v1/releases/"+releaseId+"/pack.zip";
 const dir=join(folder,"releases",releaseId);await mkdir(dir,{recursive:true});await writeFile(join(dir,"pack.zip"),zip);
}
const prefix=origin+"/agents/v1";
const release:Release=validateRelease({schemaVersion:1,status:sounds.length?"ready":"awaiting-review",releaseId,sounds,catalogUrl:prefix+"/catalog.json",jsonlUrl:prefix+"/catalog.jsonl",packUrl,packSha256});
const json=JSON.stringify(release);
await writeFile(join(folder,"latest.json"),JSON.stringify({schemaVersion:1,status:release.status,releaseId:release.releaseId,catalogUrl:release.catalogUrl,packUrl:release.packUrl}));
await writeFile(join(folder,"catalog.json"),json);await writeFile(join(folder,"catalog.jsonl"),sounds.map(s=>JSON.stringify(s)).join("\n")+(sounds.length?"\n":""));
if(releaseId){const dir=join(folder,"releases",releaseId);await writeFile(join(dir,"catalog.json"),json);await writeFile(join(dir,"catalog.jsonl"),sounds.map(s=>JSON.stringify(s)).join("\n")+"\n");}
console.log("Agent release: "+release.status+" ("+sounds.length+" approved sounds)");
