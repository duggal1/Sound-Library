import {useEffect,useRef} from "react";
/** Only animate in response to pointer movement; no perpetual rendering loop. */
export function useDeviceTilt(){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const media=matchMedia("(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
  let frame=0,x=0,y=0;
  const draw=()=>{frame=0;node.style.setProperty("--tilt-x",y.toFixed(2)+"deg");node.style.setProperty("--tilt-y",x.toFixed(2)+"deg");};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const move=(e:PointerEvent)=>{if(!media.matches||e.pointerType!=="mouse")return;const b=node.getBoundingClientRect();if(!b.width||!b.height)return;x=Math.max(-3,Math.min(3,((e.clientX-b.left)/b.width-.5)*6));y=Math.max(-2,Math.min(2,(.5-(e.clientY-b.top)/b.height)*4));queue();};
  const reset=()=>{x=0;y=0;queue();};
  node.addEventListener("pointermove",move,{passive:true});node.addEventListener("pointerleave",reset);media.addEventListener("change",reset);
  return()=>{cancelAnimationFrame(frame);node.removeEventListener("pointermove",move);node.removeEventListener("pointerleave",reset);media.removeEventListener("change",reset);};
 },[]);
 return ref;
}
