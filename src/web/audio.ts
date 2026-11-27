import { SAMPLE_RATE } from "../core/types";

export const DEFAULT_VOLUME = 1.1;

interface Playable {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private input: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private volume = DEFAULT_VOLUME;
  private activeSource: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private duration = 0;
  private readonly buffers = new WeakMap<Float32Array, AudioBuffer>();

  /** Taps the signal before the volume knob, so the scope doesn't shrink when you turn it down. */
  get analyser(): AnalyserNode | null {
    return this.input;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? SAMPLE_RATE;
  }

  /** Call synchronously inside a user gesture. Safari needs resume() in the same tick. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
  }

  setVolume(value: number): void {
    this.volume = Math.min(DEFAULT_VOLUME, Math.max(0, value));
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.015);
    }
  }

  async play(sound: Playable, isCurrent: () => boolean = () => true): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    if (!isCurrent()) return;
    const input = this.input;
    if (!input || ctx.state !== "running") throw new Error("Audio context is unavailable.");

    const buffer = this.bufferFor(ctx, sound);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(input);
    source.onended = () => {
      source.disconnect();
      if (this.activeSource === source) this.activeSource = null;
    };
    // Audition the latest sound, not a stack of overlapping transients.
    this.activeSource?.stop();
    this.activeSource = source;

    this.startedAt = ctx.currentTime;
    this.duration = buffer.duration;
    source.start(this.startedAt);
  }

  /** 0..1 while the latest sound is audible, otherwise null. Compensates output latency. */
  progress(): number | null {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.duration <= 0) return null;
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    const p = (ctx.currentTime - this.startedAt - latency) / this.duration;
    if (p >= 1) return null;
    return p < 0 ? 0 : p;
  }

  /** True while something is playing, plus `pad` seconds so visuals can settle. */
  isActive(pad = 0): boolean {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.duration <= 0) return false;
    return ctx.currentTime < this.startedAt + this.duration + pad;
  }

  private bufferFor(ctx: AudioContext, sound: Playable): AudioBuffer {
    let buffer = this.buffers.get(sound.samples);
    if (!buffer) {
      buffer = ctx.createBuffer(1, sound.samples.length, sound.sampleRate);
      buffer.getChannelData(0).set(sound.samples);
      this.buffers.set(sound.samples, buffer);
    }
    return buffer;
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ sampleRate: SAMPLE_RATE, latencyHint: "interactive" });
    } catch {
      ctx = new Ctor();
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;

    const master = ctx.createGain();
    master.gain.value = this.volume;

    // Safety net for unexpected peaks; all current WAVs remain below the threshold at 110%.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

    analyser.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    this.ctx = ctx;
    this.input = analyser;
    this.master = master;
    return ctx;
  }
}
