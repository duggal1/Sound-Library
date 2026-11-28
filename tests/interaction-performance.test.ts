import {describe,expect,test} from "bun:test";
import {gainAt,gainStep} from "../src/web/gain-math";
import {decodeWav,encodeWav} from "../src/core/wav";
describe("gain grab geometry",()=>{
  test("exact endpoints and continuous monotonic travel at narrow and wide widths",()=>{
    for(const w of [40,64,100,196,320]){
      expect(gainAt(9,w,18,1.1)).toBe(0);
      expect(gainAt(w-9,w,18,1.1)).toBeCloseTo(1.1,12);
      let previous=-1;
      for(let x=9;x<=w-9;x+=.125){const value=gainAt(x,w,18,1.1);expect(value).toBeGreaterThan(previous);previous=value;}
      expect(gainAt(-10,w,18,1.1)).toBe(0);
      expect(gainAt(w+10,w,18,1.1)).toBe(1.1);
    }
  });
  test("keyboard is bounded",()=>{expect(gainStep(1.09,.1,1.1)).toBe(1.1);expect(gainStep(.01,-.1,1.1)).toBe(0);});
});
describe("zero-copy PCM bank views",()=>{
  test("decode nonzero offset and honor segment boundary",()=>{
    const a=encodeWav([0,.25,-.5,0],48000), b=encodeWav([0,.1,0],48000);
    const bank=new Uint8Array(a.length+b.length+1);bank.set(a,1);bank.set(b,1+a.length);
    expect(decodeWav(bank.buffer,1,a.length)).toEqual(decodeWav(a.buffer as ArrayBuffer));
    expect(decodeWav(bank.buffer,1+a.length,b.length)).toEqual(decodeWav(b.buffer as ArrayBuffer));
    expect(()=>decodeWav(bank.buffer,1,a.length-2)).toThrow();
  });
});
