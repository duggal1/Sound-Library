import type { CatalogResponse } from "../core/types";
import { decodeWav } from "../core/wav";

export interface DecodedSound {
  readonly id: string;
  readonly sampleRate: number;
  readonly samples: Float32Array;
}

export async function fetchCatalog(signal: AbortSignal): Promise<CatalogResponse> {
  const forced = new URLSearchParams(location.search).get("state");
  if (forced === "loading") return new Promise<CatalogResponse>(() => {});
  if (forced === "error") throw new Error("Simulated failure (?state=error).");

  const response = await fetch("/sounds/catalog.json", { signal });
  if (!response.ok) throw new Error(`Could not load the sound catalog (${response.status}).`);
  const data = await response.json() as CatalogResponse;
  if (forced === "empty") return {...data, sounds: [], totalBytes: 0};
  return data;
}

type SoundRef = {readonly id: string; readonly previewUrl?: string};
export const PREVIEW_MEMORY_BUDGET = 768 * 1024;
const ready = new Map<string, DecodedSound>();
const inFlight = new Map<string, Promise<DecodedSound>>();
let readyBytes = 0;
let warming = 0;

function urlFor(sound: SoundRef): string {
  return sound.previewUrl ?? `/sounds/${encodeURIComponent(sound.id)}.wav`;
}

export function peekSound(sound: SoundRef): DecodedSound | undefined {
  const key = sound.id + ":" + urlFor(sound);
  const cached = ready.get(key);
  if (cached) {
    ready.delete(key);
    ready.set(key, cached);
  }
  return cached;
}

export function loadSound(sound: SoundRef, priority: "high" | "low" = "high"): Promise<DecodedSound> {
  const key = sound.id + ":" + urlFor(sound);
  const cached = peekSound(sound);
  if (cached) return Promise.resolve(cached);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const pending = fetch(urlFor(sound), {priority}).then(async response => {
    if (!response.ok) throw new Error(`Could not load ${sound.id} (${response.status}).`);
    const {sampleRate, samples} = decodeWav(await response.arrayBuffer());
    const item = {id: sound.id, sampleRate, samples};
    if (samples.byteLength > PREVIEW_MEMORY_BUDGET) return item;
    while (readyBytes + samples.byteLength > PREVIEW_MEMORY_BUDGET) {
      const oldest = ready.keys().next().value!;
      readyBytes -= ready.get(oldest)!.samples.byteLength;
      ready.delete(oldest);
    }
    ready.set(key, item);
    readyBytes += samples.byteLength;
    return item;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

/** Warm at most two likely targets following focused user interaction. */
export function prefetchSound(sound: SoundRef): void {
  const connection = (navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}}).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
  const key = sound.id + ":" + urlFor(sound);
  if (warming >= 2 || ready.has(key) || inFlight.has(key)) return;
  warming++;
  void loadSound(sound, "low").catch(() => {}).finally(() => { warming--; });
}
