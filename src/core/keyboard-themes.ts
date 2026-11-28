export type KeyboardTheme="modern"|"classic";
export interface SpriteConfig {name:string;author:string;audio_file:string;definitions:Record<string,{timing:number[][]}>}
export interface SpriteRange {code:string;start:number;end:number}
/** Source config uses millisecond start/end, not start/duration. Reject invalid bounds. */
export function spriteRanges(input:unknown,durationMs:number):SpriteRange[]{
 if(!input||typeof input!=="object")throw new Error("Invalid keyboard configuration");
 const config=input as Partial<SpriteConfig>;
 if(config.audio_file!=="audio.ogg"||!config.definitions||typeof config.definitions!=="object")throw new Error("Invalid keyboard source");
 const ranges:SpriteRange[]=[];
 for(const [code,def] of Object.entries(config.definitions)){
  const pair=def?.timing?.[0];
  if(!Array.isArray(pair)||pair.length!==2)throw new Error("Missing timing for "+code);
  const [start,end]=pair;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start!<0||end!<=start!||end!>durationMs+2)throw new Error("Invalid clip range: "+code);
  ranges.push({code,start:start!,end:Math.min(end!,durationMs)});
 }
 if(!ranges.length)throw new Error("Empty keyboard source");
 return ranges;
}
