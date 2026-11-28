/** Imported recordings: stable IDs; theme labels are editorial, not measured sound characteristics. */
export const MOUSE_PACKS=[
 {folder:"sound-1",id:"mouse-click-modern",name:"Modern mechanical",license:"unverified"},
 {folder:"sound-2",id:"mouse-click-retro",name:"Retro tactile",license:"unverified"},
 {folder:"sound-3",id:"mouse-click-classic",name:"Classic realistic",license:"personal-use-only"},
 {folder:"sound-4",id:"mouse-click-soft",name:"Modern ASMR",license:"unverified"},
] as const;
export type MousePack=typeof MOUSE_PACKS[number];
export const MOUSE_ROOT="/sounds/catalog/mouse/collection/";
export interface MouseClip {file:string;start:number;end:number;author:string;pack:string}
/** A click can contain press and release ranges. Keep the complete original interval,
 * including any intervening gap; overlapping ranges never duplicate audio. */
export function mouseClip(input:unknown,code="MouseLeft"):MouseClip {
 if(!input||typeof input!=="object")throw Error("Invalid mouse config");
 const c=input as {audio_file?:unknown;name?:unknown;author?:unknown;definitions?:Record<string,{audio_file?:unknown;timing?:unknown}>};
 const d=c.definitions?.[code],file=d?.audio_file??c.audio_file;
 if(typeof file!=="string"||!/^[a-zA-Z0-9_-]+\.(mp3|wav|ogg)$/.test(file)||typeof c.author!=="string"||typeof c.name!=="string"||!Array.isArray(d?.timing)||!d.timing.length)throw Error("Missing mouse clip: "+code);
 let start=Infinity,end=0;
 for(const pair of d.timing){
  if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=="number"||typeof pair[1]!=="number"||!Number.isFinite(pair[0])||!Number.isFinite(pair[1])||pair[0]<0||pair[1]<=pair[0]||pair[1]>5000)throw Error("Invalid mouse timing: "+code);
  start=Math.min(start,pair[0]);end=Math.max(end,pair[1]);
 }
 return {file,start,end,author:c.author,pack:c.name};
}
export function clipFrames(clip:Pick<MouseClip,"start"|"end">,sampleRate:number,length:number){
 const start=Math.round(clip.start*sampleRate/1000),end=Math.round(clip.end*sampleRate/1000);
 // A small tolerance permits encoder/decoder rounding but rejects wrong sprite files.
 if(start<0||start>=length||end<=start||end>length+Math.ceil(sampleRate*.02))throw Error("Mouse timing outside decoded audio");
 return {start,end:Math.min(end,length)};
}
