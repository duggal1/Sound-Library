/** Build legacy assets and compile measured waveforms, provenance, ZIP and immutable previews. */
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { CATALOG, CATEGORIES } from "../core/catalog";
import { measure, renderSound, summarize } from "../core/render";
import { SAMPLE_RATE, BIT_DEPTH, type CatalogResponse, type SoundSummary } from "../core/types";
import { decodeWav, encodeWav } from "../core/wav";
import { encodeWaveform } from "../core/waveform";
import { KEY_CODES, keySoundId } from "../core/keyboard";
import { createZip, type ZipEntry } from "../core/zip";

const rejected = new Set(["drag", "hover", "send", "dismiss", "swipe", "close", "open"]);
const source = resolve("public");
const output = resolve(".generated-public");
const baseline = JSON.parse(await readFile(join(source,"sounds/catalog.json"),"utf8")) as CatalogResponse;
const byId = new Map(baseline.sounds.map(sound => [sound.id,sound]));
await rm(output,{recursive:true,force:true});
await cp(source,output,{recursive:true});
const directory = join(output,"sounds");
const entries: ZipEntry[] = [];
const sounds: SoundSummary[] = [];
await mkdir(join(directory, "preview"), {recursive: true});

async function publish(record: Omit<SoundSummary, keyof ReturnType<typeof measure> | "bytes">, wav: Uint8Array) {
  const sha256 = createHash("sha256").update(wav).digest("hex");
  const {samples, sampleRate} = decodeWav(wav.buffer as ArrayBuffer, wav.byteOffset, wav.byteLength);
  if (sampleRate !== SAMPLE_RATE) throw new Error("Unexpected sample rate: " + record.id);
  const metrics = measure(samples, sampleRate);
  if (record.source && (metrics.peak > .5 || metrics.rms < .001 || metrics.duration > 1.2 || metrics.duration < .008))
    throw new Error("Collection asset failed signal checks: " + record.id);
  const previewUrl = `/sounds/preview/${sha256.slice(0, 20)}.wav`;
  await writeFile(join(output, previewUrl.slice(1)), wav);
  entries.push({name: record.id + ".wav", data: wav});
  sounds.push({...record, ...metrics, bytes: wav.byteLength, sha256, previewUrl, waveform: encodeWaveform(samples, metrics.peak)});
}
for (const def of CATALOG) {
  let wav: Uint8Array;
  let summary: SoundSummary;
  if (rejected.has(def.id)) {
    const rendered=renderSound(def);
    wav=encodeWav(rendered.samples,SAMPLE_RATE);
    summary=summarize(rendered);
    if (!Number.isFinite(summary.rms) || summary.peak > .55 || summary.duration > .32 || summary.rms <= 0)
      throw new Error("Invalid replacement: "+def.id);
    await writeFile(join(directory,def.id+".wav"),wav);
  } else {
    const original=byId.get(def.id);
    if (!original) throw new Error("Missing approved baseline: "+def.id);
    summary=original;
    wav=await readFile(join(source,"sounds",def.id+".wav"));
  }
  if(wav.byteLength!==summary.bytes)throw new Error("Asset/catalog mismatch: "+def.id);
  await publish({id: summary.id, name: summary.name, category: summary.category, description: summary.description}, wav);
}

type CollectionRecord = Pick<SoundSummary, "id" | "name" | "category" | "description" | "keyCode" | "review" | "source">;
const collection = JSON.parse(await readFile(join(directory, "collection", "manifest.json"), "utf8")) as CollectionRecord[];
const ids = new Set(sounds.map(sound => sound.id));
const keys = new Set<string>();
const hashes = new Set(sounds.map(sound => sound.sha256));
for (const record of collection) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || ids.has(record.id)) throw new Error("Invalid or duplicate ID: " + record.id);
  if (!record.source || record.source.license !== "CC0-1.0" || record.review !== "pending") throw new Error("Missing collection provenance: " + record.id);
  if (record.category === "keyboard") {
    if (!record.keyCode || !KEY_CODES.has(record.keyCode) || keys.has(record.keyCode) || record.id !== keySoundId(record.keyCode))
      throw new Error("Invalid keyboard mapping: " + record.id);
    keys.add(record.keyCode);
  }
  ids.add(record.id);
  const wav = await readFile(join(directory, "collection", record.id + ".wav"));
  await publish(record, wav);
  const hash = sounds.at(-1)!.sha256;
  if (hashes.has(hash)) throw new Error("Duplicate collection WAV: " + record.id);
  hashes.add(hash);
  await writeFile(join(directory, record.id + ".wav"), wav);
}
if (keys.size !== KEY_CODES.size) throw new Error("Keyboard mapping is incomplete");
await rm(join(directory, "collection"), {recursive: true});

const totalBytes = sounds.reduce((sum, sound) => sum + sound.bytes, 0);
const result: CatalogResponse = {
  sampleRate: SAMPLE_RATE, bitDepth: BIT_DEPTH, channels: 1, totalBytes,
  categories: [...CATEGORIES, {id: "keyboard", label: "Keyboard"}], sounds,
};
const [credits, trazoLicense] = await Promise.all([
  readFile(resolve("licenses/sound-collection.md")),
  readFile(resolve("licenses/trazo-MIT.txt")),
]);
entries.push({name: "Sound credits.md", data: credits}, {name: "trazo-MIT.txt", data: trazoLicense});
await Promise.all([
  writeFile(join(directory, "catalog.json"), JSON.stringify(result)),
  writeFile(join(directory, "pack.zip"), createZip(entries, new Date(1980, 0, 1))),
  writeFile(join(directory, "credits.md"), credits),
  writeFile(join(directory, "trazo-MIT.txt"), trazoLicense),
]);
console.log(`Published ${sounds.length} WAVs (${keys.size} keyboard), ${totalBytes} bytes.`);
