import {SAMPLE_RATE,type SoundSummary} from "../core/types";
import {measure} from "../core/render";
import {encodeWaveform} from "../core/waveform";
import {keySoundId} from "../core/keyboard";
import {MAC_ROWS,MAC_KEYS} from "../core/mac-keyboard";
import {spriteRanges} from "../core/keyboard-themes";
import type {DecodedSound} from "./api";

const ROOT="/sounds/catalog/";
const variants=new Map<string,DecodedSound>();
let pending:Promise<readonly SoundSummary[]>|undefined;
export function modernSample(url:string|undefined){return url?variants.get(url):undefined;}
export function isModern(sound:Pick<SoundSummary,"keyboardTheme">|null|undefined){return sound?.keyboardTheme==="modern";}

export function loadModernKeyboard(base:readonly SoundSummary[]):Promise<readonly SoundSummary[]>{
 if(pending)return pending;
 pending=(async()=>{
  const [configRes,audioRes]=await Promise.all([fetch(ROOT+"config.json"),fetch(ROOT+"audio.ogg")]);
  if(!configRes.ok||!audioRes.ok)throw new Error("Modern keyboard source unavailable");
  const [config,bytes]=await Promise.all([configRes.json(),audioRes.arrayBuffer()]);
  // One 48kHz decode, no audio context playback side effects or 61 duplicate buffers.
  const ctx=new OfflineAudioContext(1,1,SAMPLE_RATE);
  const decoded=await ctx.decodeAudioData(bytes);
  const pcm=new Float32Array(decoded.length);
  for(let c=0;c<decoded.numberOfChannels;c++){
   const channel=decoded.getChannelData(c);
   for(let i=0;i<pcm.length;i++)pcm[i]+=channel[i]!/decoded.numberOfChannels;
  }
  const ranges=spriteRanges(config,decoded.duration*1000);
  const byCode=new Map(base.filter(s=>s.keyCode).map(s=>[s.keyCode!,s]));
  const labels=new Map(MAC_ROWS.flat().map(k=>[k.code,k.label]));
  const clips=new Map<string,{samples:Float32Array;metrics:ReturnType<typeof measure>;waveform:string}>();
  const next=new Map<string,DecodedSound>();
  const summaries:SoundSummary[]=[];
  for(const range of ranges){
   if(!MAC_KEYS.has(range.code)&&!byCode.has(range.code))continue;
   const key=range.start+":"+range.end;
   let clip=clips.get(key);
   if(!clip){
    const start=Math.round(range.start*decoded.sampleRate/1000),end=Math.min(pcm.length,Math.round(range.end*decoded.sampleRate/1000));
    if(end<=start)throw new Error("Empty recorded clip");
    const samples=pcm.subarray(start,end);
    const metrics=measure(samples,decoded.sampleRate);
    clip={samples,metrics,waveform:encodeWaveform(samples,metrics.peak)};clips.set(key,clip);
   }
   const original=byCode.get(range.code),id=original?.id??keySoundId(range.code);
   const previewUrl="modern-keyboard:"+range.code;
   next.set(previewUrl,{id,samples:clip.samples,sampleRate:decoded.sampleRate});
   summaries.push({id,category:"keyboard",name:original?.name??((labels.get(range.code)||range.code)+" key"),description:"Custom Keyboard by remains · shared recorded clip",keyCode:range.code,keyboardTheme:"modern",previewUrl,bytes:clip.samples.byteLength,waveform:clip.waveform,...clip.metrics});
  }
  for(const code of MAC_KEYS)if(!summaries.some(s=>s.keyCode===code))throw new Error("Modern pack missing "+code);
  variants.clear();for(const [url,sample] of next)variants.set(url,sample);
  return summaries;
 })().catch(error=>{pending=undefined;throw error;});
 return pending;
}
