import type { CatalogResponse } from "../core/types";
import { decodeWav } from "../core/wav";

export interface DecodedSound {
  readonly id: string;
  readonly sampleRate: number;
  readonly samples: Float32Array;
}

/** ?state=loading | error | empty lets you review non-happy states without breaking the server. */
export async function fetchCatalog(signal: AbortSignal): Promise<CatalogResponse> {
  const forced = new URLSearchParams(location.search).get("state");
  if (forced === "loading") return new Promise<CatalogResponse>(() => {});
  if (forced === "error") throw new Error("Simulated failure (?state=error).");

  const res = await fetch("/sounds/catalog.json", { signal });
  if (!res.ok) throw new Error(`The server answered ${res.status} for /sounds/catalog.json.`);
  const data = (await res.json()) as CatalogResponse;
  return forced === "empty" ? { ...data, sounds: [], totalBytes: 0 } : data;
}

const cache = new Map<string, Promise<DecodedSound>>();

/** Fetches the exact WAV the user would download and decodes it. No AudioContext needed. */
export function loadSound(id: string): Promise<DecodedSound> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(`/sounds/${encodeURIComponent(id)}.wav`).then(async (res) => {
      if (!res.ok) throw new Error(`Could not load ${id}.wav (${res.status}).`);
      const { sampleRate, samples } = decodeWav(await res.arrayBuffer());
      return { id, sampleRate, samples };
    });
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}
