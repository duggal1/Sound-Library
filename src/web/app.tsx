/**
 * Screen brief (taste.md §13)
 * Purpose   Audition an interface sound pack and export it.
 * Hero      The selected sound: its name, then its waveform on the canvas.
 * Action    Export pack. The only decorated object on the screen.
 * Nouns     sound, library, waveform, scope, peak, RMS, export.
 * Accent    Green. Only on data: waveform, live trace, selected signal,
 *           duration meters, the brand mark. Chrome is black / white / gray.
 * States    loading, error, empty (force with ?state=...), plus "no match".
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CatalogResponse, CategoryId, CategoryInfo, SoundSummary } from "../core/types";
import { SAMPLE_RATE } from "../core/types";
import { fetchCatalog, loadSound, peekSound, prefetchSound, type DecodedSound } from "./api";
import { AudioEngine, DEFAULT_VOLUME } from "./audio";
import { AnimatedNumber, Dropdown, MicroBar, Segmented, type DropdownOption, type SegmentedOption } from "./controls";
import { fmtBytes, fmtCount, fmtDb, fmtMs } from "./format";
import {
  ArrowIcon,
  StopIcon,
  ChevronIcon,
  VolumeIcon,
  ClearIcon,
  BrandMark,
  DownloadIcon,
  NextIcon,
  PlayIcon,
  PrevIcon,
  SearchIcon,
} from "./icons";
import { StageRenderer, type StageMode } from "./stage";

const PAGE_SIZE = 12;

const MODES: readonly SegmentedOption<StageMode>[] = [
  { value: "waveform", label: "Waveform" },
  { value: "scope", label: "Scope" },
];

type CatalogState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CatalogResponse };

type CategoryFilter = "all" | CategoryId;

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export function App() {
  const [engine] = useState(() => new AudioEngine());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchCatalog(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error." });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === "loading") {
    return (
      <Shell>
        <StatePanel
          kind="loading"
          level={1}
          title="Loading sounds"
          text="Reading the sound catalog."
        />
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <StatePanel
          kind="error"
          level={1}
          title="Library unavailable"
          text={state.message}
          action={{ label: "Retry", onClick: reload }}
        />
      </Shell>
    );
  }

  if (state.data.sounds.length === 0) {
    return (
      <Shell>
        <StatePanel
          kind="empty"
          level={1}
          title="No sounds yet"
          text="Reload the catalog to try again."
          action={{ label: "Reload library", onClick: reload }}
        />
      </Shell>
    );
  }

  return <Workspace catalog={state.data} engine={engine} />;
}

/* ------------------------------------------------------------------ */
/* Workspace                                                            */
/* ------------------------------------------------------------------ */

