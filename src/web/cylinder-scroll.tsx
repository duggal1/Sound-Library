/** Native scrolling owns position. A planar reading band joins two curved ends.
 * Prior wheel-picker inspiration: Dorian Baffier / Kokonut UI (MIT).
 */
import { useLayoutEffect, type ReactNode, type RefObject } from "react";
import { dampSpring, edgeProjection, railGeometry } from "./cylinder-math";

type Geometry = ReturnType<typeof railGeometry>;
interface Row {
  node: HTMLElement;
  index: number;
  visible: boolean | null;
  transform: string;
}

const controllers = new WeakMap<HTMLElement, DrumController>();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

class DrumController {
  private list: HTMLElement | null = null;
  private rows: Row[] = [];
  private geometry: Geometry | null = null;
  private pitch = 64;
  private height = 0;
  private frame = 0;
  private lastTime = 0;
  private lastScroll = 0;
  private velocity = 0;
  private lag = 0;
  private lagVelocity = 0;
  private dirty = true;
  private destroyed = false;
  private focusedKeyboard = false;
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly coarse = matchMedia("(pointer: coarse)");
  private readonly supported = CSS.supports("perspective", "1000px") && CSS.supports("transform-style", "preserve-3d");
  private readonly resize: ResizeObserver;
  private readonly mutation: MutationObserver;

  constructor(private readonly viewport: HTMLElement, private readonly carrier: HTMLElement, private readonly stage: HTMLElement) {
    this.resize = new ResizeObserver(this.invalidate);
    this.resize.observe(viewport);
    this.mutation = new MutationObserver(records => {
      if(records.some(r => r.target === stage || r.target === this.list)) this.invalidate();
    });
    this.mutation.observe(stage,{childList:true,subtree:true});
    viewport.addEventListener("scroll",this.schedule,{passive:true});
    viewport.addEventListener("focusin",this.onFocus);
    this.reduced.addEventListener("change",this.invalidate);
    this.coarse.addEventListener("change",this.invalidate);
    document.addEventListener("visibilitychange",this.onVisibility);
    this.measure();
    this.draw(viewport.scrollTop);
  }

