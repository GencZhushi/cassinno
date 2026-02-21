"use client";

import React from "react";
import BlackjackChip from "./BlackjackChip";

const CHIP_VALUES = [1, 5, 10, 25, 50, 100];

interface ChipSelectorProps {
  selectedChip: number;
  onSelectChip: (value: number) => void;
  balance: number;
  disabled: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function ChipSelector({
  selectedChip,
  onSelectChip,
  balance,
  disabled,
  style,
  className = "",
}: ChipSelectorProps) {
  return (
    <div
      className={`absolute flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${className}`}
      style={style}
    >
      {CHIP_VALUES.map((v) => (
        <BlackjackChip
          key={v}
          value={v}
          selected={selectedChip === v}
          disabled={disabled || v > balance}
          onClick={() => onSelectChip(v)}
          size="md"
        />
      ))}
    </div>
  );
}

export { CHIP_VALUES };
