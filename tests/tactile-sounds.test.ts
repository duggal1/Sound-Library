import {describe,expect,test} from "bun:test";
import {CATALOG} from "../src/core/catalog";
import {renderSound} from "../src/core/render";
import {encodeWav} from "../src/core/wav";
const ids=["drag","send","dismiss","swipe","close","open"];
describe("tactile replacements",()=>{
  for(const id of ids)test(id+" is dry, short, finite and deterministic",()=>{
    const def=CATALOG.find(sound=>sound.id===id)!;
    expect(def.engine).toBe("synth");
    if(def.engine!=="synth")throw new Error("Missing synth");
    expect(def.echo).toBeUndefined();
    for(const layer of def.layers){
      expect(layer.type).not.toBe("tone");
      if(layer.type==="noise"){expect(layer.to).toBeUndefined();expect(layer.q??.9).toBeLessThan(.7);}
    }
    const a=renderSound(def), b=renderSound(def);
    expect(a.metrics.duration).toBeLessThan(.32);
    expect(a.metrics.peak).toBeCloseTo(def.level,8);
    expect(a.samples[0]).toBe(0);expect(a.samples[a.samples.length-1]).toBe(0);
    expect(a.samples.every(Number.isFinite)).toBe(true);
    expect(encodeWav(a.samples,a.sampleRate)).toEqual(encodeWav(b.samples,b.sampleRate));
  });
});
