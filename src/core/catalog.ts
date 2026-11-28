import { note } from "./dsp";
import type {
  CategoryInfo,
  LegacySoundDef,
  ModalLayer,
  NoiseLayer,
  SoundDef,
  SynthSoundDef,
  ToneLayer,
} from "./types";

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: "pointer", label: "Pointer" },
  { id: "toggle", label: "Toggle" },
  { id: "notify", label: "Notify" },
  { id: "motion", label: "Motion" },
  { id: "typing", label: "Typing" },
  { id: "progress", label: "Progress" },
  { id: "classic", label: "Classic" },
];

const tone = (p: Omit<ToneLayer, "type">): ToneLayer => ({ type: "tone", ...p });
const modal = (p: Omit<ModalLayer, "type">): ModalLayer => ({ type: "modal", ...p });
const noise = (p: Omit<NoiseLayer, "type">): NoiseLayer => ({ type: "noise", ...p });
const synth = (def: Omit<SynthSoundDef, "engine">): SynthSoundDef => ({ engine: "synth", ...def });
const legacy = (def: Omit<LegacySoundDef, "engine" | "seconds">): LegacySoundDef => ({
  engine: "legacy",
  seconds: 0.25,
  ...def,
});

const ECHO = { time: 0.12, gain: 0.2, taps: 2 } as const;

/* ------------------------------------------------------------------ */
/* Pointer                                                              */
/* ------------------------------------------------------------------ */
const pointer: SynthSoundDef[] = [
  synth({
    id: "tap",
    name: "Tap",
    category: "pointer",
    description: "Soft membrane tap for secondary actions.",
    level: 0.42,
    layers: [
      tone({ freq: 900, to: 420, glide: 0.008, attack: 0.0005, decay: 0.022 }),
      noise({ mode: "lowpass", freq: 2200, q: 0.8, attack: 0.0002, decay: 0.004, gain: 0.35 }),
    ],
  }),
  synth({
    id: "hover",
    name: "Hover",
    category: "pointer",
    description: "Quiet matte touch with a soft paper brush.",
    level: 0.12,
    paperGesture: "touch",
    layers: [],
  }),
  synth({
    id: "drag",
    name: "Drag",
    category: "pointer",
    description: "Soft matte paper peel when lifting an object.",
    level: 0.3,
    paperGesture: "peel",
    layers: [],
  }),
];

/* ------------------------------------------------------------------ */
/* Toggle                                                               */
/* ------------------------------------------------------------------ */
const toggle: SynthSoundDef[] = [
  synth({
    id: "toggle-on",
    name: "Toggle on",
    category: "toggle",
    description: "Two rising glass notes. Switch turned on.",
    level: 0.45,
    layers: [
      modal({ mode: "glass", freq: note("G6"), decay: 0.035, damping: 0.9, gain: 0.8 }),
      modal({ mode: "glass", at: 0.05, freq: note("D7"), decay: 0.07, damping: 0.9 }),
      noise({ mode: "highpass", freq: 5000, q: 0.7, attack: 0.0002, decay: 0.002, gain: 0.2 }),
    ],
  }),
  synth({
    id: "toggle-off",
    name: "Toggle off",
    category: "toggle",
    description: "Two falling glass notes. Switch turned off.",
    level: 0.36,
    layers: [
      modal({ mode: "glass", freq: note("D7"), decay: 0.03, damping: 0.9, gain: 0.6 }),
      modal({ mode: "glass", at: 0.05, freq: note("G6"), decay: 0.05, damping: 0.9, gain: 0.9 }),
    ],
  }),
  synth({
    id: "check",
    name: "Check",
    category: "toggle",
    description: "Bright upward chirp for a ticked checkbox.",
    level: 0.42,
    layers: [
      tone({ freq: 1400, to: 2100, glide: 0.012, decay: 0.035 }),
      modal({ mode: "glass", at: 0.012, freq: 2800, decay: 0.05, damping: 0.9, gain: 0.5 }),
    ],
  }),
  synth({
    id: "uncheck",
    name: "Uncheck",
    category: "toggle",
    description: "Short downward chirp for a cleared checkbox.",
    level: 0.32,
    layers: [
      tone({ freq: 1500, to: 1000, glide: 0.015, decay: 0.028 }),
      modal({ mode: "glass", at: 0.006, freq: 1900, decay: 0.03, damping: 0.9, gain: 0.35 }),
    ],
  }),
  synth({
    id: "select",
    name: "Select",
    category: "toggle",
    description: "Wood and glass together. A chosen list item or tab.",
    level: 0.42,
    layers: [
      modal({ mode: "wood", freq: 1400, decay: 0.022, damping: 0.6 }),
      modal({ mode: "glass", freq: 2800, decay: 0.04, damping: 0.9, gain: 0.4 }),
      noise({ mode: "bandpass", freq: 3500, q: 1, attack: 0.0002, decay: 0.002, gain: 0.3 }),
    ],
  }),
  synth({
    id: "slider-tick",
    name: "Slider tick",
    category: "toggle",
    description: "Tiny detent for each step of a slider.",
    level: 0.22,
    layers: [
      modal({ mode: "wood", freq: 2000, decay: 0.007, damping: 0.8 }),
      noise({ mode: "highpass", freq: 5000, q: 0.8, attack: 0.0002, decay: 0.0015, gain: 0.5 }),
    ],
  }),
];

