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

/** The central reading band is exactly planar; only the two ends bend away.
 * Each arc meets the plane tangentially. Extend the final tangent instead of
 * folding a hidden row back into view. Coordinates are CSS pixels. */
export function edgeProjection(distance: number, flatHalf: number, radius: number){
  const excess=Math.max(0,Math.abs(distance)-flatHalf);
  if(excess===0)return {y:distance,z:0,rotation:0};
  const angle=Math.min(.68,excess/radius);
  const tail=excess-angle*radius;
  const sign=Math.sign(distance);
  return {y:sign*(flatHalf+radius*Math.sin(angle)+tail*Math.cos(angle)),z:radius*(Math.cos(angle)-1)-tail*Math.sin(angle),rotation:-sign*angle*180/Math.PI};
}
 
/** Native scroll range, perspective and endpoint inset share one projection. */
export function railGeometry(height: number, pitch: number, count: number){
  const half=height/2;
  const flatHalf=half*.58;
  const radius=Math.max(1,(half-flatHalf)/.48);
  const perspective=Math.max(1000,height*3.6);
  const project=(distance: number)=>{const p=edgeProjection(distance,flatHalf,radius);return p.y*perspective/(perspective-p.z)};
  const solve=(target: number)=>{let lo=0,hi=height+pitch;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(project(mid)<target)lo=mid;else hi=mid}return (lo+hi)/2};
  const offset=solve(Math.max(0,half-pitch*.55));
  const visibleDistance=solve(half+pitch*.6);
  return {flatHalf,radius,perspective,offset,visibleDistance,maxScroll:Math.max(0,(count-1)*pitch-2*offset)};
}
