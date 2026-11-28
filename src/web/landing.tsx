import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogResponse, SoundSummary } from "../core/types";
import { decodeWaveform } from "../core/waveform";
import { prefetchSound } from "./api";
import type { AudioEngine } from "./audio";
import { fmtMs } from "./format";
import { ArrowIcon, PlayIcon, SoundIcon, StopIcon } from "./icons";
import { mountSoundField } from "./sound-field";
import { useAudition } from "./use-audition";
import "./sound-field.css";

// One hero: a sound sheet that lets people hear the library before entering it.
// Ink controls, green measured signal, no cards or circular carousel.
// App owns loading/empty/error; this view owns audition error and reversible local moves.
const FEATURED=["click","key-space","wheel-step","switch-latch","drop-soft","key-enter","hover","control-back","toggle-engage","mouse-down","key-a","slider-step","drop-snap","confirm-choice"];

const SoundObject=memo(function SoundObject({sound,active,pending,onPlay,onStop}:{sound:SoundSummary;active:boolean;pending:boolean;onPlay:(sound:SoundSummary)=>void;onStop:()=>void}){
  const path=useMemo(()=>{
    if(!sound.waveform)return "";
    const points=decodeWaveform(sound.waveform),bins=points.length/3;
    let d="";
    for(let i=0;i<22;i++){
      let lo=0,hi=0;
      for(let j=Math.floor(i*bins/22);j<Math.floor((i+1)*bins/22);j++){lo=Math.max(lo,points[j*3]);hi=Math.max(hi,points[j*3+1]);}
      d+=`M${i*4+6} ${(20-Math.max(.045,hi)*17).toFixed(2)}V${(20+Math.max(.045,lo)*17).toFixed(2)}`;
    }
    return d;
  },[sound.waveform]);
  return <div className="field-object" data-sound-object={sound.id}>
    <button type="button" className="field-sound" aria-label={`${active||pending?"Stop":"Preview"} ${sound.name}`} aria-pressed={active||pending}
      onPointerDown={()=>prefetchSound(sound)} onClick={()=>active||pending?onStop():onPlay(sound)}>
      <span className="field-paper">
        <span className="field-glyph"><SoundIcon kind={sound.category}/><span className="field-action">{active||pending?<StopIcon/>:<PlayIcon/>}</span></span>
        <svg className="field-wave" viewBox="0 0 96 40" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"/></svg>
        <span className="field-name">{sound.name}</span>
        <span className="field-duration">{fmtMs(sound.duration)}{pending?" · Loading":active?" · Playing":""}</span>
      </span>
    </button>
  </div>;
});

export function Landing({catalog,engine}:{catalog:CatalogResponse;engine:AudioEngine}){
  const viewport=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null);
  const driver=useRef<ReturnType<typeof mountSoundField>|null>(null);
  const [dirty,setDirty]=useState(false);
  const {play,stop,playingId,pendingId,error}=useAudition(engine);
  const ordered=useMemo(()=>{
    const byId=new Map(catalog.sounds.map(sound=>[sound.id,sound]));
    const first=FEATURED.flatMap(id=>{const sound=byId.get(id);return sound?[sound]:[]});
    const featured=new Set(first.map(sound=>sound.id));
    return [...first,...catalog.sounds.filter(sound=>!featured.has(sound.id))];
  },[catalog]);
  useEffect(()=>{
    if(!viewport.current||!world.current)return;
    const byId=new Map(ordered.map(sound=>[sound.id,sound]));
    const field=mountSoundField(viewport.current,world.current,id=>{const sound=byId.get(id);if(sound)play(sound);},setDirty);
    driver.current=field;
    return ()=>{field.dispose();driver.current=null;};
  },[ordered,play]);
  return <div className="sound-landing">
    <div className="sound-field" ref={viewport} tabIndex={0} role="region" aria-label="Sound canvas. Drag empty space or use arrow keys to explore. Click a sound to play. Escape resets.">
      <div className="field-world" ref={world}>
        <div className="field-grid" aria-hidden="true"/>
        <section className="field-hero" data-no-pan="">
          <span className="field-kicker"><i aria-hidden="true"/>{catalog.sounds.length} interface sounds</span>
          <h1>Sound for the<br/>small things.</h1>
          <p>Every click, key and gesture deserves a sound that feels right. Pick one up, listen, make it yours.</p>
          <div className="field-hero-actions">
            <a href="/library" className="pill primary">Explore sounds <ArrowIcon/></a>
            <a href="/sounds/pack.zip" className="field-download" download="verdant-sounds.zip">Download all</a>
          </div>
        </section>
        {ordered.map(sound=><SoundObject key={sound.id} sound={sound} active={playingId===sound.id} pending={pendingId===sound.id} onPlay={play} onStop={stop}/>)}
      </div>
    </div>
    <div className="field-dock">
      <span className="field-help" role="status">{error||"Drag the canvas to explore. Pick up any sound to play it."}</span>
      <button type="button" className="pill field-reset" disabled={!dirty} onClick={()=>driver.current?.reset()}>Reset canvas</button>
      {(playingId||pendingId)&&<button type="button" className="pill" onClick={stop}>Stop sound <StopIcon/></button>}
      <a href="/sounds/credits.md">Credits</a>
    </div>
  </div>;
}