/* ------------------------------------------------------------------ */
/* Notify                                                               */
/* ------------------------------------------------------------------ */
const notify: SynthSoundDef[] = [
  synth({
    id: "success",
    name: "Success",
    category: "notify",
    description: "Rising D major arpeggio in glass.",
    level: 0.5,
    echo: ECHO,
    layers: [
      modal({ mode: "glass", freq: note("D6"), decay: 0.09, damping: 0.9, gain: 0.85 }),
      modal({ mode: "glass", at: 0.075, freq: note("F#6"), decay: 0.09, damping: 0.9, gain: 0.9 }),
      modal({ mode: "glass", at: 0.15, freq: note("A6"), decay: 0.12, damping: 0.9 }),
    ],
  }),
  synth({
    id: "error",
    name: "Error",
    category: "notify",
    description: "Two low, slightly buzzy notes falling.",
    level: 0.5,
    layers: [
      tone({ freq: note("D#4"), to: note("D4"), glide: 0.06, attack: 0.002, decay: 0.07, partials: [1, 0.5, 0.3] }),
      tone({ freq: note("A#3"), to: note("G3"), glide: 0.08, at: 0.11, attack: 0.002, decay: 0.12, partials: [1, 0.5, 0.3] }),
      noise({ mode: "lowpass", freq: 1200, q: 0.7, attack: 0.0005, decay: 0.02, gain: 0.3 }),
    ],
  }),
  synth({
    id: "warning",
    name: "Warning",
    category: "notify",
    description: "Falling fifth on a metal bar.",
    level: 0.5,
    layers: [
      modal({ mode: "bar", freq: note("A5"), decay: 0.09, damping: 0.8 }),
      modal({ mode: "bar", at: 0.13, freq: note("E5"), decay: 0.12, damping: 0.8, gain: 0.9 }),
    ],
  }),
  synth({
    id: "notification",
    name: "Notification",
    category: "notify",
    description: "Two-note bell chime, a fifth up.",
    level: 0.5,
    layers: [
      modal({ mode: "bell", freq: note("E6"), decay: 0.14, damping: 0.8, gain: 0.9 }),
      modal({ mode: "bell", at: 0.12, freq: note("B6"), decay: 0.18, damping: 0.8 }),
    ],
  }),
  synth({
    id: "message",
    name: "Message",
    category: "notify",
    description: "Two quick bubbles, rising.",
    level: 0.42,
    layers: [
      tone({ freq: 600, to: 1100, glide: 0.015, decay: 0.03 }),
      tone({ freq: 800, to: 1500, glide: 0.015, at: 0.07, decay: 0.04 }),
    ],
  }),
  synth({
    id: "alert",
    name: "Alert",
    category: "notify",
    description: "Three urgent pulses.",
    level: 0.55,
    layers: [
      tone({ freq: 1320, decay: 0.05, partials: [1, 0.3, 0.15] }),
      tone({ freq: 1320, at: 0.11, decay: 0.05, partials: [1, 0.3, 0.15] }),
      tone({ freq: 1320, at: 0.22, decay: 0.05, partials: [1, 0.3, 0.15] }),
    ],
  }),
];

