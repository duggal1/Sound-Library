import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", "aria-hidden": true, focusable: false, fill: "currentColor" } as const;

// Verdant paper cuts: filled silhouettes, diagonal folds and open negative space.
// Secondary facets are cut from the same ink, not outlined or separately colored.
export const PlayIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M6 3.5 20.5 12 6 20.5V3.5Z"/><path d="M6 3.5 11 12 6 20.5Z" fill="var(--paper-fold,white)" opacity=".28"/></svg>
);
export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M10.5 2.5h3v9l3.7-3.5 2.1 2.1-7.3 7-7.3-7L6.8 8l3.7 3.5Z"/><path d="M3 16h3v3h12v-3h3v6H3Z"/><path d="M3 16h3v3Z" opacity=".45"/></svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}><path fillRule="evenodd" d="M10 2.8a7.2 7.2 0 0 1 5.9 11.3l5.5 5.5-2 2-5.5-5.5A7.2 7.2 0 1 1 10 2.8Zm0 2.7a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/><path d="m14.8 15.5 1.5-1.5 5.1 5.6-2 2Z" opacity=".65"/></svg>
);
export const ChevronIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="m8 4.5 8 7.5-8 7.5-2-2.2 5.6-5.3L6 6.7Z"/></svg>
);
export const ArrowIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 10.6h12.4L11 6.1l2-2.1 8 8-8 8-2-2.1 4.4-4.5H3Z"/><path d="m15.4 10.6 5.6 1.4-5.6 1.4Z" fill="var(--paper-fold,white)" opacity=".22"/></svg>
);
export const PrevIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3.8 5h2.8v14H3.8Z"/><path d="M19.8 4.4 7.7 12l12.1 7.6Z"/><path d="m19.8 4.4-4.5 7.6 4.5 7.6Z" fill="var(--paper-fold,white)" opacity=".28"/></svg>
);
export const NextIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M17.4 5h2.8v14h-2.8Z"/><path d="M4.2 4.4 16.3 12 4.2 19.6Z"/><path d="m4.2 4.4 4.5 7.6-4.5 7.6Z" fill="var(--paper-fold,white)" opacity=".28"/></svg>
);
export const BrandMark = (p: IconProps) => (
  <svg {...base} {...p}><path d="M2 5 11 10.5 22 2 14 16 10 13 2 22Z"/><path d="M2 5 10 13 2 22Z" opacity=".55"/><path d="M11 10.5 22 2 14 16Z" fill="var(--paper-fold,white)" opacity=".25"/></svg>
);
export const ArchiveIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="m5 2 14 2v3L5 5Z" opacity=".5"/><path d="M3 7h18v4H3Z"/><path fillRule="evenodd" d="M4 12h16v10H4Zm5 3v2.5h6V15Z"/></svg>
);
export const VolumeIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 9h4l6-5v16l-6-5H3Z"/><path d="M15 8a5 5 0 0 1 0 8v-2.4a2.7 2.7 0 0 0 0-3.2ZM17 4.5a9 9 0 0 1 0 15v-2.7a6.5 6.5 0 0 0 0-9.6Z" opacity=".7"/></svg>
);
export const ClearIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="m6 4.6 6 6 6-6 1.4 1.4-6 6 6 6-1.4 1.4-6-6-6 6-1.4-1.4 6-6-6-6Z"/></svg>
);
