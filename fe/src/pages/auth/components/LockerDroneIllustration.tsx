import * as React from "react";

type CellState = "idle" | "occupied" | "open" | "fault";

// 3 columns x 4 rows; the kiosk screen takes the middle cell of row 2.
const CELLS: CellState[][] = [
  ["occupied", "idle", "occupied"],
  ["idle", "idle", "open"],
  ["occupied", "fault", "idle"],
  ["idle", "occupied", "occupied"],
];

const CELL_FILL: Record<CellState, string> = {
  idle: "#1E293B",
  occupied: "#334155",
  open: "#0EA5E9",
  fault: "#F59E0B",
};

/** Decorative locker cabinet with a drone landing on its pad. */
export default function LockerDroneIllustration({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const cabinetX = 48;
  const cabinetY = 120;
  const cellW = 44;
  const cellH = 34;
  const gap = 6;

  return (
    <svg
      viewBox="0 0 360 300"
      className={className}
      role="img"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        .lr-drone { animation: lr-hover 3.2s ease-in-out infinite; transform-box: fill-box; }
        .lr-rotor { animation: lr-spin 0.35s linear infinite; transform-box: fill-box; transform-origin: center; }
        .lr-blink { animation: lr-blink 2s ease-in-out infinite; }
        @keyframes lr-hover { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes lr-spin { from { transform: scaleX(1) } 50% { transform: scaleX(0.35) } to { transform: scaleX(1) } }
        @keyframes lr-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        @media (prefers-reduced-motion: reduce) {
          .lr-drone, .lr-rotor, .lr-blink { animation: none; }
        }
      `}</style>

      {/* Ground */}
      <ellipse cx="180" cy="284" rx="150" ry="8" fill="#020617" opacity="0.6" />

      {/* Flight path */}
      <path
        d="M20 40 C 90 10, 170 20, 268 78"
        fill="none"
        stroke="#38BDF8"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />

      {/* Cabinet */}
      <rect
        x={cabinetX - 10}
        y={cabinetY - 26}
        width={cellW * 3 + gap * 2 + 20}
        height={cellH * 4 + gap * 3 + 46}
        rx="10"
        fill="#0F172A"
        stroke="#334155"
      />
      <rect
        x={cabinetX - 10}
        y={cabinetY - 26}
        width={cellW * 3 + gap * 2 + 20}
        height="18"
        rx="9"
        fill="#1E293B"
      />
      <text
        x={cabinetX + 4}
        y={cabinetY - 13}
        fill="#94A3B8"
        fontSize="9"
        fontWeight="600"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="1"
      >
        LOCK.R
      </text>
      <circle className="lr-blink" cx={cabinetX + cellW * 3 + gap * 2} cy={cabinetY - 17} r="3" fill="#22C55E" />

      {CELLS.map((row, r) =>
        row.map((state, c) => {
          const x = cabinetX + c * (cellW + gap);
          const y = cabinetY + r * (cellH + gap);
          if (r === 1 && c === 1) {
            // Kiosk screen with keypad
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={cellW} height={cellH} rx="4" fill="#0B1220" stroke="#38BDF8" strokeOpacity="0.6" />
                <rect x={x + 5} y={y + 5} width={cellW - 10} height="9" rx="2" fill="#38BDF8" opacity="0.8" />
                {[0, 1, 2].map((k) => (
                  <rect key={k} x={x + 7 + k * 11} y={y + 19} width="8" height="4" rx="1" fill="#475569" />
                ))}
                {[0, 1, 2].map((k) => (
                  <rect key={k} x={x + 7 + k * 11} y={y + 26} width="8" height="4" rx="1" fill="#475569" />
                ))}
              </g>
            );
          }
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx="4"
                fill={CELL_FILL[state]}
                stroke="#475569"
                strokeOpacity="0.6"
              />
              <rect x={x + cellW - 9} y={y + cellH / 2 - 4} width="3" height="8" rx="1.5" fill="#64748B" />
              {state === "open" && (
                <path d={`M${x + 14} ${y + 17} l5 5 l10 -10`} fill="none" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {state === "fault" && (
                <path d={`M${x + 22} ${y + 9} v10 M${x + 22} ${y + 24} v0.5`} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              )}
            </g>
          );
        }),
      )}

      {/* Landing pad beside the cabinet */}
      <rect x="232" y="236" width="84" height="44" rx="6" fill="#0F172A" stroke="#334155" />
      <rect x="240" y="252" width="68" height="4" rx="2" fill="#334155" />
      <rect x="240" y="262" width="68" height="4" rx="2" fill="#334155" />
      <ellipse cx="274" cy="236" rx="48" ry="11" fill="#1E293B" stroke="#38BDF8" strokeOpacity="0.6" />
      <ellipse cx="274" cy="236" rx="30" ry="6.5" fill="none" stroke="#38BDF8" strokeOpacity="0.35" strokeDasharray="3 3" />
      <text
        x="274"
        y="239.5"
        textAnchor="middle"
        fill="#38BDF8"
        fontSize="10"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        H
      </text>

      {/* Drone */}
      <g className="lr-drone">
        <path d="M274 132 v86" stroke="#38BDF8" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 4" />
        <line x1="238" y1="96" x2="310" y2="96" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        <line x1="246" y1="96" x2="246" y2="88" stroke="#94A3B8" strokeWidth="3" />
        <line x1="302" y1="96" x2="302" y2="88" stroke="#94A3B8" strokeWidth="3" />
        <ellipse className="lr-rotor" cx="246" cy="86" rx="16" ry="2.5" fill="#CBD5E1" opacity="0.8" />
        <ellipse className="lr-rotor" cx="302" cy="86" rx="16" ry="2.5" fill="#CBD5E1" opacity="0.8" />
        <rect x="258" y="90" width="32" height="16" rx="6" fill="#E2E8F0" />
        <circle className="lr-blink" cx="274" cy="98" r="2.5" fill="#0EA5E9" />
        <line x1="266" y1="106" x2="264" y2="114" stroke="#94A3B8" strokeWidth="2" />
        <line x1="282" y1="106" x2="284" y2="114" stroke="#94A3B8" strokeWidth="2" />
        {/* Parcel */}
        <rect x="263" y="114" width="22" height="16" rx="2" fill="#F59E0B" />
        <path d="M274 114 v16" stroke="#B45309" strokeWidth="2" />
      </g>
    </svg>
  );
}
