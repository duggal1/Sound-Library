import { describe, test, expect } from "bun:test";
import { siteOrigin, metadata, safeJson, sitemap, agentCatalog, eligibleSounds, pages } from "../src/core/discovery";
import type { CatalogResponse, SoundSummary } from "../src/core/types";
const sound:SoundSummary={id:"soft-click",name:"Soft click",description:"Click <test>",category:"pointer",duration:.1,samples:4800,peak:.2,rms:.01,peakDb:-14,rmsDb:-40,bytes:9644,previewUrl:"/sounds/preview/abc.wav"};
const catalog:CatalogResponse={sampleRate:48000,bitDepth:16,channels:1,totalBytes:9644,categories:[],sounds:[sound,{...sound,id:"click"},{...sound,id:"private",importedMouse:{pack:"x",author:"x",license:"unverified"}},{...sound,id:"modern",keyboardTheme:"modern"}]};
describe("search discovery",()=>{
 test("canonical origins reject paths and non-http schemes",()=>{expect(siteOrigin("https://example.com/")).toBe("https://example.com");expect(()=>siteOrigin("https://example.com/a")).toThrow();expect(()=>siteOrigin("javascript:alert(1)")).toThrow();});
 test("metadata escapes strings and prevents script breakout",()=>{const html=metadata({...pages[0]!,title:"<title>"}, "https://example.com",{description:"</script>"});expect(html).toContain("&lt;title&gt;");expect(html).toContain("\\u003c/script>");expect(safeJson("<")).toBe('"\\u003c"');});
 test("saved pages are not indexable and sitemap deduplicates",()=>{expect(pages.find(p=>p.path==="/saved")?.noindex).toBe(true);expect(sitemap("https://example.com",["/","/"])).toContain("<loc>https://example.com/</loc>");expect(sitemap("https://example.com",["/","/"]).match(/<loc>/g)?.length).toBe(1);});
 test("agent catalog excludes retired and imported records, preserves unknown rights",()=>{expect(eligibleSounds(catalog).map(s=>s.id)).toEqual(["soft-click"]);const record=agentCatalog(catalog,"https://example.com").sounds[0]!;expect(record.downloadUrl).toBe("https://example.com/sounds/soft-click.wav");expect(record.license).toBeNull();expect(record.review).toBe("not-recorded");});
});
