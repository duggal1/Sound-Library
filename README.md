# Verdant

A curated interface sound library for developers and AI coding agents, with an endless, draggable illustrated sound canvas, a searchable catalog, and a waveform studio. The current catalog includes 150 sounds. The new collection contains 61 recorded keyboard strikes and 50 mouse, control, and feedback effects. See [sound credits](licenses/sound-collection.md) for sources, edits, and listening review status.

```sh
bun install
bun run dev
```

- `/` — drag a sound to move and audition it, drag empty paper or use the trackpad to pan across all 150 sounds, or click a sound to audition it.
- `/library` — search, filter, audition and download. Open the Keyboard category to try the 61-key sound map.
- `/saved` — bookmarks stored in this browser.
- `/studio` — waveform, oscilloscope, volume, and cylindrical audition rail.

Press `/` to focus search, ↑/↓ to browse, and Space to play or stop. On the landing page, drag paper or use a trackpad to pan endlessly in both axes. Sound illustrations play on tap or drop. Arrow keys pan the focused canvas, Escape resets it, and reduced motion disables inertial travel and depth effects. Painted artwork adapts original Trazo stickers under MIT (see licenses/trazo-MIT.txt), plus original sound-specific illustrations.

Run `bun run typecheck`, `bun test`, and `bun run build` to validate and compile the release. `bun run start` serves the built site with Vite, and `bun src/server/index.ts` serves the same build with the existing API aliases. `bun run generate` is the legacy synthesis CLI.

## Preview delivery

Visual peaks and RMS come from the exported PCM and render immediately from catalog data. Auditions fetch individual content-addressed WAVs. Concurrent requests for the same sound share a promise, and the decoded PCM cache is capped at 768 KiB. A pointer-down on a sound tile can warm that single sample before it plays. The preview engine uses a 1.1× default gain, while WAV downloads use the original signal.

## Search and agent discovery

Production builds generate crawlable category and individual sound pages, route-specific metadata, structured data, a social image, sitemap.xml, robots.txt, llms.txt, and /agents/catalog.json. The agent catalog excludes preview-only imports and retired click/press/release sounds, exposes measured attributes and links, and does not assume unspecified licenses grant distribution rights. /agents explains HTTP retrieval; it is not an MCP implementation.

Set SITE_URL to the canonical production origin when changing domains (defaults to the repository's published Vercel homepage). Submit the sitemap in Google Search Console after deployment. Indexing and ranking are determined by search engines, not the build.
