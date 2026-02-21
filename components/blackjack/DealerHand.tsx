"use client";

import React from "react";
import BlackjackCard from "./BlackjackCard";

interface CardData {
  suit: string;
  rank: string;
  value: number;
}

interface DealerHandProps {
  cards: CardData[];
  dealerValue: number;
  dealerHidden: boolean;
  visibleCards: number;
  isDealing: boolean;
  isRevealing: boolean;
  isFinished: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function DealerHand({
  cards,
  dealerValue,
  dealerHidden,
  visibleCards,
  isDealing,
  isRevealing,
  isFinished,
  style,
  className = "",
}: DealerHandProps) {
  const isBusted = dealerValue > 21;
  const isBlackjack = cards.length === 2 && dealerValue === 21;
  const showValue = !isDealing && (isFinished || !dealerHidden);

  return (
    <div
      className={`absolute flex flex-col items-center justify-start pt-1 ${className}`}
      style={style}
    >
      {/* Dealer label + value */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-green-200/50 text-[8px] sm:text-[10px] uppercase tracking-widest font-medium">
          Dealer
        </span>
        {showValue && (
          <span
            className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold border
              ${isBlackjack
                ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-300 animate-pulse"
                : isBusted
                ? "bg-red-700 text-white border-red-500"
                : "bg-black/70 text-yellow-200 border-yellow-600/50"
              }
            `}
          >
            {isBlackjack ? "BJ!" : isBusted ? "BUST" : dealerValue}
          </span>
        )}
        {isDealing && (
          <span className="text-yellow-400/80 text-[8px] font-medium animate-pulse">
            Dealing...
          </span>
        )}
      </div>

      {/* Dealer cards */}
      <div className="flex justify-center gap-1 sm:gap-1.5 min-h-[74px] sm:min-h-[96px] items-center">
        {cards.map((card, i) => (
          <BlackjackCard
            key={i}
            card={card}
            visible={i < visibleCards}
            isNew={i === visibleCards - 1 && (isDealing || i >= 2)}
            hidden={i === 1 && dealerHidden && !isRevealing}
            isRevealing={i === 1 && isRevealing}
            size="md"
          />
        ))}
      </div>
    </div>
  );
}
