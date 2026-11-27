import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement>;
const base = {viewBox:"0 0 24 24", "aria-hidden":true, focusable:false, fill:"currentColor"} as const;
// Single-cut paper silhouettes: small optical area, clear negative space.
export const PlayIcon = (p:IconProps) => <svg {...base} {...p}><path d="M8 5.5 19 12 8 18.5Z"/></svg>;
export const StopIcon = (p:IconProps) => <svg {...base} {...p}><path d="M7 7h10v10H7z"/></svg>;
export const DownloadIcon = (p:IconProps) => <svg {...base} {...p}><path d="M11.25 3.5h1.5v10.6l3.8-3.8 1.1 1.1L12 17l-5.65-5.6 1.1-1.1 3.8 3.8zM5.5 19h13v1.5h-13z"/></svg>;
export const SearchIcon = (p:IconProps) => <svg {...base} {...p}><path fillRule="evenodd" d="M10.4 4a6.4 6.4 0 1 0 4 11.4l4.7 4.7 1-1-4.7-4.7A6.4 6.4 0 0 0 10.4 4Zm0 1.5a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Z"/></svg>;
export const ChevronIcon = (p:IconProps) => <svg {...base} {...p}><path d="m9 6 6 6-6 6-1.1-1.1 4.9-4.9-4.9-4.9z"/></svg>;
export const ArrowIcon = (p:IconProps) => <svg {...base} {...p}><path d="M4.5 11.25h12L12 6.8l1.1-1.1 6.3 6.3-6.3 6.3-1.1-1.1 4.5-4.45h-12z"/></svg>;
export const PrevIcon = (p:IconProps) => <svg {...base} {...p}><path d="M5 6h1.8v12H5zM18 5.5 8 12l10 6.5z"/></svg>;
export const NextIcon = (p:IconProps) => <svg {...base} {...p}><path d="M17.2 6H19v12h-1.8zM6 5.5 16 12 6 18.5z"/></svg>;
export const BrandMark = (p:IconProps) => <svg {...base} {...p}><path d="M3 4 12 10 21 3 15 17 10 14 3 21Z"/><path d="m3 4 7 10-7 7z" fill="#fff" opacity=".28"/></svg>;
export const VolumeIcon = (p:IconProps) => <svg {...base} {...p}><path d="M4 9h4l5-4v14l-5-4H4zM15.5 8a5 5 0 0 1 0 8v-2a3.2 3.2 0 0 0 0-4zM18 5a9 9 0 0 1 0 14v-1.9a7 7 0 0 0 0-10.2z"/></svg>;
export const ClearIcon = (p:IconProps) => <svg {...base} {...p}><path d="m6.4 5.3 5.6 5.6 5.6-5.6 1.1 1.1-5.6 5.6 5.6 5.6-1.1 1.1-5.6-5.6-5.6 5.6-1.1-1.1 5.6-5.6-5.6-5.6z"/></svg>;
