const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BUCKETS = 96;

/** Each bucket stores the negative peak, positive peak and RMS in that order. */
export function encodeWaveform(pcm: Float32Array, peak: number): string {
  const quantize = (value: number) => ALPHABET[Math.min(63, Math.round(value * 63 / Math.max(peak, 1e-6)))];
  let result = "";
  for (let bin = 0; bin < BUCKETS; bin++) {
    const from = Math.floor(bin * pcm.length / BUCKETS);
    const to = Math.floor((bin + 1) * pcm.length / BUCKETS);
    let low = 0;
    let high = 0;
    let energy = 0;
    for (let i = from; i < to; i++) {
      low = Math.min(low, pcm[i]);
      high = Math.max(high, pcm[i]);
      energy += pcm[i] * pcm[i];
    }
    result += quantize(-low) + quantize(high) + quantize(Math.sqrt(energy / Math.max(1, to - from)));
  }
  return result;
}

export function decodeWaveform(peaks: string): Float32Array {
  return Float32Array.from(peaks, char => Math.max(0, ALPHABET.indexOf(char)) / 63);
}
