/** Actual peak envelope; silent bins become round dots. */
export function waveformBars(points:Float32Array,count=24){
 const bins=Math.floor(points.length/3);if(!bins)return [];
 return Array.from({length:count},(_,i)=>{
  const from=Math.floor(i*bins/count),to=Math.min(bins,Math.max(from+1,Math.floor((i+1)*bins/count)));
  let lo=0,hi=0;for(let j=from;j<to;j++){lo=Math.max(lo,points[j*3]??0);hi=Math.max(hi,points[j*3+1]??0);}
  return {x:2+i*4,y1:18-Math.min(1,hi)*14,y2:18+Math.min(1,lo)*14};
 });
}