import {createHash} from "node:crypto";
export const sha256=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
export const HASH=/^[a-f0-9]{64}$/;
export function publicBase(value:string):string{
 const u=new URL(value);
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname.includes("%")||u.pathname.split("/").includes(".."))throw new Error("Invalid public storage URL");
 return u.href.replace(/\/+$/,"");
}
export function releaseId(catalog:string,pack:Uint8Array,credits:Uint8Array,license:Uint8Array){
 return sha256(JSON.stringify(["verdant-v1",sha256(catalog),sha256(pack),sha256(credits),sha256(license)]));
}
export function assetKey(hash:string){if(!HASH.test(hash))throw new Error("Invalid asset hash");return "audio/"+hash+".wav";}
