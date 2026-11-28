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
export const BrandMark = (p:IconProps) => <svg {...base} {...p}><path d="M3 8.5a1.7 1.7 0 0 1 3.4 0v7a1.7 1.7 0 0 1-3.4 0zM8 5.5a1.7 1.7 0 0 1 3.4 0v13a1.7 1.7 0 0 1-3.4 0zM13 3.5a1.7 1.7 0 0 1 3.4 0v17a1.7 1.7 0 0 1-3.4 0zM18 8.5a1.7 1.7 0 0 1 3.4 0v7a1.7 1.7 0 0 1-3.4 0z"/></svg>;
export const GitHubIcon = (p:IconProps) => <svg {...base} {...p}><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1.01 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.09 1.15a10.77 10.77 0 0 1 5.62 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.12c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z"/></svg>;
export const VolumeIcon = (p:IconProps) => <svg {...base} {...p}><path d="M4 9h4l5-4v14l-5-4H4zM15.5 8a5 5 0 0 1 0 8v-2a3.2 3.2 0 0 0 0-4zM18 5a9 9 0 0 1 0 14v-1.9a7 7 0 0 0 0-10.2z"/></svg>;
export const ClearIcon = (p:IconProps) => <svg {...base} {...p}><path d="m6.4 5.3 5.6 5.6 5.6-5.6 1.1 1.1-5.6 5.6 5.6 5.6-1.1 1.1-5.6-5.6-5.6 5.6-1.1-1.1 5.6-5.6-5.6-5.6z"/></svg>;

export const BookmarkIcon = ({filled=false,...p}:IconProps & {filled?:boolean}) => <svg {...base} {...p}>{filled?<path d="M6 3h12v18l-6-4-6 4z"/>:<path fillRule="evenodd" d="M6 3h12v18l-6-4-6 4zm1.7 1.7v13.1l4.3-2.9 4.3 2.9V4.7z"/>}</svg>;

export const MuteIcon = (p:IconProps) => <svg {...base} {...p}><path d="M4 9h4l5-4v14l-5-4H4zM16.1 8.9l1.1-1.1 2.1 2.1 2.1-2.1 1.1 1.1-2.1 2.1 2.1 2.1-1.1 1.1-2.1-2.1-2.1 2.1-1.1-1.1 2.1-2.1z"/></svg>;

export type SoundGlyph = "pointer" | "keyboard" | "toggle" | "notify" | "motion" | "typing" | "progress" | "classic";
export function SoundIcon({ kind, className, ...props }: IconProps & {kind: SoundGlyph}) {
  return <svg {...base} {...props} className={className ? "sound-icon " + className : "sound-icon"} fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
    {kind === "pointer" && <><rect x="6.5" y="2.8" width="11" height="18.4" rx="5.5"/><path d="M6.8 10h10.4M12 3v7"/><path d="M8.1 8.2V7.7a4 4 0 0 1 2-3.3v3.8z" fill="currentColor" stroke="none"/></>}
    {kind === "keyboard" && <><rect x="2.6" y="5.8" width="18.8" height="12.4" rx="3"/><path d="M6 9.5h.7m3.2 0h.7m3 0h.7m3 0h.7M6 13h.7m10.6 0h.7M9.5 14.7h5"/></>}
    {kind === "toggle" && <><rect x="2.8" y="6.4" width="18.4" height="11.2" rx="5.6"/><circle cx="15.5" cy="12" r="3.25" fill="currentColor" stroke="none"/><path d="M6.5 12h1.6"/></>}
    {kind === "notify" && <><path d="M5 16.8c1.9-2 2.1-3.6 2.1-6.3a4.9 4.9 0 0 1 9.8 0c0 2.7.2 4.3 2.1 6.3H5ZM10 20h4M12 3v2.6"/><path d="m4.8 7-1.1 2.6m15.5-2.6 1.1 2.6"/></>}
    {kind === "motion" && <><path d="M3 8h15m-3.3-3.5L18.2 8l-3.5 3.5M21 16H6m3.3-3.5L5.8 16l3.5 3.5"/><circle cx="20.4" cy="8" r=".75" fill="currentColor" stroke="none"/><circle cx="3.6" cy="16" r=".75" fill="currentColor" stroke="none"/></>}
    {kind === "typing" && <><rect x="5" y="4.5" width="14" height="15" rx="3"/><path d="M9 9.2h6m-3 0v5.8m-1.7 0h3.4"/></>}
    {kind === "progress" && <><path d="M3.4 12h17.2" opacity=".32"/><path d="M3.4 12h10.8"/><rect x="13.6" y="9.2" width="5.6" height="5.6" rx="1.3" fill="currentColor" stroke="none"/><path d="M3.4 9.5v5"/></>}
    {kind === "classic" && <><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.5"/><path d="M6.9 12a5.1 5.1 0 0 1 5.1-5.1m5.1 5.1a5.1 5.1 0 0 1-5.1 5.1"/></>}
  </svg>;
}
