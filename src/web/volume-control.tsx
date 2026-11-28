import { DEFAULT_VOLUME } from "./audio";
import { VolumeIcon } from "./icons";

export function VolumeControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100);
  const fraction = Math.max(0, Math.min(1, value / DEFAULT_VOLUME));
  return (
    <label className="volume" data-muted={value === 0}>
      <VolumeIcon />
      <span className="volume-slider">
        <span className="volume-track" aria-hidden="true">
          {Array.from({length:23},(_,index)=><i key={index} className="gain-tick" data-active={(index+1)/23<=fraction+1e-8} data-major={index%5===0} />)}
        </span>
        <input aria-label="Playback volume" aria-valuetext={`${percent}%`} type="range" min={0} max={DEFAULT_VOLUME} step={0.01}
          value={value} onChange={event => onChange(Number(event.currentTarget.value))} />
      </span>
      <span className="volume-value" aria-hidden="true">{percent}%</span>
    </label>
  );
}