/* ------------------------------------------------------------------ */
/* Motion                                                               */
/* ------------------------------------------------------------------ */
const motion: SynthSoundDef[] = [
  synth({
    id: "open",
    name: "Open",
    category: "motion",
    description: "Light release of a latch with a small, dry glass accent.",
    level: 0.38,
    layers: [
      noise({ mode: "bandpass", freq: 1750, q: 0.5, attack: 0.002, decay: 0.011, gain: 0.42 }),
      modal({ mode: "glass", at: 0.024, freq: 1540, decay: 0.025, damping: 1.6, gain: 0.72 }),
    ],
  }),
  synth({
    id: "close",
    name: "Close",
    category: "motion",
    description: "Soft mechanical latch settling against a padded stop.",
    level: 0.36,
    layers: [
      noise({ mode: "lowpass", freq: 1450, q: 0.55, attack: 0.003, decay: 0.012, gain: 0.35 }),
      modal({ mode: "wood", at: 0.021, freq: 540, decay: 0.013, damping: 1.3, gain: 0.75 }),
      noise({ mode: "bandpass", at: 0.023, freq: 2100, q: 0.5, attack: 0.0005, decay: 0.0035, gain: 0.18 }),
    ],
  }),
  synth({
    id: "swipe",
    name: "Swipe",
    category: "motion",
    description: "Short, soft paper brush with no pitched sweep.",
    level: 0.3,
    layers: [
      noise({ mode: "bandpass", freq: 2300, q: 0.48, attack: 0.013, decay: 0.017, gain: 0.74 }),
      noise({ mode: "lowpass", at: 0.016, freq: 1250, q: 0.55, attack: 0.006, decay: 0.018, gain: 0.30 }),
    ],
  }),
  synth({
    id: "expand",
    name: "Expand",
    category: "motion",
    description: "Soft upward bloom.",
    level: 0.35,
    layers: [
      tone({ freq: 400, to: 800, glide: 0.06, attack: 0.01, decay: 0.09 }),
      noise({ mode: "lowpass", freq: 1800, q: 0.7, attack: 0.01, decay: 0.03, gain: 0.15 }),
    ],
  }),
  synth({
    id: "collapse",
    name: "Collapse",
    category: "motion",
    description: "Soft downward fold.",
    level: 0.33,
    layers: [tone({ freq: 800, to: 380, glide: 0.06, attack: 0.005, decay: 0.08 })],
  }),
  synth({
    id: "dismiss",
    name: "Dismiss",
    category: "motion",
    description: "Dry muted fingertip flick with a short felt-like finish.",
    level: 0.32,
    layers: [
      noise({ mode: "bandpass", freq: 1900, q: 0.48, attack: 0.002, decay: 0.011, gain: 0.68 }),
      noise({ mode: "lowpass", at: 0.008, freq: 780, q: 0.55, attack: 0.003, decay: 0.013, gain: 0.32 }),
    ],
  }),
];

