import { TAU } from "./dsp";
import { renderSynth } from "./synth";
import {
  BIT_DEPTH,
  SAMPLE_RATE,
  type LegacySoundDef,
  type RenderedSound,
  type SoundDef,
  type SoundMetrics,
  type SoundSummary,
} from "./types";

/** Same maths as the Python: gain * max(0, 1 - t / decay) * sin(2 pi f t), fixed length. */
function renderLegacy(def: LegacySoundDef, rate: number): Float64Array {
  const frames = Math.trunc(rate * def.seconds);
  const out = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate;
    const env = Math.max(0, 1 - t / def.decay);
    out[frame] = def.gain * env * Math.sin(TAU * def.frequency * t);
  }
  return out;
}

export function measure(samples: Float64Array, rate: number): SoundMetrics {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
  }
  const rms = samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;
  const db = (x: number) => (x > 0 ? Math.max(-120, 20 * Math.log10(x)) : -120);
  return {
    duration: samples.length / rate,
    samples: samples.length,
    peak,
    rms,
    peakDb: db(peak),
    rmsDb: db(rms),
  };
}

export function renderSound(def: SoundDef, rate: number = SAMPLE_RATE): RenderedSound {
  const samples = def.engine === "legacy" ? renderLegacy(def, rate) : renderSynth(def, rate);
  return { def, sampleRate: rate, samples, metrics: measure(samples, rate) };
}

export function summarize(rendered: RenderedSound): SoundSummary {
  const { def, metrics } = rendered;
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    description: def.description,
    bytes: 44 + metrics.samples * (BIT_DEPTH / 8),
    ...metrics,
  };
}
