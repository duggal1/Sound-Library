/** Geometry and exact critically damped integration; no DOM or frame-rate assumptions. */
export function projectCylinder(distance: number, halfHeight: number, bend: number) {
  const radius = Math.max(1, halfHeight) / Math.max(0.01, bend);
  const angle = Math.max(-0.65, Math.min(0.65, distance / radius));
  // Extend the tangent outside the arc, rather than collapsing distant rows
  // onto one position. Native clipping handles the hidden part of the rail.
  const excess = distance - angle * radius;
  const y = radius * Math.sin(angle) + excess * Math.cos(angle);
  const z = radius * (Math.cos(angle) - 1) - excess * Math.sin(angle);
  return { y: y - distance, z, rotation: -angle * 180 / Math.PI };
}

export function dampSpring(value: number, velocity: number, target: number, dt: number, omega = 20) {
  const x = value - target;
  const c = velocity + omega * x;
  const decay = Math.exp(-omega * dt);
  return { value: target + (x + c * dt) * decay, velocity: (velocity - omega * c * dt) * decay };
}