/* ------------------------------------------------------------------ */
/* Typing                                                               */
/* ------------------------------------------------------------------ */
const typing: SynthSoundDef[] = [
  synth({
    id: "key",
    name: "Key",
    category: "typing",
    description: "Keyboard tick with a short low thock.",
    level: 0.4,
    layers: [
      noise({ mode: "highpass", freq: 1500, q: 0.7, attack: 0.0002, decay: 0.004 }),
      modal({ mode: "wood", freq: 1000, decay: 0.012, damping: 0.8, gain: 0.6 }),
      tone({ freq: 160, to: 110, glide: 0.01, decay: 0.02, gain: 0.5 }),
    ],
  }),
  synth({
    id: "key-alt",
    name: "Key alt",
    category: "typing",
    description: "Brighter variant. Alternate with Key to avoid machine-gun repetition.",
    level: 0.38,
    layers: [
      noise({ mode: "bandpass", freq: 3200, q: 0.8, attack: 0.0002, decay: 0.0035 }),
      modal({ mode: "wood", freq: 1300, decay: 0.011, damping: 0.8, gain: 0.6 }),
      tone({ freq: 190, to: 130, glide: 0.01, decay: 0.018, gain: 0.45 }),
    ],
  }),
  synth({
    id: "space",
    name: "Space",
    category: "typing",
    description: "Deeper, wider thock for the space bar.",
    level: 0.45,
    layers: [
      tone({ freq: 120, to: 80, glide: 0.015, decay: 0.035 }),
      modal({ mode: "wood", freq: 520, decay: 0.02, damping: 0.7, gain: 0.7 }),
      noise({ mode: "bandpass", freq: 1500, q: 0.8, attack: 0.0003, decay: 0.008, gain: 0.5 }),
    ],
  }),
  synth({
    id: "enter",
    name: "Enter",
    category: "typing",
    description: "Heavy thock followed by a light return tick.",
    level: 0.5,
    layers: [
      tone({ freq: 140, to: 90, glide: 0.015, decay: 0.04 }),
      modal({ mode: "wood", freq: 700, decay: 0.03, damping: 0.7, gain: 0.8 }),
      noise({ mode: "bandpass", freq: 2000, q: 0.8, attack: 0.0003, decay: 0.01, gain: 0.5 }),
      modal({ mode: "wood", at: 0.05, freq: 1600, decay: 0.01, damping: 0.8, gain: 0.5 }),
    ],
  }),
  synth({
    id: "backspace",
    name: "Backspace",
    category: "typing",
    description: "Short downward blip.",
    level: 0.35,
    layers: [
      tone({ freq: 700, to: 350, glide: 0.018, decay: 0.03 }),
      noise({ mode: "bandpass", freq: 2500, q: 1, attack: 0.0002, decay: 0.004, gain: 0.4 }),
    ],
  }),
  synth({
    id: "send",
    name: "Send",
    category: "typing",
    description: "Soft paper flick followed by a short, clear glass confirmation.",
    level: 0.42,
    layers: [
      noise({ mode: "bandpass", freq: 2600, q: 0.5, attack: 0.007, decay: 0.012, gain: 0.22 }),
      modal({ mode: "glass", at: 0.037, freq: 2080, decay: 0.034, damping: 1.5, gain: 0.8 }),
    ],
  }),
];

