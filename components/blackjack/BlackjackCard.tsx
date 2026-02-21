"use client";

import React from "react";

interface CardData {
  suit: string;
  rank: string;
  value: number;
}

interface BlackjackCardProps {
  card: CardData;
  hidden?: boolean;
  isNew?: boolean;
  isWinning?: boolean;
  isRevealing?: boolean;
  visible?: boolean;
  size?: "sm" | "md";
  originX?: number;  // % origin for deal animation (deck shoe position)
  originY?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const isRed = (suit: string) => suit === "hearts" || suit === "diamonds";

export default function BlackjackCard({
  card,
  hidden = false,
  isNew = false,
  isWinning = false,
  isRevealing = false,
  visible = true,
  size = "md",
}: BlackjackCardProps) {
  const sizeClasses = size === "sm"
    ? "w-[44px] h-[62px] text-[9px]"
    : "w-[54px] h-[76px] sm:w-[64px] sm:h-[90px] text-[10px] sm:text-xs";

  if (!visible) {
    return <div className={sizeClasses} />;
  }

  const symbol = SUIT_SYMBOLS[card.suit] || "?";
  const color = isRed(card.suit) ? "text-red-600" : "text-gray-900";

  return (
    <div
      className={`
        relative ${sizeClasses} rounded-md shadow-lg
        transform transition-all duration-500 ease-out
        ${isNew ? "bj-animate-deal" : ""}
        ${isRevealing ? "bj-animate-flip" : ""}
        ${isWinning ? "bj-animate-win-glow" : ""}
        ${hidden ? "" : "bg-white"}
        flex-shrink-0
      `}
      style={{ transformStyle: "preserve-3d" }}
    >
      {hidden ? (
        /* Card back */
        <div
          className="absolute inset-0 rounded-md overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #8B0000 0%, #A52A2A 30%, #8B0000 50%, #A52A2A 70%, #8B0000 100%)",
          }}
        >
          <div
            className="absolute inset-[3px] rounded-sm border border-yellow-600/40"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(139,0,0,0.3) 3px, rgba(139,0,0,0.3) 4px),
                repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(139,0,0,0.3) 3px, rgba(139,0,0,0.3) 4px)`,
              backgroundColor: "#B22222",
            }}
          />
        </div>
      ) : (
        /* Card face */
        <div className="absolute inset-0 p-1 flex flex-col bg-white rounded-md border border-gray-300">
          <div className={`flex items-start ${color}`}>
            <div className="flex flex-col items-center leading-none">
              <span className="font-bold">{card.rank}</span>
              <span>{symbol}</span>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-center ${color}`}>
            <span className="text-xl sm:text-2xl">{symbol}</span>
          </div>
          <div className={`flex items-end justify-end ${color} rotate-180`}>
            <div className="flex flex-col items-center leading-none">
              <span className="font-bold">{card.rank}</span>
              <span>{symbol}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
