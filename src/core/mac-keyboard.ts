/** US ANSI MacBook-style arrangement. Physical codes, not localized key labels. */
import type {Keycap} from "./keyboard";
const k=(code:string,label:string,width=1):Keycap=>({code,label,width});
const letters=(s:string)=>Array.from(s,c=>k("Key"+c,c));
export const MAC_ROWS:readonly (readonly Keycap[])[]=[
 [k("Escape","esc",1.35),...Array.from({length:12},(_,i)=>k("F"+(i+1),"F"+(i+1)))],
 [k("Backquote","`"),...Array.from("1234567890",c=>k("Digit"+c,c)),k("Minus","−"),k("Equal","="),k("Backspace","delete",1.6)],
 [k("Tab","tab",1.5),...letters("QWERTYUIOP"),k("BracketLeft","["),k("BracketRight","]"),k("Backslash","\\",1.1)],
 [k("CapsLock","caps lock",1.75),...letters("ASDFGHJKL"),k("Semicolon",";"),k("Quote","'"),k("Enter","return",1.85)],
 [k("ShiftLeft","shift",2.25),...letters("ZXCVBNM"),k("Comma",","),k("Period","."),k("Slash","/"),k("ShiftRight","shift",2.35)],
 [k("ControlLeft","control",1.2),k("AltLeft","⌥",1.2),k("MetaLeft","⌘",1.4),k("Space","",5),k("MetaRight","⌘",1.4),k("AltRight","⌥",1.2),k("ArrowLeft","←"),k("ArrowUp","↑"),k("ArrowDown","↓"),k("ArrowRight","→")],
];
export const MAC_KEYS=new Set(MAC_ROWS.flat().map(k=>k.code));
/** Classic recordings have no physical F-row or arrow takes. Map these explicitly,
 * never claim the fallback is a recording of that exact physical key. */
export const CLASSIC_FALLBACK:Readonly<Record<string,string>>={
 Backquote:"Escape",ArrowUp:"KeyI",ArrowDown:"KeyK",ArrowLeft:"KeyJ",ArrowRight:"KeyL",
 ...Object.fromEntries(Array.from({length:12},(_,i)=>["F"+(i+1),"Escape"])),
};
