# Verdant

An interface sound library built with Bun, React and TypeScript. Audition deterministic synthesized glass, wood and air sounds, inspect the waveform and signal metrics, and export individual WAV files or a complete ZIP.

```sh
bun install
bun run dev
```

Open http://localhost:3000. Production: bun run start. Render files locally: bun run generate. Static checks: bun run typecheck.

Keyboard: / searches, up/down browses, space auditions. Inspect loading, error and empty states with ?state=loading, ?state=error or ?state=empty.

The supplied synthesis, WAV, ZIP and server modules are retained. The paste ended at the preview controls in app.tsx, and styles.css was absent. Those portions were reconstructed. The stage uses continuous waveform geometry, a green accent and on-demand animation instead of pixel rendering. The interface uses Instrument Sans and Inter at 400–450, borderless surfaces and pill controls. Audition synthesized sounds before production use.