  private readonly invalidate = () => { this.dirty = true; this.schedule(); };
  private readonly schedule = () => {
    if(!this.frame && !this.destroyed && !document.hidden) this.frame=requestAnimationFrame(this.tick);
  };
  private readonly onVisibility = () => {
    if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.lastTime=0;}
    else {this.resetPhysics();this.invalidate();}
  };
  private resetPhysics(): void {
    this.lastTime=0;this.lastScroll=this.viewport.scrollTop;this.velocity=this.lag=this.lagVelocity=0;
  }

  private measure(): void {
    this.dirty=false;
    const next=this.stage.querySelector<HTMLElement>(".sound-list");
    const prior=this.geometry;
    const oldPosition=prior ? this.viewport.scrollTop+prior.offset : this.viewport.scrollTop;
    const oldPitch=this.pitch;
    const oldHeight=this.height;
    if(next!==this.list){this.clear();this.list=next;}
    this.height=this.viewport.clientHeight;
    const nodes=next ? Array.from(next.querySelectorAll<HTMLElement>(":scope > .sound-row, :scope > .more")) : [];
    // Fixed layout pitch is shared with CSS, not inferred from transformed bounds.
    this.pitch=parseFloat(getComputedStyle(this.viewport).getPropertyValue("--drum-pitch")) || 64;
    const g=railGeometry(this.height,this.pitch,nodes.length);
    const active=!!next && this.supported && !this.reduced.matches && this.height>=240 &&
      nodes.length*this.pitch>this.height && g.maxScroll>1;
    if(!active){this.clear();this.geometry=null;this.rows=[];this.resetPhysics();return;}
    const existing=new Map(this.rows.map(r=>[r.node,r]));
    this.rows=nodes.map((node,index)=>{
      const row=existing.get(node);
      return row && row.index===index ? row : {node,index,visible:null,transform:""};
    });
    this.geometry=g;
    this.viewport.dataset.drum="true";
    this.carrier.style.height=`${this.height+g.maxScroll}px`;
    this.stage.style.height=`${this.height}px`;
    this.stage.style.perspective=`${g.perspective}px`;
    next!.dataset.cylinder="true";
    // On a resize, preserve the fractional row at the center. Initial entry
    // and filter resets keep the natural first row at the top of the viewport.
    if(prior && (oldPitch!==this.pitch || oldHeight!==this.height)){
      this.viewport.scrollTop=clamp(oldPosition/oldPitch*this.pitch-g.offset,0,g.maxScroll);
    }
    for(const row of this.rows){
      row.visible=null;row.transform="";
      row.node.style.removeProperty("transform");
      delete row.node.dataset.drumAway;
    }
    this.resetPhysics();
  }

  private clear(): void {
    for(const row of this.rows){
      row.node.style.removeProperty("transform");
      delete row.node.dataset.drumAway;
    }
    if(this.list){delete this.list.dataset.cylinder;this.list.style.removeProperty("transform");}
    delete this.viewport.dataset.drum;
    this.carrier.style.removeProperty("height");
    this.stage.style.removeProperty("height");
    this.stage.style.removeProperty("perspective");
  }

  private draw(scroll: number): void {
    const g=this.geometry;
    if(!g || !this.list)return;
    const center=clamp(scroll+this.lag,0,g.maxScroll)+g.offset;
    for(const row of this.rows){
      const distance=row.index*this.pitch-center;
      const visible=Math.abs(distance)<=g.visibleDistance;
      if(row.visible!==visible){
        row.node.dataset.drumAway=String(!visible);
        row.visible=visible;
        if(!visible){row.node.style.removeProperty("transform");row.transform="";}
      }
      if(!visible)continue;
      const p=edgeProjection(distance,g.flatHalf,g.radius);
      // Planar rows have no rotateX or translateZ at all. No parent rotation,
      // raster filter, or scale can distort the primary reading surface.
      const transform=p.rotation===0
        ? `translateY(${p.y.toFixed(3)}px)`
        : `translate3d(0,${p.y.toFixed(3)}px,${p.z.toFixed(3)}px) rotateX(${p.rotation.toFixed(4)}deg)`;
      if(transform!==row.transform){row.node.style.transform=transform;row.transform=transform;}
    }
  }

  private readonly tick = (now:number) => {
    this.frame=0;
    if(this.destroyed || document.hidden)return;
    if(this.dirty)this.measure();
    const g=this.geometry,scroll=this.viewport.scrollTop;
    if(!g){this.resetPhysics();return;}
    const dt=this.lastTime ? clamp((now-this.lastTime)/1000,.001,.05) : 1/60;
    const delta=scroll-this.lastScroll;
    this.lastTime=now;this.lastScroll=scroll;
    this.velocity+=(clamp(delta/dt,-3200,3200)-this.velocity)*(1-Math.exp(-dt*28));
    // OS inertia is already present. Add only a very small visual compliance,
    // not another inertial scroll engine. Never let it leave the scroll range.
    const cap=this.coarse.matches ? 2 : 4;
    const target=this.focusedKeyboard ? 0 : clamp(-this.velocity*.002,-cap,cap);
    const next=dampSpring(this.lag,this.lagVelocity,target,dt,30);
    this.lag=clamp(next.value,-cap,cap);this.lagVelocity=next.velocity;
    if(scroll<=.5 || scroll>=g.maxScroll-.5){this.lag=0;this.lagVelocity=0;}
    const moving=Math.abs(delta)>.01 || Math.abs(this.velocity)>.5 || Math.abs(this.lag)>.015 || Math.abs(this.lagVelocity)>.05;
    if(!moving){this.lag=this.lagVelocity=this.velocity=0;this.lastTime=0;this.focusedKeyboard=false;}
    this.draw(scroll);
    if(moving)this.schedule();
  };

  private readonly onFocus = (event:FocusEvent) => {
    const target=event.target;
    if(!(target instanceof HTMLElement) || !target.matches(":focus-visible"))return;
    const row=target.closest<HTMLElement>(".sound-row,.more");
    if(row)this.reveal(row);
  };

  reveal(node:HTMLElement): void {
    if(this.dirty)this.measure();
    const g=this.geometry;
    const row=this.rows.find(r=>r.node===node);
    if(!g || !row){node.scrollIntoView({block:"nearest",inline:"nearest"});return;}
    const center=this.viewport.scrollTop+g.offset;
    const distance=row.index*this.pitch-center;
    // Keyboard navigation guarantees a readable, fully visible target.
    if(Math.abs(distance)>Math.max(0,g.flatHalf-this.pitch*.5)){
      this.focusedKeyboard=true;
      this.viewport.scrollTop=clamp(row.index*this.pitch-g.offset,0,g.maxScroll);
      this.resetPhysics();this.draw(this.viewport.scrollTop);
    }
  }

  destroy(): void {
    this.destroyed=true;cancelAnimationFrame(this.frame);
    this.resize.disconnect();this.mutation.disconnect();
    this.viewport.removeEventListener("scroll",this.schedule);
    this.viewport.removeEventListener("focusin",this.onFocus);
    this.reduced.removeEventListener("change",this.invalidate);
    this.coarse.removeEventListener("change",this.invalidate);
    document.removeEventListener("visibilitychange",this.onVisibility);
    this.clear();
  }
}

export function revealCylinderRow(viewport:HTMLElement|null,id:string):void {
  if(!viewport)return;
  const row=document.getElementById(`row-${id}`);
  if(!row || !viewport.contains(row))return;
  const controller=controllers.get(viewport);
  if(controller)controller.reveal(row);
  else row.scrollIntoView({block:"nearest",inline:"nearest"});
}

export function CylinderScroll({children,viewportRef}:{children:ReactNode;viewportRef:RefObject<HTMLDivElement|null>}) {
  useLayoutEffect(()=>{
    const viewport=viewportRef.current;
    const carrier=viewport?.firstElementChild;
    const stage=carrier?.firstElementChild;
    if(!viewport || !(carrier instanceof HTMLElement) || !(stage instanceof HTMLElement))return;
    const controller=new DrumController(viewport,carrier,stage);
    controllers.set(viewport,controller);
    return ()=>{controllers.delete(viewport);controller.destroy();};
  },[viewportRef]);
  return <div className="library-scroll" ref={viewportRef} tabIndex={0} aria-label="Browse sounds, scroll to see more">
    <div className="drum-carrier"><div className="drum-stage">{children}</div></div>
  </div>;
}
