import type { AudioEngine } from "./audio";
import { decodeWaveform } from "../core/waveform";
import { fmtMs } from "./format";

export type StageMode = "waveform" | "scope";

const PITCH = 4; // optical spacing, independent of device pixel ratio
const CELL = 2.8;
const GUTTER_L = 8;
const GUTTER_R = 8;
const PAD_T = 22;
const GUTTER_B = 32;
const MORPH_TAU = 0.085; // seconds; ~380 ms to settle, no overshoot
const SCOPE_TAIL = 0.15; // keep drawing after playback so the trace settles to flat
const LABEL_FONT = '12px "Open Sans", -apple-system, sans-serif';
const WAVE_COLORS={rail:"#e7e5e4",soft:"#bbf7d0",base:"#22c55e",strong:"#16a34a",peak:"#15803d",glow:"rgba(34,197,94,.12)"} as const;
const MINUS = "\u2212";

interface Palette {
  accent: string;
  soft: string;
  ink: string;
  quiet: string;
  grid: string;
}

interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
  mid: number;
  halfRows: number;
  cols: number;
  gridW: number;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    accent: get("--accent", "#16a34a"),
    soft: get("--soft", "#86efac"),
    ink: get("--ink", "#000"),
    quiet: get("--quiet", "#737373"),
    grid: get("--grid", "#c9c9c9"),
  };
}

function resample(src: Float32Array, n: number) {
  const out = new Float32Array(n);
  if (src.length === 0) return out;
  for (let i = 0; i < n; i++) out[i] = src[Math.min(src.length - 1, Math.floor((i * src.length) / n))];
  return out;
}

/**
 * Canvas renderer. Owns its own rAF loop and only runs it while something is
 * moving (playback, morph, hover), so an idle page costs nothing.
 */
