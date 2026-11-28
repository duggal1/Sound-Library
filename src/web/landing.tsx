import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogResponse, SoundSummary } from "../core/types";
import { decodeWaveform } from "../core/waveform";
import { prefetchSound } from "./api";
import type { AudioEngine } from "./audio";
import { fmtMs } from "./format";
import { ArrowIcon, PlayIcon, StopIcon } from "./icons";
import { mountSoundField } from "./sound-field";
import { useAudition } from "./use-audition";
import { waveformBars } from "./landing-waveform";
import { sketchSource } from "./sound-sketches";
import "./sound-field.css";

// One hero: a sound sheet that lets people hear the library before entering it.
// Ink controls, green measured signal, no cards or circular carousel.
// App owns loading/empty/error; this view owns audition error and reversible local moves.
const FEATURED=["mouse-click-modern","mouse-click-retro","mouse-click-classic","mouse-click-soft","key-space","wheel-step","switch-latch","drop-soft","key-enter","hover","control-back","toggle-engage","mouse-down","key-a","slider-step","drop-snap","confirm-choice"];

const SoundObject=memo(function SoundObject({sound,active,pending,onPlay,engine}:{sound:SoundSummary;active:boolean;pending:boolean;onPlay:(sound:SoundSummary)=>void;engine:AudioEngine}){
  const bars=useMemo(()=>waveformBars(sound.waveform?decodeWaveform(sound.waveform):new Float32Array()),[sound.waveform]);
  const progress=useRef<SVGSVGElement>(null);
  useEffect(()=>{
    if(!active||!progress.current)return;
    let frame=0;const node=progress.current;
    const draw=()=>{const p=engine.progress()??0;node.style.clipPath=`inset(0 ${100-p*100}% 0 0)`;if(engine.isActive())frame=requestAnimationFrame(draw);};
    draw();return()=>{cancelAnimationFrame(frame);node.style.clipPath="inset(0 100% 0 0)";};
  },[active,engine]);
  return <div className="field-object" data-sound-object={sound.id}>
    <button type="button" className="field-sound" aria-label={`Play ${sound.name}`} aria-pressed={active||pending}
      onPointerDown={()=>prefetchSound(sound)} onClick={()=>onPlay(sound)}>
      <span className="field-paper">
        <span className="field-art"><img src={sketchSource(sound.id,sound.category)} alt="" draggable={false} decoding="async" loading="lazy"/><span className="field-action"><PlayIcon/></span></span>
        <span className="field-name">{sound.name}</span>
        <span className="field-duration">{pending?"Loading…":active?"Playing":fmtMs(sound.duration)}</span>
        <span className="field-wave" aria-hidden="true">
 <svg viewBox="0 0 96 36">{bars.map((b,i)=>b.quiet?<circle key={i} cx={b.x} cy={18} r={1.35}/>:<line key={i} x1={b.x} x2={b.x} y1={b.y1} y2={b.y2}/>)}</svg>
 <svg ref={progress} className="field-wave-played" viewBox="0 0 96 36">{bars.map((b,i)=>b.quiet?<circle key={i} cx={b.x} cy={18} r={1.35}/>:<line key={i} x1={b.x} x2={b.x} y1={b.y1} y2={b.y2}/>)}</svg>
 </span>
      </span>
    </button>
  </div>;
});

