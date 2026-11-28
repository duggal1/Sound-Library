# Verdant

An interface sound library for software, with an endless, draggable illustrated sound canvas, a searchable catalog, and a waveform studio. The current catalog includes 150 sounds. The new collection contains 61 recorded keyboard strikes and 50 mouse, control, and feedback effects. See [sound credits](licenses/sound-collection.md) for sources, edits, and listening review status.

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


## Object storage (Neon S3-compatible)

Storage release publishing is intentionally separate from ordinary builds. The generated WAV catalog is canonical; only redistributable WAVs, license files, and the ZIP are published. Preview-only imported mouse and Modern keyboard recordings are excluded from the public release. Read [storage operations](docs/storage.md) before publishing. An explicit verified release pin enables remote-first audio, with Vercel fallback. Browser HTTP caching and bounded decoded PCM/native buffer caches share content hashes rather than logical aliases. No storage credentials enter Vite.
