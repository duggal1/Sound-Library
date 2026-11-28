import {describe,expect,test} from "bun:test";
import {readFileSync} from "node:fs";
import {sheetLayout,wrap,coast} from "../src/web/sound-field-math";
import {sketchSource} from "../src/web/sound-sketches";
describe("endless sound sheet",()=>{
  for(const [width,height] of [[380,680],[670,700],[850,700],[1100,650],[1440,800],[1920,1000],[3840,2160]])test("all 150 objects and seamless periods at "+width,()=>{
    const s=sheetLayout(150,width!,height!);
    expect(s.points).toHaveLength(150);expect(s).toEqual(sheetLayout(150,width!,height!));
    expect(s.width).toBeGreaterThan(width!+260);expect(s.height).toBeGreaterThan(height!+260);
    expect(s.width%22).toBe(0);expect(s.height%22).toBe(0);
    expect(new Set(s.points.map(p=>wrap(p.x,s.width)+":"+wrap(p.y,s.height))).size).toBe(150);
    for(const p of s.points)for(const n of [-10000,-2,0,2,10000]){
      expect(wrap(p.x+n*s.width,s.width)).toBeCloseTo(wrap(p.x,s.width),6);
      expect(wrap(p.y+n*s.height,s.height)).toBeCloseTo(wrap(p.y,s.height),6);
    }
    // At arbitrary phases, each viewport-sized rectangle has nearby objects.
    for(let x=-s.width/2;x<s.width/2;x+=180)for(let y=-s.height/2;y<s.height/2;y+=154){
      const nearest=Math.min(...s.points.map(p=>Math.hypot(wrap(p.x+x,s.width),wrap(p.y+y,s.height))));
      expect(nearest).toBeLessThan(500);
    }
  });
  test("wraps in either direction",()=>{expect(wrap(101,200)).toBe(-99);expect(wrap(-101,200)).toBe(99);expect(wrap(2000001,200)).toBe(1);});
  test("coast is frame-rate independent",()=>{
    const at=(hz:number)=>{let p=0,v=1000;for(let i=0;i<hz;i++){const n=coast(p,v,1/hz);p=n.position;v=n.velocity;}return p;};expect(at(60)).toBeCloseTo(at(120),8);
  });
  test("every category resolves to real SVG and distinct painted subjects",()=>{
    const sources=["pointer","keyboard","typing","toggle","notify","motion","progress","classic"].map(c=>sketchSource(c,c));
    for(const s of sources){expect(s.endsWith(".svg")).toBe(true);expect(readFileSync(new URL(s),"utf8").includes("<path")).toBe(true);}
    expect(new Set(sources).size).toBeGreaterThan(5);
  });
});
