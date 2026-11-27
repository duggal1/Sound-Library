import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { dampSpring, projectCylinder } from "./cylinder-math";

interface Row {
  node: HTMLElement;
  center: number;
  transform: string;
}

/** Native scroll is the position authority. Only the curvature is spring-driven. */
class CylinderController {
  private scene: HTMLElement | null = null;
  private rows: Row[] = [];
  private observer: ResizeObserver;
  private mutations: MutationObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private coarse = matchMedia("(pointer: coarse)");
  private supported = CSS.supports("perspective", "1000px") && CSS.supports("transform-style", "preserve-3d");
  private frame = 0;
  private lastTime = 0;
  private lastScroll = 0;
  private velocity = 0;
  private bend = 0;
  private bendVelocity = 0;
  private height = 0;
  private sceneTop = 0;
  private dirty = true;
  private enabled = false;
  private destroyed = false;

  constructor(private readonly viewport: HTMLElement) {
    this.lastScroll = viewport.scrollTop;
    this.observer = new ResizeObserver(this.invalidate);
    this.observer.observe(viewport);
    this.mutations = new MutationObserver(records => {
      if (records.some(record => record.target === viewport || record.target === this.scene)) this.invalidate();
    });
    this.mutations.observe(viewport, { childList: true, subtree: true });
    viewport.addEventListener("scroll", this.schedule, { passive: true });
    this.reduced.addEventListener("change", this.invalidate);
    this.coarse.addEventListener("change", this.invalidate);
    document.addEventListener("visibilitychange", this.visibility);
    this.measure();
    this.draw(viewport.scrollTop);
  }

  private readonly visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
    } else {
      this.lastScroll = this.viewport.scrollTop;
      this.velocity = this.bend = this.bendVelocity = 0;
      this.invalidate();
    }
  };

  private readonly invalidate = () => {
    this.dirty = true;
    this.schedule();
  };

  private readonly schedule = () => {
    if (!this.frame && !this.destroyed && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  };

  private measure(): void {
    this.dirty = false;
    const next = this.viewport.querySelector<HTMLElement>(".sound-list");
    if (next !== this.scene) {
      this.clear();
      if (this.scene) this.observer.unobserve(this.scene);
      this.scene = next;
      if (next) this.observer.observe(next);
    }
    const scene = this.scene;
    this.height = this.viewport.clientHeight;
    this.sceneTop = scene?.offsetTop ?? 0;
    this.enabled = !!scene && this.supported && !this.reduced.matches && this.height >= 160 &&
      this.viewport.scrollHeight > this.height + 2;
    if (!scene) return;
    // Layout reads happen only after resize or list mutation, never per row per frame.
    const previous = new Map(this.rows.map(row => [row.node,row]));
    this.rows = Array.from(scene.querySelectorAll<HTMLElement>(":scope > .sound-row, :scope > .more")).map(node => ({
      node, center: node.offsetTop + node.offsetHeight / 2, transform: previous.get(node)?.transform ?? "",
    }));
    if (!this.enabled) { this.clear(); this.bend = this.bendVelocity = this.velocity = 0; return; }
    scene.dataset.cylinder = "true";
    scene.style.perspective = `${Math.max(1000, this.height * 2.2)}px`;
  }

  private clear(): void {
    for (const row of this.rows) { row.node.style.removeProperty("transform"); row.transform = ""; }
    if (this.scene) {
      delete this.scene.dataset.cylinder;
      this.scene.style.removeProperty("perspective");
      this.scene.style.removeProperty("perspective-origin");
    }
  }

  private draw(scroll: number): void {
    if (!this.enabled || !this.scene) return;
    const half = this.height / 2;
    const center = scroll + half - this.sceneTop;
    const base = this.coarse.matches ? .30 : .52;
    const curve = base + (this.coarse.matches ? .05 : .09) * Math.max(0, Math.min(1, this.bend));
    const overscan = half + Math.max(160, half * .4 + 80);
    this.scene.style.perspectiveOrigin = `50% ${center.toFixed(3)}px`;
    for (const row of this.rows) {
      const distance = row.center - center;
      let transform = "";
      if (Math.abs(distance) < overscan) {
        const p = projectCylinder(distance, half, curve);
        transform = `translateY(${p.y.toFixed(3)}px) translateZ(${p.z.toFixed(3)}px) rotateX(${p.rotation.toFixed(3)}deg)`;
      }
      if (transform !== row.transform) {
        row.node.style.transform = transform;
        row.transform = transform;
      }
    }
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    if (this.destroyed || document.hidden) return;
    if (this.dirty) this.measure();
    const scroll = this.viewport.scrollTop;
    if (!this.enabled) { this.lastTime = 0; this.lastScroll = scroll; return; }
    const dt = this.lastTime ? Math.max(.001, Math.min(.05, (now - this.lastTime) / 1000)) : 1 / 60;
    this.lastTime = now;
    const delta = scroll - this.lastScroll;
    this.lastScroll = scroll;
    // macOS/Windows/iOS already supply native inertial deltas; do not integrate
    // them into a second scroll position. Speed only adds a small elastic bend.
    const speed = Math.min(3600, Math.abs(delta) / dt);
    this.velocity += (speed - this.velocity) * (1 - Math.exp(-dt * 24));
    const next = dampSpring(this.bend, this.bendVelocity, Math.min(1, this.velocity / 2200), dt);
    this.bend = next.value;
    this.bendVelocity = next.velocity;
    this.draw(scroll);
    if (Math.abs(delta) > .01 || this.velocity > .5 || Math.abs(this.bend) > .0005 || Math.abs(this.bendVelocity) > .005) this.schedule();
    else {
      this.velocity = this.bend = this.bendVelocity = 0;
      this.lastTime = 0;
      this.draw(scroll);
    }
  };

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.mutations.disconnect();
    this.viewport.removeEventListener("scroll", this.schedule);
    this.reduced.removeEventListener("change", this.invalidate);
    this.coarse.removeEventListener("change", this.invalidate);
    document.removeEventListener("visibilitychange", this.visibility);
    this.clear();
  }
}

/** Scroll by untransformed layout coordinates for keyboard browsing. No snap. */
export function revealCylinderRow(viewport: HTMLElement | null, id: string): void {
  if (!viewport) return;
  const row = document.getElementById(`row-${id}`);
  const scene = row?.parentElement;
  if (!row || !scene || !viewport.contains(row)) return;
  const top = scene.offsetTop + row.offsetTop;
  const bottom = top + row.offsetHeight;
  const margin = 12;
  if (top < viewport.scrollTop + margin) viewport.scrollTop = Math.max(0, top - margin);
  else if (bottom > viewport.scrollTop + viewport.clientHeight - margin) viewport.scrollTop = bottom - viewport.clientHeight + margin;
}

export function CylinderScroll({ children, viewportRef }: { children: ReactNode; viewportRef: RefObject<HTMLDivElement | null> }) {
  const controller = useRef<CylinderController | null>(null);
  useLayoutEffect(() => {
    if (!viewportRef.current) return;
    const instance = new CylinderController(viewportRef.current);
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [viewportRef]);
  return <div className="library-scroll" ref={viewportRef} tabIndex={0} aria-label="Browse sounds, scroll to see more">{children}</div>;
}
