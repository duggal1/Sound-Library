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

/** Session-only LRU: no localStorage, IndexedDB, service worker or Cache API. */
export const PREVIEW_MEMORY_BUDGET = 768 * 1024;
const ready = new Map<string, DecodedSound>();
const inFlight = new Map<string, Promise<DecodedSound>>();
let readyBytes = 0;
let warming = 0;
const MAX_BACKGROUND = 2;

function remember(sound: DecodedSound): DecodedSound {
  const bytes = sound.samples.byteLength;
  if (bytes > PREVIEW_MEMORY_BUDGET) return sound;
  const previous = ready.get(sound.id);
  if (previous) {
    readyBytes -= previous.samples.byteLength;
    ready.delete(sound.id);
  }
  while (readyBytes + bytes > PREVIEW_MEMORY_BUDGET && ready.size) {
    const oldest = ready.keys().next().value;
    if (oldest === undefined) break;
    const entry = ready.get(oldest)!;
    readyBytes -= entry.samples.byteLength;
    ready.delete(oldest);
  }
  ready.set(sound.id, sound);
  readyBytes += bytes;
  return sound;
}

/** Ready sounds bypass promises and network entirely on the click path. */
export function peekSound(id: string): DecodedSound | undefined {
  const sound = ready.get(id);
  if (sound) {
    ready.delete(id);
    ready.set(id, sound);
  }
  return sound;
}

export function loadSound(id: string): Promise<DecodedSound> {
  const cached = peekSound(id);
  if (cached) return Promise.resolve(cached);
  const existing = inFlight.get(id);
  if (existing) return existing;
  // Default request cache mode honors the response's browser no-store policy
  // without sending a bypass-cache directive to the CDN.
  const pending = fetch(`/sounds/${encodeURIComponent(id)}.wav`).then(async res => {
    if (!res.ok) throw new Error(`Could not load ${id}.wav (${res.status}).`);
    const { sampleRate, samples } = decodeWav(await res.arrayBuffer());
    return remember({ id, sampleRate, samples });
  }).finally(() => inFlight.delete(id));
  inFlight.set(id, pending);
  return pending;
}

/** Best effort; demand loads are never queued behind speculative work. */
export function prefetchSound(id: string | undefined): void {
  if (!id || ready.has(id) || inFlight.has(id) || warming >= MAX_BACKGROUND) return;
  // Respect browsers that expose a data-saving preference.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
  warming++;
  void loadSound(id).catch(() => {}).finally(() => { warming--; });
}
