import {clamp, coast, sheetLayout, wrap, type Placement} from "./sound-field-math";

type Point = {x:number;y:number};
type Tile = {node: HTMLElement; base:Placement; offset:Point; z:number; transform:string};
type Gesture = {pointer:number;capture:HTMLElement; tile?:Tile; start:Point; last:Point; origin:Point; time:number; velocity:Point; moved:boolean};

export function mountSoundField(viewport: HTMLElement, world: HTMLElement, onDrop: (id:string)=>void, onChange:(dirty:boolean)=>void) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const grid=viewport.querySelector<HTMLElement>(".field-grid");
  const hero=world.querySelector<HTMLElement>(".field-hero");
  let heroTransform="";
  const tiles: Tile[] = Array.from(world.querySelectorAll<HTMLElement>("[data-sound-object]"),node=>({node,base:{x:0,y:0,angle:0,size:1},offset:{x:0,y:0},z:0,transform:""}));
  let camera:Point={x:0,y:0}, velocity:Point={x:0,y:0}, period={x:2200,y:1800};
  let gesture:Gesture|undefined, frame=0, last=0, order=0, dirty=false, suppressUntil=0;
  let disposed=false;
  const setDirty=(value:boolean)=>{if(dirty!==value){dirty=value;onChange(value)}};
  function drawTile(tile:Tile) {
    const x=wrap(tile.base.x+tile.offset.x+camera.x,period.x)-camera.x;
    const y=wrap(tile.base.y+tile.offset.y+camera.y,period.y)-camera.y;
    const transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${motion.matches?0:tile.base.angle}deg)`;
    if(tile.transform!==transform){tile.node.style.transform=transform;tile.transform=transform;}
  }
  function drawCamera(){
    if(grid)grid.style.transform=`translate3d(${camera.x%22}px,${camera.y%22}px,0)`;
    world.style.transform=`translate3d(${camera.x.toFixed(2)}px,${camera.y.toFixed(2)}px,0)`;
    for(const tile of tiles)drawTile(tile);
    const h=`translate3d(${wrap(camera.x,period.x)-camera.x}px,${wrap(camera.y,period.y)-camera.y}px,0) translate(-50%,-50%)`;
    if(hero&&h!==heroTransform){hero.style.transform=h;heroTransform=h;}
  }
  function stop() {cancelAnimationFrame(frame);frame=0;last=0;velocity={x:0,y:0};}
  function setCamera(x:number,y:number) {
    camera={x:wrap(x,period.x),y:wrap(y,period.y)};
    drawCamera();
    if(Math.abs(camera.x)+Math.abs(camera.y)>1)setDirty(true);
  }
  function measure() {
    const sheet=sheetLayout(tiles.length,viewport.clientWidth,viewport.clientHeight);
    period={x:sheet.width,y:sheet.height};
    tiles.forEach((tile,i)=>{tile.base=sheet.points[i]!;tile.node.style.setProperty("--sticker-size",String(tile.base.size));tile.node.style.zIndex=String(tile.z);});
    setCamera(camera.x,camera.y);
    viewport.dataset.ready="true";
  }
  const observer=new ResizeObserver(measure);
  observer.observe(viewport);measure();
  function tick(now:number) {
    frame=0;
    if(disposed||document.hidden||motion.matches)return;
    const dt=last?clamp((now-last)/1000,.001,.05):1/60;last=now;
    const x=coast(camera.x,velocity.x,dt), y=coast(camera.y,velocity.y,dt);
    velocity={x:x.velocity,y:y.velocity};setCamera(x.position,y.position);
    if(Math.hypot(velocity.x,velocity.y)>8)frame=requestAnimationFrame(tick);else stop();
  }
  function down(event:PointerEvent) {
    if(event.button!==0||!event.isPrimary||gesture)return;
    const target=event.target as Element;
    if(target.closest("[data-no-pan]")&&target.closest("button,a,input"))return;
    const tile=tiles.find(item=>item.node.contains(target));
    if(!tile&&target.closest("button,a,input"))return;
    stop();
    const capture=tile?.node.querySelector("button")??viewport;
    gesture={pointer:event.pointerId,capture,tile,start:{x:event.clientX,y:event.clientY},last:{x:event.clientX,y:event.clientY},origin:{...(tile?tile.offset:camera)},time:event.timeStamp,velocity:{x:0,y:0},moved:false};
    capture.setPointerCapture(event.pointerId);
  }
  function move(event:PointerEvent) {
    const g=gesture;if(!g||g.pointer!==event.pointerId)return;
    const dx=event.clientX-g.start.x,dy=event.clientY-g.start.y;
    if(!g.moved&&Math.hypot(dx,dy)<5)return;
    if(!g.moved){
      g.moved=true;
      viewport.dataset.grabbing=g.tile?"sound":"paper";
      if(g.tile){g.tile.node.dataset.held="true";g.tile.z=++order;g.tile.node.style.zIndex=String(g.tile.z);}
    }
    event.preventDefault();
    const elapsed=Math.max(8,event.timeStamp-g.time);
    const vx=clamp((event.clientX-g.last.x)*1000/elapsed,-2200,2200),vy=clamp((event.clientY-g.last.y)*1000/elapsed,-2200,2200);
    g.velocity={x:g.velocity.x*.35+vx*.65,y:g.velocity.y*.35+vy*.65};
    g.last={x:event.clientX,y:event.clientY};g.time=event.timeStamp;
    if(g.tile){
      const tile=g.tile;
      tile.offset={x:wrap(g.origin.x+dx,period.x),y:wrap(g.origin.y+dy,period.y)};
      tile.node.style.setProperty("--lift-tilt",`${clamp(g.velocity.x/180,-8,8)}deg`);
      tile.node.style.setProperty("--lift-pitch",`${clamp(-g.velocity.y/180,-7,7)}deg`);
      drawTile(tile);pushNeighbors(tile);setDirty(true);
    }else setCamera(g.origin.x+dx,g.origin.y+dy);
  }
  // Move nearby stickers away from the held sound, not the whole canvas.
  function pushNeighbors(held:Tile){
    const radius=viewport.clientWidth<670?125:155;
    const x=held.base.x+held.offset.x,y=held.base.y+held.offset.y;
    for(const tile of tiles){
      if(tile===held)continue;
      const dx=wrap(tile.base.x+tile.offset.x-x,period.x),dy=wrap(tile.base.y+tile.offset.y-y,period.y);
      const distance=Math.hypot(dx,dy);if(distance>=radius)continue;
      const ux=distance>.01?dx/distance:1,uy=distance>.01?dy/distance:0,shift=(radius-distance)*.45;
      tile.offset={x:wrap(tile.offset.x+ux*shift,period.x),y:wrap(tile.offset.y+uy*shift,period.y)};drawTile(tile);
    }
  }
  function end(event:PointerEvent,cancel=false) {
    const g=gesture;if(!g||g.pointer!==event.pointerId)return;
    gesture=undefined;delete viewport.dataset.grabbing;
    if(g.capture.hasPointerCapture(event.pointerId))g.capture.releasePointerCapture(event.pointerId);
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
  const lost=(e:PointerEvent)=>{if(gesture?.capture===e.target)end(e,true);};
  function click(event:MouseEvent) {
    if(event.detail!==0&&performance.now()<suppressUntil){event.preventDefault();event.stopPropagation();}
  }
  function wheel(event:WheelEvent) {
    if(event.ctrlKey||gesture)return;
    event.preventDefault();stop();
    const multiplier=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
    setCamera(camera.x-event.deltaX*multiplier,camera.y-event.deltaY*multiplier);
  }
  function focus(event:FocusEvent) {
    const target=event.target as HTMLElement;if(!target.matches(":focus-visible"))return;
    if(hero?.contains(target)){stop();setCamera(0,0);return;}
    const tile=tiles.find(t=>t.node.contains(target));if(!tile)return;
    const x=wrap(tile.base.x+tile.offset.x+camera.x,period.x),y=wrap(tile.base.y+tile.offset.y+camera.y,period.y);
    if(Math.abs(x)>viewport.clientWidth/2-65||Math.abs(y)>viewport.clientHeight/2-55){
      stop();setCamera(-tile.base.x-tile.offset.x,-tile.base.y-tile.offset.y);
    }
  }
  function reset() {
    if(gesture){const active=gesture;gesture=undefined;delete viewport.dataset.grabbing;if(active.tile){delete active.tile.node.dataset.held;active.tile.node.style.removeProperty("--lift-tilt");active.tile.node.style.removeProperty("--lift-pitch");}if(active.capture.hasPointerCapture(active.pointer))active.capture.releasePointerCapture(active.pointer);}
    stop();camera={x:0,y:0};order=0;
    for(const tile of tiles){tile.offset={x:0,y:0};tile.z=0;tile.node.style.zIndex="0";drawTile(tile);}
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
  window.addEventListener("pointermove",move,{passive:false});
  window.addEventListener("pointerup",up);
  window.addEventListener("pointercancel",cancel);
  viewport.addEventListener("lostpointercapture",lost);
  viewport.addEventListener("click",click,true);
  viewport.addEventListener("wheel",wheel,{passive:false});
  viewport.addEventListener("focusin",focus);
  viewport.addEventListener("keydown",key);
  viewport.addEventListener("scroll",scroll);
  document.addEventListener("visibilitychange",visibility);
  motion.addEventListener("change",motionChange);
  return {reset,dispose(){
    disposed=true;stop();observer.disconnect();
    if(gesture&&gesture.capture.hasPointerCapture(gesture.pointer))gesture.capture.releasePointerCapture(gesture.pointer);
    gesture=undefined;
    viewport.removeEventListener("pointerdown",down);
    window.removeEventListener("pointermove",move);
    window.removeEventListener("pointerup",up);
    window.removeEventListener("pointercancel",cancel);
    viewport.removeEventListener("lostpointercapture",lost);
    viewport.removeEventListener("click",click,true);
    viewport.removeEventListener("wheel",wheel);
    viewport.removeEventListener("focusin",focus);
    viewport.removeEventListener("keydown",key);
    viewport.removeEventListener("scroll",scroll);
    document.removeEventListener("visibilitychange",visibility);
    motion.removeEventListener("change",motionChange);
  }};
}
