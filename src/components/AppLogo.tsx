import type { AppLogoProps } from "../types/Common";

// The app's mark: energy flowing into (violet) and out of (emerald) a battery.
// The same drawing as public/favicon.svg. Decorative: the name always sits
// next to it.
const AppLogo = ({ className }: AppLogoProps) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#111827" />
    <path
      d="M16.41 23 A18 18 0 0 1 46.2 20.9"
      fill="none"
      stroke="#a78bfa"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M51.9 20.5 L43.3 25.5 L50.6 28.2 Z"
      fill="#a78bfa"
      stroke="#a78bfa"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <g transform="rotate(180 32 32)">
      <path
        d="M16.41 23 A18 18 0 0 1 46.2 20.9"
        fill="none"
        stroke="#34d399"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M51.9 20.5 L43.3 25.5 L50.6 28.2 Z"
        fill="#34d399"
        stroke="#34d399"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
    <rect
      x="26"
      y="23"
      width="12"
      height="20"
      rx="3"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
    />
    <rect x="29.5" y="20" width="5" height="3" rx="1" fill="#ffffff" />
    <path
      d="M33.8 26.5 L28.6 34 H32 L30.3 40 L35.4 32.3 H32 Z"
      fill="#fcd34d"
    />
  </svg>
);

export default AppLogo;