function Workspace({ catalog, engine }: { catalog: CatalogResponse; engine: AudioEngine }) {
  const { sounds, categories } = catalog;

  const [selectedId, setSelectedId] = useState<string | null>(sounds[0]?.id ?? null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<StageMode>("waveform");
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [previewError, setPreviewError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => engine.subscribe(setPlayingId), [engine]);
  const auditionVersion = useRef(0);
  const [decoded, setDecoded] = useState<DecodedSound | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categoryLabel = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const maxDuration = useMemo(() => Math.max(0.001, ...sounds.map((s) => s.duration)), [sounds]);
  const selected = useMemo(() => sounds.find((s) => s.id === selectedId) ?? null, [sounds, selectedId]);
  const filtered = useMemo(
    () => filterSounds(sounds, categoryLabel, category, query),
    [sounds, categoryLabel, category, query],
  );

  const categoryOptions = useMemo<DropdownOption<CategoryFilter>[]>(
    () => [
      { value: "all", label: "All sounds", hint: fmtCount(sounds.length) },
      ...categories.map((c: CategoryInfo) => ({
        value: c.id,
        label: c.label,
        hint: fmtCount(sounds.filter((s) => s.category === c.id).length),
      })),
    ],
    [sounds, categories],
  );

  // Prioritize the selected sound; only warm likely next previews.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setPreviewError("");
    const cached = peekSound(selectedId);
    if (cached) { setDecoded(cached); return; }
    loadSound(selectedId).then(
      (d) => !cancelled && setDecoded(d),
      () => {if (!cancelled) {setDecoded(null);setPreviewError("Could not load waveform. Play to retry.");}},
    );
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const index = filtered.findIndex(sound => sound.id === selectedId);
    prefetchSound(filtered[index + 1]?.id);
    if (index > 0) prefetchSound(filtered[index - 1]?.id);
  }, [selectedId, filtered]);

  useEffect(() => engine.setVolume(volume), [engine, volume]);

  const audition = useCallback(
    (id: string, fraction = 0) => {
      const version = ++auditionVersion.current;
      setSelectedId(id);
      setPendingId(id);
      engine.stop();
      setPreviewError("");
      try { engine.unlock(); } catch { setPendingId(null); setPreviewError("Audio is unavailable in this browser."); return; }
      const current = () => version === auditionVersion.current;
      const play = (d: DecodedSound) => {
        if (!current()) return;
        setDecoded(d);
        // On a RAM hit, enter the audio engine synchronously in the gesture.
        void engine.play(d, current, fraction).then(() => {
          if (current()) { setPendingId(null); window.dispatchEvent(new Event("verdant:play")); }
        }).catch(failed);
      };
      const failed = () => { if (current()) { setPendingId(null); setPreviewError("Playback failed. Try again."); } };
      const cached = peekSound(id);
      if (cached) play(cached);
      else void loadSound(id).then(play, failed);
    },
    [engine],
  );

  const stop = useCallback(() => {
    ++auditionVersion.current;
    setPendingId(null);
    engine.stop();
    window.dispatchEvent(new Event("verdant:play"));
  }, [engine]);
  const replay = useCallback(() => {
    if (playingId === selectedId || pendingId === selectedId) stop();
    else if (selectedId) audition(selectedId);
  }, [audition, selectedId, playingId, pendingId, stop]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (filtered.length === 0) return;
      const index = filtered.findIndex((s) => s.id === selectedId);
      const next = index < 0 ? 0 : Math.min(filtered.length - 1, Math.max(0, index + dir));
      const target = filtered[next];
      if (!target) return;
      setShown((n) => Math.max(n, next + 1));
      audition(target.id);
      requestAnimationFrame(() =>
        document.getElementById(`row-${target.id}`)?.scrollIntoView({ block: "nearest" }),
      );
    },
    [filtered, selectedId, audition],
  );

  // Keyboard: / search, Esc clear, ↑ ↓ browse, space replay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || !!target?.isContentEditable;

      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        setShown(PAGE_SIZE);
        searchRef.current?.blur();
        return;
      }
      // Components with their own arrow/space semantics keep them.
      if (target?.closest("input, textarea, select, [aria-haspopup='listbox'], [role='radiogroup'], [role='slider']")) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        step(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === " " && !target?.closest("button, a")) {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, replay]);

  const clearFilters = () => {
    setCategory("all");
    setQuery("");
    setShown(PAGE_SIZE);
  };

  const rows = filtered.slice(0, Math.max(shown, PAGE_SIZE));
  const stageSound = decoded && decoded.id === selectedId ? decoded : null;

  const busy = pendingId === selectedId;
  const playing = playingId === selectedId;
  const currentIndex = filtered.findIndex(sound => sound.id === selectedId);
  return (
    <Shell context={`${fmtCount(sounds.length)} sounds · ${SAMPLE_RATE / 1000} kHz · ${catalog.bitDepth}-bit · mono`}
      pack={<a className="pill pack" href="/sounds/pack.zip" download="verdant-sounds.zip"><DownloadIcon /><span>Download all</span><small>{fmtBytes(catalog.totalBytes)}</small></a>}>
      <div className="workspace">
        <section className="library" aria-label="Sound library">
          <div className="library-head">
            <h2>Sounds <span className="library-count">{fmtCount(filtered.length)}</span></h2>
            <div className="filters">
              <div className="search"><SearchIcon /><input ref={searchRef} type="search" placeholder="Search sounds" aria-label="Search sounds" value={query} onChange={e => {setQuery(e.target.value);setShown(PAGE_SIZE);}} />{query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => {setQuery("");setShown(PAGE_SIZE);searchRef.current?.focus();}}><ClearIcon /></button>}</div>
              <Dropdown label="Sound category" value={category} options={categoryOptions} onChange={value => {setCategory(value);setShown(PAGE_SIZE);}} />
            </div>
          </div>
          <div className="list-header" aria-hidden="true"><span>Name</span><span>Duration</span><span>Peak</span><span /></div>
          <div className="library-scroll" tabIndex={0} aria-label="Browse sounds">
            {filtered.length === 0 ? <StatePanel kind="empty" title="No matching sounds" text="Try a different name or category." action={{label:"Clear filters",onClick:clearFilters}} /> :
              <div className="sound-list">
                {rows.map(sound => {
                  const active = playingId === sound.id;
                  const loading = pendingId === sound.id;
                  return <div className="sound-row" id={`row-${sound.id}`} key={sound.id} data-selected={sound.id === selectedId} data-playing={active} data-loading={loading}
                    onPointerEnter={() => prefetchSound(sound.id)}>
                    <button className="sound-select" onFocus={() => prefetchSound(sound.id)} type="button" aria-label={`${active || loading ? "Stop" : "Play"} ${sound.name}`} aria-pressed={sound.id === selectedId} onClick={() => active || loading ? stop() : audition(sound.id)}>
                      <span className="row-play">{active || loading ? <StopIcon /> : <PlayIcon />}</span>
                      <span className="sound-text"><span>{sound.name}</span><small>{loading ? "Loading…" : active ? "Playing" : categoryLabel.get(sound.category)}</small></span>
                    </button>
                    <div className="duration"><MicroBar ratio={sound.duration / maxDuration} /><span>{fmtMs(sound.duration)}</span></div>
                    <span className="peak">{fmtDb(sound.peakDb)}</span>
                    <a className="pill icon-button" href={downloadUrl(sound.id)} download aria-label={`Download ${sound.name}`}><DownloadIcon /></a>
                  </div>;
                })}
              </div>}
            {rows.length < filtered.length && <button className="pill more" type="button" onClick={() => setShown(n => n + PAGE_SIZE)}>Show more <ArrowIcon /></button>}
          </div>
          <div className="library-foot"><span>{fmtCount(rows.length)} of {fmtCount(filtered.length)}</span><span>↑ ↓ Browse · Space to play</span></div>
        </section>
        <section className="preview" aria-label="Audio inspector" data-expanded={expanded}>
          <div className="preview-top">
            <div className="preview-meta"><span>{selected ? categoryLabel.get(selected.category) : "Preview"}</span><span>{selected ? fmtMs(selected.duration) : ""}</span></div>
            <div className="hero">
              <h1 className="hero-name" key={selectedId}>{selected?.name ?? "Select a sound"}</h1>
              <button type="button" className="pill expand-preview" aria-expanded={expanded} aria-label={expanded ? "Collapse sound details" : "Expand sound details"} onClick={() => setExpanded(v => !v)}><ChevronIcon /></button>
            </div>
            <p className="hero-caption">{selected?.description}</p>
          </div>
          <div className="stage-bar"><Segmented label="Visualisation" value={mode} options={MODES} onChange={setMode} /><span className="stage-label">{mode === "waveform" ? "Normalized amplitude" : "Live signal"}</span></div>
          <SoundStage engine={engine} sound={stageSound} mode={mode} onSeek={fraction => { if (selectedId && stageSound) audition(selectedId, fraction); }} />
          <div className="stage-footer"><span role="status">{previewError || (busy ? "Loading sound…" : playing ? "Playing" : stageSound ? "Ready" : "Loading waveform…")}</span>{previewError && <button className="pill retry" onClick={replay}>Retry</button>}</div>
          <div className="transport">
            <nav className="dock" aria-label="Transport">
              <button className="pill icon-button" type="button" aria-label="Previous sound" disabled={!filtered.length || currentIndex === 0} onClick={() => step(-1)}><PrevIcon /></button>
              <button className="pill primary dock-play" type="button" disabled={!selected} onClick={replay}>{playing || busy ? <StopIcon /> : <PlayIcon />}<span>{playing || busy ? "Stop" : "Play"}</span></button>
              <button className="pill icon-button" type="button" aria-label="Next sound" disabled={!filtered.length || currentIndex === filtered.length - 1} onClick={() => step(1)}><NextIcon /></button>
            </nav>
            {selected && <a className="pill icon-button current-download" aria-label="Download selected sound" href={downloadUrl(selected.id)} download><DownloadIcon /></a>}
            <label className="volume"><VolumeIcon /><input aria-label="Playback volume" type="range" min={0} max={1.1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} /><span>{Math.round(volume * 100)}%</span></label>
          </div>
          <section className="details" aria-label="Source signal metrics">
            <dl>
              <div><dt>Peak</dt><dd>{selected ? <AnimatedNumber value={selected.peakDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>RMS</dt><dd>{selected ? <AnimatedNumber value={selected.rmsDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>Samples</dt><dd>{selected ? fmtCount(selected.samples) : "—"}</dd></div>
              <div><dt>File size</dt><dd>{selected ? fmtBytes(selected.bytes) : "—"}</dd></div>
            </dl>
          </section>
        </section>
      </div>
    </Shell>
  );
}

function downloadUrl(id: string) { return `/sounds/${encodeURIComponent(id)}.wav`; }
function filterSounds(sounds: readonly SoundSummary[], labels: Map<CategoryId,string>, category: CategoryFilter, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sounds.filter(s => (category === "all" || s.category === category) &&
    terms.every(term => `${s.name} ${s.id} ${s.description} ${labels.get(s.category) ?? ""}`.toLowerCase().includes(term)));
}
function SoundStage({engine,sound,mode,onSeek}: {engine:AudioEngine;sound:DecodedSound|null;mode:StageMode;onSeek:(fraction:number)=>void}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<StageRenderer|null>(null);
  const drag = useRef<number|null>(null);
  const [position,setPosition] = useState(0);
  useEffect(() => {
    if (!canvas.current) return;
    const stage = new StageRenderer(canvas.current,engine);
    renderer.current = stage;
    const wake = () => stage.refresh();
    window.addEventListener("verdant:play",wake);
    return () => {window.removeEventListener("verdant:play",wake);stage.destroy();renderer.current=null;};
  },[engine]);
  useEffect(() => {renderer.current?.setSound(sound?.samples ?? null,sound?.sampleRate ?? SAMPLE_RATE);setPosition(0);drag.current=null;},[sound]);
  useEffect(() => {renderer.current?.setMode(mode);},[mode]);
  const enabled = mode === "waveform" && !!sound;
  const fraction = (x:number) => renderer.current?.fractionAt(x) ?? 0;
  const seek = (value:number) => {
    const next = Math.max(0,Math.min(.999,value));
    setPosition(next);renderer.current?.inspect(next);onSeek(next);
  };
  return <div className="stage" data-ready={!!sound} data-mode={mode}>
    <canvas ref={canvas} role={enabled ? "slider" : "img"} tabIndex={enabled ? 0 : undefined}
      aria-label={enabled ? "Audition from waveform position" : mode === "scope" ? "Live audio oscilloscope" : "Sound amplitude over time"}
      aria-valuemin={enabled ? 0 : undefined} aria-valuemax={enabled ? 100 : undefined} aria-valuenow={enabled ? Math.round(position*100) : undefined}
      onPointerDown={e => {if(!enabled || e.button !== 0)return;drag.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging="true";renderer.current?.inspect(fraction(e.clientX));}}
      onPointerUp={e => {if(drag.current !== e.pointerId)return;drag.current=null;delete e.currentTarget.dataset.dragging;seek(fraction(e.clientX));}}
      onPointerCancel={e => {drag.current=null;delete e.currentTarget.dataset.dragging;renderer.current?.inspect(null);}}
      onLostPointerCapture={e => {drag.current=null;delete e.currentTarget.dataset.dragging;}}
      onKeyDown={e => {if(!enabled)return;const delta=e.key==="ArrowRight"||e.key==="ArrowUp" ? .05 :e.key==="ArrowLeft"||e.key==="ArrowDown"?-.05:0;
        if(delta || e.key==="Home" || e.key==="End"){e.preventDefault();e.stopPropagation();seek(e.key==="Home"?0:e.key==="End" ? .999 :position+delta);}}}
    />
  </div>;
}
function Shell({children,context,pack}: {children:ReactNode;context?:string;pack?:ReactNode}) {
  return <div className="shell"><header className="top"><div className="brand"><BrandMark /><span>Verdant</span></div><span className="context">{context ?? "Interface sounds"}</span>{pack}</header><main>{children}</main></div>;
}
function StatePanel({kind,title,text,action,level=2}: {kind:"loading"|"empty"|"error";title:string;text:string;action?:{label:string;onClick:()=>void};level?:1|2}) {
  const Heading = level === 1 ? "h1" : "h2";
  return <div className="state" role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading"}>{kind === "loading" && <span className="loading-bar" aria-hidden="true" />}<Heading>{title}</Heading>{text && <p>{text}</p>}{action && <button className="pill primary" type="button" onClick={action.onClick}>{action.label}<ArrowIcon /></button>}</div>;
}
