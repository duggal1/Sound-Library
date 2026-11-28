import type {CatalogResponse} from "../core/types";
type Storage=NonNullable<CatalogResponse["storage"]>;
type Ref={id:string;previewUrl?:string;sha256?:string;bytes?:number};
const hashPattern=/^[a-f0-9]{64}$/;
export function verifiedStorage(value:unknown):Storage|undefined{
 if(!value||typeof value!=="object")return;
 const s=value as Storage;
 if(!hashPattern.test(s.releaseId)||s.packKey!=="releases/"+s.releaseId+"/pack.zip")return;
 try{const u=new URL(s.publicBase);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname.includes("%"))return;
 return {...s,publicBase:u.href.replace(/\/+$/,"")};}catch{return;}
}
export function assetCandidates(sound:Ref,storage?:Storage):string[]{
 const fallback=/^\/sounds\/preview\/[a-f0-9]{20}\.wav$/.test(sound.previewUrl??"")?sound.previewUrl!:"/sounds/"+encodeURIComponent(sound.id)+".wav";
 return storage&&sound.sha256&&hashPattern.test(sound.sha256)?[storage.publicBase+"/audio/"+sound.sha256+".wav",fallback]:[fallback];
}
async function checksum(bytes:ArrayBuffer,expected:string){
 if(!globalThis.crypto?.subtle)throw new Error("Integrity API unavailable");
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),n=>n.toString(16).padStart(2,"0")).join("");
 if(hash!==expected)throw new Error("WAV checksum mismatch");
}
export async function fetchWavBytes(sound:Ref,storage?:Storage,priority:"high"|"low"="high"):Promise<ArrayBuffer>{
 const candidates=assetCandidates(sound,storage);
 for(let i=0;i<candidates.length;i++){
  try{
   const res=await fetch(candidates[i]!,{priority,signal:AbortSignal.timeout(i===0&&candidates.length>1?2500:5000),redirect:"error"});
   if(!res.ok||res.headers.get("content-type")?.includes("text/html"))throw new Error("Invalid audio response");
   const bytes=await res.arrayBuffer();
   if(sound.bytes!==undefined&&bytes.byteLength!==sound.bytes)throw new Error("WAV length mismatch");
   if(sound.sha256&&hashPattern.test(sound.sha256)&&globalThis.crypto?.subtle)await checksum(bytes,sound.sha256);
   else if(i===0&&candidates.length>1)throw new Error("Remote integrity API unavailable");
   return bytes;
  }catch{if(i===candidates.length-1)throw new Error("Sound unavailable");}
 }
 throw new Error("Sound unavailable");
}
function anchor(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();}
export async function downloadRemoteSound(sound:Ref,storage:Storage){
 const filename=sound.id+".wav";
 try{const bytes=await fetchWavBytes(sound,storage);const url=URL.createObjectURL(new Blob([bytes],{type:"audio/wav"}));anchor(url,filename);setTimeout(()=>URL.revokeObjectURL(url),30000);}
 catch{anchor("/sounds/"+encodeURIComponent(filename),filename);}
}
export async function downloadRemotePack(storage:Storage){
 const url=storage.publicBase+"/"+storage.packKey;
 try{const res=await fetch(url,{method:"HEAD",signal:AbortSignal.timeout(2500),redirect:"error"});
 if(!res.ok||!res.headers.get("content-type")?.includes("application/zip"))throw new Error("Pack unavailable");
 anchor(url,"verdant-sounds.zip");}catch{anchor("/sounds/pack.zip","verdant-sounds.zip");}
}
