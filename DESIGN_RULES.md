# Verdant design contract

Purpose: browse, audition, inspect and export interface sounds without losing the active visual feedback. The selected sound and measured waveform are the hero. Search, browsing and transport support that action. No decorative metrics, repeated play controls or card grid.

- Desktop: stationary left waveform/transport, independently scrolling right library. On narrow screens, keep the waveform above the independently scrolling list; expand the inspector for source metrics and description.
- White, ink #000, muted #525252, quiet #737373. Green #168a48 / #a7cdb2 / #edf7ef / #166534 is the audio and selection accent, not the default control color.
- Instrument Sans / Inter, weights 400/450, four sizes (12/14/20/44), tabular digits; spacing 4/8/12/16/24/32/48/64.
- Full pills for all controls and rows. No row borders, no gradients, no pixel decoration. One quiet dotted section rule. Custom single-cut paper glyphs and pointer/grab cursors.
- Waveform uses measured signed peaks and RMS, a clock-driven playhead and pointer/keyboard seek. Scope uses actual analyser samples. Motion uses damped transitions and honors reduced motion.
- Loading, empty, error, disabled, selected, playing and pending states must be real. No fabricated metrics. Preserve keyboard, focus and scroll.
- Keep all original generated WAVs, static asset paths, 768 KiB cache, 110% preview gain and synthesis untouched.

Review at 380, 670, 850, 1100 and 1440 CSS pixels. Verify scroll isolation, tap targets, download, filter, replay, stop, seek, reduced motion and keyboard. Do not claim a screenshot or frame-rate benchmark without running it.

## Cylindrical library

Native scrollTop owns position and OS momentum. The supplied MIT Kokonut UI wheel picker by Dorian Baffier provides the fixed tangent-row drum geometry; Verdant uses a single interactive row copy, native scroll carrier, stationary perspective stage and one shared rotating drum. Fixed row angles use 2 atan(pitch / 2 radius); rebase every six rows without changing the projection. The only added motion is an analytically critically damped, at most 8px visual lag (4px touch); no wheel interception, forced snapping, looping, vibration or overscroll simulation. Optional .28px blur affects only text near the edges, never hovered/focused text or the central row. Offscreen rows remain keyboard-reachable. Reduced motion, unsupported 3D and short lists use flat native scrolling. No new dependencies.

Volume uses a neutral pill, a real value-driven fill and a native keyboard/touch range with custom grab cursors. Download all uses a dark neutral pill. Library hover and selection backgrounds stay neutral; green remains the signal accent.
