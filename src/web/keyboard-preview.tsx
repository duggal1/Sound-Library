import {useCallback,useEffect,useMemo,useRef,useState,useId,type CSSProperties,type KeyboardEvent,type PointerEvent,type MouseEvent} from "react";
import {createPortal} from "react-dom";
import type {SoundSummary} from "../core/types";
import {CLASSIC_FALLBACK} from "../core/mac-keyboard";
import {BOARD_WIDTH,BOARD_HEIGHT,PHYSICAL_KEYS} from "../core/device-geometry";
import {useDeviceTilt} from "./use-device-tilt";
import type {KeyboardTheme} from "../core/keyboard-themes";
import {loadSound,peekSound,prefetchSound} from "./api";
import type {AudioEngine} from "./audio";
import {SoundIcon,ClearIcon,ArrowIcon} from "./icons";
import "./device-preview.css";

type Device="keyboard"|"mouse";
type Props={sounds:readonly SoundSummary[];engine:AudioEngine;theme:KeyboardTheme;effectiveTheme:KeyboardTheme;themeStatus:string;onTheme:(theme:KeyboardTheme)=>void;device:Device;onDevice:(device:Device)=>void};
const THEMES=[{id:"modern",label:"Modern · realistic"},{id:"classic",label:"Classic · retro"}] as const;

export function ThemePicker({theme,onTheme}:{theme:KeyboardTheme;onTheme:(theme:KeyboardTheme)=>void}){
 return <div className="device-theme-options" role="group" aria-label="Keyboard sound themes">
  {THEMES.map(t=><button type="button" key={t.id} aria-pressed={theme===t.id} onClick={()=>onTheme(t.id)}><i aria-hidden="true"/>{t.label}</button>)}
 </div>;
}

function useTransient(engine:AudioEngine,sounds:readonly SoundSummary[]){
 const generation=useRef(0);
 const [error,setError]=useState("");
 useEffect(()=>{generation.current++;setError("");return()=>{generation.current++;engine.stopTransients();};},[engine,sounds]);
 const fire=useCallback((sound:SoundSummary|undefined)=>{
  if(!sound)return;
  const current=generation.current;const valid=()=>current===generation.current;
  try{
   engine.unlock();
   const ready=peekSound(sound);
   if(ready){engine.playTransient(ready,valid);return;}
   void loadSound(sound).then(s=>{if(valid())engine.playTransient(s,valid);}).catch(()=>{if(valid())setError("Could not play this sound. Try again.");});
  }catch{if(valid())setError("Could not open audio. Try again.");}
 },[engine]);
 return {fire,error};
}

