import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogResponse, SoundSummary } from "../core/types";
import { decodeWaveform } from "../core/waveform";
import { prefetchSound } from "./api";
import type { AudioEngine } from "./audio";
import { fmtMs } from "./format";
import { ArrowIcon, PlayIcon, StopIcon } from "./icons";
import { mountSoundField } from "./sound-field";
import { useAudition } from "./use-audition";
import {waveformBars} from "./landing-waveform";
import { sketchSource } from "./sound-sketches";
import "./sound-field.css";

// One hero: a sound sheet that lets people hear the library before entering it.
// Ink controls, green measured signal, no cards or circular carousel.
// App owns loading/empty/error; this view owns audition error and reversible local moves.
const FEATURED=["mouse-click-modern","mouse-click-retro","mouse-click-classic","mouse-click-soft","key-space","wheel-step","switch-latch","drop-soft","key-enter","hover","control-back","toggle-engage","mouse-down","key-a","slider-step","drop-snap","confirm-choice"];

const SoundObject=memo(function SoundObject({sound,active,pending,onPlay,onStop,engine}:{sound:SoundSummary;active:boolean;pending:boolean;onPlay:(sound:SoundSummary)=>void;onStop:()=>void;engine:AudioEngine}){
  const bars=useMemo(()=>waveformBars(sound.waveform?decodeWaveform(sound.waveform):new Float32Array()),[sound.waveform]);
  const progress=useRef<SVGSVGElement>(null);
  useEffect(()=>{
    if(!active||!progress.current)return;
    const node=progress.current;let frame=0;
    const draw=()=>{const p=engine.progress()??1;node.style.clipPath=`inset(0 ${100-p*100}% 0 0)`;if(engine.isActive())frame=requestAnimationFrame(draw);};
    draw();return()=>{cancelAnimationFrame(frame);node.style.clipPath="inset(0 100% 0 0)";};
  },[active,engine]);
  const shapes=bars.map((b,i)=>b.quiet?<circle key={i} cx={b.x} cy={18} r={1.35}/>:<line key={i} x1={b.x} x2={b.x} y1={b.y1} y2={b.y2}/>);
  return <div className="field-object" data-sound-object={sound.id}>
    <button type="button" className="field-sound" aria-label={`${active||pending?"Stop":"Preview"} ${sound.name}`} aria-pressed={active||pending}
      onPointerDown={()=>prefetchSound(sound)} onClick={()=>active||pending?onStop():onPlay(sound)}>
      <span className="field-paper">
        <span className="field-art"><img src={sketchSource(sound.id,sound.category)} alt="" draggable={false} decoding="async" loading="lazy"/><span className="field-action">{active||pending?<StopIcon/>:<PlayIcon/>}</span></span>
        <span className="field-name">{sound.name}</span>
        <span className="field-duration">{pending?"Loading…":active?"Playing":fmtMs(sound.duration)}</span>
        <span className="field-wave" aria-hidden="true"><svg viewBox="0 0 96 36">{shapes}</svg><svg ref={progress} className="field-wave-played" viewBox="0 0 96 36">{shapes}</svg></span>
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
    const groups=new Map<string,SoundSummary[]>();
    for(const sound of catalog.sounds){if(featured.has(sound.id))continue;const group=groups.get(sound.category)??[];group.push(sound);groups.set(sound.category,group);}
    while(true){let added=false;for(const group of groups.values()){const sound=group.shift();if(sound){first.push(sound);added=true;}}if(!added)break;}
    return first;
  },[catalog]);
  useEffect(()=>{
    if(!viewport.current||!world.current)return;
    const byId=new Map(ordered.map(sound=>[sound.id,sound]));
    const field=mountSoundField(viewport.current,world.current,id=>{const sound=byId.get(id);if(sound)play(sound);},setDirty);
    driver.current=field;
    return ()=>{field.dispose();driver.current=null;};
  },[ordered,play]);
  return <div className="sound-landing">
    <div className="sound-field" ref={viewport} tabIndex={0} role="region" aria-label="Endless sound canvas. Drag empty space or use arrow keys to explore. Click a sound to play. Escape resets.">
      <div className="field-grid" aria-hidden="true"/>
      <div className="field-world" ref={world}>
        <section className="field-hero" data-no-pan="">
          <span className="field-kicker"><i aria-hidden="true"/>{catalog.sounds.length} interface sounds</span>
          <h1>Make the small<br/><span>things sound good.<svg viewBox="0 0 300 13" aria-hidden="true"><path d="M3 8C70 2 166 1 296 6M47 10Q169 5 265 9" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg></span></h1>
          <p>A playful collection of tactile sounds for the interfaces you build. Grab a sound, hear it, and make it part of your next project.</p>
          <div className="field-hero-actions">
            <a href="/library" className="pill primary">Explore the library <ArrowIcon/></a>
            <a href="/sounds/pack.zip" className="field-download" download="verdant-sounds.zip">Download WAV pack</a>
          </div>
        </section>
        {ordered.map(sound=><SoundObject key={sound.id} sound={sound} active={playingId===sound.id} pending={pendingId===sound.id} onPlay={play} onStop={stop} engine={engine}/>)}
      </div>
    </div>
    <div className="field-dock"><div className="field-dock-inner">
      <span className="field-help" role="status">{error||"Drag to wander · Tap to listen"}</span>
      <button type="button" className="pill field-reset" disabled={!dirty} onClick={()=>driver.current?.reset()}>Back to center</button>
      <button type="button" className="pill" disabled={!playingId&&!pendingId} onClick={stop}>Stop <StopIcon/></button>
      <a href="/sounds/credits.md">Credits</a>
    </div></div>
  </div>;
}
