/**
 * Screen brief (taste.md §13)
 * Purpose   Audition an interface sound pack and export it.
 * Hero      The selected sound: its name, then its waveform on the canvas.
 * Action    Audition the selected sound; export the source WAVs.
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
  BookmarkIcon,
  StopIcon,
  ChevronIcon,
  ClearIcon,
  BrandMark,
  DownloadIcon,
  NextIcon,
  PlayIcon,
  PrevIcon,
  SearchIcon,
} from "./icons";
import type { StageMode } from "./stage";
import { SoundStage } from "./sound-stage";
import { VolumeControl } from "./volume-control";
import { CylinderScroll, revealCylinderRow } from "./cylinder-scroll";

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
  const [savedOnly,setSavedOnly]=useState(false);
  const [bookmarks,setBookmarks]=useState<Set<string>>(()=>readBookmarks());
  const toggleBookmark=useCallback((id:string)=>{
    setBookmarks(previous=>{
      const next=new Set(previous);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  },[]);
  useEffect(()=>{try{localStorage.setItem("verdant.bookmarks.v1",JSON.stringify([...bookmarks]));}catch{}},[bookmarks]);
  const [mode, setMode] = useState<StageMode>("waveform");
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [previewError, setPreviewError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { const unsubscribe = engine.subscribe(setPlayingId); return () => {unsubscribe();engine.stop();}; }, [engine]);
  const auditionVersion = useRef(0);
  const [decoded, setDecoded] = useState<DecodedSound | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  const categoryLabel = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const maxDuration = useMemo(() => Math.max(0.001, ...sounds.map((s) => s.duration)), [sounds]);
  const selected = useMemo(() => sounds.find((s) => s.id === selectedId) ?? null, [sounds, selectedId]);
  const filtered = useMemo(
    () => filterSounds(sounds, categoryLabel, category, query).filter(sound=>!savedOnly || bookmarks.has(sound.id)),
    [sounds, categoryLabel, category, query,savedOnly,bookmarks],
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
    if (index < 0) return;
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
      window.dispatchEvent(new Event("verdant:play"));
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
      audition(target.id);
      requestAnimationFrame(() =>
        revealCylinderRow(libraryRef.current, target.id),
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

  useEffect(() => { if (libraryRef.current) libraryRef.current.scrollTop = 0; }, [query, category,savedOnly]);

  const clearFilters = () => {
    setCategory("all");
    setQuery("");
    setSavedOnly(false);
  };

  const stageSound = decoded && decoded.id === selectedId ? decoded : null;

  const busy = selectedId !== null && pendingId === selectedId;
  const playing = selectedId !== null && playingId === selectedId;
  const currentIndex = filtered.findIndex(sound => sound.id === selectedId);
  return (
    <Shell context={`${fmtCount(sounds.length)} sounds · ${SAMPLE_RATE / 1000} kHz · ${catalog.bitDepth}-bit · mono`}
      pack={<a className="pill pack" href="/sounds/pack.zip" download="verdant-sounds.zip"><DownloadIcon /><span>Download all</span><small>{fmtBytes(catalog.totalBytes)}</small></a>}>
      <div className="workspace">
        <section className="preview" aria-label="Audio inspector" data-expanded={expanded}>
          <div className="preview-top">
            <div className="preview-meta"><span>{selected ? categoryLabel.get(selected.category) : "Preview"}</span><span>{selected ? fmtMs(selected.duration) : ""}</span></div>
            <div className="hero">
              <h1 className="hero-name" key={selectedId}>{selected?.name ?? "Select a sound"}</h1>
              {selected && <button type="button" className="pill icon-button hero-bookmark" aria-label={bookmarks.has(selected.id)?"Remove bookmark":"Bookmark sound"} aria-pressed={bookmarks.has(selected.id)} onClick={()=>toggleBookmark(selected.id)}><BookmarkIcon filled={bookmarks.has(selected.id)}/></button>}
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
            <VolumeControl value={volume} onChange={setVolume} />
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
        <section className="library" aria-label="Sound library">
          <div className="library-head">
            <div className="library-title"><h2>Sounds <span className="library-count">{fmtCount(filtered.length)}</span></h2><button type="button" className="pill saved-filter" aria-pressed={savedOnly} onClick={()=>setSavedOnly(v=>!v)}><BookmarkIcon filled={savedOnly}/><span>Saved</span><small>{bookmarks.size}</small></button></div>
            <div className="filters">
              <div className="search"><SearchIcon /><input ref={searchRef} type="search" placeholder="Search sounds" aria-label="Search sounds" value={query} onChange={e => {setQuery(e.target.value);}} />{query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => {setQuery("");searchRef.current?.focus();}}><ClearIcon /></button>}</div>
              <Dropdown label="Sound category" value={category} options={categoryOptions} onChange={value => {setCategory(value);}} />
            </div>
          </div>
          <div className="list-header" aria-hidden="true"><span>Name</span><span>Duration</span><span>Peak</span><span /><span /></div>
          <CylinderScroll viewportRef={libraryRef}>
            {filtered.length === 0 ? <StatePanel kind="empty" title={savedOnly?"No saved sounds match":"No matching sounds"} text={savedOnly?"Bookmark a sound or clear the filters.":"Try a different name or category."} action={{label:"Clear filters",onClick:clearFilters}} /> :
              <div className="sound-list">
                {filtered.map(sound => {
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
                    <button type="button" className="pill icon-button row-bookmark" aria-label={`${bookmarks.has(sound.id)?"Remove bookmark from":"Bookmark"} ${sound.name}`} aria-pressed={bookmarks.has(sound.id)} onClick={()=>toggleBookmark(sound.id)}><BookmarkIcon filled={bookmarks.has(sound.id)}/></button>
                    <a className="pill icon-button" href={downloadUrl(sound.id)} download aria-label={`Download ${sound.name}`}><DownloadIcon /></a>
                  </div>;
                })}
              </div>}
          </CylinderScroll>
          <div className="library-foot"><span>{fmtCount(filtered.length)} sounds</span><span>↑ ↓ Browse · Space to play / stop</span></div>
        </section>
      </div>
    </Shell>
  );
}

function readBookmarks(): Set<string> {
  try {
    const values:unknown=JSON.parse(localStorage.getItem("verdant.bookmarks.v1")??"[]");
    return new Set(Array.isArray(values)?values.filter((id):id is string=>typeof id==="string"):[]);
  } catch { return new Set(); }
}
function downloadUrl(id: string) { return `/sounds/${encodeURIComponent(id)}.wav`; }
function filterSounds(sounds: readonly SoundSummary[], labels: Map<CategoryId,string>, category: CategoryFilter, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sounds.filter(s => (category === "all" || s.category === category) &&
    terms.every(term => `${s.name} ${s.id} ${s.description} ${labels.get(s.category) ?? ""}`.toLowerCase().includes(term)));
}
function Shell({children,context,pack}: {children:ReactNode;context?:string;pack?:ReactNode}) {
  return <div className="shell"><header className="top"><div className="brand"><BrandMark /><span>Verdant</span></div><span className="context">{context ?? "Interface sounds"}</span>{pack}</header><main>{children}</main></div>;
}
function StatePanel({kind,title,text,action,level=2}: {kind:"loading"|"empty"|"error";title:string;text:string;action?:{label:string;onClick:()=>void};level?:1|2}) {
  const Heading = level === 1 ? "h1" : "h2";
  return <div className="state" role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading"}>{kind === "loading" && <span className="loading-bar" aria-hidden="true" />}<Heading>{title}</Heading>{text && <p>{text}</p>}{action && <button className="pill primary" type="button" onClick={action.onClick}>{action.label}<ArrowIcon /></button>}</div>;
}
