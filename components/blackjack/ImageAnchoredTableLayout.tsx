"use client";

import React, { useState } from "react";

export interface AnchorZone {
  id: string;
  label: string;
  x: number;   // % from left
  y: number;   // % from top
  w: number;   // % width
  h: number;   // % height
}

interface ImageAnchoredTableLayoutProps {
  imageSrc: string;
  aspectRatio: string;            // e.g. "877 / 638"
  anchors: AnchorZone[];
  debug?: boolean;
  children: (anchors: AnchorZone[]) => React.ReactNode;
  className?: string;
}

/**
 * Reusable component that renders a background image at a fixed aspect ratio
 * and exposes percentage-based anchor zones for absolute-positioned overlays.
 * Can be used for any table game by swapping the image + anchor map.
 */
export default function ImageAnchoredTableLayout({
  imageSrc,
  aspectRatio,
  anchors,
  debug = false,
  children,
  className = "",
}: ImageAnchoredTableLayoutProps) {
  const [showDebug, setShowDebug] = useState(debug);

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio }}>
      {/* Background table image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageSrc})` }}
      />

      {/* Debug overlay toggle */}
      {debug && (
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="absolute top-1 right-1 z-[100] bg-black/80 text-white text-[10px] px-2 py-0.5 rounded hover:bg-black"
        >
          {showDebug ? "Hide" : "Show"} Anchors
        </button>
      )}

      {/* Debug anchor boxes */}
      {showDebug &&
        anchors.map((a) => (
          <div
            key={a.id}
            className="absolute border-2 border-red-500/80 bg-red-500/10 z-[90] pointer-events-none flex items-end justify-center"
            style={{
              left: `${a.x}%`,
              top: `${a.y}%`,
              width: `${a.w}%`,
              height: `${a.h}%`,
            }}
          >
            <span className="text-[8px] text-red-300 bg-black/60 px-1 rounded-t leading-tight">
              {a.label}
            </span>
          </div>
        ))}

      {/* Interactive overlay layer */}
      <div className="absolute inset-0 z-10">{children(anchors)}</div>
    </div>
  );
}

/** Helper: get an anchor by id from the anchors array */
export function getAnchor(anchors: AnchorZone[], id: string): AnchorZone | undefined {
  return anchors.find((a) => a.id === id);
}

/** Helper: convert anchor to inline style */
export function anchorStyle(anchor: AnchorZone): React.CSSProperties {
  return {
    position: "absolute",
    left: `${anchor.x}%`,
    top: `${anchor.y}%`,
    width: `${anchor.w}%`,
    height: `${anchor.h}%`,
  };
}
