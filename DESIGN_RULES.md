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

Native scrollTop owns position and OS momentum. A stationary perspective stage holds a single copy of every row. The central 58% of the rail is exactly planar; only its top and bottom edges curve away on tangent-connected arcs. Each visible row gets an independent projection, no parent rotation, scale or blur. Visual compliance is critically damped and limited to 4px (2px touch). No wheel interception, forced snapping, looping or overscroll simulation. Offscreen controls remain keyboard-reachable; focus reveals the row. Reduced motion, unsupported 3D, short lists and compact rails use flat native scrolling. No new dependencies.

Volume uses a neutral pill, a real value-driven fill and a native keyboard/touch range with custom grab cursors. Download all uses a dark neutral pill. Library row hover and selection backgrounds stay neutral; the hovered play/download/transport button is black with white ink. Green remains the signal accent.

## Studio paper and tactile audio
Warm paper canvas with green data accents; volume is a calibrated tick ruler with a native range input. Bookmarks persist locally and do not require an account. The six rejected recordings (drag, send, dismiss, swipe, close, open) are regenerated at build time using short, dry, low-Q, non-sweeping textures. The remaining baseline WAVs are copied byte-for-byte. Production catalog, ZIP and content-addressed preview bank are assembled together; decoded cache remains bounded to 768 KiB and the optional raw bank to 3 MiB. No audio is synthesized at runtime.

## Volume and Trazo gestures
The gain control uses a single native range value, an ink capsule, an aligned white thumb, mute/restore and a full-width compact layout. No ruler or tick layers. Drag is the deterministic offline adaptation of Trazo's procedural sticker peel. Hover is a quieter adaptation of its sticker placement, not an upstream hover asset. Preserve the MIT notice in licenses/trazo-MIT.txt. No upstream MP3 assets are used. The seven revised sounds are generated at build time; the other 32 baseline WAVs remain byte-identical.
