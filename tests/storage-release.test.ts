import {test,expect} from "bun:test";
import {releaseId,assetKey,publicBase,sha256} from "../src/storage/release";
import {assetCandidates,verifiedStorage} from "../src/web/asset-delivery";
const hash="a".repeat(64),id="b".repeat(64),storage={releaseId:id,publicBase:"https://example.com/bucket",packKey:"releases/"+id+"/pack.zip"};
test("deterministic release identity, safe keys and exact fallback",()=>{
 const a=new Uint8Array([1,2]),b=new Uint8Array([2,3]);
 expect(releaseId("{}",a,b,a)).toBe(releaseId("{}",a,b,a));expect(releaseId("{}",a,b,a)).not.toBe(releaseId("{}",b,b,a));
 expect(assetKey(hash)).toBe("audio/"+hash+".wav");expect(()=>assetKey("../x")).toThrow();
 expect(()=>publicBase("http://example.com")).toThrow();expect(()=>publicBase("https://user@example.com")).toThrow();
 expect(sha256(a)).toHaveLength(64);expect(verifiedStorage(storage)).toEqual(storage);
 expect(verifiedStorage({...storage,packKey:"../x"})).toBeUndefined();
 expect(assetCandidates({id:"tap",sha256:hash},storage)).toEqual([storage.publicBase+"/audio/"+hash+".wav","/sounds/tap.wav"]);
 expect(assetCandidates({id:"tap",previewUrl:"/sounds/preview/"+"a".repeat(20)+".wav"})).toEqual(["/sounds/preview/"+"a".repeat(20)+".wav"]);
});
