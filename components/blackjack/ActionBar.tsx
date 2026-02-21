"use client";

import React from "react";

interface ActionBarProps {
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  insuranceTaken: boolean;
  disabled: boolean;
  onAction: (action: "hit" | "stand" | "double" | "split" | "insurance") => void;
  style?: React.CSSProperties;
  className?: string;
}

const ACTION_STYLES: Record<string, { bg: string; label: string; key: string }> = {
  hit:       { bg: "linear-gradient(180deg, #3B82F6, #1D4ED8)", label: "Hit",       key: "H" },
  stand:     { bg: "linear-gradient(180deg, #D97706, #B45309)", label: "Stand",     key: "S" },
  double:    { bg: "linear-gradient(180deg, #059669, #047857)", label: "Double",    key: "D" },
  split:     { bg: "linear-gradient(180deg, #7C3AED, #5B21B6)", label: "Split",     key: "P" },
  insurance: { bg: "linear-gradient(180deg, #DC2626, #B91C1C)", label: "Insurance", key: "I" },
};

export default function ActionBar({
  canHit,
  canStand,
  canDouble,
  canSplit,
  canInsurance,
  insuranceTaken,
  disabled,
  onAction,
  style,
  className = "",
}: ActionBarProps) {
  const actions: { id: "hit" | "stand" | "double" | "split" | "insurance"; visible: boolean }[] = [
    { id: "hit",       visible: canHit },
    { id: "stand",     visible: canStand },
    { id: "double",    visible: canDouble },
    { id: "split",     visible: canSplit },
    { id: "insurance", visible: canInsurance && !insuranceTaken },
  ];

  const visibleActions = actions.filter((a) => a.visible);

  if (visibleActions.length === 0) return null;

  return (
    <div
      className={`absolute flex items-center justify-center gap-1.5 sm:gap-2 z-[40] ${className}`}
      style={style}
    >
      {visibleActions.map(({ id }) => {
        const s = ACTION_STYLES[id];
        return (
          <button
            key={id}
            onClick={() => onAction(id)}
            disabled={disabled}
            className="
              px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold
              text-[10px] sm:text-sm text-white shadow-lg
              transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:brightness-110 active:scale-95
              border border-white/10
            "
            style={{ background: s.bg }}
          >
            {s.label}
            <span className="hidden sm:inline text-[9px] opacity-50 ml-1">[{s.key}]</span>
          </button>
        );
      })}
    </div>
  );
}
