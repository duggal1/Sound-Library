import {test,expect} from "bun:test";
import {readFileSync,existsSync} from "node:fs";
const css=readFileSync(new URL("../src/web/device-preview.css",import.meta.url),"utf8");
const component=readFileSync(new URL("../src/web/keyboard-preview.tsx",import.meta.url),"utf8");
test("device surfaces never track pointer position or rotate in 3D",()=>{
 expect(component).not.toContain("useDeviceTilt");
 expect(css).not.toMatch(/rotate[XY]\(|perspective\s*:|--tilt-/);
 expect(existsSync(new URL("../src/web/use-device-tilt.ts",import.meta.url))).toBe(false);
});
test("keyboard uses charcoal caps and a fixed light chassis with local press travel",()=>{
 expect(css).toContain("aspect-ratio:1540/606");
 expect(css).toContain("#fdfdfd");
 expect(css).toContain("#232426");
 expect(css).toContain(".device-key[data-pressed=true] .device-key-face");
 expect(css).toContain("prefers-reduced-motion:reduce");
});
test("mouse has accessible center scroll control and keeps wheel audition",()=>{
 expect(component).toContain('data-zone="middle"');
 expect(component).toContain('aria-label="Center scroll sound"');
 expect(component).toContain('e.currentTarget.dataset.zone==="middle"');
 expect(component).toContain('addEventListener("wheel",onWheel');
});
