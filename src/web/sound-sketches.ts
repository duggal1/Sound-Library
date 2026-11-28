// Original layered Trazo art: Aditya Ojha, MIT, 35c86c90c558d88c84bb218a855f1ddea3c91ccd. See licenses/trazo-MIT.txt.
// Verdant sound-specific sketches are original. Artwork is cached once per shape.
const urls:Record<string,string> = {
  "mouse":new URL("./sketches/mouse.svg",import.meta.url).href,
  "cursor":new URL("./sketches/cursor.svg",import.meta.url).href,
  "diamond":new URL("./sketches/diamond.svg",import.meta.url).href,
  "keycap":new URL("./sketches/keycap.svg",import.meta.url).href,
  "keyboard":new URL("./sketches/keyboard.svg",import.meta.url).href,
  "game-coral-key":new URL("./sketches/game-coral-key.svg",import.meta.url).href,
  "yellow-pencil":new URL("./sketches/yellow-pencil.svg",import.meta.url).href,
  "spiral-notebook":new URL("./sketches/spiral-notebook.svg",import.meta.url).href,
  "switch":new URL("./sketches/switch.svg",import.meta.url).href,
  "check":new URL("./sketches/check.svg",import.meta.url).href,
  "slider":new URL("./sketches/slider.svg",import.meta.url).href,
  "game-mint-gem":new URL("./sketches/game-mint-gem.svg",import.meta.url).href,
  "bell":new URL("./sketches/bell.svg",import.meta.url).href,
  "party-popper":new URL("./sketches/party-popper.svg",import.meta.url).href,
  "speech-bubble":new URL("./sketches/speech-bubble.svg",import.meta.url).href,
  "sparkle-four":new URL("./sketches/sparkle-four.svg",import.meta.url).href,
  "heart-burst":new URL("./sketches/heart-burst.svg",import.meta.url).href,
  "paper-plane":new URL("./sketches/paper-plane.svg",import.meta.url).href,
  "loop-arrow-orange":new URL("./sketches/loop-arrow-orange.svg",import.meta.url).href,
  "sky-coil":new URL("./sketches/sky-coil.svg",import.meta.url).href,
  "zigzag-scribble":new URL("./sketches/zigzag-scribble.svg",import.meta.url).href,
  "curly-arrow":new URL("./sketches/curly-arrow.svg",import.meta.url).href,
  "spiral":new URL("./sketches/spiral.svg",import.meta.url).href,
  "ocean-waves":new URL("./sketches/ocean-waves.svg",import.meta.url).href,
  "lightning-bolt":new URL("./sketches/lightning-bolt.svg",import.meta.url).href,
  "rocket":new URL("./sketches/rocket.svg",import.meta.url).href,
  "sun-burst":new URL("./sketches/sun-burst.svg",import.meta.url).href,
  "game-coin":new URL("./sketches/game-coin.svg",import.meta.url).href,
  "speaker":new URL("./sketches/speaker.svg",import.meta.url).href,
  "headphones":new URL("./sketches/headphones.svg",import.meta.url).href,
  "puffy-cloud":new URL("./sketches/puffy-cloud.svg",import.meta.url).href,
};
const choices:Record<string,string[]> = {"pointer":["mouse","cursor","diamond"],"keyboard":["keycap","keyboard","game-coral-key"],"typing":["keyboard","yellow-pencil","keycap","spiral-notebook"],"toggle":["switch","check","slider","game-mint-gem"],"notify":["bell","party-popper","speech-bubble","sparkle-four","heart-burst"],"motion":["paper-plane","loop-arrow-orange","sky-coil","zigzag-scribble","curly-arrow","spiral","ocean-waves"],"progress":["slider","lightning-bolt","rocket","sun-burst","game-coin"],"classic":["speaker","headphones"]};
const direct:Record<string,string> = {"click":"mouse","hover":"cursor","drag":"paper-plane","send":"paper-plane","dismiss":"spiral","swipe":"ocean-waves","close":"loop-arrow-orange","open":"curly-arrow","key-space":"keyboard","key-enter":"keycap","key-a":"keycap","wheel-step":"sky-coil","switch-latch":"switch","drop-soft":"puffy-cloud","drop-snap":"lightning-bolt","control-back":"curly-arrow","toggle-engage":"switch","mouse-down":"mouse","slider-step":"slider","confirm-choice":"check","notification":"bell","success":"party-popper"};
export function sketchSource(id:string,category:string){
 let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 const group=choices[category]??choices.classic!;
 return urls[direct[id]??group[hash%group.length]!]!;
}
