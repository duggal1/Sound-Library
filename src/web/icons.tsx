import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;

export const PlayIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 5.2v13.6L19.2 12z" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M11 4h2v8.1l2.9-2.9 1.4 1.4L12 16l-5.3-5.4 1.4-1.4 2.9 2.9z" />
    <path d="M5 18h14v2H5z" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path
      fillRule="evenodd"
      d="M10.5 4a6.5 6.5 0 1 0 4.1 11.5l3.9 3.9 1.4-1.4-3.9-3.9A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"
    />
  </svg>
);

export const ChevronIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9.2 5.6 15.6 12l-6.4 6.4-1.4-1.4 5-5-5-5z" />
  </svg>
);

export const ArrowIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 11h11.2l-3.9-3.9 1.4-1.4L19 12l-6.3 6.3-1.4-1.4 3.9-3.9H4z" />
  </svg>
);

export const PrevIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 5h2v14H6z" />
    <path d="M19 5.4v13.2L9.6 12z" />
  </svg>
);

export const NextIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M16 5h2v14h-2z" />
    <path d="M5 5.4v13.2L14.4 12z" />
  </svg>
);

export const BrandMark = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 3h11L3 14z" />
    <path d="M21 21H10l11-11z" />
  </svg>
);
