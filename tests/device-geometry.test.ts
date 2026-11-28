import {test,expect} from "bun:test";
import {BOARD_WIDTH,BOARD_HEIGHT,PHYSICAL_KEYS,fitBoard} from "../src/core/device-geometry";
import {MAC_KEYS} from "../src/core/mac-keyboard";
test("fixed geometry includes every mapped key, stays in bounds, and never overlaps",()=>{
 expect(new Set(PHYSICAL_KEYS.map(k=>k.code))).toEqual(MAC_KEYS);
 for(const [i,k] of PHYSICAL_KEYS.entries()){
  expect(k.x).toBeGreaterThanOrEqual(0);expect(k.y).toBeGreaterThanOrEqual(0);
  expect(k.x+k.width).toBeLessThanOrEqual(BOARD_WIDTH);expect(k.y+k.height).toBeLessThanOrEqual(BOARD_HEIGHT);
  expect(k.width).toBeGreaterThan(0);expect(k.height).toBeGreaterThan(0);
  for(const n of PHYSICAL_KEYS.slice(i+1))expect(k.x+k.width<=n.x||n.x+n.width<=k.x||k.y+k.height<=n.y||n.y+n.height<=k.y).toBe(true);
 }
});
test("natural aspect ratio is preserved at every compact and expanded width",()=>{
 for(const w of [280,320,380,480,670,900,1100,1440,3840]){
  const b=fitBoard(w);expect(b.width).toBeLessThanOrEqual(w);
  expect(b.width/b.height).toBeCloseTo(BOARD_WIDTH/BOARD_HEIGHT,8);
 }
});
test("arrow cluster has half-height up/down keys and full-height left/right",()=>{
 const key=(code:string)=>PHYSICAL_KEYS.find(k=>k.code===code)!;
 expect(key("ArrowUp").x).toBe(key("ArrowDown").x);
 expect(key("ArrowUp").height).toBe(key("ArrowDown").height);
 expect(key("ArrowLeft").height).toBeGreaterThan(key("ArrowUp").height);
});

test("wide low-profile geometry has tight even key gaps",()=>{
 expect(BOARD_WIDTH/BOARD_HEIGHT).toBeGreaterThan(3);
 const a=PHYSICAL_KEYS.find(k=>k.code==="KeyA")!,s=PHYSICAL_KEYS.find(k=>k.code==="KeyS")!;
 expect(a.width/a.height).toBeGreaterThan(1.1);
 expect(s.x-a.x-a.width).toBe(6);
});
