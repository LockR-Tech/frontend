import React from 'react';
import arucoDictData from '~/lib/arucoDict4x4.json';

interface ArucoMarkerProps {
  markerId: number;
  dictionary?: string;
  sizePx?: number | string;
  className?: string;
  showQuietZone?: boolean;
  showCutBorder?: boolean;
}

export function ArucoMarker({
  markerId,
  dictionary = 'DICT_4X4_50',
  sizePx = 240,
  className = '',
  showQuietZone = true,
  showCutBorder = false,
}: ArucoMarkerProps) {
  const dict = arucoDictData as Record<string, number[][]>;
  const grid6x6 = dict[String(markerId)];

  if (!grid6x6) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-red-400 text-red-500 text-xs font-mono p-4 ${className}`}
        style={{ width: sizePx, height: sizePx }}
      >
        ArUco ID #{markerId} not in {dictionary}
      </div>
    );
  }

  // 6x6 marker grid (1-bit black border + 4x4 inner data)
  // If showQuietZone is true, we pad with 1 unit of white on all 4 sides => 8x8 total viewBox
  const viewBoxSize = showQuietZone ? 8 : 6;
  const offset = showQuietZone ? 1 : 0;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        aspectRatio: '1 / 1',
        display: 'block',
      }}
    >
      {/* Quiet zone background (pure white) */}
      <rect x="0" y="0" width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />

      {/* 6x6 marker cells: 0 is black, 1 is white */}
      {grid6x6.map((row, r) =>
        row.map((val, c) => (
          <rect
            key={`${r}-${c}`}
            x={c + offset}
            y={r + offset}
            width="1.005"
            height="1.005"
            fill={val === 0 ? '#000000' : '#FFFFFF'}
          />
        ))
      )}

      {/* Viền cắt decal mảnh nét đứt quanh quiet zone */}
      {showCutBorder && (
        <rect
          x="0.03"
          y="0.03"
          width={viewBoxSize - 0.06}
          height={viewBoxSize - 0.06}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="0.04"
          strokeDasharray="0.12 0.08"
        />
      )}
    </svg>
  );
}
