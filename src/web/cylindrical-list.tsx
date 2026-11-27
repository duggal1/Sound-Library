import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Project native scroll coordinates onto a vertical cylinder. No synthetic wheel
 * events, scroll hijacking, snapping, or React renders on the animation path. */
export function CylindricalList({ children, itemKey }: { children: ReactNode; itemKey: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const rows = Array.from(track.querySelectorAll<HTMLElement>(".sound-row"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let centers: number[] = [];
    let height = 0;
    let rowHeight = 0;
    let radius = 1;
    let enabled = false;
    let active = new Set<number>();
    let frame = 0;
    let lastTime = 0;
    let position = 0;
    let velocity = 0;

    function clearRow(index: number) {
      const row = rows[index];
      if (row) row.style.removeProperty("transform");
    }

    function paint(native: number) {
      if (!enabled) return;
      const center = native + height / 2;
      const visualCenter = position + height / 2;
      track!.style.setProperty("--cylinder-origin", center + "px");
      // Only project the front arc and enough overscan to keep the edge continuous.
      const reach = height / 2 + rowHeight * 2;
      const next = new Set<number>();
      const first = Math.max(0, Math.floor((visualCenter - reach) / rowHeight));
      const last = Math.min(rows.length - 1, Math.ceil((visualCenter + reach) / rowHeight));
      for (let i = first; i <= last; i++) {
        const offset = centers[i] - visualCenter;
        if (Math.abs(offset) > reach) continue;
        const angle = offset / radius;
        const y = radius * Math.sin(angle);
        const z = radius * (Math.cos(angle) - 1);
        const dy = y - (centers[i] - center);
        rows[i].style.transform = `translate3d(0,${dy.toFixed(3)}px,${z.toFixed(3)}px) rotateX(${(-angle).toFixed(5)}rad)`;
        next.add(i);
      }
      for (const i of active) if (!next.has(i)) clearRow(i);
      active = next;
    }

    function tick(now: number) {
      frame = 0;
      if (!enabled) return;
      const native = viewport!.scrollTop;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000 || 1 / 60));
      lastTime = now;

      // Exact critically damped spring solution. The OS already supplies trackpad
      // momentum; this only absorbs tiny projection discontinuities, never adds
      // a second inertial scroll or lets the display drift far from input.
      const omega = 48;
      let error = position - native;
      if (Math.abs(error) > 24) {
        error = Math.sign(error) * 24;
        velocity = 0;
      }
      const c = velocity + omega * error;
      const decay = Math.exp(-omega * dt);
      const nextError = (error + c * dt) * decay;
      velocity = (velocity - omega * c * dt) * decay;
      if (error * nextError <= 0 || (Math.abs(nextError) < 0.05 && Math.abs(velocity) < 2)) {
        position = native;
        velocity = 0;
      } else {
        position = native + nextError;
      }
      paint(native);
      if (position !== native || velocity !== 0) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }

    function schedule() {
      if (!enabled || frame) return;
      if (!lastTime) lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function measure() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      for (const i of active) clearRow(i);
      active.clear();
      height = viewport!.clientHeight;
      rowHeight = rows[0]?.offsetHeight ?? 0;
      centers = rows.map(row => row.offsetTop + row.offsetHeight / 2);
      // Large radius keeps text legible, with a shallow arc at the viewport edge.
      radius = Math.max(420, height * 1.02);
      enabled = !reduced.matches && rowHeight > 0 && track!.offsetHeight > height + 1;
      track!.dataset.curved = String(enabled);
      position = viewport!.scrollTop;
      velocity = 0;
      if (enabled) paint(position);
      else track!.style.removeProperty("--cylinder-origin");
    }

    function onFocus(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(":focus-visible")) return;
      const row = target.closest<HTMLElement>(".sound-row");
      if (row) revealCylinderRow(row.id);
    }

    viewport.scrollTop = 0;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    viewport.addEventListener("scroll", schedule, { passive: true });
    viewport.addEventListener("focusin", onFocus);
    reduced.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", measure);
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("focusin", onFocus);
      if (frame) cancelAnimationFrame(frame);
      for (const i of active) clearRow(i);
      track.style.removeProperty("--cylinder-origin");
      delete track.dataset.curved;
    };
  }, [itemKey]);

  return (
    <div ref={viewportRef} className="cylinder-viewport" tabIndex={0} role="region" aria-label="Scrollable sounds">
      <div ref={trackRef} className="cylinder-track">{children}</div>
    </div>
  );
}

/** Reveal the actual layout row, not its projected bounding rectangle. */
export function revealCylinderRow(id: string) {
  const row = document.getElementById(id);
  const viewport = row?.closest<HTMLElement>(".cylinder-viewport");
  if (!row || !viewport) return;
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  const margin = Math.min(row.offsetHeight, viewport.clientHeight * 0.15);
  if (top < viewport.scrollTop + margin || bottom > viewport.scrollTop + viewport.clientHeight - margin) {
    viewport.scrollTop = top + row.offsetHeight / 2 - viewport.clientHeight / 2;
  }
}
