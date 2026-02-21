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
  size?: "sm" | "md" | "lg";
  originX?: number;
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
  const sizeClasses = {
    sm: "w-[52px] h-[74px] text-[10px]",
    md: "w-[68px] h-[96px] sm:w-[80px] sm:h-[112px] text-xs sm:text-sm",
    lg: "w-[90px] h-[126px] sm:w-[100px] sm:h-[140px] text-sm sm:text-base",
  }[size];

  const centerSymbolSize = {
    sm: "text-2xl",
    md: "text-3xl sm:text-4xl",
    lg: "text-4xl sm:text-5xl",
  }[size];

  if (!visible) {
    return <div className={sizeClasses} />;
  }

  const symbol = SUIT_SYMBOLS[card.suit] || "?";
  const color = isRed(card.suit) ? "text-red-600" : "text-gray-900";

  return (
    <div
      className={`
        relative ${sizeClasses} rounded-lg shadow-xl
        transform transition-all duration-500 ease-out
        ${isNew ? "bj-animate-deal" : ""}
        ${isRevealing ? "bj-animate-flip" : ""}
        ${isWinning ? "bj-animate-win-glow" : ""}
        flex-shrink-0
      `}
      style={{ transformStyle: "preserve-3d" }}
    >
      {hidden ? (
        /* Card back — premium design */
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #7B0000 0%, #9B1B1B 40%, #7B0000 60%, #5A0000 100%)",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="absolute inset-[3px] rounded-md border-2 border-yellow-600/30"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,215,0,0.06) 4px, rgba(255,215,0,0.06) 5px),
                repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,215,0,0.06) 4px, rgba(255,215,0,0.06) 5px)
              `,
              backgroundColor: "#8B1A1A",
            }}
          >
            <div className="absolute inset-[6px] rounded-sm border border-yellow-500/20 flex items-center justify-center">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-yellow-500/30 flex items-center justify-center">
                <span className="text-yellow-500/40 text-[8px] sm:text-[10px] font-bold">♠</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Card face — clean professional design */
        <div
          className="absolute inset-0 flex flex-col rounded-lg overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 100%)",
            border: "1px solid #D1D5DB",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.8)",
          }}
        >
          {/* Top-left rank + suit */}
          <div className={`absolute top-1 left-1.5 ${color}`}>
            <div className="flex flex-col items-center leading-none">
              <span className="font-black tracking-tight">{card.rank}</span>
              <span className="text-[0.8em] -mt-0.5">{symbol}</span>
            </div>
          </div>
          {/* Center symbol */}
          <div className={`flex-1 flex items-center justify-center ${color}`}>
            <span className={`${centerSymbolSize} drop-shadow-sm`}>{symbol}</span>
          </div>
          {/* Bottom-right rank + suit (inverted) */}
          <div className={`absolute bottom-1 right-1.5 ${color} rotate-180`}>
            <div className="flex flex-col items-center leading-none">
              <span className="font-black tracking-tight">{card.rank}</span>
              <span className="text-[0.8em] -mt-0.5">{symbol}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
