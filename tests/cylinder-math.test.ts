import { describe, expect, test } from "bun:test";
import { dampSpring, projectCylinder } from "../src/web/cylinder-math";

describe("cylindrical projection", () => {
  test("center is flat; depth and rotation are symmetric", () => {
    for (const half of [100, 300, 500, 900]) {
      expect(projectCylinder(0, half, .44)).toEqual({y:0,z:0,rotation:-0});
      for (const d of [20,half,half+160]) {
        const a=projectCylinder(d,half,.52), b=projectCylinder(-d,half,.52);
        expect(a.y).toBeCloseTo(-b.y,8);
        expect(a.z).toBeCloseTo(b.z,8);
        expect(a.rotation).toBeCloseTo(-b.rotation,8);
        expect(a.z).toBeLessThanOrEqual(0);
      }
    }
  });
  test("perspective never reverses row order within the visible arc", () => {
    for (const half of [100, 300, 500, 900]) for (const bend of [.28,.44,.52]) {
      let last=-Infinity;
      const perspective=Math.max(1000,half*4.4);
      for(let d=-half-160;d<=half+160;d+=4){
        const p=projectCylinder(d,half,bend);
        const y=(d+p.y)*perspective/(perspective-p.z);
        expect(y).toBeGreaterThan(last); last=y;
      }
    }
  });
  test("critical damping settles without overshoot at 30–144 Hz", () => {
    for(const hz of [30,60,120,144]){
      let s={value:0,velocity:0};
      for(let i=0;i<hz;i++){
        s=dampSpring(s.value,s.velocity,1,1/hz);
        expect(s.value).toBeGreaterThanOrEqual(0);
        expect(s.value).toBeLessThanOrEqual(1);
      }
      expect(s.value).toBeCloseTo(1,6);
      for(let i=0;i<hz;i++)s=dampSpring(s.value,s.velocity,0,1/hz);
      expect(s.value).toBeCloseTo(0,6);
    }
  });
});
