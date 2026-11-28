#!/usr/bin/env node
import {readFile,mkdir,lstat,realpath,writeFile,open,link,unlink,rename} from "node:fs/promises";
import {resolve,join,dirname,basename} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {validateRelease,searchSounds,getSound,catalogInfo,soundId,type Asset} from "../../src/agent/service.ts";
const origin="https://sound-library-zeta.vercel.app";
const sha=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
const exists=async(p:string)=>{try{return await lstat(p)}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e}};
async function bounded(url:string,max:number){
 const u=new URL(url);if(u.protocol!=="https:"||u.username||u.password)throw Error("Unsafe URL");
 const res=await fetch(u,{redirect:"error",signal:AbortSignal.timeout(8000)});
 if(!res.ok||!res.body)throw Error("Download failed");
 const reader=res.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw Error("Response too large");chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 return Buffer.concat(chunks);
}
async function catalog(){return validateRelease(JSON.parse((await bounded(origin+"/agents/v1/catalog.json",4*1024*1024)).toString("utf8")))}
async function verifyFile(path:string,a:Pick<Asset,"sha256"|"bytes">){const st=await exists(path);if(!st||!st.isFile()||st.isSymbolicLink()||st.size!==a.bytes)return false;return sha(await readFile(path))===a.sha256}
async function dir(path:string){const st=await exists(path);if(st){if(!st.isDirectory()||st.isSymbolicLink())throw Error("Unsafe directory");}else await mkdir(path);if(await realpath(path)!==path)throw Error("Directory escapes workspace");}
async function download(a:Asset){for(const url of new Set([a.primaryUrl,a.fallbackUrl])){try{const b=await bounded(url,a.bytes);if(b.length===a.bytes&&sha(b)===a.sha256&&b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WAVE")return b}catch{}}throw Error("Both origins failed integrity check")}
type Lock={schemaVersion:1;assets:Record<string,{releaseId:string;sha256:string;bytes:number;path:string;license:string;source:string}>};
async function readLock(path:string):Promise<Lock>{const st=await exists(path);if(!st)return {schemaVersion:1,assets:{}};if(!st.isFile()||st.isSymbolicLink()||st.size>1024*1024)throw Error("Unsafe lockfile");const l=JSON.parse(await readFile(path,"utf8")) as Lock;if(l.schemaVersion!==1||!l.assets||Array.isArray(l.assets)||typeof l.assets!=="object")throw Error("Invalid lockfile");for(const [id,a] of Object.entries(l.assets)){soundId(id);if(!/^[a-f0-9]{64}$/.test(a.sha256)||a.path!=="verdant-assets/"+a.sha256+".wav"||!Number.isSafeInteger(a.bytes)||a.bytes<46||a.bytes>4*1024*1024)throw Error("Invalid lock entry")}return l}
async function install(id:string,dry:boolean){const r=await catalog(),a=getSound(r,id).asset;if(!a||!r.releaseId)throw Error("Sound is not in an approved release");const relative="verdant-assets/"+a.sha256+".wav";if(dry)return {id,path:relative,releaseId:r.releaseId,sha256:a.sha256,bytes:a.bytes,dryRun:true};
 const root=await realpath(process.cwd()),assets=join(root,"verdant-assets");await dir(assets);
 const lease=join(root,".verdant-install.lock"),guard=await open(lease,"wx",0o600);
 try{const lockPath=join(root,"verdant.lock.json"),lock=await readLock(lockPath),old=lock.assets[id];if(old&&old.sha256!==a.sha256)throw Error("Revision changed; explicit update required");
 const target=join(root,relative),st=await exists(target);
 if(st&&!await verifyFile(target,a))throw Error("Refusing to overwrite mismatched file");
 if(!st){const bytes=await download(a),temp=join(assets,"."+randomUUID()+".tmp");try{await writeFile(temp,bytes,{flag:"wx",mode:0o644});await link(temp,target)}finally{await unlink(temp).catch(()=>{})}}
 if(!await verifyFile(target,a))throw Error("Installed file verification failed");
 lock.assets[id]={releaseId:r.releaseId,sha256:a.sha256,bytes:a.bytes,path:relative,license:a.license,source:a.source};
 const temp=join(root,".verdant-"+randomUUID()+".tmp");try{await writeFile(temp,JSON.stringify(lock,null,2)+"\n",{flag:"wx"});await rename(temp,lockPath)}finally{await unlink(temp).catch(()=>{})}
 return {id,path:relative,releaseId:r.releaseId,sha256:a.sha256,verified:true};
 }finally{await guard.close();await unlink(lease)}
}
async function main(){const [cmd,...args]=process.argv.slice(2);switch(cmd){
 case "search":return searchSounds(await catalog(),{query:args.join(" ")});
 case "get":return getSound(await catalog(),args[0]);
 case "catalog":return catalogInfo(await catalog());
 case "install":if(!args[0]||args.slice(1).some(x=>x!=="--dry-run"))throw Error("Usage: install <id> [--dry-run]");return install(soundId(args[0]),args.includes("--dry-run"));
 case "verify":{const root=await realpath(process.cwd());const l=await readLock(join(root,"verdant.lock.json"));const items=[];for(const [id,a] of Object.entries(l.assets)){const parent=await exists(join(root,"verdant-assets"));items.push({id,verified:!!parent&&parent.isDirectory()&&!parent.isSymbolicLink()&&await verifyFile(join(root,a.path),a)})}if(!items.length||items.some(a=>!a.verified))process.exitCode=1;return {items}}
 case "doctor":return {node:process.version,...catalogInfo(await catalog())};
 default:throw Error("Usage: verdant search <query> | get <id> | catalog | install <id> [--dry-run] | verify | doctor");
}}
main().then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(JSON.stringify({error:e instanceof Error?e.message:"Command failed"}));process.exitCode=1});
