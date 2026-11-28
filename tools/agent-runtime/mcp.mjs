import {createMcpHandler} from "mcp-handler";
import {z} from "zod";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {validateRelease,searchSounds,getSound,compareSounds,resolvePack,catalogInfo} from "../../src/agent/service.ts";

let pending;
function release(){
 return pending??=(readFile(resolve(".generated-public/agents/v1/catalog.json"),"utf8").then(JSON.parse).then(validateRelease).catch(error=>{pending=undefined;throw error;}));
}
const id=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const terms=z.array(z.string().trim().min(1).max(64)).max(12);
const search=z.object({query:z.string().trim().min(1).max(300),category:z.enum(["pointer","toggle","notify","motion","typing","keyboard","progress","classic"]).optional(),event:z.string().min(1).max(64).optional(),minDurationMs:z.number().int().min(0).max(30000).optional(),maxDurationMs:z.number().int().min(1).max(30000).optional(),style:terms.optional(),exclude:terms.optional(),repeatSafe:z.boolean().optional(),limit:z.number().int().min(1).max(20).optional()}).strict();
const asset=z.object({id,name:z.string(),description:z.string(),category:z.string(),sha256:hash,bytes:z.number().int(),durationMs:z.number().int(),peakDb:z.number(),rmsDb:z.number(),license:z.string(),source:z.string(),reviewEvidence:z.string(),events:z.array(z.string()),tags:z.array(z.string()),family:z.string(),repeatSafe:z.boolean(),primaryUrl:z.string().url(),fallbackUrl:z.string().url()});
const revision=z.object({releaseId:hash.nullable()});
const single=revision.extend({asset:asset.nullable()});
const compact=z.object({id,name:z.string(),durationMs:z.number(),sha256:hash,license:z.string(),reason:z.string(),score:z.number()});
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const result=value=>({structuredContent:value,content:[{type:"text",text:JSON.stringify(value)}]});
const error=()=>({isError:true,content:[{type:"text",text:"Invalid request or release unavailable. Retry or inspect the catalog."}]});
const run=fn=>async args=>{try{return result(await fn(await release(),args))}catch{return error()}};
export const handler=createMcpHandler(server=>{
 server.registerTool("search_sounds",{title:"Find interface sounds",description:"Find approved sounds by event, character and hard constraints. Returns compact ranked IDs; get_sound returns download descriptors.",inputSchema:search,outputSchema:revision.extend({status:z.enum(["matched","no-match","awaiting-review"]),matches:z.array(compact)}),annotations},run((r,q)=>{const s=searchSounds(r,q);return {...s,matches:s.matches.map(({asset:a,reason,score})=>({id:a.id,name:a.name,durationMs:a.durationMs,sha256:a.sha256,license:a.license,reason,score}))}}));
 server.registerTool("get_sound",{title:"Get a verified sound",description:"Return a sound descriptor and exact immutable WAV URLs; no files are written by this tool.",inputSchema:z.object({id,sha256:hash.optional()}).strict(),outputSchema:single,annotations},run((r,q)=>getSound(r,q.id,q.sha256)));
 server.registerTool("compare_sounds",{title:"Compare sounds",description:"Compare measured audio properties and reviewed annotations; not a listening simulation.",inputSchema:z.object({ids:z.array(id).min(2).max(8)}).strict(),outputSchema:revision.extend({items:z.array(single)}),annotations},run((r,q)=>compareSounds(r,q.ids)));
 server.registerTool("resolve_sound_pack",{title:"Resolve interaction sound pack",description:"Choose a coherent set of reviewed sounds for up to 12 named interaction slots. Reports unresolved slots.",inputSchema:z.object({slots:z.array(z.object({name:id,search}).strict()).min(1).max(12),style:terms.optional()}).strict(),outputSchema:revision.extend({complete:z.boolean(),items:z.array(z.object({name:id,asset:asset.nullable(),reason:z.string()}))}),annotations},run((r,q)=>resolvePack(r,q.slots,q.style)));
 server.registerTool("get_catalog",{title:"Get catalog release",description:"Get the current approved release, availability and JSON/JSONL/ZIP links.",inputSchema:z.object({}).strict(),outputSchema:revision.extend({schemaVersion:z.literal(1),status:z.enum(["ready","awaiting-review"]),soundCount:z.number(),uniqueAudio:z.number(),catalogUrl:z.string(),jsonlUrl:z.string(),packUrl:z.string().nullable(),packSha256:hash.nullable(),categories:z.array(z.string())}),annotations},run(r=>catalogInfo(r)));
},{serverInfo:{name:"verdant",version:"0.1.0"}});
/** Public read-only service: bounded body, strict browser Origin, no client-supplied URLs. */
export async function serveMcp(req){
 const origin=req.headers.get("origin");
 const allowed=new Set([process.env.SITE_URL||"https://sound-library-zeta.vercel.app",...(process.env.AGENT_ALLOWED_ORIGINS||"").split(",").filter(Boolean)]);
 if(origin&&!allowed.has(origin))return new Response("Forbidden origin",{status:403});
 if(!["POST","GET","DELETE"].includes(req.method))return new Response("Method not allowed",{status:405});
 if(req.method!=="POST")return handler(req);
 const reader=req.body?.getReader();if(!reader)return new Response("Body required",{status:400});
 let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();return new Response("Request too large",{status:413});}chunks.push(value);}}
 catch{return new Response("Invalid request body",{status:400});}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 return handler(new Request(req.url,{method:req.method,headers:req.headers,body,signal:req.signal}));
}
