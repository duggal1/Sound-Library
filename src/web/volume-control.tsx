import { useRef, type CSSProperties } from "react";
import { DEFAULT_VOLUME } from "./audio";
import { VolumeIcon, MuteIcon } from "./icons";

/** Native range semantics, custom visual surface. One value drives fill,
 * handle, accessible text and audio gain. No independently animated ruler. */
export function VolumeControl({value,onChange}:{value:number;onChange:(value:number)=>void}){
  const lastAudible=useRef(DEFAULT_VOLUME);
  const percent=Math.round(value*100);
  const fraction=Math.max(0,Math.min(1,value/DEFAULT_VOLUME));
  const change=(next:number)=>{
    if(next>0)lastAudible.current=next;
    onChange(next);
  };
  return <div className="volume" data-muted={value===0}>
    <button className="volume-mute" type="button" aria-label={value===0?"Unmute preview":"Mute preview"}
      aria-pressed={value===0} onClick={()=>{if(value>0){lastAudible.current=value;onChange(0);}else change(lastAudible.current);}}>
      {value===0?<MuteIcon/>:<VolumeIcon/>}
    </button>
    <div className="volume-slider" style={{"--gain":fraction} as CSSProperties}>
      <div className="volume-rail" aria-hidden="true"><span className="volume-ink"/></div>
      <input aria-label="Playback volume" aria-valuetext={percent+"%"} type="range"
        min={0} max={DEFAULT_VOLUME} step={.01} value={value}
        onChange={event=>change(Number(event.currentTarget.value))}/>
    </div>
    <output className="volume-value" aria-hidden="true">{percent}%</output>
  </div>;
}
