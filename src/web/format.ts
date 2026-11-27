const MINUS = "\u2212";
const counts = new Intl.NumberFormat("en-US");

export function fmtMs(seconds: number): string {
  return seconds < 1 ? `${Math.round(seconds * 1000)} ms` : `${seconds.toFixed(2)} s`;
}

export function fmtMsRounded(ms: number): string {
  return `${Math.round(ms)} ms`;
}

export function fmtDb(db: number): string {
  const rounded = Math.round(db * 10) / 10;
  return `${rounded < 0 ? MINUS : ""}${Math.abs(rounded).toFixed(1)} dBFS`;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtCount(n: number): string {
  return counts.format(Math.round(n));
}

export function fmtSigned(value: number, digits = 2): string {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : value < 0 ? `${MINUS}${text.replace("-", "")}` : "0";
}
