export interface WaveformBar {x:number;y1:number;y2:number;quiet:boolean}
export function waveformBars(points:Float32Array,count=24):WaveformBar[]{
 const bins=Math.floor(points.length/3);if(!bins||count<1)return [];
 return Array.from({length:count},(_,i)=>{
  const from=Math.floor(i*bins/count),to=Math.min(bins,Math.max(from+1,Math.floor((i+1)*bins/count)));
  let lo=0,hi=0;for(let j=from;j<to;j++){lo=Math.max(lo,points[j*3]??0);hi=Math.max(hi,points[j*3+1]??0);}
  const y1=18-Math.min(1,hi)*14,y2=18+Math.min(1,lo)*14;
  return {x:2+i*4,y1,y2,quiet:y2-y1<1.2};
 });
}
