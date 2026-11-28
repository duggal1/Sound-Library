/** Shared, transport-independent, deterministic retrieval. No model calls. */
export const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HASH=/^[a-f0-9]{64}$/;
export const categories=["pointer","toggle","notify","motion","typing","keyboard","progress","classic"] as const;
export type Category=typeof categories[number];
export type Asset={id:string;name:string;description:string;category:Category;sha256:string;bytes:number;durationMs:number;peakDb:number;rmsDb:number;license:string;source:string;reviewEvidence:string;events:string[];tags:string[];family:string;repeatSafe:boolean;primaryUrl:string;fallbackUrl:string};
export type Release={schemaVersion:1;releaseId:string|null;status:"ready"|"awaiting-review";sounds:Asset[];catalogUrl:string;jsonlUrl:string;packUrl:string|null;packSha256:string|null};
export type Search={query:string;category?:Category;event?:string;maxDurationMs?:number;minDurationMs?:number;style?:string[];exclude?:string[];repeatSafe?:boolean;limit?:number};
const vocab:Record<string,string[]>={click:["tap","press","button","click"],toggle:["switch","toggle","latch","check"],hover:["hover","focus","rollover"],success:["save","success","confirm","complete"],error:["reject","error","invalid","warning"],drop:["drag","drop","snap"],typing:["typing","keyboard","keystroke","key"],dismiss:["close","dismiss","collapse"],open:["open","expand"],progress:["progress","tick"]};
const words=(s:string)=>s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g)??[];
const unique=(a:string[])=>[...new Set(a)];
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Expected object");return v as Record<string,unknown>};
function str(v:unknown,max=160):string{if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("Invalid string");return v.trim()}
function strings(v:unknown,max=12):string[]{if(!Array.isArray(v)||v.length>max)throw Error("Invalid list");return unique(v.map(x=>str(x,64).toLowerCase()))}
function integer(v:unknown,min:number,max:number){if(typeof v!=="number"||!Number.isInteger(v)||v<min||v>max)throw Error("Invalid integer");return v}
export function soundId(v:unknown){const s=str(v,100);if(!ID.test(s))throw Error("Invalid sound ID");return s}
function url(v:unknown){const s=str(v,1024),u=new URL(s);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw Error("Invalid asset URL");return s}
export function validateRelease(value:unknown):Release{
 const r=record(value);
 if(r.schemaVersion!==1||!Array.isArray(r.sounds)||r.sounds.length>10000)throw Error("Invalid release");
 const ids=new Set<string>();
 const sounds=r.sounds.map(v=>{
  const a=record(v),id=soundId(a.id),sha256=str(a.sha256,64);
  if(ids.has(id)||!HASH.test(sha256)||!categories.includes(a.category as Category)||!["CC0-1.0","MIT","LicenseRef-Verdant"].includes(String(a.license))||typeof a.repeatSafe!=="boolean"||typeof a.peakDb!=="number"||!Number.isFinite(a.peakDb)||a.peakDb>0||typeof a.rmsDb!=="number"||!Number.isFinite(a.rmsDb)||a.rmsDb>0)throw Error("Invalid asset");
  ids.add(id);
  const primaryUrl=url(a.primaryUrl),fallbackUrl=url(a.fallbackUrl);
  if(!primaryUrl.endsWith("/"+sha256+".wav")||!fallbackUrl.endsWith("/"+sha256+".wav"))throw Error("Asset URL is not immutable");
  return {id,sha256,name:str(a.name),description:str(a.description,500),category:a.category as Category,bytes:integer(a.bytes,46,4*1024*1024),durationMs:integer(a.durationMs,1,30000),peakDb:a.peakDb,rmsDb:a.rmsDb,license:str(a.license),source:str(a.source,1000),reviewEvidence:str(a.reviewEvidence,1000),events:strings(a.events),tags:strings(a.tags,32),family:str(a.family,64),repeatSafe:a.repeatSafe,primaryUrl,fallbackUrl};
 });
 const ready=sounds.length>0;
 if(ready?(r.status!=="ready"||typeof r.releaseId!=="string"||!HASH.test(r.releaseId)||typeof r.packSha256!=="string"||!HASH.test(r.packSha256)):(r.status!=="awaiting-review"||r.releaseId!==null||r.packUrl!==null||r.packSha256!==null))throw Error("Invalid release state");
 return {schemaVersion:1,releaseId:ready?r.releaseId as string:null,status:ready?"ready":"awaiting-review",sounds,catalogUrl:url(r.catalogUrl),jsonlUrl:url(r.jsonlUrl),packUrl:ready?url(r.packUrl):null,packSha256:ready?r.packSha256 as string:null};
}
export function parseSearch(value:unknown):Search{
 const a=record(value),allowed=new Set(["query","category","event","maxDurationMs","minDurationMs","style","exclude","repeatSafe","limit"]);
 if(Object.keys(a).some(k=>!allowed.has(k)))throw Error("Unknown search field");
 const query=str(a.query,300),category=a.category as Category|undefined;
 if(category!==undefined&&!categories.includes(category))throw Error("Unknown category");
 const minDurationMs=a.minDurationMs===undefined?undefined:integer(a.minDurationMs,0,30000),maxDurationMs=a.maxDurationMs===undefined?undefined:integer(a.maxDurationMs,1,30000);
 if((minDurationMs??0)>(maxDurationMs??30000)||a.repeatSafe!==undefined&&typeof a.repeatSafe!=="boolean")throw Error("Conflicting constraints");
 return {query,category,event:a.event===undefined?undefined:str(a.event,64).toLowerCase(),minDurationMs,maxDurationMs,style:a.style===undefined?[]:strings(a.style),exclude:a.exclude===undefined?[]:strings(a.exclude),repeatSafe:a.repeatSafe as boolean|undefined,limit:a.limit===undefined?5:integer(a.limit,1,20)};
}
function normalized(q:Search){
 let text=q.query.toLowerCase(),max=q.maxDurationMs??30000,min=q.minDurationMs??0;
 const negative=[...(q.exclude??[])];
 text=text.replace(/\b(?:no|without|avoid)\s+([a-z]+(?:-[a-z]+)?)/g,(_,word:string)=>{negative.push(word);return " "});
 text=text.replace(/\b(?:under|below|at most|max(?:imum)?)\s+(\d+)\s*ms\b/g,(_,n:string)=>{max=Math.min(max,Number(n));return " "});
 text=text.replace(/\b(?:over|above|at least|min(?:imum)?)\s+(\d+)\s*ms\b/g,(_,n:string)=>{min=Math.max(min,Number(n));return " "});
 const terms=words(text).filter(w=>!["a","an","the","for","with","find","sound","sounds","please","ui","interface","and","of","to","in"].includes(w));
 const events=Object.entries(vocab).filter(([_,aliases])=>aliases.some(a=>terms.includes(a))).map(([event])=>event);
 return {terms,events,negative:unique(negative),max,min};
}
export function searchSounds(release:Release,input:unknown,used=new Set<string>(),family?:string){
 const q=parseSearch(input),n=normalized(q);
 const candidates=release.sounds.flatMap(a=>{
  if(q.category&&a.category!==q.category||q.event&&!a.events.includes(q.event)||q.repeatSafe&&!a.repeatSafe||a.durationMs<n.min||a.durationMs>n.max)return [];
  const tokens=new Set(words([a.id,a.name,a.description,...a.events,...a.tags].join(" ")));
  if(n.negative.some(x=>words(x).every(w=>tokens.has(w)))||q.style?.some(x=>!a.tags.includes(x)))return [];
  const matched=n.terms.filter(t=>tokens.has(t)),event=n.events.filter(x=>a.events.includes(x)),exact=q.query.toLowerCase()===a.id||q.query.toLowerCase()===a.name.toLowerCase();
  if(!exact&&!matched.length&&!event.length&&!q.event&&!q.category)return [];
  const score=(exact?100:0)+event.length*35+matched.length*6+(q.style?.length??0)*8+(family===a.family?8:0)-(used.has(a.sha256)?60:0);
  return [{asset:a,score,reason:exact?"Exact ID or name":event.length?"Matching event: "+event.join(", "):matched.length?"Matching terms: "+matched.join(", "):"Requested filter"}];
 }).sort((a,b)=>b.score-a.score||(a.asset.id<b.asset.id?-1:1));
 const seen=new Set<string>();
 const matches=candidates.filter(x=>{if(seen.has(x.asset.sha256))return false;seen.add(x.asset.sha256);return true}).slice(0,q.limit);
 return {releaseId:release.releaseId,status:matches.length?"matched":release.status==="ready"?"no-match":"awaiting-review",matches};
}
export function getSound(release:Release,id:unknown,revision?:string){const key=soundId(id);const asset=release.sounds.find(a=>a.id===key&&(!revision||a.sha256===revision));return {releaseId:release.releaseId,asset:asset??null};}
export function compareSounds(release:Release,ids:unknown){if(!Array.isArray(ids)||ids.length<2||ids.length>8)throw Error("Provide 2–8 IDs");return {releaseId:release.releaseId,items:ids.map(id=>getSound(release,id))};}
export function resolvePack(release:Release,slots:unknown,style?:string[]){
 if(!Array.isArray(slots)||slots.length<1||slots.length>12)throw Error("Provide 1–12 slots");
 const used=new Set<string>(),names=new Set<string>();let family:string|undefined;
 const items=slots.map(slot=>{const s=record(slot),name=soundId(s.name);if(names.has(name))throw Error("Duplicate slot");names.add(name);
 const query=parseSearch(s.search);const hit=searchSounds(release,{...query,style:unique([...(style??[]),...(query.style??[])]),limit:20},used,family).matches.find(x=>!used.has(x.asset.sha256));
 if(hit){used.add(hit.asset.sha256);family??=hit.asset.family;}
 return {name,asset:hit?.asset??null,reason:hit?.reason??"No eligible match"};});
 return {releaseId:release.releaseId,complete:items.every(x=>x.asset!==null),items};
}
export function catalogInfo(r:Release){return {schemaVersion:r.schemaVersion,releaseId:r.releaseId,status:r.status,soundCount:r.sounds.length,uniqueAudio:new Set(r.sounds.map(a=>a.sha256)).size,catalogUrl:r.catalogUrl,jsonlUrl:r.jsonlUrl,packUrl:r.packUrl,packSha256:r.packSha256,categories};}
