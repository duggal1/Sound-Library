/**
 * Offline adaptation of Trazo's playStickerPeelSound / playStickerPlaceSound.
 * Aditya Ojha, MIT, https://github.com/AdityaKodez/trazo/blob/35c86c90c558d88c84bb218a855f1ddea3c91ccd/lib/sound.ts
 * License: licenses/trazo-MIT.txt. No MP3s or third-party runtime dependencies.
 * Fixed jitter (1) and seeded noise give stable, downloadable PCM.
 */
import { fadeEdges, scaleToPeak, TAU } from "./dsp";
import { hashString, mulberry32 } from "./rng";

export type PaperGesture = "peel" | "touch";
function ramp(t:number, attack:number, end:number, peak:number):number {
  const floor=.0001;
  if(t>=end)return floor;
  if(t<=attack)return floor+(peak-floor)*t/attack;
  return peak*Math.pow(floor/peak,(t-attack)/(end-attack));
}
function sweep(t:number, from:number, to:number, duration:number):number {
  return from*Math.pow(to/from,Math.min(1,t/duration));
}

/** RBJ biquad, constant-peak bandpass / lowpass, with audio-rate cutoff automation. */
export function renderPaperGesture(kind:PaperGesture, rate:number, peak:number):Float64Array {
  const peel=kind==="peel";
  const out=new Float64Array(Math.round(rate*(peel?.065:.075)));
  const random=mulberry32(hashString("trazo-paper-"+kind));
  let x1=0,x2=0,y1=0,y2=0,phase=0;
  const noiseStop=peel?.065:.04, oscStop=peel?.06:.075;
  // The touch is a quieter adaptation of Trazo's placement sound, not a
  // claim that Trazo ships a distinct hover effect.
  for(let i=0;i<out.length;i++){
    const time=i/rate;
    let value=0;
    if(time<noiseStop){
      const cutoff=peel?sweep(time,1600,3200,.055):1400;
      const w=TAU*Math.min(cutoff,rate*.45)/rate, c=Math.cos(w);
      const alpha=Math.sin(w)/(2*(peel?1.4:Math.SQRT1_2));
      const a0=1+alpha;
      const b0=peel?alpha:(1-c)/2;
      const b1=peel?0:1-c;
      const b2=peel?-alpha:b0;
      const x=random()*2-1;
      const y=(b0*x+b1*x1+b2*x2+2*c*y1-(1-alpha)*y2)/a0;
      x2=x1;x1=x;y2=y1;y1=y;
      value+=y*ramp(time,peel?.012:.005,peel?.06:.035,peel?.045:.032);
    }
    if(time<oscStop){
      const frequency=peel?sweep(time,280,430,.05):sweep(time,290,145,.065);
      // Band-limited triangle; the source's place oscillator is a sine.
      let wave=Math.sin(phase);
      if(peel){
        let sum=0;
        for(let h=1;h<=Math.min(31,Math.floor(rate*.45/frequency));h+=2)
          sum+=((h%4===1?1:-1)/(h*h))*Math.sin(h*phase);
        wave=sum*8/(Math.PI*Math.PI);
      }
      phase+=TAU*frequency/rate;
      value+=wave*ramp(time,peel?.008:.006,peel?.055:.07,peel?.05:.085);
    }
    out[i]=value;
  }
  fadeEdges(out,.0002,.005,rate);
  scaleToPeak(out,peak);
  return out;
}
