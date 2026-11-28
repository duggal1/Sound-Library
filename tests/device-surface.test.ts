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
 expect(css).toContain("aspect-ratio:1540/500");
 expect(css).toContain("#fdfdfd");
 expect(css).toContain("#232426");
 expect(css).toContain(".device-key[data-pressed=true] .device-key-face");
 expect(css).toContain("prefers-reduced-motion:reduce");
});
test("mouse preview only auditions left and right clicks",()=>{
 expect(component).toContain('aria-label="Left click"');
 expect(component).toContain('aria-label="Right click"');
 expect(component).not.toContain("wheel-step");
 expect(component).not.toContain("mouse-middle");
 expect(component).not.toContain("Scroll sound");
 expect(component).not.toContain('addEventListener("wheel"');
});

test("device header is not a nested scrollport and quick taps get visible feedback",()=>{
 expect(css).toContain(".library-head:has(.device-preview){max-height:none;overflow:visible");
 expect(css).not.toContain("max-height:57dvh");
 expect(component).toContain("55-(performance.now()");
 expect(component).toContain("releaseTimers.current.clear()");
 expect(component).toContain("settle(code)");
});

test("hardware legends use deterministic vectors and expanded chassis is neutral",()=>{
 const icons=readFileSync(new URL("../src/web/key-symbol.tsx",import.meta.url),"utf8");
 for(let i=1;i<=12;i++)expect(icons).toContain('case "F'+i+'"');
 expect(component).toContain("<KeySymbol code={key.code}/>");
 expect(css).toContain("background:#f5f5f5;border:0");
});

test("function and modifier legends occupy independent zones",()=>{expect(css).toContain(".device-key[data-function=true] .key-symbol{position:absolute;top:15%");expect(css).toContain(".device-key[data-function=true] .key-legend{position:absolute;bottom:12%");expect(css).toContain(".device-key[data-modifier=true] .key-secondary{position:absolute;top:13%;right:13%");expect(component).toContain('key.code==="Fn"');expect(component).toContain("DEVICE_FALLBACK[code]");});