export class StageRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private readonly motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly palette = readPalette();

  private width = 0;
  private height = 0;
  private dpr = 1;

  private waveform: Float32Array | null = null;
  private duration = 0;
  private peak = 0;
  private mode: StageMode = "waveform";

  private cols = 0;
  private targetMax = new Float32Array(0);
  private targetMin = new Float32Array(0);
  private targetRms = new Float32Array(0);
  private shownRms = new Float32Array(0);
  private shownMax = new Float32Array(0);
  private shownMin = new Float32Array(0);
  private scopeBuf = new Float32Array(0);

  private pointerX: number | null = null;
  private raf = 0;
  private last = 0;
  private destroyed = false;
  private waveformPaths: {peaks:Path2D;energy:Path2D}|null=null;
  private morphDirty=true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly engine: AudioEngine,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas is not available");
    this.ctx = ctx;

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    void document.fonts?.ready.then(() => this.requestFrame());

    this.resize();
  }

  setSound(encoded: string | undefined, duration: number, peak: number): void {
    this.waveform = encoded ? decodeWaveform(encoded) : null;
    this.duration = duration;
    this.peak = peak;
    this.morphDirty = true;
    this.waveformPaths = null;
    this.computeTargets();
    this.pointerX = null;
    this.requestFrame();
  }

  setMode(mode: StageMode): void {
    this.mode = mode;
    this.requestFrame();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
  }

  /* ---------------------------------------------------------------- */

  private readonly onPointerMove = (e: PointerEvent) => {
    const p = this.plot();
    this.pointerX = Math.max(p.left,Math.min(p.right,e.clientX - this.canvas.getBoundingClientRect().left));
    this.requestFrame();
  };

  private readonly onPointerLeave = () => {
    this.pointerX = null;
    this.requestFrame();
  };

  fractionAt(clientX: number): number { const p = this.plot(); return Math.max(0, Math.min(1, (clientX - this.canvas.getBoundingClientRect().left - p.left) / p.gridW)); }
  inspect(fraction: number | null): void { const p = this.plot(); this.pointerX = fraction === null ? null : p.left + fraction * p.gridW; this.requestFrame(); }
  refresh(): void { this.requestFrame(); }

  private requestFrame(): void {
    if (this.destroyed || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;

    const morphing = this.morphDirty && this.step(dt);
    if(this.morphDirty)this.waveformPaths=null;
    this.morphDirty=morphing;
    const live = this.engine.isActive(this.mode === "scope" ? SCOPE_TAIL : 0.12) || this.engine.progress() !== null;
    this.draw();

    if (morphing || live) this.requestFrame();
    else this.last = 0;
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (w === this.width && h === this.height && dpr === this.dpr) return;

    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.rebuild();
    this.morphDirty=true;this.waveformPaths=null;
    this.requestFrame();
  }

  private plot(): Plot {
    const left = GUTTER_L;
    const top = PAD_T;
    const bottom = Math.max(top + PITCH * 3, this.height - GUTTER_B);
    const h = bottom - top;
    const cols = Math.max(1, Math.floor((this.width - GUTTER_L - GUTTER_R) / PITCH));
    const gridW = cols * PITCH;
    return {
      left,
      right: left + gridW,
      top,
      bottom,
      mid: top + h / 2,
      halfRows: Math.max(1, Math.floor((h / 2 - CELL / 2) / PITCH)),
      cols,
      gridW,
    };
  }

  private rebuild(): void {
    const { cols } = this.plot();
    if (cols !== this.cols) {
      this.shownMax = resample(this.shownMax, cols);
      this.shownMin = resample(this.shownMin, cols);
      this.targetMax = new Float32Array(cols);
      this.targetMin = new Float32Array(cols);
      this.targetRms = new Float32Array(cols);
      this.shownRms = resample(this.shownRms,cols);
      this.cols = cols;
    }
    this.computeTargets();
  }

  /** Min/max per column, normalised to the sound's own peak. */
  private computeTargets(): void {
    const waveform = this.waveform;
    if (!waveform?.length) {
      this.targetMax.fill(0);
      this.targetMin.fill(0);
      this.targetRms.fill(0);
      return;
    }
    const bins = waveform.length / 3;
    for (let c = 0; c < this.cols; c++) {
      const from = Math.floor(c * bins / this.cols);
      const to = Math.max(from + 1, Math.floor((c + 1) * bins / this.cols));
      let low = 0;
      let high = 0;
      let rms = 0;
      for (let bin = from; bin < to; bin++) {
        low = Math.max(low, waveform[bin * 3]);
        high = Math.max(high, waveform[bin * 3 + 1]);
        rms += waveform[bin * 3 + 2];
      }
      this.targetMin[c] = -low;
      this.targetMax[c] = high;
      this.targetRms[c] = rms / (to - from);
    }
  }

  /** Animates the delta toward the new sound instead of redrawing from nothing. */
  private step(dt: number): boolean {
    const k = this.motion.matches ? 1 : 1 - Math.exp(-dt / MORPH_TAU);
    let moving = false;
    for (let i = 0; i < this.cols; i++) {
      const dMax = this.targetMax[i] - this.shownMax[i];
      const dMin = this.targetMin[i] - this.shownMin[i];
      const dRms = this.targetRms[i] - this.shownRms[i];
      if(Math.abs(dRms)<.002)this.shownRms[i]=this.targetRms[i];else{this.shownRms[i]+=dRms*k;moving=true;}
      if (Math.abs(dMax) < 0.002) this.shownMax[i] = this.targetMax[i];
      else {
        this.shownMax[i] += dMax * k;
        moving = true;
      }
      if (Math.abs(dMin) < 0.002) this.shownMin[i] = this.targetMin[i];
      else {
        this.shownMin[i] += dMin * k;
        moving = true;
      }
    }
    return moving;
  }

  /* ---------------------------------------------------------------- */

  private draw(): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    const plot = this.plot();
    this.drawGrid(plot);
    if (this.mode === "waveform") this.drawWaveform(plot);
    else this.drawScope(plot);
    this.drawAxis(plot);
  }

  private drawGrid(p: Plot): void {
    const { ctx, palette } = this;
    // A quiet zero line, not an oscilloscope graticule.
    ctx.save();
    ctx.strokeStyle = WAVE_COLORS.rail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.left, p.mid);
    ctx.lineTo(p.right, p.mid);
    ctx.stroke();
    ctx.restore();
  }

  private drawWaveform(p: Plot): void {
    const { ctx } = this;
    if (!this.waveform) return;
    const progress = this.engine.progress();
    const reach = (p.bottom - p.top) * 0.42;
    if(!this.waveformPaths){
      const peaks = new Path2D(), energy = new Path2D();
      for (let c=0;c<p.cols;c++){
        const x=p.left+(c+.5)*PITCH;
        const hi=this.shownMax[c]*reach,lo=-this.shownMin[c]*reach,rms=this.shownRms[c]*reach;
        const cap=(path:Path2D,upper:number,lower:number,width:number)=>{
          const height=upper+lower;
          if(height<1.2){path.moveTo(x+width/2,p.mid);path.arc(x,p.mid,width/2,0,Math.PI*2);}
          else path.roundRect(x-width/2,p.mid-upper-width/2,width,height+width,width/2);
        };
        cap(peaks,hi,lo,3.1);
        cap(energy,Math.min(hi,rms),Math.min(lo,rms),2.45);
      }
      this.waveformPaths={peaks,energy};
    }
    const {peaks,energy}=this.waveformPaths;
    ctx.save();
    ctx.lineCap = "round";
    const drawInk=(played:boolean)=>{
      ctx.fillStyle=played?"#4ade80":WAVE_COLORS.soft;ctx.fill(peaks);
      ctx.fillStyle=played?WAVE_COLORS.peak:WAVE_COLORS.base;ctx.fill(energy);
    };
    drawInk(false);
    if(progress !== null){ctx.save();ctx.beginPath();ctx.rect(p.left,p.top,p.gridW*progress,p.bottom-p.top);ctx.clip();drawInk(true);ctx.restore();}
    if (progress !== null) {
      const x = p.left + progress * p.gridW;
      ctx.strokeStyle = WAVE_COLORS.strong;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, p.top + 4);
      ctx.lineTo(x, p.bottom - 4);
      ctx.stroke();
      ctx.fillStyle = WAVE_COLORS.strong;
      ctx.beginPath();
      ctx.arc(x,p.top+3,3,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    if (this.pointerX !== null && this.waveform) this.drawHover(p);
  }

  private drawHover(p: Plot): void {
    const { ctx, palette } = this;
    const px = this.pointerX;
    if (px === null || px < p.left || px > p.right) return;

    const c = Math.min(p.cols - 1, Math.max(0, Math.floor((px - p.left) / PITCH)));
    const x = Math.round(p.left + c * PITCH + PITCH / 2) + 0.5;
    const t = ((c + 0.5) / p.cols) * this.duration;
    const level = Math.max(this.targetMax[c], -this.targetMin[c]) * this.peak;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 3]);
    ctx.beginPath();
    ctx.moveTo(x, p.top);
    ctx.lineTo(x, p.bottom);
    ctx.stroke();
    ctx.restore();

    const text = `${fmtMs(t)}  ·  ${level > 0 ? (20 * Math.log10(level)).toFixed(1) + " dBFS" : "−∞ dBFS"}`;
    ctx.save();
    ctx.font = LABEL_FONT;
    const w = ctx.measureText(text).width + 20;
    const bx = Math.min(p.right - w, Math.max(p.left, x - w / 2));
    // Keep the measurement, not the intrusive black floating pill.
    ctx.fillStyle = palette.quiet;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + 10, p.top + 17);
    ctx.restore();
  }

  private drawScope(p: Plot): void {
    const { ctx, palette } = this;
    const analyser = this.engine.analyser;
    const n = analyser?.fftSize ?? 4096;
    if (this.scopeBuf.length !== n) this.scopeBuf = new Float32Array(n);
    if (analyser) analyser.getFloatTimeDomainData(this.scopeBuf);
    else this.scopeBuf.fill(0);

    const buf = this.scopeBuf;
    const reach = (p.bottom - p.top) * 0.42;
    // Plot actual time-domain samples in order; avoid signed-peak aliasing.
    ctx.save();
    ctx.beginPath();
    const count = Math.max(2, buf.length);
    for (let i = 0; i < buf.length; i++) {
      const x = p.left + i / (count - 1) * p.gridW;
      const y = p.mid - Math.max(-1, Math.min(1, buf[i])) * reach;
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.lineJoin="round";ctx.lineCap="round";
    ctx.strokeStyle=WAVE_COLORS.glow;ctx.lineWidth=4.5;ctx.stroke();
    ctx.strokeStyle=WAVE_COLORS.base;ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle=WAVE_COLORS.strong;ctx.lineWidth=.85;ctx.stroke();
    ctx.restore();
  }

  private drawAxis(p: Plot): void {
    const { ctx, palette } = this;
    let labels: string[];
    if (this.mode === "waveform") {
      labels = this.waveform ? [0, 0.5, 1].map((f) => fmtMs(f * this.duration)) : ["", "", ""];
    } else {
      const windowMs = Math.round(((this.scopeBuf.length || 4096) / this.engine.sampleRate) * 1000);
      labels = [`${MINUS}${windowMs} ms`, `${MINUS}${Math.round(windowMs / 2)} ms`, "now"];
    }

    ctx.save();
    ctx.font = LABEL_FONT;
    ctx.fillStyle = palette.quiet;
    ctx.textBaseline = "top";
    labels.forEach((text, i) => {
      ctx.textAlign = i === 0 ? "left" : i === labels.length - 1 ? "right" : "center";
      ctx.fillText(text, p.left + (i / (labels.length - 1)) * p.gridW, p.bottom + 10);
    });
    ctx.restore();
  }
}
