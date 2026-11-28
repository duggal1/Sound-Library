import { useEffect, useMemo, useRef } from "react";
import type { CatalogResponse } from "../core/types";
import { decodeWaveform } from "../core/waveform";
import { prefetchSound } from "./api";
import type { AudioEngine } from "./audio";
import { fmtMs } from "./format";
import { ArrowIcon, ChevronIcon, PlayIcon, SoundIcon, StopIcon } from "./icons";
import { mountOrbit } from "./orbit";
import { useAudition } from "./use-audition";

const FEATURED = [
  "click", "key-space", "wheel-step", "switch-latch", "drop-soft", "key-enter", "hover",
  "control-back", "toggle-engage", "mouse-down", "key-a", "slider-step", "drop-snap", "confirm-choice",
];

function PeakStrip({waveform}: {waveform: string | undefined}) {
  const path = useMemo(() => {
    if (!waveform) return "";
    const points = decodeWaveform(waveform);
    const bins = points.length / 3;
    const count = 36;
    let path = "";
    for (let i = 0; i < count; i++) {
      let low = 0;
      let high = 0;
      for (let j = Math.floor(i * bins / count); j < Math.floor((i + 1) * bins / count); j++) {
        low = Math.max(low, points[j * 3]);
        high = Math.max(high, points[j * 3 + 1]);
      }
      path += `M${i * 3 + 1} ${(14 - high * 12).toFixed(1)}V${(14 + Math.max(.07, low) * 12).toFixed(1)}`;
    }
    return path;
  }, [waveform]);
  return <svg className="tile-wave" viewBox="0 0 108 28" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export function Landing({catalog, engine}: {catalog: CatalogResponse; engine: AudioEngine}) {
  const surface = useRef<HTMLDivElement>(null);
  const orbit = useRef<ReturnType<typeof mountOrbit> | null>(null);
  const {play, stop, playingId, pendingId, error} = useAudition(engine);
  const featured = useMemo(() => {
    const byId = new Map(catalog.sounds.map(sound => [sound.id, sound]));
    return FEATURED.flatMap(id => {
      const sound = byId.get(id);
      return sound ? [sound] : [];
    });
  }, [catalog]);

  useEffect(() => {
    if (!surface.current) return;
    const driver = mountOrbit(surface.current, id => {
      const sound = featured.find(item => item.id === id);
      if (sound) play(sound);
    });
    orbit.current = driver;
    return () => {driver.dispose(); orbit.current = null;};
  }, [featured, play]);

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const sound of catalog.sounds) result.set(sound.category, (result.get(sound.category) ?? 0) + 1);
    return result;
  }, [catalog]);

  return <div className="landing">
    <section className="landing-intro">
      <a className="edition-link" href="/library"><span className="signal-dot" />{catalog.sounds.length} interface sounds <ChevronIcon /></a>
      <h1>Sound you can grab.</h1>
      <p>Audition sounds for keys, clicks and the small things your interface does.</p>
      <a className="pill primary landing-cta" href="/library">Browse sounds <ArrowIcon /></a>
    </section>

    <section className="orbit-section" aria-label="Interactive sound cylinder">
      <div className="orbit-frame">
        <div className="orbit-surface" ref={surface} tabIndex={0} aria-label="Sound cylinder. Use left and right arrows to rotate."
          onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            orbit.current?.rotate(event.key === "ArrowLeft" ? -1 : 1);
          }}>
          <div className="orbit-guide" aria-hidden="true"><div/><div/><div/></div>
          {featured.map((sound, index) => {
            const active = playingId === sound.id || pendingId === sound.id;
            return <div className="orbit-tile" key={sound.id} data-orbit-tile={sound.id} data-tone={index % 4}>
              <button className="orbit-card" type="button" aria-label={`${active ? "Stop" : "Preview"} ${sound.name}`} aria-pressed={active}
                onPointerDown={() => prefetchSound(sound)} onClick={() => active ? stop() : play(sound)}>
                <span className="tile-top"><SoundIcon kind={sound.category} /><small>{fmtMs(sound.duration)}</small></span>
                <PeakStrip waveform={sound.waveform} />
                <span className="tile-bottom"><span>{sound.name}</span><span className="tile-play">{active ? <StopIcon /> : <PlayIcon />}</span></span>
              </button>
            </div>;
          })}
        </div>
      </div>
      <div className="orbit-controls">
        <button className="pill icon-button orbit-prev" type="button" aria-label="Rotate left" onClick={() => orbit.current?.rotate(-1)}><ChevronIcon /></button>
        <p className="orbit-instructions" data-error={!!error} role="status">{error || "Drag a sound to move it. Drag the space between sounds to turn."}</p>
        <button className="pill icon-button orbit-next" type="button" aria-label="Rotate right" onClick={() => orbit.current?.rotate(1)}><ChevronIcon /></button>
      </div>
    </section>

    <nav className="landing-categories" aria-label="Browse sound categories">
      {(["keyboard", "pointer", "toggle", "motion"] as const).map((id) => (
        <a key={id} href={`/library?category=${id}`}>
          <SoundIcon kind={id}/>
          <span>{{keyboard:"Keyboard", pointer:"Mouse", toggle:"Controls", motion:"Gestures"}[id]}</span>
          <small>{counts.get(id) ?? 0}</small>
          <ArrowIcon />
        </a>
      ))}
    </nav>
    <footer className="landing-footer"><a href="/sounds/credits.md">Sound credits</a><a href="https://github.com/duggal1/Sound-Library">GitHub</a></footer>
  </div>;
}
