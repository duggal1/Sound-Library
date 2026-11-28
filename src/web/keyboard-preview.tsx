import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type KeyboardEvent,type PointerEvent} from "react";
import {createPortal} from "react-dom";
import type {SoundSummary} from "../core/types";
import {MAC_ROWS,CLASSIC_FALLBACK} from "../core/mac-keyboard";
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
 const board=useRef<HTMLDivElement>(null);
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
  if(e.key==="Escape"||e.isComposing)return;
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
 return <div className="key-board device-keyboard" ref={board} tabIndex={0} role="group" aria-label="MacBook-style keyboard. Focus and type, or click any key." onKeyDown={keyDown} onKeyUp={keyUp}
   onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))clear();}}>
  {MAC_ROWS.map((row,i)=><div className="device-key-row" key={i} data-function={i===0}>
   {row.map(key=>{
    const sound=lookup(key.code),mapped=sound&&sound.keyCode!==key.code;
    return <button type="button" key={key.code} className="device-key" data-code={key.code} data-wide={key.width>1.3} disabled={!sound}
      aria-label={key.code==="Space"?"Space":key.label||key.code} title={mapped?"Classic fallback: "+sound.name:sound?.name}
      style={{"--key-width":key.width} as CSSProperties}
      onPointerEnter={()=>{if(sound)prefetchSound(sound);}} onPointerDown={e=>pointerDown(e,key.code)} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
      onClick={e=>{if(e.detail===0){fire(sound);}}}>
      <span className="device-key-face">{key.label}{key.code==="CapsLock"&&<i/>}</span>
    </button>;
   })}
  </div>)}
 </div>;
}

function MousePreview({sounds,fire}:{sounds:readonly SoundSummary[];fire:(sound:SoundSummary|undefined)=>void}){
 const byId=useMemo(()=>new Map(sounds.map(s=>[s.id,s])),[sounds]);
 const lastWheel=useRef(0);
 const wheel=useRef<HTMLButtonElement>(null);
 const play=(id:string)=>fire(byId.get(id));
 useEffect(()=>{
  const node=wheel.current;if(!node)return;
  const onWheel=(e:WheelEvent)=>{e.preventDefault();const now=performance.now();if(now-lastWheel.current<36)return;lastWheel.current=now;play("wheel-step");node.animate([{transform:"translateY(2px)"},{transform:"translateY(0)"}],{duration:120,easing:"ease-out"});};
  node.addEventListener("wheel",onWheel,{passive:false});return()=>node.removeEventListener("wheel",onWheel);
 },[byId,fire]);
 const down=(e:PointerEvent<HTMLButtonElement>)=>{if(e.button!==0&&e.button!==2)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.pressed="true";play("mouse-down");};
 const up=(e:PointerEvent<HTMLButtonElement>)=>{if(e.currentTarget.dataset.pressed!=="true")return;e.currentTarget.dataset.pressed="false";play("mouse-up");};
 return <div className="device-mouse-space">
  <div className="device-mouse" role="group" aria-label="Interactive mouse">
   <div className="device-mouse-top">
    <button type="button" className="mouse-left" aria-label="Left mouse button" onPointerDown={down} onPointerUp={up} onPointerCancel={e=>{e.currentTarget.dataset.pressed="false";}} onLostPointerCapture={e=>{e.currentTarget.dataset.pressed="false";}} onClick={e=>{if(e.detail===0)play("mouse-down");}}/>
    <button type="button" className="mouse-wheel" ref={wheel} aria-label="Scroll wheel; click or scroll" onClick={()=>play("wheel-step")}><span/></button>
    <button type="button" className="mouse-right" aria-label="Right mouse button" onContextMenu={e=>e.preventDefault()} onPointerDown={down} onPointerUp={up} onPointerCancel={e=>{e.currentTarget.dataset.pressed="false";}} onLostPointerCapture={e=>{e.currentTarget.dataset.pressed="false";}} onClick={e=>{if(e.detail===0)play("mouse-down");}}/>
   </div><div className="mouse-palm" aria-hidden="true"><i/></div>
  </div>
  <div className="device-mouse-actions"><span>Left / right click</span><span>Scroll the wheel</span></div>
 </div>;
}

function PreviewBody({device,sounds,effectiveTheme,fire}:{device:Device;sounds:readonly SoundSummary[];effectiveTheme:KeyboardTheme;fire:(sound:SoundSummary|undefined)=>void}){
 return device==="keyboard"?<MacKeyboard sounds={sounds} theme={effectiveTheme} fire={fire}/>:<MousePreview sounds={sounds} fire={fire}/>;
}
export function DevicePreview(props:Props){
 const {sounds,engine,theme,effectiveTheme,themeStatus,onTheme,device,onDevice}=props;
 const [expanded,setExpanded]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const {fire,error}=useTransient(engine,sounds);
 useEffect(()=>{
  if(!expanded)return;
  const node=dialog.current;if(!node)return;
  node.showModal();
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
  {device==="keyboard"&&<ThemePicker theme={theme} onTheme={onTheme}/>}
  <PreviewBody device={device} sounds={sounds} effectiveTheme={effectiveTheme} fire={fire}/>
  <p className="device-caption" role="status">{error||((device==="keyboard"&&themeStatus)|| (device==="keyboard"?"Click a key or focus the keyboard and type.":"Click either button or scroll the wheel."))}</p>
  {expanded&&createPortal(<dialog ref={dialog} className="device-dialog" aria-label="Expanded device preview" onClick={e=>{if(e.target===e.currentTarget&&e.clientX!==0){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.currentTarget.close();}}}>
   <div className="device-dialog-top"><div><span className="device-dialog-kicker">Sound test</span><h2>{device==="keyboard"?"Play the keyboard":"Play the mouse"}</h2></div><button type="button" className="pill icon-button" aria-label="Close preview" onClick={()=>dialog.current?.close()}><ClearIcon/></button></div>
   {device==="keyboard"&&<ThemePicker theme={theme} onTheme={onTheme}/>}
   <div className="device-expanded-body"><PreviewBody device={device} sounds={sounds} effectiveTheme={effectiveTheme} fire={fire}/></div>
   <p className="device-caption" role="status">{error||((device==="keyboard"&&themeStatus)||(device==="keyboard"?"Focus the keyboard and type. Every supported key plays its mapped recording.":"Click and scroll to hear recorded mouse sounds."))}</p>
   {device==="keyboard"&&<p className="device-source">{effectiveTheme==="modern"?"Custom Keyboard by remains · shared recorded clips · preview only":"Classic · recorded key strikes with explicit fallback for additional MacBook keys"}</p>}
  </dialog>,document.body)}
 </section>;
}
