import {MOUSE_PACKS,MOUSE_ROOT,mouseClip,clipFrames} from "../core/mouse-packs";
import {SAMPLE_RATE,type SoundSummary} from "../core/types";
import {measure} from "../core/render";
import {encodeWaveform} from "../core/waveform";
import type {DecodedSound} from "./api";
const clips=new Map<string,DecodedSound>();
export function peekMouseRecording(url?:string){return url?clips.get(url):undefined;}
export async function loadMouseRecordings(signal:AbortSignal){
 const sounds:SoundSummary[]=[];const failed:string[]=[];
 // All sources are supplied by the user; the exportable WAV pack is deliberately separate.
 const Offline=window.OfflineAudioContext??(window as unknown as {webkitOfflineAudioContext:typeof OfflineAudioContext}).webkitOfflineAudioContext;
 if(!Offline)return {sounds,failed:MOUSE_PACKS.map(p=>p.name)};
 const ctx=new Offline(1,1,SAMPLE_RATE);
 const results=await Promise.allSettled(MOUSE_PACKS.map(async pack=>{
  const root=MOUSE_ROOT+pack.folder+"/";
  const config=await fetch(root+"config.json",{signal});if(!config.ok)throw Error("Missing mouse config");
  const clip=mouseClip(await config.json());
  const res=await fetch(root+clip.file,{signal});if(!res.ok)throw Error("Missing mouse recording");
  const audio=await ctx.decodeAudioData(await res.arrayBuffer());
  const {start,end}=clipFrames(clip,audio.sampleRate,audio.length);
  const samples=new Float32Array(end-start);
  for(let c=0;c<audio.numberOfChannels;c++){const pcm=audio.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=pcm[start+i]!/audio.numberOfChannels;}
  const metrics=measure(samples,audio.sampleRate);if(!Number.isFinite(metrics.peak)||metrics.peak===0)throw Error("Empty recording");
  const previewUrl="mouse-recording:"+pack.id;
  const summary:SoundSummary={id:pack.id,name:pack.name+" click",category:"pointer",description:clip.pack+" · "+clip.author,bytes:samples.byteLength,previewUrl,importedMouse:{pack:clip.pack,author:clip.author,license:pack.license},waveform:encodeWaveform(samples,metrics.peak),...metrics};
  return {summary,decoded:{id:pack.id,sampleRate:audio.sampleRate,samples}};
 }));
 if(signal.aborted)throw new DOMException("Aborted","AbortError");
 for(let i=0;i<results.length;i++){const r=results[i]!;if(r.status==="fulfilled"){clips.set(r.value.summary.previewUrl!,r.value.decoded);sounds.push(r.value.summary);}else failed.push(MOUSE_PACKS[i]!.name);}
 return {sounds,failed};
}
