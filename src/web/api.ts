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
  const catalog = forced === "empty" ? { ...data, sounds: [], totalBytes: 0, previewBank: undefined } : data;
  registerBank(catalog);
  return catalog;
}

/** A single immutable compressed-on-wire PCM bank replaces repeated requests.
 * Decode only the currently demanded sound; the small LRU remains bounded. */
let bank: ArrayBuffer | null = null;
let bankPath: string | undefined;
let bankLength = 0;
let bankPending: Promise<void> | null = null;
let bankAttempted = false;
const offsets = new Map<string,{start:number;end:number}>();
function registerBank(catalog: CatalogResponse): void {
  if (bankPath !== catalog.previewBank) {
    bank = null; bankPending = null; bankAttempted = false;
    ready.clear(); readyBytes = 0;
  }
  bankPath = catalog.previewBank;
  offsets.clear(); bankLength = 0;
  for (const sound of catalog.sounds) {
    offsets.set(sound.id,{start:bankLength,end:bankLength+sound.bytes});
    bankLength += sound.bytes;
  }
}
function canWarm(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !/(^|-)2g$/.test(connection?.effectiveType ?? "");
}
function warmBank(): void {
  const path=bankPath, length=bankLength;
  if (!path || bank || bankPending || bankAttempted || !canWarm() || length>3*1024*1024) return;
  bankAttempted=true;
  bankPending=fetch(path,{priority:"low"}).then(async response=>{
    if(!response.ok)throw new Error("Preview bank unavailable");
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==length)throw new Error("Preview bank length mismatch");
    if(bankPath===path)bank=bytes;
  }).catch(()=>{}).finally(()=>{if(bankPath===path)bankPending=null;});
}
function fromBank(id:string):DecodedSound|undefined {
  const range=offsets.get(id);
  if(!bank || !range)return;
  const {sampleRate,samples}=decodeWav(bank.slice(range.start,range.end));
  return remember({id,sampleRate,samples});
}

/** Session-only decoded LRU; bank bytes are retained separately. */
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
  return sound ?? fromBank(id);
}

export function loadSound(id: string): Promise<DecodedSound> {
  const cached = peekSound(id);
  if (cached) return Promise.resolve(cached);
  const existing = inFlight.get(id);
  if (existing) return existing;
  // Never wait for a speculative bank transfer on a cold demand load.
  const pending = fetch(`/sounds/${encodeURIComponent(id)}.wav`).then(async res => {
    if (!res.ok) throw new Error(`Could not load ${id}.wav (${res.status}).`);
    const { sampleRate, samples } = decodeWav(await res.arrayBuffer());
    const result=remember({ id, sampleRate, samples });
    warmBank();
    return result;
  }).finally(() => inFlight.delete(id));
  inFlight.set(id, pending);
  return pending;
}

/** Best effort; demand loads are never queued behind speculative work. */
export function prefetchSound(id: string | undefined): void {
  if (!id || ready.has(id) || inFlight.has(id) || warming >= MAX_BACKGROUND) return;
  if (!canWarm() || bank || bankPending) return;
  warming++;
  void loadSound(id).catch(() => {}).finally(() => { warming--; });
}
