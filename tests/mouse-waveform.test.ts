import {test,expect} from "bun:test";
import {readFileSync,existsSync} from "node:fs";
import {MOUSE_PACKS,mouseClip,clipFrames} from "../src/core/mouse-packs";
import {waveformBars} from "../src/web/landing-waveform";
import {CATALOG} from "../src/core/catalog";
test("all four mouse mappings reference real supplied files",()=>{
 for(const pack of MOUSE_PACKS){
  const root=new URL("../public/sounds/catalog/mouse/collection/"+pack.folder+"/",import.meta.url);
  const clip=mouseClip(JSON.parse(readFileSync(new URL("config.json",root),"utf8")));
  expect(existsSync(new URL(clip.file,root))).toBe(true);
  expect(clip.end).toBeGreaterThan(clip.start);
 }
 expect(MOUSE_PACKS.map(p=>p.id).length).toBe(4);
 expect(CATALOG.some(s=>["click","press","release"].includes(s.id))).toBe(false);
});
test("overlapping press/release ranges preserve one interval",()=>{
 const clip=mouseClip({name:"test",author:"test",audio_file:"a.mp3",definitions:{MouseLeft:{timing:[[0,35],[33,100]]}}});
 expect(clip.start).toBe(0);expect(clip.end).toBe(100);
 expect(clipFrames(clip,48000,4800)).toEqual({start:0,end:4800});
 expect(()=>clipFrames(clip,48000,100)).toThrow();
 expect(()=>mouseClip({name:"test",author:"test",audio_file:"../a.mp3",definitions:{MouseLeft:{timing:[[0,1]]}}})).toThrow();
});
test("measured waveform produces round quiet dots and asymmetric peaks",()=>{
 const b=waveformBars(new Float32Array([0,0,0,.5,1,.3]),2);
 expect(b[0]).toEqual({x:2,y1:18,y2:18,quiet:true});
 expect(b[1]).toEqual({x:6,y1:4,y2:25,quiet:false});
 expect(waveformBars(new Float32Array())).toEqual([]);
});
