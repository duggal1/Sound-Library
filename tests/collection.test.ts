import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { KEY_ROWS, keySoundId } from "../src/core/keyboard";
import type { SoundSummary } from "../src/core/types";
import { decodeWav } from "../src/core/wav";
import { decodeWaveform, encodeWaveform } from "../src/core/waveform";
import { wrapAngle } from "../src/web/orbit";

const source = new URL("../public/sounds/collection/", import.meta.url);
const assets = JSON.parse(readFileSync(new URL("manifest.json", source), "utf8")) as SoundSummary[];

describe("expanded collection", () => {
  test("every key points at a distinct recorded take, with complete provenance", () => {
    const keys = assets.filter(asset => asset.category === "keyboard");
    expect(keys).toHaveLength(61);
    const keyMap = new Map(keys.map(asset => [asset.keyCode, asset]));
    for (const key of KEY_ROWS.flat()) {
      const asset = keyMap.get(key.code);
      expect(asset?.id).toBe(keySoundId(key.code));
      expect(asset?.source?.author).toBe("unicaegames");
    }
    expect(new Set(keys.map(asset => asset.source?.take)).size).toBe(keys.length);
  });

  test("all 111 edited assets decode, have unique PCM and end cleanly", () => {
    expect(assets).toHaveLength(111);
    const seen = new Set<string>();
    for (const asset of assets) {
      expect(asset.source?.license).toBe("CC0-1.0");
      expect(asset.review).toBe("pending");
      const wav = readFileSync(new URL(asset.id + ".wav", source));
      const {sampleRate, samples} = decodeWav(wav.buffer, wav.byteOffset, wav.byteLength);
      expect(sampleRate).toBe(48000);
      expect(samples[0]).toBe(0);
      expect(samples.at(-1)).toBe(0);
      const hash = createHash("sha256").update(wav.subarray(44)).digest("hex");
      expect(seen.has(hash)).toBe(false);
      seen.add(hash);
    }
  });

  test("compact waveform keeps both sides of the signal", () => {
    const samples = new Float32Array(192).fill(0);
    samples[0] = -.5;
    samples[1] = .25;
    const encoded = encodeWaveform(samples, .5);
    const decoded = decodeWaveform(encoded);
    expect(encoded).toHaveLength(288);
    expect(decoded[0]).toBe(1);
    expect(decoded[1]).toBeCloseTo(.5, 1);
    expect(decoded[2]).toBeCloseTo(Math.sqrt(.625), 1);
    expect(decoded[3]).toBe(0);
  });

  test("cylinder wrapping preserves points after many full turns", () => {
    for (const angle of [-2.8, -1.2, 0, .5, 2.97]) {
      expect(wrapAngle(angle + 2 * Math.PI * 5000)).toBeCloseTo(angle, 9);
      expect(wrapAngle(angle - 2 * Math.PI * 5000)).toBeCloseTo(angle, 9);
    }
  });
});
