export const TAU = Math.PI * 2;

/** Decays are truncated at 6.9 time constants, which is -60 dB. */
export const TAIL = 6.9;

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smooth attack into an exponential decay. */
export function envelope(t: number, attack: number, decay: number): number {
  if (t < 0) return 0;
  const a = Math.max(attack, 1e-5);
  if (t < a) return smoothstep(t / a);
  return Math.exp(-(t - a) / decay);
}

export function peakOf(buf: ArrayLike<number>): number {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

export function scaleToPeak(buf: Float64Array, target: number): void {
  const peak = peakOf(buf);
  if (peak < 1e-12) return;
  const k = target / peak;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
}

/** Kills the first/last-sample discontinuity that would otherwise tick on playback. */
export function fadeEdges(buf: Float64Array, inSeconds: number, outSeconds: number, rate: number): void {
  const nIn = Math.min(buf.length, Math.round(inSeconds * rate));
  for (let i = 0; i < nIn; i++) buf[i] *= smoothstep(i / nIn);
  const nOut = Math.min(buf.length, Math.round(outSeconds * rate));
  for (let i = 0; i < nOut; i++) buf[buf.length - 1 - i] *= smoothstep(i / nOut);
}

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" -> 440, "F#6" -> 1479.98 */
export function note(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octave] = match;
  const semitone = SEMITONES[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const midi = (Number(octave) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}
