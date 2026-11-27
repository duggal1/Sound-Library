import { describe, expect, test } from "bun:test";
import { drumGeometry, dampSpring } from "../src/web/cylinder-math";

describe("shared sound drum",()=>{
  test("perspective is monotonic across the front arc",()=>{
    for(const h of [160,220,320,480,640,800,1100])for(const pitch of [60,64]){
      const g=drumGeometry(h,pitch,40);
      let prior=-Infinity;
      for(let a=-g.visible;a<=g.visible;a+=.005){
        const y=g.radius*Math.sin(a)*g.perspective/(g.perspective+g.radius*(1-Math.cos(a)));
        expect(y).toBeGreaterThan(prior);prior=y;
      }
      expect(g.maxScroll).toBeGreaterThan(0);
    }
  });
  test("rebasing preserves the exact angle",()=>{
    const g=drumGeometry(640,64,40);
    for(let c=0;c<40;c+=.125){
      const anchor=Math.floor(c/6)*6;
      for(let i=0;i<40;i++)expect((c-anchor)*g.step-(i-anchor)*g.step).toBeCloseTo((c-i)*g.step,10);
    }
  });
  test("visual compliance settles at variable refresh rates",()=>{
    for(const hz of [30,60,90,120,144]){
      let s={value:0,velocity:0};
      for(let i=0;i<hz;i++){s=dampSpring(s.value,s.velocity,8,1/hz,30);expect(s.value).toBeGreaterThanOrEqual(0);expect(s.value).toBeLessThanOrEqual(8);}
      expect(s.value).toBeCloseTo(8,7);
      for(let i=0;i<hz;i++)s=dampSpring(s.value,s.velocity,0,1/hz,30);
      expect(s.value).toBeCloseTo(0,7);
    }
  });
});