/* ------------------------------------------------------------------ */
/* Progress                                                             */
/* ------------------------------------------------------------------ */
const progress: SynthSoundDef[] = [
  synth({
    id: "progress-tick",
    name: "Progress tick",
    category: "progress",
    description: "Glass tick for each step of a long task.",
    level: 0.22,
    layers: [
      modal({ mode: "glass", freq: 2600, decay: 0.012, damping: 0.9 }),
      noise({ mode: "highpass", freq: 6000, q: 0.7, attack: 0.0002, decay: 0.002, gain: 0.3 }),
    ],
  }),
  synth({
    id: "complete",
    name: "Complete",
    category: "progress",
    description: "Two bell notes, a fourth up, with a short echo.",
    level: 0.5,
    echo: ECHO,
    layers: [
      modal({ mode: "bell", freq: note("G5"), decay: 0.09, damping: 0.9, gain: 0.8 }),
      modal({ mode: "bell", at: 0.09, freq: note("C6"), decay: 0.11, damping: 0.9 }),
    ],
  }),
  synth({
    id: "unlock",
    name: "Unlock",
    category: "progress",
    description: "Latch click, then three rising glass notes.",
    level: 0.5,
    layers: [
      modal({ mode: "wood", freq: 900, decay: 0.012, damping: 0.8 }),
      noise({ mode: "highpass", freq: 3000, q: 0.7, attack: 0.0002, decay: 0.003, gain: 0.5 }),
      modal({ mode: "glass", at: 0.07, freq: note("G6"), decay: 0.05, damping: 0.9, gain: 0.7 }),
      modal({ mode: "glass", at: 0.11, freq: note("C7"), decay: 0.05, damping: 0.9, gain: 0.85 }),
      modal({ mode: "glass", at: 0.15, freq: note("E7"), decay: 0.09, damping: 0.9 }),
    ],
  }),
  synth({
    id: "level-up",
    name: "Level up",
    category: "progress",
    description: "Four-note C major arpeggio in bell tones, with echo.",
    level: 0.55,
    echo: ECHO,
    layers: [
      modal({ mode: "bell", freq: note("C6"), decay: 0.08, damping: 0.9, gain: 0.8 }),
      modal({ mode: "bell", at: 0.07, freq: note("E6"), decay: 0.08, damping: 0.9, gain: 0.85 }),
      modal({ mode: "bell", at: 0.14, freq: note("G6"), decay: 0.08, damping: 0.9, gain: 0.9 }),
      modal({ mode: "bell", at: 0.21, freq: note("C7"), decay: 0.11, damping: 0.9 }),
    ],
  }),
  synth({
    id: "coin",
    name: "Coin",
    category: "progress",
    description: "Two metal-bar pings, a fourth up.",
    level: 0.45,
    layers: [
      modal({ mode: "bar", freq: note("B6"), decay: 0.03, damping: 0.9 }),
      modal({ mode: "bar", at: 0.055, freq: note("E7"), decay: 0.09, damping: 0.9 }),
    ],
  }),
  synth({
    id: "undo",
    name: "Undo",
    category: "progress",
    description: "Down-chirp, then a wooden tap.",
    level: 0.38,
    layers: [
      tone({ freq: 900, to: 600, glide: 0.03, decay: 0.04 }),
      modal({ mode: "wood", at: 0.05, freq: 1000, decay: 0.02, damping: 0.8, gain: 0.6 }),
    ],
  }),
];

/* ------------------------------------------------------------------ */
/* Classic: exact port of the original Python generator                 */
/* ------------------------------------------------------------------ */
const classic: LegacySoundDef[] = [
  legacy({
    id: "classic-click",
    name: "Classic click",
    category: "classic",
    description: "Original: 800 Hz sine, 15 ms linear decay, gain 0.40.",
    frequency: 800,
    decay: 0.015,
    gain: 0.4,
  }),
  legacy({
    id: "classic-tap",
    name: "Classic tap",
    category: "classic",
    description: "Original: 1200 Hz sine, 12 ms linear decay, gain 0.32.",
    frequency: 1200,
    decay: 0.012,
    gain: 0.32,
  }),
  legacy({
    id: "classic-hover",
    name: "Classic hover",
    category: "classic",
    description: "Original: 1300 Hz sine, 10 ms linear decay, gain 0.16.",
    frequency: 1300,
    decay: 0.01,
    gain: 0.16,
  }),
];

export const CATALOG: readonly SoundDef[] = [
  ...pointer,
  ...toggle,
  ...notify,
  ...motion,
  ...typing,
  ...progress,
  ...classic,
];

const seen = new Set<string>();
for (const def of CATALOG) {
  if (seen.has(def.id)) throw new Error(`Duplicate sound id: ${def.id}`);
  seen.add(def.id);
}

export function findSound(id: string): SoundDef | undefined {
  return CATALOG.find((def) => def.id === id);
}
