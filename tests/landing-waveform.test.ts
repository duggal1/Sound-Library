import {expect,test} from "bun:test";
import {waveformBars} from "../src/web/landing-waveform";
test("quiet samples make round dots and measured peaks preserve asymmetry",()=>{
 const bars=waveformBars(new Float32Array([0,0,0,.5,1,.3]),2);
 expect(bars[0]).toEqual({x:2,y1:18,y2:18});
 expect(bars[1]).toEqual({x:6,y1:4,y2:25});
 expect(waveformBars(new Float32Array()).length).toBe(0);
 expect(waveformBars(new Float32Array([.2,.3,.1])).length).toBe(24);
});