function MacKeyboard({sounds,theme,fire}:{sounds:readonly SoundSummary[];theme:KeyboardTheme;fire:(sound:SoundSummary|undefined)=>void}){
 const board=useRef<HTMLDivElement>(null),tilt=useDeviceTilt();
 const held=useRef(new Set<string>());
 const pointers=useRef(new Map<number,string>());
 const byCode=useMemo(()=>new Map(sounds.filter(s=>s.keyCode).map(s=>[s.keyCode!,s])),[sounds]);
 const lookup=(code:string)=>byCode.get(code)??(theme==="classic"?byCode.get(CLASSIC_FALLBACK[code]??""):undefined);
 const setPressed=(code:string,value:boolean)=>{
  const node=board.current?.querySelector<HTMLElement>('[data-code="'+code+'"]');
  if(node)node.dataset.pressed=String(value);
 };
 const clear=useCallback(()=>{
  held.current.clear();pointers.current.clear();
  board.current?.querySelectorAll<HTMLElement>("[data-pressed=true]").forEach(n=>{n.dataset.pressed="false";});
 },[]);
 useEffect(()=>{window.addEventListener("blur",clear);return()=>{window.removeEventListener("blur",clear);clear();};},[clear,theme]);
 const release=(code:string)=>{held.current.delete(code);if(!Array.from(pointers.current.values()).includes(code))setPressed(code,false);};
 const press=(code:string)=>{setPressed(code,true);fire(lookup(code));};
 function keyDown(e:KeyboardEvent<HTMLDivElement>){
  if(e.nativeEvent.isComposing)return;
  if(e.key==="Escape"){if(!e.repeat)fire(lookup(e.code));return;}
  if((e.metaKey||e.ctrlKey||e.altKey)&&!/^Meta|^Control|^Alt/.test(e.code))return;
  if(!lookup(e.code))return;
  // Tab continues normal focus navigation. Browser shortcuts remain untouched.
  if(e.key!=="Tab"){e.preventDefault();e.stopPropagation();}
  if(!held.current.has(e.code)||e.repeat){held.current.add(e.code);press(e.code);}
 }
 function keyUp(e:KeyboardEvent<HTMLDivElement>){release(e.code);}
 function pointerDown(e:PointerEvent<HTMLButtonElement>,code:string){
  if(e.button!==0)return;
  e.preventDefault();board.current?.focus({preventScroll:true});
  e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,code);press(code);
 }
 function pointerEnd(e:PointerEvent<HTMLButtonElement>){
  const code=pointers.current.get(e.pointerId);if(!code)return;
  pointers.current.delete(e.pointerId);if(!held.current.has(code)&&!Array.from(pointers.current.values()).includes(code))setPressed(code,false);
 }
 return <div className="magic-stage magic-keyboard-stage">
  <div className="magic-keyboard-tilt" ref={tilt}>
   <div className="device-keyboard magic-keyboard" ref={board} tabIndex={0} role="group" aria-label="Magic Keyboard-inspired preview. Focus and type, or click any key." onKeyDown={keyDown} onKeyUp={keyUp} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))clear();}}>
    {PHYSICAL_KEYS.map(key=>{
     const sound=lookup(key.code),mapped=sound&&sound.keyCode!==key.code;
     const style={left:key.x/BOARD_WIDTH*100+"%",top:key.y/BOARD_HEIGHT*100+"%",width:key.width/BOARD_WIDTH*100+"%",height:key.height/BOARD_HEIGHT*100+"%"} as CSSProperties;
     return <button type="button" key={key.code} className="device-key" data-code={key.code} data-function={!!key.functionLabel} data-modifier={key.width>120} disabled={!sound}
       aria-label={key.code==="Space"?"Space":key.label||key.code} title={mapped?"Classic fallback: "+sound.name:sound?.name} style={style}
       onPointerEnter={()=>{if(sound)prefetchSound(sound);}} onPointerDown={e=>pointerDown(e,key.code)} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
       onClick={e=>{if(e.detail===0)fire(sound);}}>
      <span className="device-key-face">
       {(key.functionLabel||key.secondary)&&<span className="key-secondary">{key.functionLabel||key.secondary}</span>}
       <span className="key-legend">{key.label}</span>
       {key.code==="CapsLock"&&<i aria-hidden="true"/>}
      </span>
     </button>;
    })}
   </div>
  </div>
 </div>;
}

