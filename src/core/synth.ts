import { TAIL, TAU, envelope, fadeEdges, scaleToPeak, smoothstep } from "./dsp";
import { hashString, mulberry32 } from "./rng";
import type { EchoSpec, Layer, ModalLayer, ModalMode, NoiseLayer, SynthSoundDef, ToneLayer } from "./types";

const SINE: readonly number[] = [1];

/** Partial ratios and relative amplitudes of the struck-object models. */
const MODES: Record<ModalMode, { readonly ratios: readonly number[]; readonly gains: readonly number[] }> = {
  glass: { ratios: [1, 2.32, 4.25, 6.63], gains: [1, 0.42, 0.2, 0.09] },
  bar: { ratios: [1, 2.756, 5.404, 8.933], gains: [1, 0.5, 0.22, 0.1] },
  wood: { ratios: [1, 2.4, 4.7], gains: [1, 0.45, 0.18] },
  bell: {
    ratios: [0.5, 1, 1.183, 1.506, 2, 2.514, 3.011],
    gains: [0.35, 1, 0.55, 0.4, 0.45, 0.2, 0.12],
  },
};

function lengthOf(attack: number, decay: number, rate: number): number {
  return Math.max(1, Math.ceil((attack + decay * TAIL) * rate));
}

function renderTone(layer: ToneLayer, rate: number): Float64Array {
  const attack = layer.attack ?? 0.0008;
  const out = new Float64Array(lengthOf(attack, layer.decay, rate));
  const target = layer.to ?? layer.freq;
  const glide = layer.glide ?? 0.01;
  const partials = layer.partials ?? SINE;
  const limit = rate * 0.45;

  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const freq = target + (layer.freq - target) * Math.exp(-t / glide);
    let sum = 0;
    for (let k = 0; k < partials.length; k++) {
      const amp = partials[k];
      if (amp !== 0 && freq * (k + 1) < limit) sum += amp * Math.sin(phase * (k + 1));
    }
    out[i] = sum * envelope(t, attack, layer.decay);
    phase += (TAU * freq) / rate;
  }
  return out;
}

function renderModal(layer: ModalLayer, rate: number): Float64Array {
  const mode = MODES[layer.mode];
  const attack = layer.attack ?? 0.0004;
  const damping = layer.damping ?? 0.6;
  const out = new Float64Array(lengthOf(attack, layer.decay, rate));
  const limit = rate * 0.45;

  for (let p = 0; p < mode.ratios.length; p++) {
    const freq = layer.freq * mode.ratios[p];
    if (freq >= limit) continue;
    const tau = layer.decay / (1 + damping * p);
    const step = (TAU * freq) / rate;
    const amp = mode.gains[p];
    const end = Math.min(out.length, Math.ceil((attack + tau * TAIL) * rate));
    for (let i = 0; i < end; i++) {
      out[i] += amp * envelope(i / rate, attack, tau) * Math.sin(step * i);
    }
  }
  return out;
}

function renderNoise(layer: NoiseLayer, rate: number, rand: () => number): Float64Array {
  const attack = layer.attack ?? 0.0005;
  const out = new Float64Array(lengthOf(attack, layer.decay, rate));
  const q = layer.q ?? 0.9;
  const k = 1 / q;
  const to = layer.to ?? layer.freq;
  const sweep = layer.sweep ?? out.length / rate;
  const ceiling = rate * 0.45;

  // Trapezoidal-integrated state-variable filter (Zavalishin / Simper).
  // Stable under per-sample cutoff modulation, which the sweeps need.
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const x = rand() * 2 - 1;
    const fc = Math.min(layer.freq * Math.pow(to / layer.freq, smoothstep(t / sweep)), ceiling);
    const g = Math.tan((Math.PI * fc) / rate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;

    const y = layer.mode === "lowpass" ? v2 : layer.mode === "bandpass" ? k * v1 : x - k * v1 - v2;
    out[i] = y * envelope(t, attack, layer.decay);
  }
  return out;
}

function renderLayer(layer: Layer, rate: number, rand: () => number): Float64Array {
  switch (layer.type) {
    case "tone":
      return renderTone(layer, rate);
    case "modal":
      return renderModal(layer, rate);
    case "noise":
      return renderNoise(layer, rate, rand);
  }
}

function applyEcho(dry: Float64Array, echo: EchoSpec | undefined, rate: number): Float64Array {
  if (!echo) return dry;
  const delay = Math.round(echo.time * rate);
  const out = new Float64Array(dry.length + delay * echo.taps);
  out.set(dry);
  for (let tap = 1; tap <= echo.taps; tap++) {
    const gain = echo.gain ** tap;
    const offset = delay * tap;
    for (let i = 0; i < dry.length; i++) out[offset + i] += dry[i] * gain;
  }
  return out;
}

/**
 * Every layer is peak-normalised to its own `gain` before mixing, so `gain`
 * means exactly "how loud is this layer relative to the others". The mix is
 * then normalised to the sound's `level`. Noise is seeded from the id, so
 * output is bit-identical across server, CLI and browser.
 */
export function renderSynth(def: SynthSoundDef, rate: number): Float64Array {
  const rand = mulberry32(hashString(def.id));
  const parts = def.layers.map((layer) => {
    const data = renderLayer(layer, rate, rand);
    scaleToPeak(data, layer.gain ?? 1);
    return { offset: Math.round((layer.at ?? 0) * rate), data };
  });

  let length = 0;
  for (const part of parts) length = Math.max(length, part.offset + part.data.length);

  const dry = new Float64Array(length);
  for (const part of parts) {
    for (let i = 0; i < part.data.length; i++) dry[part.offset + i] += part.data[i];
  }

  const mix = applyEcho(dry, def.echo, rate);
  fadeEdges(mix, 0.0002, 0.006, rate);
  scaleToPeak(mix, def.level);
  return mix;
}
