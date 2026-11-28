import {expect,test} from "bun:test";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("one stone theme and real neutral focus border",()=>{
 const css=read("src/web/styles.css"),landing=read("src/web/sound-field.css");
 expect(css).toContain("--button:#000");expect(css).toContain("--hover:#0c0a09");expect(css).toContain("--line:#e7e5e499");
 expect(css).toContain(".search:focus-within{border-color:var(--line);outline:none}");
 expect(css).toContain(".volume-ink{background:var(--hover)}");
 expect(css).not.toContain("outline:2px solid #a7cdb2");expect(landing).not.toContain("--surface:");
});
test("typing aliases reuse licensed existing recorded takes",()=>{
 const script=read("src/cli/prepare-assets.ts"),assets=JSON.parse(read("public/sounds/collection/manifest.json"));
 for(const code of ["KeyA","KeyS","Space","Enter","Backspace"])expect(assets.some((a:{category:string;keyCode?:string;source?:{license:string}})=>a.category==="keyboard"&&a.keyCode===code&&a.source?.license==="CC0-1.0")).toBe(true);
 expect(script).toContain('await publish({id:def.id,name:def.name,category:def.category');
 expect(script).toContain('sounds.filter(sound=>!typingAliases[sound.id])');
});
test("bookmarks persist synchronously and inspector selection follows filters",()=>{
 const app=read("src/web/app.tsx");
 expect(app.indexOf('JSON.stringify([...next])')).toBeLessThan(app.indexOf('setBookmarks(next)'));
 expect(app).toContain("filtered.some(sound=>sound.id===selectedId)");
 expect(app).toContain('history.pushState(null,"",url)');
 expect(app).toContain('history.pushState(null,"","/library")');
});
