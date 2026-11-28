import {describe,expect,test} from "bun:test";
import {soundPlacements,cameraBounds,coast} from "../src/web/sound-field-math";
describe("spatial sound sheet",()=>{
  for(const width of [380,670,850,1100,1440,1920])test("all 150 sounds have distinct reachable placements at "+width,()=>{
    const points=soundPlacements(150,width);
    expect(points).toHaveLength(150);
    expect(soundPlacements(150,width)).toEqual(points);
    expect(new Set(points.map(p=>p.x+":"+p.y)).size).toBe(150);
    const compact=width<670,clearX=compact?Math.min(width,340)/2+68:310,clearY=compact?205:180;
    for(const p of points)expect(Math.abs(p.x)>=clearX||Math.abs(p.y)>=clearY).toBe(true);
    const bounds=cameraBounds(points,width,760);
    for(const p of points){expect(Math.abs(p.x)).toBeLessThan(bounds.x);expect(Math.abs(p.y)).toBeLessThan(bounds.y);}
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const a=points[i]!,b=points[j]!;
      expect(Math.abs(a.x-b.x)>=(compact?100:125)||Math.abs(a.y-b.y)>=(compact?94:112)).toBe(true);
    }
  });
  test("inertia is frame-rate independent and cannot cross boundaries",()=>{
    const at=(hz:number)=>{let p=0,v=1000;for(let i=0;i<hz;i++){const n=coast(p,v,1/hz,1000);p=n.position;v=n.velocity;}return p;};
    expect(at(60)).toBeCloseTo(at(120),8);
    expect(coast(95,2000,.05,100)).toEqual({position:100,velocity:0});
  });
});
