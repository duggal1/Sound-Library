import { useMemo, useState, type CSSProperties } from "react";
import { KEY_ROWS } from "../core/keyboard";
import type { SoundSummary } from "../core/types";
import { SoundIcon } from "./icons";

export function KeyboardPreview({sounds, active, audition}: {
  sounds: readonly SoundSummary[];
  active: string | null;
  audition: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const byCode = useMemo(() => new Map(sounds.filter(sound => sound.keyCode).map(sound => [sound.keyCode, sound])), [sounds]);
  if (!byCode.size) return null;
  return <div className="key-preview">
    <button className="pill" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      <SoundIcon kind="keyboard" /> {expanded ? "Hide keyboard" : "Try the keyboard"}
    </button>
    {expanded && <div className="key-board" role="group" aria-label="Keyboard sound pad" tabIndex={0}
      onKeyDown={event => {
        if (event.currentTarget !== event.target || event.metaKey || event.ctrlKey || event.altKey || event.key === "Tab" || event.key === "Escape") return;
        const sound = byCode.get(event.code);
        if (!sound) return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) audition(sound.id);
      }}>
      <p>Focus here and type, or select a key.</p>
      {KEY_ROWS.map((row, index) => <div className="key-row" key={index}>
        {row.map(key => {
          const sound = byCode.get(key.code);
          return <button type="button" key={key.code} disabled={!sound} aria-label={sound?.name}
            className="key-cap" data-active={sound?.id === active} title={sound?.name}
            style={{"--key-width":key.width} as CSSProperties} onClick={() => {if (sound) audition(sound.id);}}>{key.label}</button>;
        })}
      </div>)}
    </div>}
  </div>;
}
