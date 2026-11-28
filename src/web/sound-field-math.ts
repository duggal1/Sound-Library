/** Authored, deterministic sound sheet. The center is reserved for the hero. */
export interface Placement { x: number; y: number; angle: number }
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function soundPlacements(count: number, width: number): Placement[] {
  const compact = width < 670;
  const sx = compact ? 126 : 156, sy = compact ? 116 : 132;
  const clearX = compact ? Math.min(width, 340) / 2 + 68 : 310;
  const clearY = compact ? 205 : 180;
  const cells: Placement[] = [];
  const radius = Math.ceil(Math.sqrt(count + 40)) + 3;
  for (let row = -radius; row <= radius; row++) {
    for (let col = -radius; col <= radius; col++) {
      const seed = ((row * 73856093) ^ (col * 19349663)) >>> 0;
      const x = col * sx + (row % 2) * sx * .13 + (seed % 17 - 8);
      const y = row * sy + ((seed >>> 8) % 19 - 9);
      if (Math.abs(x) < clearX && Math.abs(y) < clearY) continue;
      cells.push({x, y, angle: (seed % 15 - 7) * .6});
    }
  }
  // Prefer the viewport's aspect ratio, not an artificial circular orbit.
  const aspect = clamp(width / 760, .68, 1.8);
  cells.sort((a,b) => Math.hypot(a.x / aspect, a.y) - Math.hypot(b.x / aspect,b.y) || a.y-b.y || a.x-b.x);
  return cells.slice(0,count);
}

export function cameraBounds(points: readonly Placement[], width: number, height: number) {
  // Allow every object to be centered, including its accessible focus target.
  return {
    x: Math.max(width * .35, ...points.map(p=>Math.abs(p.x))) + 120,
    y: Math.max(height * .35, ...points.map(p=>Math.abs(p.y))) + 120,
  };
}

export function coast(value: number, velocity: number, dt: number, limit: number) {
  const decay = Math.exp(-7 * dt);
  const next = value + velocity * (1-decay)/7;
  const position = clamp(next,-limit,limit);
  return {position, velocity: position === next ? velocity*decay : 0};
}
