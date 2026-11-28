import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import { DEFAULT_VOLUME, type AudioEngine } from "./audio";
import { VolumeIcon, MuteIcon } from "./icons";
import { gainAt, gainStep } from "./gain-math";

const THUMB=18;
/** Direct manipulation, not a spring that chases the cursor. One local frame
 * commit drives audio, handle, fill and value; the workspace never rerenders. */
export function VolumeControl({engine}:{engine:AudioEngine}){
  const [value,setValue]=useState(DEFAULT_VOLUME);
  const [dragging,setDragging]=useState(false);
  const current=useRef(DEFAULT_VOLUME);
  const lastAudible=useRef(DEFAULT_VOLUME);
  const pointer=useRef<{id:number;left:number;width:number;offset:number}|null>(null);
  const pending=useRef<number|null>(null);
  const raf=useRef(0);
  const commit=(next:number)=>{
    if(next===current.current)return;
    current.current=next;
    if(next>0)lastAudible.current=next;
    engine.setVolume(next);
    setValue(next);
  };
  const flush=()=>{
    if(raf.current)cancelAnimationFrame(raf.current);
    raf.current=0;
    const next=pending.current;
    pending.current=null;
    if(next!==null)commit(next);
  };
  const enqueue=(next:number)=>{
    pending.current=next;
    if(!raf.current)raf.current=requestAnimationFrame(flush);
  };
  useEffect(()=>()=>{if(raf.current)cancelAnimationFrame(raf.current);},[]);
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const p=pointer.current;
    if(!p||p.id!==event.pointerId)return;
    enqueue(gainAt(event.clientX-p.left-p.offset,p.width,THUMB,DEFAULT_VOLUME));
  };
  const end=(event:PointerEvent<HTMLDivElement>,final:boolean)=>{
    if(pointer.current?.id!==event.pointerId)return;
    if(final)move(event);
    flush();
    pointer.current=null;
    setDragging(false);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const start=(event:PointerEvent<HTMLDivElement>)=>{
    if(!event.isPrimary||event.button!==0||pointer.current)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=event.clientX-rect.left;
    const center=THUMB/2+(rect.width-THUMB)*current.current/DEFAULT_VOLUME;
    // Keep the point where the thumb was grabbed under the pointer. Track
    // clicks jump immediately; grabbing the handle never jumps.
    const offset=Math.abs(x-center)<=THUMB/2+3?x-center:0;
    pointer.current={id:event.pointerId,left:rect.left,width:rect.width,offset};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({preventScroll:true});
    setDragging(true);
    commit(gainAt(x-offset,rect.width,THUMB,DEFAULT_VOLUME));
  };
  const key=(event:KeyboardEvent<HTMLDivElement>)=>{
    const delta=event.key==="ArrowRight"||event.key==="ArrowUp" ? .01:
      event.key==="ArrowLeft"||event.key==="ArrowDown"?-.01:
      event.key==="PageUp" ? .1:event.key==="PageDown"?-.1:0;
    if(!delta&&event.key!=="Home"&&event.key!=="End")return;
    event.preventDefault();event.stopPropagation();flush();
    commit(event.key==="Home"?0:event.key==="End"?DEFAULT_VOLUME:gainStep(current.current,delta,DEFAULT_VOLUME));
  };
  const percent=Math.round(value*100);
  const fraction=value/DEFAULT_VOLUME;
  return <div className="volume" data-muted={value===0}>
    <button className="volume-mute" type="button" aria-label={value===0?"Unmute preview":"Mute preview"}
      aria-pressed={value===0} onClick={()=>{flush();commit(current.current>0?0:lastAudible.current);}}>
      {value===0?<MuteIcon/>:<VolumeIcon/>}
    </button>
    <div className="volume-slider" role="slider" tabIndex={0} aria-label="Playback volume"
      aria-valuemin={0} aria-valuemax={110} aria-valuenow={percent} aria-valuetext={percent+"%"}
      data-dragging={dragging} style={{"--gain":fraction,"--gain-percent":(fraction*100)+"%"} as CSSProperties}
      onPointerDown={start} onPointerMove={move} onPointerUp={event=>end(event,true)}
      onPointerCancel={event=>end(event,false)} onLostPointerCapture={event=>end(event,false)} onKeyDown={key}>
      <div className="volume-rail" aria-hidden="true"><span className="volume-ink"/></div>
      <div className="volume-travel" aria-hidden="true"><span className="volume-thumb"/></div>
    </div>
    <output className="volume-value" aria-hidden="true">{percent}%</output>
  </div>;
}
