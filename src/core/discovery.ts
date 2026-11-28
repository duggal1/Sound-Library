import type { CatalogResponse, SoundSummary } from "./types";

export const DEFAULT_SITE = "https://sound-library-zeta.vercel.app";
export const BRAND = "Verdant";
export const DESCRIPTION = "A curated library of UI sound effects for developers and AI coding agents. Preview and download WAV clicks, keyboard sounds, notifications and interaction sounds.";
export function siteOrigin(value = DEFAULT_SITE): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("SITE_URL must be an HTTP(S) origin");
  return url.origin;
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export const categoryNames: Record<string,string> = {
  pointer:"Click and mouse sounds", toggle:"Toggle and control sounds", notify:"Notification sounds", motion:"Motion and transition sounds", typing:"Typing sounds", keyboard:"Keyboard sound effects", progress:"Progress and feedback sounds", classic:"Classic interface sounds"
};
export type Page = { path: string; title: string; description: string; heading: string; noindex?: boolean };
export const pages: readonly Page[] = [
  {path:"/",title:"Curated UI Sound Effects for Developers & AI Agents | Verdant",description:DESCRIPTION,heading:"Curated UI sound effects, built for developers and agents"},
  {path:"/library",title:"UI Sound Effects Library — WAV Downloads | Verdant",description:"Browse interface sounds for buttons, clicks, toggles, keyboards, notifications and motion. Preview and download WAV files for software.",heading:"UI sound effects library"},
  {path:"/studio",title:"Sound Studio — Preview UI Sounds & Waveforms | Verdant",description:"Audition interface sounds, inspect their waveforms and adjust playback gain before choosing a sound for your software.",heading:"Interface sound studio"},
  {path:"/saved",title:"Saved Sounds | Verdant",description:"Your locally saved interface sounds.",heading:"Saved sounds",noindex:true},
  {path:"/agents",title:"UI Sound Effects for Coding Agents — Catalog & WAV Files | Verdant",description:"Find interface sound effects for AI coding agents using a structured JSON catalog, stable sound IDs, WAV links and provenance.",heading:"Interface sounds for coding agents"},
];
export function eligibleSounds(catalog: CatalogResponse) {
  return catalog.sounds.filter(s => !s.importedMouse && s.keyboardTheme !== "modern" && !["click","press","release"].includes(s.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id));
}
export function soundPath(s: SoundSummary) { return "/effects/" + s.id; }
export function categoryPath(category: string) { return "/effects/category/" + category; }
export function agentCatalog(catalog: CatalogResponse, origin: string) {
  return {
    schemaVersion: 1, name: BRAND, description: DESCRIPTION, url: origin, sampleRate: catalog.sampleRate, bitDepth: catalog.bitDepth, channels: catalog.channels,
    sounds: eligibleSounds(catalog).map(s => ({id:s.id,name:s.name,category:s.category,description:s.description,durationSeconds:s.duration,bytes:s.bytes,peakDb:s.peakDb,rmsDb:s.rmsDb,sha256:s.sha256,format:"audio/wav",url:origin+soundPath(s),downloadUrl:origin+"/sounds/"+s.id+".wav",previewUrl:s.previewUrl?.startsWith("/sounds/preview/")?origin+s.previewUrl:undefined,source:s.source??null,license:s.source?.license??null,review:s.review??"not-recorded",keyCode:s.keyCode}))
  };
}
export function metadata(page: Page, origin: string, schema: unknown, imagePath="/social-card.png") {
  const e=escapeHtml, url=origin+page.path;
  return [
    '<title>'+e(page.title)+'</title>',
    '<meta name="description" content="'+e(page.description)+'">',
    '<meta name="robots" content="'+(page.noindex?"noindex,follow":"index,follow,max-image-preview:large")+'">',
    '<link rel="canonical" href="'+e(url)+'">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Verdant">',
    '<meta property="og:title" content="'+e(page.title)+'">',
    '<meta property="og:description" content="'+e(page.description)+'">',
    '<meta property="og:url" content="'+e(url)+'">',
    '<meta property="og:image" content="'+e(origin+imagePath)+'">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="'+e(page.title)+'">',
    '<meta name="twitter:description" content="'+e(page.description)+'">',
    '<meta name="twitter:image" content="'+e(origin+imagePath)+'">',
    '<script type="application/ld+json">'+safeJson(schema)+'</script>'
  ].join("\n");
}
export function sitemap(origin: string, paths: readonly string[]) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(paths)].map(path=>"<url><loc>"+escapeHtml(origin+path)+"</loc></url>").join("")+"</urlset>\n";
}
