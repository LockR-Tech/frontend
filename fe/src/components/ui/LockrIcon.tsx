import React, { useEffect, useId } from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
  idPrefix?: string;
};

export default function LockrIcon({ size = 56, idPrefix, className, ...rest }: Props) {
  const reactId = useId();
  const prefix = idPrefix ?? `lockr-${reactId.replace(/:/g, "-")}`;

  useEffect(() => {
    // Ensure Gugi font is loaded once
    const href = "https://fonts.googleapis.com/css2?family=Gugi&display=swap";
    if (!document.querySelector(`link[href='${href}']`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  const w = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 400 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <defs>
        <linearGradient id={`${prefix}-shineGradient`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <filter id={`${prefix}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <mask id={`${prefix}-text-mask`} maskUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="black" />
          <text
            id={`${prefix}-maskText`}
            x="50%"
            y="66%"
            textAnchor="middle"
            fill="white"
            fontFamily="Gugi, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight={400}
            fontSize={54}
          >
            Lock.R
          </text>
        </mask>

      </defs>

      <style>{`
        .lockr-${prefix} { overflow: visible; }
        .logo-text-${prefix} { fill: #C97C4F; font-family: Gugi, system-ui, sans-serif; font-weight: 400; font-size: 54px; text-anchor: middle; }
        .shimmer-rect-${prefix} { transform: translateX(-140%); }
        .glow-copy-${prefix} { opacity: 0; filter: url(#${prefix}-glow); }

        .lockr-${prefix}:hover .shimmer-rect-${prefix} {
          animation: sweep-${prefix} 1.2s ease-in-out forwards;
        }

        .lockr-${prefix}:hover .glow-copy-${prefix} {
          animation: glow-${prefix} 1.2s ease-in-out forwards;
        }

        @keyframes sweep-${prefix} {
          0% { transform: translateX(-140%); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateX(0%); opacity: 1; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        @keyframes glow-${prefix} {
          0% { opacity: 0; }
          30% { opacity: 0.0; }
          45% { opacity: 1; }
          65% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* base text */}
      <g className={`lockr-${prefix}`}> 
        <text className={`logo-text-${prefix}`} x="50%" y="66%">Lock.R</text>
        <text className={`logo-text-${prefix} glow-copy-${prefix}`} x="50%" y="66%">Lock.R</text>
        <rect
          className={`shimmer-rect-${prefix}`}
          x="-60%"
          y="0"
          width="80%"
          height="120"
          fill={`url(#${prefix}-shineGradient)`}
          mask={`url(#${prefix}-text-mask)`}
        />
      </g>
    </svg>
  );
}
