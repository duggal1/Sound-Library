import {buildInventory,type ReleaseObject} from "../../src/storage/inventory";
import {publicBase,sha256} from "../../src/storage/release";
import {writeFile} from "node:fs/promises";

const mode=process.argv[2];
if(!["plan","publish","verify"].includes(mode??""))throw new Error("Use plan, publish or verify");
const plan=await buildInventory();
const summary={releaseId:plan.release,sounds:plan.soundCount,uniqueAudio:plan.uniqueAudio,logicalBytes:plan.logicalBytes,packSha256:plan.packHash};
if(mode==="plan"){console.log(JSON.stringify(summary,null,2));process.exit(0);}
const env=(name:string)=>{const value=process.env[name];if(!value)throw new Error("Missing "+name);return value;};
try{
 if(process.env.SOUND_CREDENTIAL_ROTATED!=="yes")throw new Error("Fresh credential confirmation required");
 const endpoint=publicBase(env("AWS_ENDPOINT_URL_S3"));
 if(new URL(endpoint).pathname!=="/")throw new Error("Endpoint must be a branch origin");
 const bucket=env("SOUND_BUCKET");
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw new Error("Invalid bucket");
 if(process.env.SOUND_PUBLISH_CONFIRM!==bucket)throw new Error("Confirm the dedicated public bucket");
 const origin=endpoint+"/"+bucket,base=publicBase(process.env.SOUND_CDN_BASE_URL||process.env.SOUND_PUBLIC_BASE_URL||origin);
 const corsOrigin=new URL(env("SOUND_BROWSER_ORIGIN")).origin;
 const sdk=await import("@aws-sdk/client-s3");
 const client=new sdk.S3Client({endpoint,region:env("AWS_REGION"),credentials:{accessKeyId:env("AWS_ACCESS_KEY_ID"),secretAccessKey:env("AWS_SECRET_ACCESS_KEY")},forcePathStyle:true,maxAttempts:3,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"});
 const send=<T>(command:T)=>client.send(command as any,{abortSignal:AbortSignal.timeout(20000)});
 // Typed command calls below use their concrete response type.
 await client.send(new sdk.HeadBucketCommand({Bucket:bucket}),{abortSignal:AbortSignal.timeout(10000)});
 let uploaded=0,skipped=0,verified=0,uploadedBytes=0;
 const cache="public, max-age=31536000, immutable";
 async function verifyPublic(item:ReleaseObject,root:string){
  const res=await fetch(root+"/"+item.key,{headers:{Origin:corsOrigin},redirect:"error",signal:AbortSignal.timeout(20000)});
  if(!res.ok||!res.headers.get("content-type")?.startsWith(item.type.split(";")[0]!)||!res.headers.get("cache-control")?.includes("immutable"))throw new Error("Public headers invalid: "+item.key);
  const allowed=res.headers.get("access-control-allow-origin");
  if(allowed!=="*"&&allowed!==corsOrigin)throw new Error("Public CORS invalid: "+item.key);
  const bytes=new Uint8Array(await res.arrayBuffer());
  if(bytes.byteLength!==item.bytes.byteLength||sha256(bytes)!==item.hash)throw new Error("Public checksum mismatch: "+item.key);
 }
 async function one(item:ReleaseObject){
  let head;
  try{head=await client.send(new sdk.HeadObjectCommand({Bucket:bucket,Key:item.key}),{abortSignal:AbortSignal.timeout(20000)});}
  catch(e){const code=(e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode;if(code!==404)throw e;}
  if(!head){
   if(mode==="verify")throw new Error("Missing remote object: "+item.key);
   await client.send(new sdk.PutObjectCommand({Bucket:bucket,Key:item.key,Body:item.bytes,ContentLength:item.bytes.byteLength,ContentType:item.type,CacheControl:cache,ContentDisposition:item.disposition,Metadata:{sha256:item.hash}}),{abortSignal:AbortSignal.timeout(20000)});
   uploaded++;uploadedBytes+=item.bytes.byteLength;
  }else{if(head.ContentLength!==item.bytes.byteLength||head.Metadata?.sha256!==item.hash)throw new Error("Immutable object metadata mismatch: "+item.key);skipped++;}
  const response=await client.send(new sdk.GetObjectCommand({Bucket:bucket,Key:item.key}),{abortSignal:AbortSignal.timeout(20000)});
  const bytes=await response.Body?.transformToByteArray();
  if(!bytes||bytes.byteLength!==item.bytes.byteLength||sha256(bytes)!==item.hash)throw new Error("Authenticated checksum mismatch: "+item.key);
  await verifyPublic(item,origin);if(base!==origin)await verifyPublic(item,base);verified++;
 }
 async function pool(items:readonly ReleaseObject[]){
  let next=0,failed=false;const workers=Array.from({length:Math.min(8,items.length)},async()=>{while(!failed){const i=next++;if(i>=items.length)return;try{await one(items[i]!);}catch(e){failed=true;throw e;}}});
  const results=await Promise.allSettled(workers);if(results.some(r=>r.status==="rejected"))throw new Error("Upload or verification failed; release not activated");
 }
 // A single publisher must own this dedicated bucket; Neon does not document conditional PUT.
 await pool(plan.files);await pool(plan.metadata);
 const receipt={...summary,bucket,publicBase:base,uploaded,skipped,verified,uploadedBytes,activation:"not activated; pin only after deployment checks"};
 await writeFile(".storage-receipt.json",JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
 client.destroy();
}catch{console.error("Storage operation failed. Check rotated credentials, public bucket, CORS, cache metadata, quota and endpoint. No release was activated.");process.exitCode=1;}
