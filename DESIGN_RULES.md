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

## Direct manipulation and rendering budget
Volume state is local to its control; pointer capture preserves the grab offset, one frame commit updates gain and UI, and gain automation replaces the previous tail. No spring lag on direct manipulation. Saved hover uses black/white with a separate keyboard-only focus indicator. Duration is a measured linear mark with dotted guide and square endpoint, never playback progress. Memoized rows, range-based PCM decoding without byte-slice copies, and cached waveform paths avoid unnecessary work. Idle motion remains event-driven. Audio assets are unchanged.

## Landing and catalog dashboard

The landing alone uses a playful Trazo-style crayon illustration layer (MIT original layered artwork and Verdant sound-specific sketches), white dotted paper, green measured waveform signals, black pills and Instrument Sans UI. Its central editorial hero is surrounded by individually draggable painted objects; the catalog occupies a periodic rectangular sheet. The camera wraps indefinitely on both axes, with a period aligned to the 22px dot texture; no repeated React trees or finite dead edges. Drag empty paper, use trackpad or arrow keys to pan; drag a sound to reposition and audition on release. Reset restores the authored layout. Direct manipulation preserves pointer offset; velocity-dependent lift and exponential coast settle without bounce. Reduced motion disables coast and lift. All multicolor illustration exceptions are landing-only; Studio and dashboard remain unchanged.

The dashboard uses a flat catalog and a stationary inspector. Studio keeps the left waveform and right cylindrical rail. Both share one audio engine, persistent saved IDs and the original download URLs. Keyboard auditions are scoped to the focused keyboard pad, while the on-screen keys also support click and touch.

Waveform envelopes are built from the delivered PCM and included with the catalog. Individual immutable previews replace the full-catalog bank. Audio loads when invited, with a bounded decoded cache and a single playback source. The expanded collection has per-asset credit and listening review status.
