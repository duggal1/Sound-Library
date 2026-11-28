export const SAMPLE_RATE = 48_000;
export const BIT_DEPTH = 16;

export type CategoryId =
  | "pointer"
  | "toggle"
  | "notify"
  | "motion"
  | "typing"
  | "keyboard"
  | "progress"
  | "classic";

export interface CategoryInfo {
  readonly id: CategoryId;
  readonly label: string;
}

export type ModalMode = "glass" | "bar" | "wood" | "bell";
export type FilterMode = "lowpass" | "bandpass" | "highpass";

interface LayerBase {
  /** Start offset in seconds. */
  readonly at?: number;
  /** Peak amplitude of this layer before the final mix is normalised. Default 1. */
  readonly gain?: number;
}

/** Sine (or additive) oscillator with an exponential pitch glide and exponential decay. */
export interface ToneLayer extends LayerBase {
  readonly type: "tone";
  readonly freq: number;
  /** Pitch the glide settles on. Omit for a constant pitch. */
  readonly to?: number;
  /** Glide time constant in seconds. */
  readonly glide?: number;
  /** Harmonic amplitudes, index 0 = fundamental. Default [1]. */
  readonly partials?: readonly number[];
  readonly attack?: number;
  /** Decay time constant in seconds. */
  readonly decay: number;
}

/** Struck-object model: a bank of decaying sines at inharmonic ratios. */
export interface ModalLayer extends LayerBase {
  readonly type: "modal";
  readonly mode: ModalMode;
  readonly freq: number;
  /** Fundamental decay time constant in seconds. */
  readonly decay: number;
  /** Higher partials die faster: tau_i = decay / (1 + damping * i). */
  readonly damping?: number;
  readonly attack?: number;
}

/** White noise through a resonant state-variable filter, optionally swept. */
export interface NoiseLayer extends LayerBase {
  readonly type: "noise";
  readonly mode: FilterMode;
  readonly freq: number;
  readonly to?: number;
  /** Seconds the filter takes to travel from freq to `to`. */
  readonly sweep?: number;
  readonly q?: number;
  readonly attack?: number;
  readonly decay: number;
}

export type Layer = ToneLayer | ModalLayer | NoiseLayer;

export interface EchoSpec {
  readonly time: number;
  readonly gain: number;
  readonly taps: number;
}

interface SoundBase {
  readonly id: string;
  readonly name: string;
  readonly category: CategoryId;
  readonly description: string;
}

export interface SynthSoundDef extends SoundBase {
  readonly engine: "synth";
  /** Final peak amplitude, 0..1. */
  readonly level: number;
  readonly layers: readonly Layer[];
  /** Offline paper-gesture renderer adapted from Trazo, when present. */
  readonly paperGesture?: "peel" | "touch";
  readonly echo?: EchoSpec;
}

/** Faithful port of the original Python generator: linear-decay sine, fixed length. */
export interface LegacySoundDef extends SoundBase {
  readonly engine: "legacy";
  readonly frequency: number;
  readonly decay: number;
  readonly gain: number;
  readonly seconds: number;
}

export type SoundDef = SynthSoundDef | LegacySoundDef;

export interface SoundMetrics {
  readonly duration: number;
  readonly samples: number;
  readonly peak: number;
  readonly rms: number;
  readonly peakDb: number;
  readonly rmsDb: number;
}

export interface RenderedSound {
  readonly def: SoundDef;
  readonly sampleRate: number;
  readonly samples: Float64Array;
  readonly metrics: SoundMetrics;
}

export interface SoundSummary extends SoundMetrics {
  readonly id: string;
  readonly name: string;
  readonly category: CategoryId;
  readonly description: string;
  readonly bytes: number;
  readonly waveform?: string;
  readonly previewUrl?: string;
  readonly sha256?: string;
  readonly source?: { readonly name: string; readonly author: string; readonly url: string; readonly license: "CC0-1.0"; readonly take: string };
  readonly review?: "pending";
  readonly keyCode?: string;
  readonly importedMouse?: {readonly pack:string;readonly author:string;readonly license:"personal-use-only"|"unverified"};
}

export interface CatalogResponse {
  readonly sampleRate: number;
  readonly bitDepth: number;
  readonly channels: 1;
  readonly totalBytes: number;
  /** Immutable, contiguous WAV bank in catalog order; optional for legacy catalogs. */
  readonly previewBank?: string;
  readonly previewWarning?: string;
  readonly categories: readonly CategoryInfo[];
  readonly sounds: readonly SoundSummary[];
}
