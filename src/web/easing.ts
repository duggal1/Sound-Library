/** Critically damped spring, 0 -> 1, no overshoot. */
export function spring(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const k = 9;
  return (1 - (1 + k * x) * Math.exp(-k * x)) / (1 - (1 + k) * Math.exp(-k));
}

/** Samples the spring into a CSS linear() easing and exposes it as --liquid. */
export function installEasing(): void {
  const steps = Array.from({ length: 81 }, (_, i) => spring(i / 80).toFixed(6));
  const liquid = `linear(${steps.join(",")})`;
  const value = CSS.supports("transition-timing-function", liquid) ? liquid : "cubic-bezier(.16,1,.3,1)";
  document.documentElement.style.setProperty("--liquid", value);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