function MousePreview({sounds,fire,mouseId}:{sounds:readonly SoundSummary[];fire:(sound:SoundSummary|undefined)=>void;mouseId:string}){
 const byId=useMemo(()=>new Map(sounds.map(s=>[s.id,s])),[sounds]);
 const lastWheel=useRef(0),surface=useRef<HTMLDivElement>(null),tilt=useDeviceTilt();
 const prefix=useId().replace(/:/g,"");
 const scrollSound=byId.get("wheel-step");
 const clickSound=byId.get(mouseId);
 const scroll=useCallback(()=>{const now=performance.now();if(now-lastWheel.current<36)return;lastWheel.current=now;fire(scrollSound);},[fire,scrollSound]);
 useEffect(()=>{
  const node=surface.current;if(!node)return;
  const onWheel=(e:WheelEvent)=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();scroll();};
  node.addEventListener("wheel",onWheel,{passive:false});return()=>node.removeEventListener("wheel",onWheel);
 },[scroll]);
 const down=(e:PointerEvent<HTMLButtonElement>)=>{
  if(e.button!==0&&e.button!==2&&e.button!==1)return;
  e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.dataset.pressed="true";if(e.button===1)scroll();else fire(clickSound);
 };
 const up=(e:PointerEvent<HTMLButtonElement>)=>{e.currentTarget.dataset.pressed="false";};
 const click=(e:MouseEvent<HTMLButtonElement>)=>{if(e.detail===0)fire(clickSound);};
 return <div className="magic-stage magic-mouse-stage">
  <div className="magic-mouse-tilt" ref={tilt}>
   <div className="device-mouse magic-mouse" ref={surface} role="group" aria-label="Magic Mouse-inspired touch surface. Left and right click, or scroll over the surface.">
    <svg className="magic-mouse-material" viewBox="0 0 156 286" aria-hidden="true">
     <defs>
      <linearGradient id={prefix+"metal"} x1="0" y1="0" x2=".9" y2=".18"><stop stopColor="#d7d8da"/><stop offset=".18" stopColor="#f2f3f4"/><stop offset=".63" stopColor="#c7c9cc"/><stop offset="1" stopColor="#a9adb0"/></linearGradient>
      <linearGradient id={prefix+"shell"} x1=".14" y1=".04" x2=".84" y2=".94"><stop stopColor="#ffffff"/><stop offset=".30" stopColor="#fcfcfd"/><stop offset=".69" stopColor="#f0f1f3"/><stop offset="1" stopColor="#e2e4e7"/></linearGradient>
      <linearGradient id={prefix+"reflection"} x1="0" y1="0" x2="1" y2=".6"><stop stopColor="#fff" stopOpacity=".9"/><stop offset=".54" stopColor="#fff" stopOpacity=".22"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
      <linearGradient id={prefix+"rim"} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff"/><stop offset=".56" stopColor="#f4f4f5"/><stop offset="1" stopColor="#c7c9cc"/></linearGradient>
     </defs>
     <path d="M78 10C32 10 10 31 7 82L7 201C8 252 24 275 78 276C132 275 148 252 149 201L149 82C146 31 124 10 78 10Z" fill={"url(#"+prefix+"metal)"}/>
     <g className="magic-mouse-shell">
      <path d="M78 4C32 4 10 25 7 76L7 195C8 246 24 269 78 270C132 269 148 246 149 195L149 76C146 25 124 4 78 4Z" fill={"url(#"+prefix+"shell)"} stroke={"url(#"+prefix+"rim)"} strokeWidth="1.4"/>
      <path d="M78 10C37 10 16 31 14 76L14 157C18 103 26 65 53 43C75 25 104 19 128 30C114 17 98 10 78 10Z" fill={"url(#"+prefix+"reflection)"}/>
      <path d="M143 83L143 195C141 237 130 255 107 261" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".8" fill="none"/>
     </g>
    </svg>
    <div className="magic-mouse-hit-area">
     <button type="button" className="mouse-left" aria-label="Left click" disabled={!clickSound} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onContextMenu={e=>e.preventDefault()} onClick={click}/>
     <button type="button" className="mouse-right" aria-label="Right click" disabled={!clickSound} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onContextMenu={e=>e.preventDefault()} onClick={click}/>
    </div>
   </div>
  </div>
  <div className="magic-mouse-instructions"><span>Click either side</span><button type="button" className="magic-scroll-tick" disabled={!scrollSound} onClick={scroll}>Scroll sound <span aria-hidden="true">↕</span></button></div>
 </div>;
}

