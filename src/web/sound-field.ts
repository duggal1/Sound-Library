import {cameraBounds, clamp, coast, soundPlacements, type Placement} from "./sound-field-math";

type Point = {x:number;y:number};
type Tile = {node: HTMLElement; base:Placement; offset:Point; z:number};
type Gesture = {pointer:number; tile?:Tile; start:Point; last:Point; origin:Point; time:number; velocity:Point; moved:boolean};

export function mountSoundField(viewport: HTMLElement, world: HTMLElement, onDrop: (id:string)=>void, onChange:(dirty:boolean)=>void) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const grid=viewport.querySelector<HTMLElement>(".field-grid");
  const tiles: Tile[] = Array.from(world.querySelectorAll<HTMLElement>("[data-sound-object]"),node=>({node,base:{x:0,y:0,angle:0},offset:{x:0,y:0},z:0}));
  let camera:Point={x:0,y:0}, velocity:Point={x:0,y:0}, bounds={x:0,y:0};
  let gesture:Gesture|undefined, frame=0, last=0, order=0, dirty=false, suppressUntil=0;
  let disposed=false;
  const setDirty=(value:boolean)=>{if(dirty!==value){dirty=value;onChange(value)}};
  const drawCamera=()=>{if(grid)grid.style.transform=`translate3d(${camera.x%24}px,${camera.y%24}px,0)`;world.style.transform=`translate3d(${camera.x.toFixed(2)}px,${camera.y.toFixed(2)}px,0)`};
  function drawTile(tile:Tile) {
    const x=tile.base.x+tile.offset.x, y=tile.base.y+tile.offset.y;
    tile.node.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${motion.matches?0:tile.base.angle}deg)`;
    tile.node.style.zIndex=String(tile.z);
  }
  function stop() {cancelAnimationFrame(frame);frame=0;last=0;velocity={x:0,y:0};}
  function setCamera(x:number,y:number) {
    camera={x:clamp(x,-bounds.x,bounds.x),y:clamp(y,-bounds.y,bounds.y)};
    drawCamera();
    if(Math.abs(camera.x)+Math.abs(camera.y)>1)setDirty(true);
  }
  function measure() {
    const points=soundPlacements(tiles.length,viewport.clientWidth);
    tiles.forEach((tile,i)=>{tile.base=points[i]!;drawTile(tile)});
    bounds=cameraBounds(points,viewport.clientWidth,viewport.clientHeight);
    setCamera(camera.x,camera.y);
    viewport.dataset.ready="true";
  }
  const observer=new ResizeObserver(measure);
  observer.observe(viewport);measure();
  function tick(now:number) {
    frame=0;
    if(disposed||document.hidden||motion.matches)return;
    const dt=last?clamp((now-last)/1000,.001,.05):1/60;last=now;
    const x=coast(camera.x,velocity.x,dt,bounds.x), y=coast(camera.y,velocity.y,dt,bounds.y);
    velocity={x:x.velocity,y:y.velocity};setCamera(x.position,y.position);
    if(Math.hypot(velocity.x,velocity.y)>8)frame=requestAnimationFrame(tick);else stop();
  }
  function down(event:PointerEvent) {
    if(event.button!==0||!event.isPrimary||gesture)return;
    const target=event.target as HTMLElement;
    if(target.closest("[data-no-pan]"))return;
    const tile=tiles.find(item=>item.node.contains(target));
    if(!tile&&target.closest("button,a,input"))return;
    stop();
    gesture={pointer:event.pointerId,tile,start:{x:event.clientX,y:event.clientY},last:{x:event.clientX,y:event.clientY},origin:{...(tile?tile.offset:camera)},time:event.timeStamp,velocity:{x:0,y:0},moved:false};
  }
  function move(event:PointerEvent) {
    const g=gesture;if(!g||g.pointer!==event.pointerId)return;
    const dx=event.clientX-g.start.x,dy=event.clientY-g.start.y;
    if(!g.moved&&Math.hypot(dx,dy)<5)return;
    if(!g.moved){
      g.moved=true;viewport.setPointerCapture(event.pointerId);
      viewport.dataset.grabbing=g.tile?"sound":"paper";
      if(g.tile){g.tile.node.dataset.held="true";g.tile.z=++order;}
    }
    const elapsed=Math.max(8,event.timeStamp-g.time);
    const vx=clamp((event.clientX-g.last.x)*1000/elapsed,-2200,2200),vy=clamp((event.clientY-g.last.y)*1000/elapsed,-2200,2200);
    g.velocity={x:g.velocity.x*.35+vx*.65,y:g.velocity.y*.35+vy*.65};
    g.last={x:event.clientX,y:event.clientY};g.time=event.timeStamp;
    if(g.tile){
      const tile=g.tile;
      tile.offset={x:clamp(g.origin.x+dx,-bounds.x-tile.base.x,bounds.x-tile.base.x),y:clamp(g.origin.y+dy,-bounds.y-tile.base.y,bounds.y-tile.base.y)};
      tile.node.style.setProperty("--lift-tilt",`${clamp(g.velocity.x/180,-8,8)}deg`);
      tile.node.style.setProperty("--lift-pitch",`${clamp(-g.velocity.y/180,-7,7)}deg`);
      drawTile(tile);setDirty(true);
    }else setCamera(g.origin.x+dx,g.origin.y+dy);
  }
  function end(event:PointerEvent,cancel=false) {
    const g=gesture;if(!g||g.pointer!==event.pointerId)return;
    gesture=undefined;delete viewport.dataset.grabbing;
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    if(!g.moved)return;
    suppressUntil=performance.now()+350;
    if(g.tile){
      delete g.tile.node.dataset.held;
      g.tile.node.style.removeProperty("--lift-tilt");g.tile.node.style.removeProperty("--lift-pitch");
      if(cancel){g.tile.offset=g.origin;drawTile(g.tile);}
      else {const id=g.tile.node.dataset.soundObject;if(id)onDrop(id);}
    }else if(!cancel&&!motion.matches&&event.timeStamp-g.time<100){
      velocity=g.velocity;if(Math.hypot(velocity.x,velocity.y)>8)frame=requestAnimationFrame(tick);
    }
  }
  const up=(e:PointerEvent)=>end(e);
  const cancel=(e:PointerEvent)=>end(e,true);
  function click(event:MouseEvent) {
    if(event.detail!==0&&performance.now()<suppressUntil){event.preventDefault();event.stopPropagation();}
  }
  function wheel(event:WheelEvent) {
    if(event.ctrlKey||(event.target as HTMLElement).closest("[data-no-pan]"))return;
    event.preventDefault();stop();
    const multiplier=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
    setCamera(camera.x-event.deltaX*multiplier,camera.y-event.deltaY*multiplier);
  }
  function focus(event:FocusEvent) {
    const target=event.target as HTMLElement;if(!target.matches(":focus-visible"))return;
    const tile=tiles.find(t=>t.node.contains(target));if(!tile)return;
    const x=tile.base.x+tile.offset.x+camera.x,y=tile.base.y+tile.offset.y+camera.y;
    if(Math.abs(x)>viewport.clientWidth/2-65||Math.abs(y)>viewport.clientHeight/2-55){
      stop();setCamera(-tile.base.x-tile.offset.x,-tile.base.y-tile.offset.y);
    }
  }
  function reset() {
    if(gesture){const active=gesture;gesture=undefined;delete viewport.dataset.grabbing;if(active.tile){delete active.tile.node.dataset.held;active.tile.node.style.removeProperty("--lift-tilt");active.tile.node.style.removeProperty("--lift-pitch");}if(viewport.hasPointerCapture(active.pointer))viewport.releasePointerCapture(active.pointer);}
    stop();camera={x:0,y:0};order=0;
    for(const tile of tiles){tile.offset={x:0,y:0};tile.z=0;drawTile(tile);}
    drawCamera();setDirty(false);
  }
  function key(event:KeyboardEvent) {
    if(event.key==="Escape"){reset();return;}
    if((event.target as HTMLElement).closest("button,a,input"))return;
    const step=event.shiftKey?320:120;
    const directions:Record<string,Point>={ArrowLeft:{x:step,y:0},ArrowRight:{x:-step,y:0},ArrowUp:{x:0,y:step},ArrowDown:{x:0,y:-step}};
    const direction=directions[event.key];if(!direction)return;
    event.preventDefault();stop();setCamera(camera.x+direction.x,camera.y+direction.y);
  }
  function visibility(){if(document.hidden)stop();}
  function motionChange(){stop();tiles.forEach(drawTile);}
  const scroll=()=>{viewport.scrollLeft=0;viewport.scrollTop=0;};
  viewport.addEventListener("pointerdown",down);
  window.addEventListener("pointermove",move);
  window.addEventListener("pointerup",up);
  window.addEventListener("pointercancel",cancel);
  viewport.addEventListener("lostpointercapture",cancel);
  viewport.addEventListener("click",click,true);
  viewport.addEventListener("wheel",wheel,{passive:false});
  viewport.addEventListener("focusin",focus);
  viewport.addEventListener("keydown",key);
  viewport.addEventListener("scroll",scroll);
  document.addEventListener("visibilitychange",visibility);
  motion.addEventListener("change",motionChange);
  return {reset,dispose(){
    disposed=true;stop();observer.disconnect();
    if(gesture&&viewport.hasPointerCapture(gesture.pointer))viewport.releasePointerCapture(gesture.pointer);
    gesture=undefined;
    viewport.removeEventListener("pointerdown",down);
    window.removeEventListener("pointermove",move);
    window.removeEventListener("pointerup",up);
    window.removeEventListener("pointercancel",cancel);
    viewport.removeEventListener("lostpointercapture",cancel);
    viewport.removeEventListener("click",click,true);
    viewport.removeEventListener("wheel",wheel);
    viewport.removeEventListener("focusin",focus);
    viewport.removeEventListener("keydown",key);
    viewport.removeEventListener("scroll",scroll);
    document.removeEventListener("visibilitychange",visibility);
    motion.removeEventListener("change",motionChange);
  }};
}
