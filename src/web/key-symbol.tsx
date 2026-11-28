import type {ReactNode} from "react";

/** Monochrome vector legends, drawn to match the supplied Magic Keyboard reference.
 * Shared compact/expanded keyboard, no platform-dependent emoji or symbol font. */
export function KeySymbol({code}:{code:string}){
 const sun=(radius:number)=><><circle cx="12" cy="12" r={radius}/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>;
 const speaker=<path d="M3 9h4l5-4v14l-5-4H3z"/>;
 let shape:ReactNode;
 switch(code){
  case "F1":shape=sun(3.2);break;
  case "F2":shape=sun(4.6);break;
  case "F3":shape=<><rect x="3" y="5" width="10" height="6" rx="1"/><rect x="15" y="5" width="6" height="14" rx="1"/><rect x="3" y="13" width="10" height="6" rx="1"/></>;break;
  case "F4":shape=<><circle cx="10" cy="10" r="5.5"/><path d="m14 14 6 6"/></>;break;
  case "F5":shape=<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21m-3 0h6"/></>;break;
  case "F6":shape=<path d="M19.8 15.5A8.5 8.5 0 0 1 8.5 4.2 8.5 8.5 0 1 0 19.8 15.5Z"/>;break;
  case "F7":shape=<path d="m11 6-8 6 8 6V6Zm10 0-8 6 8 6V6Z"/>;break;
  case "F8":shape=<><path d="m4 5 9 7-9 7V5Z"/><path d="M16 5v14m4-14v14"/></>;break;
  case "F9":shape=<path d="m3 6 8 6-8 6V6Zm10 0 8 6-8 6V6Z"/>;break;
  case "F10":shape=speaker;break;
  case "F11":shape=<>{speaker}<path d="M15 9a4 4 0 0 1 0 6"/></>;break;
  case "F12":shape=<>{speaker}<path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/></>;break;
  case "ArrowLeft":shape=<path fill="currentColor" stroke="none" d="m8 12 8-5v10z"/>;break;
  case "ArrowRight":shape=<path fill="currentColor" stroke="none" d="m16 12-8-5v10z"/>;break;
  case "ArrowUp":shape=<path fill="currentColor" stroke="none" d="m12 8-5 8h10z"/>;break;
  case "ArrowDown":shape=<path fill="currentColor" stroke="none" d="m12 16-5-8h10z"/>;break;
  default:return null;
 }
 return <svg className="key-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
