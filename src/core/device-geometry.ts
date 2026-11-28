import {MAC_ROWS} from "./mac-keyboard";
export const BOARD_WIDTH=1540;
export const BOARD_HEIGHT=510;
export interface PhysicalKey {code:string;label:string;x:number;y:number;width:number;height:number;secondary?:string;functionLabel?:string}
const GAP=6,UNIT=100,LEFT=18;
const ROW_PITCH=86,KEY_HEIGHT=80;
const shifted:Record<string,string>={Backquote:"~",Digit1:"!",Digit2:"@",Digit3:"#",Digit4:"$",Digit5:"%",Digit6:"^",Digit7:"&",Digit8:"*",Digit9:"(",Digit0:")",Minus:"_",Equal:"+",BracketLeft:"{",BracketRight:"}",Backslash:"|",Semicolon:":",Quote:'"',Comma:"<",Period:">",Slash:"?"};
const fn=["☼","☀","▤","⌕","♩","☾","⏮","⏯","⏭","◌","◖","◗"];
export function physicalKeys():PhysicalKey[]{
 const keys:PhysicalKey[]=[];
 // All standard keys share the exact same unit. No row-specific flex stretching.
 for(let row=0;row<MAC_ROWS.length;row++){
  const source=MAC_ROWS[row]!;
  if(row===0){
   const width=1500/source.length;
   source.forEach((key,i)=>keys.push({code:key.code,label:key.label,x:LEFT+i*width,y:13,width:width-GAP,height:54,functionLabel:i?fn[i-1]:undefined}));
   continue;
  }
  if(row===5){
   const y=417;
   const widths=[1.5,1.25,1.5,5,1.5,1.25];
   let x=LEFT;
   for(let i=0;i<6;i++){
    const key=source[i]!,width=widths[i]!*UNIT;
    const label=key.code.startsWith("Alt")?"option":key.code.startsWith("Meta")?"command":key.label;
    keys.push({code:key.code,label,x,y,width:width-GAP,height:KEY_HEIGHT,secondary:key.code.startsWith("Alt")?"⌥":key.code.startsWith("Meta")?"⌘":key.code==="ControlLeft"?"⌃":undefined});x+=width;
   }
   keys.push({code:"ArrowLeft",label:"←",x,y,width:UNIT-GAP,height:KEY_HEIGHT},
    {code:"ArrowUp",label:"↑",x:x+UNIT,y,width:UNIT-GAP,height:37},
    {code:"ArrowDown",label:"↓",x:x+UNIT,y:y+43,width:UNIT-GAP,height:37},
    {code:"ArrowRight",label:"→",x:x+UNIT*2,y,width:UNIT-GAP,height:KEY_HEIGHT});
   continue;
  }
  const widths=source.map(key=>key.width);
  // ANSI widths are authored explicitly; the rightmost modifier closes the row.
  widths[widths.length-1]=15-widths.slice(0,-1).reduce((a,b)=>a+b,0);
  let x=LEFT;const y=73+(row-1)*ROW_PITCH;
  source.forEach((key,i)=>{const width=widths[i]!*UNIT;keys.push({code:key.code,label:key.label,x,y,width:width-GAP,height:KEY_HEIGHT,secondary:shifted[key.code]});x+=width;});
 }
 return keys;
}
export const PHYSICAL_KEYS=physicalKeys();
export function fitBoard(available:number,maxWidth=1040){
 const width=Math.max(0,Math.min(available,maxWidth));return {width,height:width*BOARD_HEIGHT/BOARD_WIDTH};
}
