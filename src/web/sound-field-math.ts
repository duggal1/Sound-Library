/** The finite catalog is a toroidal sheet: endless travel, bounded memory. */
export interface Placement {x:number;y:number;angle:number;size:number}
export interface Sheet {width:number;height:number;points:Placement[]}
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function wrap(value:number,period:number){return ((value+period/2)%period+period)%period-period/2;}
export function sheetLayout(count:number,width:number,height:number):Sheet {
  const compact=width<670,cols=Math.max(15,Math.ceil(Math.sqrt(count+9)/1.05)|1),rows=Math.max(11,Math.ceil((count+9)/cols)|1);
  // The period is aligned to the 22px paper-dot texture.
  const sx=22*Math.ceil(Math.max(compact?132:176,(width+360)/cols)/22);
  const sy=22*Math.ceil(Math.max(compact?132:154,(height+360)/rows)/22);
  const cells:Placement[]=[];
  for(let row=-(rows-1)/2;row<=(rows-1)/2;row++)for(let col=-(cols-1)/2;col<=(cols-1)/2;col++){
    if(Math.abs(row)<=1&&Math.abs(col)<=1)continue;
    const seed=((row*73856093)^(col*19349663))>>>0;
    cells.push({x:col*sx+(row%2)*sx*.07+(seed%31-15),y:row*sy+((seed>>>8)%29-14),angle:(seed%23-11)*.8,size:.82+(seed%35)/100});
  }
  cells.sort((a,b)=>Math.hypot(a.x/1.18,a.y)-Math.hypot(b.x/1.18,b.y)||a.x-b.x||a.y-b.y);
  const excess=cells.length-count;
  const candidates=cells.map((_,i)=>i).filter(i=>i>=Math.min(24,Math.floor(count/2)));
  const omit=new Set<number>();
  for(let i=0;i<excess;i++)omit.add(candidates[Math.floor((i+.5)*candidates.length/excess)]!);
  return {width:sx*cols,height:sy*rows,points:cells.filter((_,i)=>!omit.has(i))};
}
export function coast(value:number,velocity:number,dt:number){
  const decay=Math.exp(-7*dt);
  return {position:value+velocity*(1-decay)/7,velocity:velocity*decay};
}
