const TURN = 2 * Math.PI;
const STEP = TURN / 7;
const PERSPECTIVE = 1000;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
export const wrapAngle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));

interface Tile {
  element: HTMLElement;
  angle: number;
  height: number;
  x: number;
  y: number;
  settle?: {fromX: number; fromY: number; lean: number; at: number};
}

interface Gesture {
  pointer: number;
  tile?: Tile;
  startX: number;
  startY: number;
  lastX: number;
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  moved: boolean;
  x: number;
  y: number;
  time: number;
  velocity: number;
}

/** Input and transforms share one frame scheduler. React only handles audio and UI state. */
export function mountOrbit(surface: HTMLElement, onDrop: (id: string) => void) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const tiles: Tile[] = Array.from(surface.querySelectorAll<HTMLElement>("[data-orbit-tile]"), (element, index) => ({
    element,
    angle: (Math.floor(index / 2) + (index % 2 ? .43 : 0)) * STEP,
    height: index % 2 ? .5 : -.5,
    x: 0,
    y: 0,
  }));
  let radius = 0;
  let rowGap = 0;
  let angle = 0;
  let velocity = 0;
  let target: number | null = null;
  let frame = 0;
  let lastFrame = 0;
  let gesture: Gesture | undefined;
  let suppressClickUntil = 0;

  function draw(time: number) {
    let settling = false;
    if (motion.matches) {
      for (const {element} of tiles) {
        element.style.removeProperty("transform");
        element.style.removeProperty("opacity");
        element.inert = false;
        element.removeAttribute("data-back");
      }
      for (const tile of tiles) tile.settle = undefined;
      return false;
    }
    for (const tile of tiles) {
      const yaw = wrapAngle(tile.angle + angle);
      const z = radius * (Math.cos(yaw) - 1);
      const x = radius * Math.sin(yaw);
      const y = tile.height * rowGap + z * -.085;
      const scale = PERSPECTIVE / (PERSPECTIVE - z);
      tile.x = x * scale;
      tile.y = y * scale;
      const held = gesture?.moved && gesture.tile === tile ? gesture : null;
      const settle = tile.settle;
      const t = settle ? Math.max(0, (time - settle.at) / 1000) * 28 : 0;
      const offset = settle ? (1 + t) * Math.exp(-t) : 0;
      const inFlight = !!settle && offset > .006;
      if (inFlight) settling = true;
      else tile.settle = undefined;

      const rear = Math.abs(yaw) > Math.PI / 2 + .1;
      const hidden = rear && !held && !inFlight;
      if (tile.element.inert !== hidden) tile.element.inert = hidden;
      tile.element.toggleAttribute("data-back", hidden);
      const fade = clamp((1.66 - Math.abs(yaw)) * 2.85, 0, 1);
      tile.element.style.opacity = String(held ? 1 : fade + (1 - fade) * offset);
      if (held) {
        const lean = clamp(held.velocity * 2, -9, 9);
        tile.element.style.transform = `translate3d(${(held.x + held.offsetX) * .94}px,${(held.y + held.offsetY) * .94}px,60px) rotateZ(${lean}deg)`;
      } else if (inFlight) {
        tile.element.style.transform = `translate3d(${x + (settle.fromX - x) * offset}px,${y + (settle.fromY - y) * offset}px,${z + (60 - z) * offset}px) rotateY(${yaw * (1 - offset)}rad) rotateZ(${settle.lean * offset}deg)`;
      } else {
        tile.element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${yaw.toFixed(4)}rad)`;
      }
    }
    return settling;
  }

  function tick(time: number) {
    frame = 0;
    const dt = lastFrame ? Math.min(.034, (time - lastFrame) / 1000) : 1 / 60;
    lastFrame = time;
    if (target !== null) {
      angle += (target - angle) * (1 - Math.exp(-17 * dt));
      if (Math.abs(target - angle) < .001) { angle = target; target = null; }
    } else if (!gesture && Math.abs(velocity) > .008) {
      const decay = Math.exp(-5.8 * dt);
      angle += velocity * (1 - decay) / 5.8;
      velocity *= decay;
    }
    const settling = draw(time);
    if (settling || target !== null || (!gesture && Math.abs(velocity) > .008)) schedule();
    else lastFrame = 0;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function stopMotion() {
    velocity = 0;
    target = null;
  }

  const resize = new ResizeObserver(([entry]) => {
    radius = clamp(entry.contentRect.width * .45, 150, 510);
    rowGap = entry.contentRect.width < 550 ? 122 : 156;
    schedule();
  });
  resize.observe(surface);

  function down(event: PointerEvent) {
    if (motion.matches || event.button !== 0 || !event.isPrimary || gesture) return;
    const tile = tiles.find(item => item.element.contains(event.target as Node));
    if (tile) tile.settle = undefined;
    stopMotion();
    const rect = surface.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    gesture = {
      pointer: event.pointerId, tile, x, y, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, initialX: x, initialY: y,
      offsetX: (tile?.x ?? x) - x, offsetY: (tile?.y ?? y) - y,
      time: event.timeStamp, velocity: 0, moved: false,
    };
  }

  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const drag = gesture;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && distance < 5) return;
    if (!drag.moved) {
      surface.setPointerCapture(event.pointerId);
      surface.dataset.grabbing = drag.tile ? "tile" : "orbit";
      if (drag.tile) drag.tile.element.dataset.held = "true";
      drag.moved = true;
    }
    const movement = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    const elapsed = Math.max(8, event.timeStamp - drag.time);
    const instant = (movement / Math.max(radius, 1)) * 1000 / elapsed;
    drag.velocity = clamp(drag.velocity * .45 + instant * .55, -5, 5);
    drag.time = event.timeStamp;
    if (!drag.tile) angle = wrapAngle(angle + movement / Math.max(radius, 1));
    drag.x = drag.initialX + event.clientX - drag.startX;
    drag.y = drag.initialY + event.clientY - drag.startY;
    schedule();
  }

  function end(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const drag = gesture;
    gesture = undefined;
    delete surface.dataset.grabbing;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (!drag.moved) return;
    suppressClickUntil = performance.now() + 300;
    if (drag.tile) {
      delete drag.tile.element.dataset.held;
      drag.tile.settle = {
        fromX: (drag.x + drag.offsetX) * .94,
        fromY: (drag.y + drag.offsetY) * .94,
        lean: clamp(drag.velocity * 2, -9, 9),
        at: performance.now(),
      };
      if (event.type === "pointerup") {
        drag.tile.angle = wrapAngle(drag.tile.angle + (event.clientX - drag.startX) / radius);
        drag.tile.height = clamp(drag.tile.height + (event.clientY - drag.startY) / rowGap, -.74, .74);
        onDrop(drag.tile.element.dataset.orbitTile!);
      }
    } else if (event.type === "pointerup" && event.timeStamp - drag.time < 100) {
      velocity = drag.velocity;
    }
    schedule();
  }

  function wheel(event: WheelEvent) {
    if (motion.matches || gesture || event.ctrlKey || event.metaKey) return;
    const delta = event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
    if (!delta || (!event.shiftKey && Math.abs(event.deltaY) > Math.abs(delta))) return;
    event.preventDefault();
    stopMotion();
    const unit = event.deltaMode === 1 ? 15 : event.deltaMode === 2 ? radius : 1;
    angle = wrapAngle(angle - delta * unit / Math.max(radius, 1));
    schedule();
  }

  function click(event: MouseEvent) {
    if (event.detail && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function motionChanged() {
    stopMotion();
    if (gesture && motion.matches) {
      if (gesture.tile) delete gesture.tile.element.dataset.held;
      delete surface.dataset.grabbing;
      if (surface.hasPointerCapture(gesture.pointer)) surface.releasePointerCapture(gesture.pointer);
      gesture = undefined;
    }
    schedule();
  }
  surface.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  surface.addEventListener("lostpointercapture", end);
  surface.addEventListener("wheel", wheel, {passive: false});
  surface.addEventListener("click", click, true);
  motion.addEventListener("change", motionChanged);
  schedule();

  return {
    rotate(direction: -1 | 1) {
      if (motion.matches || gesture) return;
      velocity = 0;
      target = (target ?? angle) - direction * STEP;
      schedule();
    },
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      surface.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      surface.removeEventListener("lostpointercapture", end);
      surface.removeEventListener("wheel", wheel);
      surface.removeEventListener("click", click, true);
      motion.removeEventListener("change", motionChanged);
    },
  };
}
