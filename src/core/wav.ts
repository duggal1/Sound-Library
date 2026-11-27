function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function readAscii(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

function toInt16(x: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
}

/** 16-bit PCM, mono, little-endian RIFF/WAVE. Same container the Python `wave` module writes. */
export function encodeWav(samples: ArrayLike<number>, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, toInt16(samples[i]), true);
  return new Uint8Array(buffer);
}

/** Minimal decoder for what encodeWav writes: 16-bit PCM mono. */
export function decodeWav(buffer: ArrayBuffer): { sampleRate: number; samples: Float32Array } {
  const view = new DataView(buffer);
  if (view.byteLength < 12 || readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }

  let offset = 12;
  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (id === "fmt ") {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      if (format !== 1 || channels !== 1 || bits !== 16) {
        throw new Error("Unsupported WAV: expected 16-bit PCM mono");
      }
      const count = Math.floor(Math.min(size, view.byteLength - body) / 2);
      const samples = new Float32Array(count);
      for (let i = 0; i < count; i++) samples[i] = view.getInt16(body + i * 2, true) / 32768;
      return { sampleRate, samples };
    }
    offset = body + size + (size & 1);
  }
  throw new Error("WAV has no data chunk");
}
