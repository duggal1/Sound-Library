import type { AudioEngine } from "./audio";
import { fmtMs } from "./format";

export type StageMode = "waveform" | "scope";

const PITCH = 2; // waveform sampling interval
const CELL = 2; // edge clearance
const GUTTER_L = 56;
const GUTTER_R = 8;
const PAD_T = 14;
const GUTTER_B = 30;
const MORPH_TAU = 0.085; // seconds; ~380 ms to settle, no overshoot
const SCOPE_TAIL = 0.15; // keep drawing after playback so the trace settles to flat
const LABEL_FONT = '12px "Instrument Sans", -apple-system, sans-serif';
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

function resample(src: Float32Array, n: number): Float32Array {
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

  private pcm: Float32Array | null = null;
  private peak = 1;
  private duration = 0;
  private mode: StageMode = "waveform";

  private cols = 0;
  private targetMax = new Float32Array(0);
  private targetMin = new Float32Array(0);
  private shownMax = new Float32Array(0);
  private shownMin = new Float32Array(0);
  private scopeBuf = new Float32Array(0);

  private pointerX: number | null = null;
  private raf = 0;
  private last = 0;
  private destroyed = false;

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

  setSound(pcm: Float32Array | null, sampleRate: number): void {
    this.pcm = pcm;
    this.duration = pcm ? pcm.length / sampleRate : 0;
    let peak = 0;
    if (pcm) {
      for (let i = 0; i < pcm.length; i++) {
        const a = Math.abs(pcm[i]);
        if (a > peak) peak = a;
      }
    }
    this.peak = Math.max(peak, 1e-6);
    this.computeTargets();
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
    this.pointerX = e.clientX - this.canvas.getBoundingClientRect().left;
    this.requestFrame();
  };

  private readonly onPointerLeave = () => {
    this.pointerX = null;
    this.requestFrame();
  };

  refresh(): void { this.requestFrame(); }

  private requestFrame(): void {
    if (this.destroyed || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;

    const morphing = this.step(dt);
    const live = this.engine.isActive(this.mode === "scope" ? SCOPE_TAIL : 0);
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
      this.cols = cols;
    }
    this.computeTargets();
  }

  /** Min/max per column, normalised to the sound's own peak. */
  private computeTargets(): void {
    const pcm = this.pcm;
    if (!pcm || pcm.length === 0) {
      this.targetMax.fill(0);
      this.targetMin.fill(0);
      return;
    }
    const n = pcm.length;
    for (let c = 0; c < this.cols; c++) {
      const from = Math.floor((c * n) / this.cols);
      const to = Math.max(from + 1, Math.floor(((c + 1) * n) / this.cols));
      let hi = 0;
      let lo = 0;
      for (let i = from; i < to && i < n; i++) {
        const v = pcm[i];
        if (v > hi) hi = v;
        if (v < lo) lo = v;
      }
      this.targetMax[c] = hi / this.peak;
      this.targetMin[c] = lo / this.peak;
    }
  }

  /** Animates the delta toward the new sound instead of redrawing from nothing. */
  private step(dt: number): boolean {
    const k = this.motion.matches ? 1 : 1 - Math.exp(-dt / MORPH_TAU);
    let moving = false;
    for (let i = 0; i < this.cols; i++) {
      const dMax = this.targetMax[i] - this.shownMax[i];
      const dMin = this.targetMin[i] - this.shownMin[i];
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
    const reach = p.halfRows * PITCH;
    const peakText = this.peak.toFixed(2);

    ctx.save();
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.setLineDash([1, 4]);
    for (const y of [p.mid - reach, p.mid, p.mid + reach]) {
      const yy = Math.round(y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p.left, yy);
      ctx.lineTo(p.right, yy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.font = LABEL_FONT;
    ctx.fillStyle = palette.quiet;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${peakText}`, p.left - 12, p.mid - reach);
    ctx.fillText("0", p.left - 12, p.mid);
    ctx.fillText(`${MINUS}${peakText}`, p.left - 12, p.mid + reach);
    ctx.restore();
  }

  private drawWaveform(p: Plot): void {
    const { ctx, palette } = this;
    const progress = this.engine.progress();

    const reach = p.halfRows * PITCH;
    const outline = new Path2D();
    for (let c = 0; c < p.cols; c++) {
      const x = p.left + c / Math.max(1,p.cols - 1) * p.gridW;
      const y = p.mid - this.shownMax[c] * reach;
      if (c === 0) outline.moveTo(x,y); else outline.lineTo(x,y);
    }
    for (let c = p.cols - 1; c >= 0; c--) {
      outline.lineTo(p.left + c / Math.max(1,p.cols - 1) * p.gridW, p.mid - this.shownMin[c] * reach);
    }
    outline.closePath();
    ctx.fillStyle = progress === null ? palette.accent : palette.soft;
    ctx.fill(outline);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.8;
    ctx.stroke(outline);
    if (progress !== null) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.left,p.top,p.gridW * progress,p.bottom - p.top);
      ctx.clip();
      ctx.fillStyle = palette.accent;
      ctx.fill(outline);
      ctx.restore();
    }

    if (progress !== null) {
      const x = Math.round(p.left + progress * p.gridW) + 0.5;
      ctx.save();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.moveTo(x, p.top);
      ctx.lineTo(x, p.bottom);
      ctx.stroke();
      ctx.restore();
    }

    if (this.pointerX !== null && this.pcm) this.drawHover(p);
  }

  private drawHover(p: Plot): void {
    const { ctx, palette } = this;
    const px = this.pointerX;
    if (px === null || px < p.left || px > p.right) return;

    const c = Math.min(p.cols - 1, Math.max(0, Math.floor((px - p.left) / PITCH)));
    const x = Math.round(p.left + c * PITCH + PITCH / 2) + 0.5;
    const t = ((c + 0.5) / p.cols) * this.duration;
    const level = Math.max(this.shownMax[c], -this.shownMin[c]) * this.peak;

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

    const text = `${fmtMs(t)}  ·  ${level.toFixed(2)}`;
    ctx.save();
    ctx.font = LABEL_FONT;
    const w = ctx.measureText(text).width + 20;
    const bx = Math.min(p.right - w, Math.max(p.left, x - w / 2));
    ctx.fillStyle = "rgba(0,0,0,.84)";
    ctx.beginPath();
    ctx.roundRect(bx, p.top + 4, w, 26, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
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
    const reach = p.halfRows * PITCH;
    let endY = p.mid;

    ctx.save();
    ctx.beginPath();
    for (let px = 0; px < p.gridW; px++) {
      const from = Math.floor((px / p.gridW) * n);
      const to = Math.min(n, Math.max(from + 1, Math.floor(((px + 1) / p.gridW) * n)));
      let v = 0;
      for (let i = from; i < to; i++) if (Math.abs(buf[i]) > Math.abs(v)) v = buf[i];
      const y = p.mid - Math.max(-1.15, Math.min(1.15, v / this.peak)) * reach;
      if (px === 0) ctx.moveTo(p.left, y);
      else ctx.lineTo(p.left + px, y);
      endY = y;
    }
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(p.right - 1, endY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawAxis(p: Plot): void {
    const { ctx, palette } = this;
    let labels: string[];
    if (this.mode === "waveform") {
      labels = [0, 1 / 3, 2 / 3, 1].map((f) => fmtMs(f * this.duration));
    } else {
      const windowMs = Math.round(((this.scopeBuf.length || 4096) / this.engine.sampleRate) * 1000);
      labels = [`${MINUS}${windowMs} ms`, `${MINUS}${Math.round((windowMs * 2) / 3)} ms`, `${MINUS}${Math.round(windowMs / 3)} ms`, "now"];
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