export function Landing({catalog,engine}:{catalog:CatalogResponse;engine:AudioEngine}){
  const viewport=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null);
  const driver=useRef<ReturnType<typeof mountSoundField>|null>(null);
  const [dirty,setDirty]=useState(false);
  const {play,stop,playingId,pendingId,error}=useAudition(engine);
  const queue=useRef<AbortController|null>(null);
  const [sequence,setSequence]=useState<number|null>(null);
  const cancelQueue=useCallback(()=>{queue.current?.abort();queue.current=null;setSequence(null);stop();},[stop]);
  const audition=useCallback((sound:SoundSummary)=>{queue.current?.abort();queue.current=null;setSequence(null);void play(sound);},[play]);
  useEffect(()=>()=>{queue.current?.abort();queue.current=null;},[]);
  const ordered=useMemo(()=>{
    const byId=new Map(catalog.sounds.map(sound=>[sound.id,sound]));
    const first=FEATURED.flatMap(id=>{const sound=byId.get(id);return sound?[sound]:[]});
    const featured=new Set(first.map(sound=>sound.id));
    const groups=new Map<string,SoundSummary[]>();
    for(const sound of catalog.sounds){if(featured.has(sound.id))continue;const group=groups.get(sound.category)??[];group.push(sound);groups.set(sound.category,group);}
    while(true){let added=false;for(const group of groups.values()){const sound=group.shift();if(sound){first.push(sound);added=true;}}if(!added)break;}
    return first;
  },[catalog]);
  const playAll=useCallback(async()=>{
    if(queue.current){cancelQueue();return;}
    const controller=new AbortController();queue.current=controller;
    const signal=controller.signal;
    try{
      engine.unlock();
      for(let i=0;i<ordered.length&&!signal.aborted;i++){
        setSequence(i+1);
        const sound=ordered[i]!;
        if(i+1<ordered.length)prefetchSound(ordered[i+1]!);
        const started=await play(sound);
        if(signal.aborted||!started)break;
        await new Promise<void>(resolve=>{
          let unsubscribe=()=>{};
          const done=()=>{unsubscribe();signal.removeEventListener("abort",done);resolve();};
          unsubscribe=engine.subscribe(id=>{if(id!==sound.id)done();});
          signal.addEventListener("abort",done,{once:true});
          if(signal.aborted||!engine.isActive())done();
        });
      }
    }finally{if(queue.current===controller){queue.current=null;setSequence(null);}}
  },[ordered,engine,play,cancelQueue]);
  useEffect(()=>{
    if(!viewport.current||!world.current)return;
    const byId=new Map(ordered.map(sound=>[sound.id,sound]));
    const field=mountSoundField(viewport.current,world.current,id=>{const sound=byId.get(id);if(sound)audition(sound);},setDirty);
    driver.current=field;
    return ()=>{field.dispose();driver.current=null;};
  },[ordered,audition]);
  return <div className="sound-landing">
    <div className="sound-field" ref={viewport} tabIndex={0} role="region" aria-label="Endless sound canvas. Drag empty space or use arrow keys to explore. Click a sound to play. Escape resets.">
      <div className="field-grid" aria-hidden="true"/>
      <div className="field-world" ref={world}>
        <section className="field-hero" data-no-pan="">
          <span className="field-kicker"><svg className="field-sketch-dot" viewBox="0 0 12 12" aria-hidden="true"><path d="M5.8 1.1C8.1.8 10.6 3 10.5 5.8c.1 2.7-2.1 5-4.8 4.8C3 10.8.9 8.3 1.2 5.7 1 3.2 3.5 1.3 5.8 1.1Z" fill="currentColor"/><path d="M3 4.5 7.4 2.8M2.9 7.1 9 4.6M5 9 8.8 7" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth=".65" strokeLinecap="round"/></svg>{catalog.sounds.length} interface sounds</span>
          <h1>Make the small<br/><span className="field-headline-tail">things sound good<span className="field-headline-dot">.<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5.8 1.1C8.1.8 10.6 3 10.5 5.8c.1 2.7-2.1 5-4.8 4.8C3 10.8.9 8.3 1.2 5.7 1 3.2 3.5 1.3 5.8 1.1Z" fill="currentColor"/><path d="M3 4.5 7.4 2.8M2.9 7.1 9 4.6M5 9 8.8 7" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth=".65" strokeLinecap="round"/></svg></span><svg className="field-headline-underline" viewBox="0 0 300 13" aria-hidden="true"><path d="M3 8C70 2 166 1 296 6M47 10Q169 5 265 9" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg></span></h1>
          <p>Discover tactile interface sounds. Grab, listen, and bring them into your next project.</p>
          <div className="field-hero-actions">
            <a href="/library" className="pill primary">Explore the library <ArrowIcon/></a>
            <a href="/sounds/pack.zip" className="field-download" download="verdant-sounds.zip">Download WAV pack</a>
          </div>
        </section>
        {ordered.map(sound=><SoundObject key={sound.id} sound={sound} active={playingId===sound.id} pending={pendingId===sound.id} onPlay={audition} engine={engine}/>)}
      </div>
    </div>
    <div className="field-dock"><div className="field-dock-inner">
      <span className="field-help" role="status">{error||(sequence!==null?`Playing ${sequence} of ${ordered.length}`:"Drag to wander · Tap to listen")}</span>
      <button type="button" className="pill field-reset" disabled={!dirty} onClick={()=>driver.current?.reset()}>Back to center</button>
      <button type="button" className="pill primary field-play-all" onClick={()=>void playAll()}>{sequence!==null?<><StopIcon/> Stop</>:<><PlayIcon/> Play all sounds</>}</button>
      <a href="/sounds/credits.md">Credits</a>
    </div></div>
  </div>;
}