function PreviewBody({device,sounds,effectiveTheme,fire,mouseId}:{device:Device;sounds:readonly SoundSummary[];effectiveTheme:KeyboardTheme;fire:(sound:SoundSummary|undefined)=>void;mouseId:string}){
 return device==="keyboard"?<MacKeyboard sounds={sounds} theme={effectiveTheme} fire={fire}/>:<MousePreview sounds={sounds} fire={fire} mouseId={mouseId}/>;
}
export function DevicePreview(props:Props){
 const {sounds,engine,theme,effectiveTheme,themeStatus,onTheme,device,onDevice}=props;
 const [expanded,setExpanded]=useState(false);
 const mouseVariants=useMemo(()=>sounds.filter(s=>s.importedMouse),[sounds]);
 const [preferredMouse,setPreferredMouse]=useState(()=>{try{return localStorage.getItem("verdant.mouse-theme")??"mouse-click-modern";}catch{return "mouse-click-modern";}});
 const mouseId=mouseVariants.find(s=>s.id===preferredMouse)?.id??mouseVariants[0]?.id??"mouse-down";
 const mousePicker=<div className="device-theme-options" role="group" aria-label="Mouse click variants">{mouseVariants.map(s=><button type="button" key={s.id} aria-pressed={s.id===mouseId} onClick={()=>{setPreferredMouse(s.id);try{localStorage.setItem("verdant.mouse-theme",s.id);}catch{}fire(s);}}><i aria-hidden="true"/>{s.name.replace(/ click$/,"")}</button>)}</div>;
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const {fire,error}=useTransient(engine,sounds);
 useEffect(()=>{
  if(!expanded)return;
  const node=dialog.current;if(!node)return;
  node.showModal();
  node.querySelector<HTMLElement>(".device-keyboard, .mouse-left")?.focus({preventScroll:true});
  const close=()=>setExpanded(false);
  node.addEventListener("close",close);
  return()=>{node.removeEventListener("close",close);if(node.open)node.close();trigger.current?.focus({preventScroll:true});};
 },[expanded]);
 return <section className="device-preview" aria-label="Interactive device preview">
  <div className="device-toolbar">
   <div className="device-tabs" role="group" aria-label="Device">
    <button type="button" aria-pressed={device==="keyboard"} onClick={()=>onDevice("keyboard")}><SoundIcon kind="keyboard"/>Keyboard</button>
    <button type="button" aria-pressed={device==="mouse"} onClick={()=>onDevice("mouse")}><SoundIcon kind="pointer"/>Mouse</button>
   </div>
   <button ref={trigger} type="button" className="pill device-expand" onClick={()=>setExpanded(true)} aria-label="Expand device preview"><ArrowIcon/> Expand</button>
  </div>
  {device==="keyboard"?<ThemePicker theme={theme} onTheme={onTheme}/>:mousePicker}
  <PreviewBody device={device} sounds={sounds} effectiveTheme={effectiveTheme} fire={fire} mouseId={mouseId}/>
  <p className="device-caption" role="status">{error||((device==="keyboard"&&themeStatus)|| (device==="keyboard"?"Click a key or focus the keyboard and type.":"Click either side or scroll over the touch surface."))}</p>
  {expanded&&createPortal(<dialog ref={dialog} className="device-dialog" aria-label="Expanded device preview" onClick={e=>{if(e.target===e.currentTarget&&e.clientX!==0){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.currentTarget.close();}}}>
   <div className="device-dialog-top"><div><span className="device-dialog-kicker">Sound test</span><h2>{device==="keyboard"?"Play the keyboard":"Play the mouse"}</h2></div><button type="button" className="pill icon-button" aria-label="Close preview" onClick={()=>dialog.current?.close()}><ClearIcon/></button></div>
   {device==="keyboard"?<ThemePicker theme={theme} onTheme={onTheme}/>:mousePicker}
   <div className="device-expanded-body"><PreviewBody device={device} sounds={sounds} effectiveTheme={effectiveTheme} fire={fire} mouseId={mouseId}/></div>
   <p className="device-caption" role="status">{error||((device==="keyboard"&&themeStatus)||(device==="keyboard"?"Focus the keyboard and type. Every supported key plays its mapped recording.":"Click either side or scroll over the touch surface."))}</p>
   {device==="keyboard"&&<p className="device-source">{effectiveTheme==="modern"?"Custom Keyboard by remains · shared recorded clips · preview only":"Classic · recorded key strikes with explicit fallback for additional MacBook keys"}</p>}
  </dialog>,document.body)}
 </section>;
}
