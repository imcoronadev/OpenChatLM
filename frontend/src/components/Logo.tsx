import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, showText = true }) => {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-label="OpenChat LM logo"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7aa2f7" />
            <stop offset="1" stopColor="#bb9af7" />
          </linearGradient>
          <linearGradient id="logoBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1a1f29" />
            <stop offset="1" stopColor="#0b0d10" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#logoBg)" stroke="url(#logoGrad)" strokeWidth="2" />
        <path d="M14 22 Q14 14 22 14 L42 14 Q50 14 50 22 L50 32 Q50 40 42 40 L26 40 L18 48 L18 40 Q14 40 14 32 Z" fill="url(#logoGrad)" opacity="0.18" />
        <path d="M16 22 Q16 16 22 16 L42 16 Q48 16 48 22 L48 32 Q48 38 42 38 L24 38 L18 44 L18 38 Q16 38 16 32 Z" fill="none" stroke="url(#logoGrad)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="26" cy="27" r="2" fill="#7aa2f7" />
        <circle cx="32" cy="27" r="2" fill="#bb9af7" />
        <circle cx="38" cy="27" r="2" fill="#7aa2f7" />
        <rect x="20" y="48" width="6" height="3" rx="1" fill="url(#logoGrad)" />
        <rect x="28" y="48" width="14" height="3" rx="1" fill="url(#logoGrad)" opacity="0.6" />
        <rect x="44" y="48" width="6" height="3" rx="1" fill="url(#logoGrad)" opacity="0.3" />
      </svg>
      {showText && (
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-fg" style={{ fontSize: "1.05rem" }}>
            OpenChat LM
          </div>
          <div className="text-[0.7rem] text-fg-mute">local LLM cockpit</div>
        </div>
      )}
    </div>
  );
};