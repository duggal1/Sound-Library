import { describe, expect, test } from "bun:test";
import { edgeProjection, railGeometry, dampSpring } from "../src/web/cylinder-math";

describe("flat-center sound rail",()=>{
  test("central rows are exactly flat at every scroll position",()=>{
    for(const h of [240,320,480,640,800,1100])for(const pitch of [60,64]){
      const g=railGeometry(h,pitch,39);
      for(let d=-g.flatHalf;d<=g.flatHalf;d+=.125){
        expect(edgeProjection(d,g.flatHalf,g.radius)).toEqual({y:d,z:0,rotation:0});
      }
    }
  });
  test("curved ends are symmetric, tangent-continuous and never fold over",()=>{
    for(const h of [240,320,480,640,800,1100])for(const pitch of [60,64]){
      const g=railGeometry(h,pitch,39);
      const screen=(d:number)=>{
        const p=edgeProjection(d,g.flatHalf,g.radius);
        return p.y*g.perspective/(g.perspective-p.z);
      };
      let prior=-Infinity;
      for(let d=-g.visibleDistance;d<=g.visibleDistance;d+=.5){
        const p=edgeProjection(d,g.flatHalf,g.radius),q=edgeProjection(-d,g.flatHalf,g.radius);
        expect(p.y).toBeCloseTo(-q.y,8);
        expect(p.z).toBeCloseTo(q.z,8);
        expect(p.rotation).toBeCloseTo(-q.rotation,8);
        expect(p.z).toBeLessThanOrEqual(0);
        expect(screen(d)).toBeGreaterThan(prior);prior=screen(d);
      }
      const eps=.001;
      expect((screen(g.flatHalf+eps)-screen(g.flatHalf))/eps).toBeCloseTo(1,4);
      expect(edgeProjection(h/2,g.flatHalf,g.radius).rotation).toBeLessThan(-20);
      expect(screen(g.offset)).toBeCloseTo(h/2-pitch*.55,5);
      expect(screen((39-1)*pitch-(g.maxScroll+g.offset))).toBeCloseTo(screen(g.offset),5);
    }
  });
  test("visual compliance settles without overshoot across refresh rates",()=>{
    for(const hz of [30,60,90,120,144]){
      let s={value:0,velocity:0};
      for(let i=0;i<hz;i++){s=dampSpring(s.value,s.velocity,4,1/hz,30);expect(s.value).toBeGreaterThanOrEqual(0);expect(s.value).toBeLessThanOrEqual(4);}
      expect(s.value).toBeCloseTo(4,7);
      for(let i=0;i<hz;i++)s=dampSpring(s.value,s.velocity,0,1/hz,30);
      expect(s.value).toBeCloseTo(0,7);
    }
  });
});
