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
  memo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type MouseEvent,
} from "react";
import type { CatalogResponse, CategoryId, CategoryInfo, SoundSummary } from "../core/types";
import { SAMPLE_RATE } from "../core/types";
import { fetchCatalog } from "./api";
import { useAudition } from "./use-audition";
import { Landing } from "./landing";
import { DevicePreview, ThemePicker } from "./keyboard-preview";
import { loadModernKeyboard,isModern } from "./keyboard-theme";
import type { KeyboardTheme } from "../core/keyboard-themes";
import { AudioEngine } from "./audio";
import { AnimatedNumber, Dropdown, MicroBar, Segmented, type DropdownOption, type SegmentedOption } from "./controls";
import { fmtBytes, fmtCount, fmtDb, fmtMs } from "./format";
import {
  ArrowIcon,
  BookmarkIcon,
  StopIcon,
  ChevronIcon,
  ClearIcon,
  BrandMark,
  GitHubIcon,
  DownloadIcon,
  NextIcon,
  PlayIcon,
  PrevIcon,
  SearchIcon,
  SoundIcon,
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

const ROUTES = new Set(["/", "/library", "/studio", "/saved"]);
const currentUrl = () => location.pathname + location.search;

function useNavigation() {
  const [url, setUrl] = useState(currentUrl);
  useEffect(() => {
    const update = () => setUrl(currentUrl());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest("a");
    if (!link || link.hasAttribute("download") || link.target || link.origin !== location.origin || !ROUTES.has(link.pathname)) return;
    event.preventDefault();
    const next = link.pathname + link.search;
    if (next === currentUrl()) return;
    history.pushState(null, "", next);
    setUrl(next);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => document.getElementById("page-main")?.focus({preventScroll: true}));
  };
  return {url, navigate};
}

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export function App() {
  const {url, navigate} = useNavigation();
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

  const route = new URL(url, location.origin);
  const isStudio = route.pathname === "/studio";
  const isSaved = route.pathname === "/saved";
  const initialCategory = state.data.categories.find(item => item.id === route.searchParams.get("category"))?.id ?? "all";
  return <div onClick={navigate}>
    {route.pathname === "/"
      ? <Shell current="home"><Landing catalog={state.data} engine={engine} /></Shell>
      : <Workspace key={url} catalog={state.data} engine={engine} studio={isStudio} initialCategory={initialCategory} initialSaved={isSaved} />}
  </div>;
}

/* ------------------------------------------------------------------ */
/* Workspace                                                            */
/* ------------------------------------------------------------------ */

function Workspace({catalog, engine, studio, initialCategory, initialSaved}: {
  catalog: CatalogResponse;
  engine: AudioEngine;
  studio: boolean;
  initialCategory: CategoryFilter;
  initialSaved: boolean;
}) {
  const { sounds:baseSounds, categories } = catalog;
  const [theme,setTheme]=useState<KeyboardTheme>(()=>{try{return localStorage.getItem("verdant.keyboard-theme")==="classic"?"classic":"modern";}catch{return "modern";}});
  const [modern,setModern]=useState<readonly SoundSummary[]|null>(null);
  const [themeError,setThemeError]=useState(false);
  const [device,setDevice]=useState<"keyboard"|"mouse">(initialCategory==="pointer"?"mouse":"keyboard");
  useEffect(()=>{if(theme!=="modern"||modern)return;let current=true;setThemeError(false);void loadModernKeyboard(baseSounds).then(value=>{if(current)setModern(value);}).catch(()=>{if(current)setThemeError(true);});return()=>{current=false;};},[theme,modern,baseSounds]);
  const effectiveTheme:KeyboardTheme=theme==="modern"&&modern?"modern":"classic";
  const themeStatus=theme==="modern"&&!modern?(themeError?"Modern unavailable · Classic remains playable":"Loading Modern · Classic remains playable"):effectiveTheme==="modern"?"Modern · shared recorded clips":"Classic · recorded key strikes";
  const sounds=useMemo(()=>effectiveTheme==="modern"&&modern?[...baseSounds.filter(s=>s.category!=="keyboard"),...modern]:baseSounds,[effectiveTheme,modern,baseSounds]);

  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const bookmarkRef=useRef(bookmarks);
  const [selectedId, setSelectedId] = useState<string | null>(() => sounds.find(sound => (
    (initialCategory === "all" || sound.category === initialCategory) && (!initialSaved || bookmarks.has(sound.id))
  ))?.id ?? null);
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(initialSaved);
  const toggleBookmark=useCallback((id:string)=>{
    const next=new Set(bookmarkRef.current);
    if(next.has(id))next.delete(id);else next.add(id);
    bookmarkRef.current=next;
    // Persist before a route change can unmount this workspace.
    try{localStorage.setItem("verdant.bookmarks.v1",JSON.stringify([...next]));}catch{}
    setBookmarks(next);
  },[]);
  const [mode, setMode] = useState<StageMode>("waveform");
  const {playingId, pendingId, error: previewError, play, stop} = useAudition(engine);
  useEffect(()=>{stop();},[effectiveTheme,stop]);
  const [expanded, setExpanded] = useState(false);
  const chooseTheme=useCallback((next:KeyboardTheme)=>{stop();setTheme(next);try{localStorage.setItem("verdant.keyboard-theme",next);}catch{}},[stop]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  const categoryLabel = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const maxDuration = useMemo(() => Math.max(0.001, ...sounds.map((s) => s.duration)), [sounds]);
  const byId = useMemo(() => new Map(sounds.map(sound => [sound.id, sound])), [sounds]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const searchIndex = useMemo(() => new Map(sounds.map(sound => [
    sound.id, `${sound.name} ${sound.id} ${sound.description} ${categoryLabel.get(sound.category) ?? ""}`.toLowerCase(),
  ])), [sounds, categoryLabel]);
  const filtered = useMemo(
    () => filterSounds(sounds, searchIndex, category, query).filter(sound=>!savedOnly || bookmarks.has(sound.id)),
    [sounds, searchIndex, category, query,savedOnly,bookmarks],
  );

  useEffect(()=>{
    if(selectedId!==null&&filtered.some(sound=>sound.id===selectedId))return;
    const next=filtered[0]?.id??null;
    if(next!==selectedId){stop();setSelectedId(next);}
  },[filtered,selectedId,stop]);
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

  const audition = useCallback((id: string, fraction = 0) => {
    const sound = byId.get(id);
    if (!sound) return;
    setSelectedId(id);
    play(sound, fraction);
  }, [byId, play]);
  const replay = useCallback(() => {
    if (selectedId && (playingId === selectedId || pendingId === selectedId)) stop();
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
      requestAnimationFrame(() => revealCylinderRow(libraryRef.current, target.id));
    },
    [filtered, selectedId, audition],
  );

  // Keyboard: / search, Esc clear, ↑ ↓ browse, space replay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || !!target?.isContentEditable;

      if(target?.closest(".device-preview, .device-dialog"))return;
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
      if (target?.closest(".key-board, input, textarea, select, [aria-haspopup='listbox'], [role='radiogroup'], [role='slider']")) return;

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

  useEffect(() => { const viewport=libraryRef.current;if(viewport){viewport.scrollTop=0;const library=viewport.closest<HTMLElement>(".library");if(library&&getComputedStyle(library).overflowY==="auto")library.scrollTop=0;} }, [query, category,savedOnly]);

  const changeCategory = (value: CategoryFilter) => {
    setCategory(value);
    if(value==="pointer")setDevice("mouse");else if(value==="keyboard")setDevice("keyboard");
    const url = new URL(location.href);
    if (value === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", value);
    history.replaceState(history.state, "", url);

    const first = sounds.find(sound => (value === "all" || sound.category === value) && (!savedOnly || bookmarks.has(sound.id)));
    if (first && value !== "all" && selected?.category !== value) {
      stop();
      setSelectedId(first.id);
    }
  };

  const clearFilters = () => {
    changeCategory("all");
    setQuery("");
    if(savedOnly&&bookmarks.size===0){
      setSavedOnly(false);
      if(location.pathname==="/saved"){history.pushState(null,"","/library");window.dispatchEvent(new PopStateEvent("popstate"));}
    }
  };

  const busy = selectedId !== null && pendingId === selectedId;
  const playing = selectedId !== null && playingId === selectedId;
  const currentIndex = filtered.findIndex(sound => sound.id === selectedId);
  return (
    <Shell current={studio ? "studio" : "library"} context={`${fmtCount(baseSounds.length)} downloadable WAVs · ${SAMPLE_RATE / 1000} kHz · mono`}
      pack={<a className="pill pack" href="/sounds/pack.zip" download="verdant-sounds.zip"><DownloadIcon /><span>Download WAV pack</span><small>{fmtBytes(catalog.totalBytes)}</small></a>}>
      <div className="workspace" data-layout={studio ? "studio" : "dashboard"}>
        {!studio && <aside className="dashboard-sidebar" aria-label="Library navigation">
          <a className="dashboard-index" href="/library" aria-current={!savedOnly && category === "all" ? "page" : undefined}>Library <span>{fmtCount(sounds.length)}</span></a>
          <a className="dashboard-index" href="/saved" aria-current={savedOnly ? "page" : undefined}><BookmarkIcon /> Saved <span>{bookmarks.size}</span></a>
          <nav className="dashboard-categories" aria-label="Categories">
            {categoryOptions.slice(1).sort((a, b) => Number(b.value === "keyboard") - Number(a.value === "keyboard")).map(option => <button key={option.value} type="button" aria-pressed={category === option.value}
              onClick={() => changeCategory(category === option.value ? "all" : option.value)}>
              <SoundIcon kind={option.value as CategoryId} /><span>{option.value === "pointer" ? "Mouse" : option.value === "toggle" ? "Controls" : option.label}</span><small>{option.hint}</small>
            </button>)}
          </nav>
          <div className="dashboard-themes"><span>Keyboard themes</span><ThemePicker theme={theme} onTheme={next=>{chooseTheme(next);changeCategory("keyboard");}}/></div>
        </aside>}
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
          <SoundStage engine={engine} sound={selected} mode={mode} onSeek={fraction => { if (selectedId && selected?.waveform) audition(selectedId, fraction); }} />
          <div className="stage-footer"><span role="status">{previewError || (busy ? "Loading sound…" : playing ? "Playing" : selected ? "Ready" : "")}</span>{previewError && <button className="pill retry" onClick={replay}>Retry</button>}</div>
          <div className="transport">
            <nav className="dock" aria-label="Transport">
              <button className="pill icon-button" type="button" aria-label="Previous sound" disabled={!filtered.length || currentIndex === 0} onClick={() => step(-1)}><PrevIcon /></button>
              <button className="pill primary dock-play" type="button" disabled={!selected} onClick={replay}>{playing || busy ? <StopIcon /> : <PlayIcon />}<span>{playing || busy ? "Stop" : "Play"}</span></button>
              <button className="pill icon-button" type="button" aria-label="Next sound" disabled={!filtered.length || currentIndex === filtered.length - 1} onClick={() => step(1)}><NextIcon /></button>
            </nav>
            {selected && !isModern(selected) && !selected.importedMouse && <a className="pill icon-button current-download" aria-label="Download selected sound" href={downloadUrl(selected.id)} download><DownloadIcon /></a>}
            <VolumeControl engine={engine} />
          </div>
          <section className="details" aria-label="Source signal metrics">
            <dl>
              <div><dt>Peak</dt><dd>{selected ? <AnimatedNumber value={selected.peakDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>RMS</dt><dd>{selected ? <AnimatedNumber value={selected.rmsDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>Samples</dt><dd>{selected ? fmtCount(selected.samples) : "—"}</dd></div>
              <div><dt>{(isModern(selected)||selected?.importedMouse)?"Decoded PCM":"File size"}</dt><dd>{selected ? fmtBytes(selected.bytes) : "—"}</dd></div>
            </dl>
          </section>
          {!studio && selected && <div className="asset-details">
            <button type="button" className="pill" onClick={async () => {
              try {
                await navigator.clipboard.writeText(selected.id);
                setCopiedId(selected.id);
                setCopyError(false);
              } catch {
                setCopiedId(null);
                setCopyError(true);
              }
            }}>{copiedId === selected.id ? "Copied ID" : "Copy asset ID"}</button>
            {copyError && <span role="status">Clipboard unavailable</span>}
            <code>{selected.id}</code>
            {isModern(selected)&&<span>Custom Keyboard by remains · preview only</span>}
            {selected.importedMouse&&<span>{selected.importedMouse.author} · {selected.importedMouse.license==="personal-use-only"?"Personal use only":"License unverified"} · Preview only</span>}
            {selected.source && <a href={selected.source.url}>{selected.source.author} · {selected.source.license}</a>}
            {selected.review && <span>Listening review pending</span>}
          </div>}
        </section>
        <section className="library" aria-label="Sound library">
          <div className="library-head">
            {catalog.previewWarning&&<p className="imported-warning" role="status">{catalog.previewWarning}</p>}
            <div className="library-title"><h2>{savedOnly ? "Saved sounds" : studio ? "Sounds" : category === "all" ? "All sounds" : category === "pointer" ? "Mouse" : category === "toggle" ? "Controls" : categoryLabel.get(category)} <span className="library-count">{fmtCount(filtered.length)}</span></h2><button type="button" className="pill saved-filter" aria-pressed={savedOnly} onClick={()=>setSavedOnly(v=>!v)}><BookmarkIcon filled={savedOnly}/><span>Saved</span><small>{bookmarks.size}</small></button></div>
            <div className="filters">
              <div className="search"><SearchIcon /><input ref={searchRef} type="search" placeholder="Search sounds" aria-label="Search sounds" value={query} onChange={e => {setQuery(e.target.value);}} />{query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => {setQuery("");searchRef.current?.focus();}}><ClearIcon /></button>}</div>
              <Dropdown label="Sound category" value={category} options={categoryOptions} onChange={changeCategory} />
            </div>
            {(category==="all"||category==="keyboard"||category==="pointer")&&!savedOnly&&<DevicePreview sounds={sounds} engine={engine} theme={theme} effectiveTheme={effectiveTheme} themeStatus={themeStatus} onTheme={chooseTheme} device={device} onDevice={setDevice}/> }
          </div>
          <div className="list-header" aria-hidden="true"><span>Name</span><span>Duration</span><span>Peak</span><span /><span /></div>
          <SoundListViewport studio={studio} viewportRef={libraryRef}>
            {filtered.length === 0 ? <StatePanel kind="empty" title={savedOnly&&bookmarks.size===0?"No saved sounds yet":savedOnly?"No saved sounds match":"No matching sounds"} text={savedOnly&&bookmarks.size===0?"Save sounds from the library to find them here.":"Try a different name or category."} action={{label:savedOnly&&bookmarks.size===0?"Browse library":"Clear filters",onClick:clearFilters}} /> :
              <div className="sound-list">
                {filtered.map(sound=><SoundRow key={sound.id} sound={sound}
                  selected={sound.id===selectedId} active={playingId===sound.id} loading={pendingId===sound.id}
                  saved={bookmarks.has(sound.id)} categoryName={categoryLabel.get(sound.category)??""}
                  maxDuration={maxDuration} audition={audition} stop={stop} toggleBookmark={toggleBookmark}/>)}
              </div>}
          </SoundListViewport>
          <div className="library-foot"><span>{fmtCount(filtered.length)} sounds</span><span>↑ ↓ Browse · Space to play / stop</span></div>
        </section>
      </div>
    </Shell>
  );
}

/** Only the rows whose selection/play/bookmark state changes are rendered again. */
const SoundRow=memo(function SoundRow({sound,selected,active,loading,saved,categoryName,maxDuration,audition,stop,toggleBookmark}:{
  sound:SoundSummary;selected:boolean;active:boolean;loading:boolean;saved:boolean;categoryName:string;maxDuration:number;
  audition:(id:string)=>void;stop:()=>void;toggleBookmark:(id:string)=>void;
}){
  return <div className="sound-row" id={`row-${sound.id}`} data-selected={selected} data-playing={active} data-loading={loading}>
                    <button className="sound-select" type="button" aria-label={`${active || loading ? "Stop" : "Play"} ${sound.name}`} aria-pressed={selected} onClick={() => active || loading ? stop() : audition(sound.id)}>
                      <span className="row-play">{active || loading ? <StopIcon /> : <><SoundIcon className="row-glyph" kind={sound.category}/><PlayIcon className="row-trigger"/></>}</span>
                      <span className="sound-text"><span>{sound.name}</span><small>{loading ? "Loading…" : active ? "Playing" : categoryName}</small></span>
                    </button>
                    <div className="duration"><MicroBar ratio={sound.duration / maxDuration} /><span>{fmtMs(sound.duration)}</span></div>
                    <span className="peak">{fmtDb(sound.peakDb)}</span>
                    <button type="button" className="pill icon-button row-bookmark" aria-label={`${saved?"Remove bookmark from":"Bookmark"} ${sound.name}`} aria-pressed={saved} onClick={()=>toggleBookmark(sound.id)}><BookmarkIcon filled={saved}/></button>
                    {(isModern(sound)||sound.importedMouse)?<span className="pill icon-button device-download-disabled" title="Imported recording is preview only" aria-label="Preview only"><DownloadIcon/></span>:<a className="pill icon-button" href={downloadUrl(sound.id)} download aria-label={`Download ${sound.name}`}><DownloadIcon /></a>}
                  </div>;
});

function readBookmarks(): Set<string> {
  try {
    const values:unknown=JSON.parse(localStorage.getItem("verdant.bookmarks.v1")??"[]");
    return new Set(Array.isArray(values)?values.filter((id):id is string=>typeof id==="string"):[]);
  } catch { return new Set(); }
}
function downloadUrl(id: string) { return `/sounds/${encodeURIComponent(id)}.wav`; }
function filterSounds(sounds: readonly SoundSummary[], index: Map<string,string>, category: CategoryFilter, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sounds.filter(s => (category === "all" || s.category === category) &&
    terms.every(term => index.get(s.id)?.includes(term)));
}

function SoundListViewport({children, studio, viewportRef}: {
  children: ReactNode;
  studio: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  return studio
    ? <CylinderScroll viewportRef={viewportRef}>{children}</CylinderScroll>
    : <div className="library-scroll" ref={viewportRef} tabIndex={0} aria-label="Browse sounds">{children}</div>;
}

function Shell({children, context, pack, current}: {children: ReactNode; context?: string; pack?: ReactNode; current?: "home" | "library" | "studio"}) {
  return <div className={`shell ${current === "home" ? "site-home" : ""}`}>
    <header className="top">
      <a href="/" className="brand" aria-label="Verdant home"><BrandMark /><span>Verdant</span></a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/library" aria-current={current === "library" ? "page" : undefined}>Library</a>
        <a href="/studio" aria-current={current === "studio" ? "page" : undefined}>Studio</a>
      </nav>
      {context && <span className="context">{context}</span>}
      {pack}
      {current === "home" && <a className="home-repo" href="https://github.com/duggal1/Sound-Library"><GitHubIcon /> GitHub</a>}
    </header>
    <main id="page-main" tabIndex={-1}>{children}</main>
  </div>;
}

function StatePanel({kind,title,text,action,level=2}: {kind:"loading"|"empty"|"error";title:string;text:string;action?:{label:string;onClick:()=>void};level?:1|2}) {
  const Heading = level === 1 ? "h1" : "h2";
  return <div className="state" role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading"}>{kind === "loading" && <span className="loading-bar" aria-hidden="true" />}<Heading>{title}</Heading>{text && <p>{text}</p>}{action && <button className="pill primary" type="button" onClick={action.onClick}>{action.label}<ArrowIcon /></button>}</div>;
}
