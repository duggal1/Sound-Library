import { deflateSync } from "node:zlib";
const W=1200,H=630;
function crc32(bytes:Uint8Array){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(name:string,data:Uint8Array){const type=Buffer.from(name),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([len,type,data,crc]);}
export function socialCard(){
 const pixels=Buffer.alloc((W*3+1)*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const p=y*(W*3+1)+1+x*3;const bar=Math.floor((x-210)/24),center=210+bar*24+8;
   const amp=22+165*Math.exp(-Math.pow((bar-16)/9,2))*(.3+.7*Math.abs(Math.sin(bar*1.73)));
   const wave=bar>=0&&bar<33&&Math.abs(x-center)<6&&Math.abs(y-H/2)<amp;
   const color=wave?[30,108,75]:[250,250,248];pixels[p]=color[0]!;pixels[p+1]=color[1]!;pixels[p+2]=color[2]!;
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",deflateSync(pixels)),chunk("IEND",Buffer.alloc(0))]);
}
