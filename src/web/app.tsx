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
import { fetchCatalog, loadSound, type DecodedSound } from "./api";
import { AudioEngine } from "./audio";
import { AnimatedNumber, Dropdown, MicroBar, Segmented, type DropdownOption, type SegmentedOption } from "./controls";
import { fmtBytes, fmtCount, fmtDb, fmtMs, fmtMsRounded } from "./format";
import {
  ArrowIcon,
  ArchiveIcon,
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
          text=""
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
          text=""
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
  const [volume, setVolume] = useState(0.8);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [previewError, setPreviewError] = useState("");
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

  // Decode the selected WAV for the stage; warm everything else in the background.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setPreviewError("");
    loadSound(selectedId).then(
      (d) => !cancelled && setDecoded(d),
      () => {if (!cancelled) {setDecoded(null);setPreviewError("Could not load waveform. Play to retry.");}},
    );
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    for (const s of sounds) void loadSound(s.id).catch(() => {});
  }, [sounds]);

  useEffect(() => engine.setVolume(volume), [engine, volume]);

  const audition = useCallback(
    (id: string) => {
      const version = ++auditionVersion.current;
      setSelectedId(id);
      setPreviewError("");
      try { engine.unlock(); } catch { setPreviewError("Audio is unavailable in this browser."); return; }
      void loadSound(id).then(async d => {
        if (version !== auditionVersion.current) return;
        setDecoded(d);
        await engine.play(d);
        if (version === auditionVersion.current) window.dispatchEvent(new Event("verdant:play"));
      }).catch(() => {if (version === auditionVersion.current) setPreviewError("Playback failed. Try again.");});
    },
    [engine],
  );

  const replay = useCallback(() => {
    if (selectedId) audition(selectedId);
  }, [audition, selectedId]);

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
      if (target?.closest("input, textarea, select, [aria-haspopup='listbox'], [role='radiogroup']")) return;

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

  const dock = (
    <nav className="dock" aria-label="Transport">
      <button type="button" aria-label="Previous sound" disabled={filtered.length === 0 || selectedId === filtered[0]?.id} onClick={() => step(-1)}>
        <PrevIcon />
      </button>
      <button type="button" className="dock-play" disabled={!selected} onClick={replay}>
        <PlayIcon />
        <span>Play</span>
      </button>
      <button type="button" aria-label="Next sound" disabled={filtered.length === 0 || selectedId === filtered[filtered.length - 1]?.id} onClick={() => step(1)}>
        <NextIcon />
      </button>
    </nav>
  );

  return (
    <Shell
      context={`${fmtCount(sounds.length)} sounds · ${SAMPLE_RATE / 1000} kHz · ${catalog.bitDepth}-bit · mono`}
    >
      <div className="overview">
        {/* ----------------------------- hero + stage ----------------------------- */}
        <section className="hero-block" aria-label="Preview">
          {selected && (
            <div className="hero swap" key={selected.id}>
              <div className="hero-label">{categoryLabel.get(selected.category)}</div>
              <h1 className="hero-name">{selected.name}</h1>
              <p className="hero-caption">
                {selected.description}
              </p>
            </div>
          )}

          <div className="stage-bar">
            <Segmented label="Visualisation" value={mode} options={MODES} onChange={setMode} />
            <div className="stage-actions">
              {dock}
              {selected && <a className="pill icon-button" aria-label="Download selected sound" href={downloadUrl(selected.id)} download><DownloadIcon /></a>}
            </div>
          </div>
          <SoundStage engine={engine} sound={stageSound} mode={mode} />
          <div className="stage-footer">
            <span role="status">{previewError || (stageSound ? "" : "Loading waveform…")}</span>
            <label className="volume"><VolumeIcon /> <input aria-label="Playback volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} /><span>{Math.round(volume * 100)}%</span></label>
          </div>
        </section>
        <aside className="inspector" aria-label="Sound details">
          <div className="details">
            <h2>Signal</h2>
            <dl>
              <div><dt>Duration</dt><dd>{selected ? <AnimatedNumber value={selected.duration * 1000} format={fmtMsRounded} /> : "—"}</dd></div>
              <div><dt>Peak</dt><dd>{selected ? <AnimatedNumber value={selected.peakDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>RMS</dt><dd>{selected ? <AnimatedNumber value={selected.rmsDb} format={fmtDb} /> : "—"}</dd></div>
              <div><dt>Samples</dt><dd>{selected ? fmtCount(selected.samples) : "—"}</dd></div>
              <div><dt>File size</dt><dd>{selected ? fmtBytes(selected.bytes) : "—"}</dd></div>
            </dl>
          </div>
          <section className="export">
            <div className="export-heading"><ArchiveIcon /><span>Complete pack</span></div>
            <h2>{fmtCount(sounds.length)} sounds</h2>
            <p>{fmtBytes(catalog.totalBytes)} · WAV / ZIP</p>
            <a className="pill primary" href="/sounds/pack.zip" download="verdant-sounds.zip">Download all <DownloadIcon /></a>
          </section>
        </aside>
      </div>
      <section className="library" aria-label="Sound library">
        <div className="library-head">
          <div><h2>Library <span className="library-count">{fmtCount(filtered.length)}</span></h2></div>
          <div className="filters">
            <label className="search"><SearchIcon /><input ref={searchRef} type="search" placeholder="Search sounds" aria-label="Search sounds" value={query} onChange={e => {setQuery(e.target.value);setShown(PAGE_SIZE);}} />{query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => {setQuery("");setShown(PAGE_SIZE);searchRef.current?.focus();}}><ClearIcon /></button>}</label>
            <Dropdown label="Sound category" value={category} options={categoryOptions} onChange={value => {setCategory(value);setShown(PAGE_SIZE);}} />
          </div>
        </div>
        {filtered.length === 0 ? <StatePanel kind="empty" title="No matching sounds" text="Try a different name or category." action={{label:"Clear filters",onClick:clearFilters}} /> :
          <div className="sound-list">
            <div className="list-header" aria-hidden="true"><span>Sound</span><span>Duration</span><span>Peak</span><span>File</span></div>
            {rows.map(sound => <div className="sound-row" id={`row-${sound.id}`} key={sound.id} data-selected={sound.id === selectedId}>
              <button className="sound-select" type="button" aria-label={`Play ${sound.name}`} aria-pressed={sound.id === selectedId} onClick={() => audition(sound.id)}>
                <span className="row-play"><PlayIcon /></span><span className="sound-text"><span>{sound.name}</span><small>{categoryLabel.get(sound.category)}</small></span>
              </button>
              <div className="duration"><MicroBar ratio={sound.duration / maxDuration} /><span>{fmtMs(sound.duration)}</span></div>
              <span className="peak">{fmtDb(sound.peakDb)}</span>
              <a className="pill icon-button" href={downloadUrl(sound.id)} download aria-label={`Download ${sound.name}`}><DownloadIcon /></a>
            </div>)}
          </div>}
        {rows.length < filtered.length && <button className="pill more" type="button" onClick={() => setShown(n => n + PAGE_SIZE)}>Show more <ArrowIcon /></button>}
      </section>
    </Shell>
  );
}
function downloadUrl(id: string) { return `/sounds/${encodeURIComponent(id)}.wav`; }
function filterSounds(sounds: readonly SoundSummary[], labels: Map<CategoryId,string>, category: CategoryFilter, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return sounds.filter(s => (category === "all" || s.category === category) &&
    terms.every(term => `${s.name} ${s.id} ${s.description} ${labels.get(s.category) ?? ""}`.toLowerCase().includes(term)));
}
function SoundStage({engine,sound,mode}: {engine:AudioEngine;sound:DecodedSound|null;mode:StageMode}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<StageRenderer|null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const stage = new StageRenderer(canvas.current,engine);
    renderer.current = stage;
    const wake = () => stage.refresh();
    window.addEventListener("verdant:play",wake);
    return () => {window.removeEventListener("verdant:play",wake);stage.destroy();renderer.current=null;};
  },[engine]);
  useEffect(() => {renderer.current?.setSound(sound?.samples ?? null,sound?.sampleRate ?? SAMPLE_RATE);},[sound]);
  useEffect(() => {renderer.current?.setMode(mode);},[mode]);
  return <div className="stage"><canvas ref={canvas} role="img" aria-label={mode === "scope" ? "Live audio oscilloscope" : "Sound amplitude over time"} /></div>;
}
function Shell({children,context}: {children:ReactNode;context?:string}) {
  return <><header className="top"><div className="brand"><BrandMark /><span>Verdant</span></div><span className="context">{context ?? "Interface sounds"}</span></header><main>{children}</main><footer><span>Verdant</span><span>Synthesized audio</span></footer></>;
}
function StatePanel({kind,title,text,action,level=2}: {kind:"loading"|"empty"|"error";title:string;text:string;action?:{label:string;onClick:()=>void};level?:1|2}) {
  const Heading = level === 1 ? "h1" : "h2";
  return <div className="state" role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading"}><BrandMark className={kind === "loading" ? "loading-mark" : ""}/><Heading>{title}</Heading>{text && <p>{text}</p>}{action && <button className="pill primary" type="button" onClick={action.onClick}>{action.label}<ArrowIcon /></button>}</div>;
}
