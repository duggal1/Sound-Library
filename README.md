# Verdant

An interface sound library for software, with a 360° sound cylinder, a searchable catalog, and a waveform studio. The current catalog includes 150 sounds. The new collection contains 61 recorded keyboard strikes and 50 mouse, control, and feedback effects. See [sound credits](licenses/sound-collection.md) for sources, edits, and listening review status.

```sh
bun install
bun run dev
```

- `/` — drag a tile to move it, drag the space between tiles to turn the cylinder, or click a tile to audition it.
- `/library` — search, filter, audition and download. Open the Keyboard category to try the 61-key sound map.
- `/saved` — bookmarks stored in this browser.
- `/studio` — waveform, oscilloscope, volume, and cylindrical audition rail.

Press `/` to focus search, ↑/↓ to browse, and Space to play or stop. On the landing page, the cylinder has left/right arrow controls and a flat reduced-motion view.

Run `bun run typecheck`, `bun test`, and `bun run build` to validate and compile the release. `bun run start` serves the built site with Vite, and `bun src/server/index.ts` serves the same build with the existing API aliases. `bun run generate` is the legacy synthesis CLI.

## Preview delivery

Visual peaks and RMS come from the exported PCM and render immediately from catalog data. Auditions fetch individual content-addressed WAVs. Concurrent requests for the same sound share a promise, and the decoded PCM cache is capped at 768 KiB. A pointer-down on a sound tile can warm that single sample before it plays. The preview engine uses a 1.1× default gain, while WAV downloads use the original signal.
