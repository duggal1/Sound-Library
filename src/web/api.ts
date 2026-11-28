import type { CatalogResponse, SoundSummary } from "../core/types";
import {modernSample} from "./keyboard-theme";
import {peekMouseRecording} from "./mouse-recordings";
import { decodeWav } from "../core/wav";

import {verifiedStorage,fetchWavBytes,downloadRemotePack,downloadRemoteSound} from "./asset-delivery";

let storage:CatalogResponse["storage"];
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
  if(!Array.isArray(data.sounds)||!Array.isArray(data.categories)||data.sampleRate!==48000||data.channels!==1)throw new Error("Invalid sound catalog");
  storage=verifiedStorage(data.storage);
  if (forced === "empty") return {...data, sounds: [], totalBytes: 0};
  return {...data,sounds:data.sounds.filter(s=>!["click","press","release"].includes(s.id))};
}

type SoundRef = {readonly id: string; readonly previewUrl?: string;readonly sha256?:string;readonly bytes?:number};
export const PREVIEW_MEMORY_BUDGET = 768 * 1024;
const ready = new Map<string, DecodedSound>();
const inFlight = new Map<string, Promise<DecodedSound>>();
let readyBytes = 0;
let warming = 0;

function cacheKey(sound:SoundRef):string{return sound.sha256&&/^[a-f0-9]{64}$/.test(sound.sha256)?sound.sha256:sound.id+":"+(sound.previewUrl??"");}
const withId=(item:DecodedSound,id:string):DecodedSound=>item.id===id?item:{...item,id};
export function downloadSound(sound:SoundSummary,event:{preventDefault():void;button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean}){if(storage&&sound.sha256&&!event.button&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();void downloadRemoteSound(sound,storage);}}
export function downloadPack(event:{preventDefault():void;button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean}){if(storage&&!event.button&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();void downloadRemotePack(storage);}}

export function peekSound(sound: SoundRef): DecodedSound | undefined {
  const modern=modernSample(sound.previewUrl);if(modern)return modern;
  const imported=peekMouseRecording(sound.previewUrl);if(imported)return imported;
  const key = cacheKey(sound);
  const cached = ready.get(key);
  if (cached) {
    ready.delete(key);
    ready.set(key, cached);
  }
  return cached?withId(cached,sound.id):undefined;
}

export function loadSound(sound: SoundRef, priority: "high" | "low" = "high"): Promise<DecodedSound> {
  const key = cacheKey(sound);
  const cached = peekSound(sound);
  if (cached) return Promise.resolve(cached);
  if(sound.previewUrl?.startsWith("modern-keyboard:"))return Promise.reject(new Error("Modern keyboard is not ready"));
  if(sound.previewUrl?.startsWith("mouse-recording:"))return Promise.reject(new Error("Mouse preview unavailable"));
  const existing = inFlight.get(key);
  if (existing) return existing.then(item=>withId(item,sound.id));

  const pending = fetchWavBytes(sound,storage,priority).then(bytes => {
    const {sampleRate, samples} = decodeWav(bytes);
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
  if(modernSample(sound.previewUrl)||peekMouseRecording(sound.previewUrl))return;
  const connection = (navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}}).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
  const key = cacheKey(sound);
  if (warming >= 2 || ready.has(key) || inFlight.has(key)) return;
  warming++;
  void loadSound(sound, "low").catch(() => {}).finally(() => { warming--; });
}
