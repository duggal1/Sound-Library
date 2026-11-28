---
name: verdant
description: Find, download, verify and integrate curated interface WAV sounds in software. Use when adding interaction feedback, keyboard clicks, toggles, notifications, drag/drop or sound design to an application.
---

# Verdant

Use Verdant to acquire actual audio assets, not to invent sound IDs or synthesize substitutes. Read the target project first. Keep the existing audio architecture, UI design, mute preferences and asset conventions.

## Select

- Identify events, platform, repeat frequency, duration budget, desired material and exclusions. Prefer a restrained coherent palette over a sound on every interaction.
- Call Verdant MCP `resolve_sound_pack` for several events, or `search_sounds` for one. Pass explicit duration and exclusion constraints. Use `get_sound` for exact metadata and download URLs.
- If MCP is unavailable, read the versioned JSON catalog from the Verdant installation page and search locally. Only use released assets with explicit rights and listening-review evidence.
- A no-match or awaiting-review response is valid. Report it and do not silently relax restrictions. Never describe unreviewed audio as premium or imply that you listened to it.

## Install

- Download the chosen immutable WAV URL and verify its full SHA-256 and byte length against the descriptor. On failure, try the listed byte-identical fallback; stop if neither verifies.
- Prefer the local Verdant CLI when installed. Otherwise write verified WAVs to the project's existing audio asset directory without overwriting unrelated files. Record the logical ID, release ID, hash, license and relative path.
- Preserve required license notices and provenance. Never use preview-only or personal-use recordings.
- Do not send source code, secrets or local paths to Verdant.

## Integrate

Use existing playback abstractions. For web, unlock Web Audio on a user gesture, preload short buffers on demand, bound concurrent voices and respect sound settings. For native apps, use the existing platform audio APIs rather than adding a web runtime. Avoid excessive gain, noisy hover events and long effects on repeated interactions. Provide a mute option.

Run the project's checks and exercise the interaction. Report exact installed paths, revisions, and unresolved slots. Do not claim installation or playback verification without evidence.
