/** Animate discrete mouse wheel steps only. Precision trackpads, touch,
 * native scrollbar drag and the cylindrical renderer retain native momentum. */
const SELECTOR=".library-scroll,.preview,.dashboard-sidebar,.library";
export function enhanceWheelScroll(root:Element):()=>void{
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const cleanups:Array<()=>void>=[];
 for(const el of root.querySelectorAll<HTMLElement>(SELECTOR)){
  let target=0,frame=0,last=0;
  const cancel=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
  const tick=(now:number)=>{
   const dt=last?Math.min(48,now-last):16.67;last=now;
   const max=Math.max(0,el.scrollHeight-el.clientHeight);target=Math.min(max,Math.max(0,target));
   const distance=target-el.scrollTop;
   if(Math.abs(distance)<.65){el.scrollTop=target;frame=0;last=0;return;}
   const step=distance*(1-Math.exp(-dt/65));
   el.scrollTop+=Math.sign(distance)*Math.max(1,Math.abs(step));
   frame=requestAnimationFrame(tick);
  };
  const wheel=(e:WheelEvent)=>{
   if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||reduced.matches||Math.abs(e.deltaX)>Math.abs(e.deltaY)){cancel();return;}
   // Pixel wheel steps cannot reliably be distinguished from trackpads.
   // Only explicit line/page deltas use the optional interpolation.
   if(e.deltaMode===0){cancel();return;}
   if(!/auto|scroll/.test(getComputedStyle(el).overflowY))return;
   const max=el.scrollHeight-el.clientHeight;if(max<=0)return;
   const current=frame?target:el.scrollTop;
   const next=Math.min(max,Math.max(0,current+e.deltaY*(e.deltaMode===1?32:el.clientHeight)));
   if(next===current)return;
   e.preventDefault();e.stopPropagation();target=next;
   if(!frame)frame=requestAnimationFrame(tick);
  };
  el.addEventListener("wheel",wheel,{passive:false});
  el.addEventListener("pointerdown",cancel,{passive:true});
  el.addEventListener("touchstart",cancel,{passive:true});
  el.addEventListener("keydown",cancel);
  reduced.addEventListener("change",cancel);
  cleanups.push(()=>{cancel();el.removeEventListener("wheel",wheel);el.removeEventListener("pointerdown",cancel);el.removeEventListener("touchstart",cancel);el.removeEventListener("keydown",cancel);reduced.removeEventListener("change",cancel);});
 }
 return ()=>cleanups.forEach(fn=>fn());
}
