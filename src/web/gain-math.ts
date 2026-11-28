/** The thumb center travels from radius to width minus radius. */
export function gainAt(x:number,width:number,thumb:number,max:number):number {
  const travel=Math.max(1,width-thumb);
  return Math.max(0,Math.min(max,((x-thumb/2)/travel)*max));
}
export function gainStep(value:number,delta:number,max:number):number {
  return Math.max(0,Math.min(max,Math.round((value+delta)*1000)/1000));
}
