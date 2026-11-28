import {test,expect} from "bun:test";
import {readFileSync} from "node:fs";
const css=readFileSync(new URL("../src/web/smooth-scroll.css",import.meta.url),"utf8");
const hook=readFileSync(new URL("../src/web/smooth-scroll.ts",import.meta.url),"utf8");
test("stone rail stays thin and native scrolling remains available",()=>{
 expect(css).toContain("width:5px");expect(css).toContain("#d6d3d1");
 expect(hook).toContain("e.deltaMode===0");expect(hook).toContain("reduced.matches");
 expect(hook).toContain("cancelAnimationFrame(frame)");
});