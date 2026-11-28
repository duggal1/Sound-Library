import {useEffect,useRef,useState} from "react";
import type { SoundSummary } from "../core/types";
import type {AudioEngine} from "./audio";
import {StageRenderer,type StageMode} from "./stage";

export function SoundStage({engine,sound,mode,onSeek}: {engine:AudioEngine;sound:SoundSummary|null;mode:StageMode;onSeek:(fraction:number)=>void}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<StageRenderer|null>(null);
  const drag = useRef<number|null>(null);
  const [position,setPosition] = useState(0);
  useEffect(() => {
    if (!canvas.current) return;
    const stage = new StageRenderer(canvas.current,engine);
    renderer.current = stage;
    const wake = () => stage.refresh();
    const unsubscribe = engine.subscribe(wake);
    return () => {unsubscribe();stage.destroy();renderer.current=null;};
  },[engine]);
  useEffect(() => {renderer.current?.setSound(sound?.waveform,sound?.duration ?? 0,sound?.peak ?? 0);setPosition(0);drag.current=null;},[sound]);
  useEffect(() => {renderer.current?.setMode(mode);drag.current=null;if(canvas.current)delete canvas.current.dataset.dragging;},[mode]);
  const enabled = mode === "waveform" && !!sound?.waveform;
  const fraction = (x:number) => renderer.current?.fractionAt(x) ?? 0;
  const seek = (value:number) => {
    const next = Math.max(0,Math.min(.999,value));
    setPosition(next);renderer.current?.inspect(next);onSeek(next);
  };
  return <div className="stage" data-ready={!!sound?.waveform || mode === "scope"} data-mode={mode}>
    <canvas ref={canvas} role={enabled ? "slider" : "img"} tabIndex={enabled ? 0 : undefined}
      aria-label={enabled ? "Audition from waveform position" : mode === "scope" ? "Live audio oscilloscope" : "Sound amplitude over time"}
      aria-valuemin={enabled ? 0 : undefined} aria-valuemax={enabled ? 100 : undefined} aria-valuenow={enabled ? Math.round(position*100) : undefined} aria-valuetext={enabled && sound ? `${Math.round(position*sound.duration*1000)} milliseconds` : undefined}
      onPointerDown={e => {if(!enabled || e.button !== 0)return;drag.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging="true";renderer.current?.inspect(fraction(e.clientX));}}
      onPointerUp={e => {if(drag.current !== e.pointerId)return;drag.current=null;delete e.currentTarget.dataset.dragging;seek(fraction(e.clientX));}}
      onPointerCancel={e => {drag.current=null;delete e.currentTarget.dataset.dragging;renderer.current?.inspect(null);}}
      onLostPointerCapture={e => {drag.current=null;delete e.currentTarget.dataset.dragging;}}
      onKeyDown={e => {if(!enabled)return;const delta=e.key==="ArrowRight"||e.key==="ArrowUp" ? .05 :e.key==="ArrowLeft"||e.key==="ArrowDown" ? -.05 : 0;
        if(delta || e.key==="Home" || e.key==="End"){e.preventDefault();e.stopPropagation();seek(e.key==="Home"?0:e.key==="End" ? .999 :position+delta);}}}
    />
  </div>;
}
