import {describe,expect,test} from "bun:test";
import {readFileSync} from "node:fs";
import {spriteRanges} from "../src/core/keyboard-themes";
import {MAC_ROWS,MAC_KEYS,CLASSIC_FALLBACK,DEVICE_FALLBACK} from "../src/core/mac-keyboard";
import {KEY_CODES} from "../src/core/keyboard";
const config=JSON.parse(readFileSync(new URL("../public/sounds/catalog/config.json",import.meta.url),"utf8"));
describe("physical keyboard theme",()=>{
 test("modern pack maps every displayed MacBook key to valid source ranges",()=>{
  const ranges=spriteRanges(config,1433),codes=new Set(ranges.map(r=>r.code));
  expect(MAC_KEYS.size).toBe(MAC_ROWS.flat().length);
  for(const code of MAC_KEYS)expect(codes.has(code)||codes.has(DEVICE_FALLBACK[code]??"")).toBe(true);
  expect(new Set(ranges.map(r=>r.start+":"+r.end)).size).toBe(10);
 });
 test("classic has direct or explicit fallback for all visible keys",()=>{
  for(const code of MAC_KEYS)expect(KEY_CODES.has(code)||KEY_CODES.has(CLASSIC_FALLBACK[code]??"")).toBe(true);
 });
 test("reject malformed or out-of-bounds sprites",()=>{
  expect(()=>spriteRanges({audio_file:"audio.ogg",definitions:{KeyA:{timing:[[10,9]]}}},100)).toThrow();
  expect(()=>spriteRanges({audio_file:"audio.ogg",definitions:{KeyA:{timing:[[1,200]]}}},100)).toThrow();
  expect(()=>spriteRanges({audio_file:"other.ogg",definitions:{}},100)).toThrow();
 });
});

test("Fn uses an existing modifier recording",()=>{expect(DEVICE_FALLBACK.Fn).toBe("ControlLeft");expect(config.definitions.Fn).toBeUndefined();expect(config.definitions[DEVICE_FALLBACK.Fn!]).toBeDefined();});
