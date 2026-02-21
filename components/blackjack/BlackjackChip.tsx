"use client";

import React from "react";

interface BlackjackChipProps {
  value: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  stacked?: boolean;    // render as stacked chip on table
  className?: string;
}

const CHIP_COLORS: Record<number, { bg: string; border: string; inner: string; text: string }> = {
  1:   { bg: "#FFFFFF", border: "#CCCCCC", inner: "#4169E1", text: "#1A202C" },
  5:   { bg: "#E53E3E", border: "#C53030", inner: "#FEB2B2", text: "#FFFFFF" },
  10:  { bg: "#3182CE", border: "#2B6CB0", inner: "#BEE3F8", text: "#FFFFFF" },
  25:  { bg: "#38A169", border: "#2F855A", inner: "#C6F6D5", text: "#FFFFFF" },
  50:  { bg: "#DD6B20", border: "#C05621", inner: "#FEEBC8", text: "#FFFFFF" },
  100: { bg: "#1A202C", border: "#2D3748", inner: "#A0AEC0", text: "#FFFFFF" },
};

export default function BlackjackChip({
  value,
  selected = false,
  onClick,
  disabled = false,
  size = "md",
  stacked = false,
  className = "",
}: BlackjackChipProps) {
  const s = CHIP_COLORS[value] || CHIP_COLORS[1];

  const sizeClasses = {
    sm: "w-8 h-8 text-[8px]",
    md: "w-11 h-11 sm:w-12 sm:h-12 text-[10px] sm:text-xs",
    lg: "w-14 h-14 text-sm",
  }[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-full shadow-lg
        transform transition-all duration-200
        flex items-center justify-center flex-shrink-0
        ${sizeClasses}
        ${selected ? "scale-110 -translate-y-1.5 z-10" : "hover:scale-105 hover:-translate-y-0.5"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${stacked ? "bj-animate-chip-place" : ""}
        ${className}
      `}
      style={{
        background: s.bg,
        border: `3px dashed ${s.border}`,
        boxShadow: selected
          ? `0 0 12px 3px rgba(255,215,0,0.7), 0 4px 12px rgba(0,0,0,0.4)`
          : `0 2px 8px rgba(0,0,0,0.3)`,
      }}
    >
      <div
        className="absolute inset-[4px] rounded-full"
        style={{ border: `2px solid ${s.inner}`, opacity: 0.5 }}
      />
      <span className="font-bold drop-shadow relative z-[1]" style={{ color: s.text }}>
        {value}
      </span>
    </button>
  );
}

export { CHIP_COLORS };
