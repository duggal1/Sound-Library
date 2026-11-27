# Verdant

An interface sound library built with React and TypeScript. Audition deterministic synthesized glass, wood and air sounds, inspect the waveform and signal metrics, and export individual WAV files or a complete ZIP.

```sh
bun install
bun run dev
```

Open the URL printed by Vite. Build the static site with `bun run build` and preview it with `bun run start`. Regenerate the static audio assets with `bun run generate`. Run static checks with `bun run typecheck`. Vercel can deploy the resulting `dist` directory using the build script.

Keyboard: / searches, up/down browses, space auditions. Inspect loading, error and empty states with ?state=loading, ?state=error or ?state=empty.
