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

/** Tangent drum geometry adapted from Dorian Baffier's MIT Wheel Picker (Kokonut UI). */
export function drumGeometry(height: number,pitch: number,count: number) {
  const radius = Math.max(140,height*.76);
  const perspective = Math.max(900,height*2.8);
  const step = 2*Math.atan(pitch/(2*radius));
  const project = (angle: number) => radius*Math.sin(angle)*perspective/(perspective+radius*(1-Math.cos(angle)));
  const limit = Math.min(1.12,Math.acos(radius/(radius+perspective))-.035);
  const solve = (y: number) => {
    let lo=0,hi=limit;
    for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(project(mid)<y)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  };
  const edge=solve(Math.max(0,height/2-pitch*.58));
  const offset=edge/step*pitch;
  return {radius,perspective,step,edge,offset,maxScroll:Math.max(0,(count-1)*pitch-2*offset),visible:Math.min(limit,solve(height/2+pitch*.65))};
}
