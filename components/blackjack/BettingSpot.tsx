"use client";

import React from "react";
import BlackjackCard from "./BlackjackCard";
import BlackjackChip from "./BlackjackChip";

interface CardData {
  suit: string;
  rank: string;
  value: number;
}

interface HandData {
  cards: CardData[];
  value: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBusted: boolean;
  isDoubled?: boolean;
  isSplit?: boolean;
  bet: number;
}

interface BettingSpotProps {
  id: string;
  hand?: HandData | null;
  betAmount: number;
  isActive: boolean;           // currently active hand
  isMainSpot: boolean;         // center "Tap to Place Bets" spot
  enabled: boolean;            // can accept bets
  visibleCards: number;
  showResult?: string | null;  // "win" | "lose" | "push" | "blackjack"
  isDealing?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function BettingSpot({
  hand,
  betAmount,
  isActive,
  isMainSpot,
  enabled,
  visibleCards,
  showResult,
  onClick,
  style,
  className = "",
}: BettingSpotProps) {
  const hasHand = hand && hand.cards.length > 0;
  const hasBet = betAmount > 0;

  return (
    <div
      className={`
        absolute flex flex-col items-center justify-center
        transition-all duration-300
        ${enabled && !hasHand ? "cursor-pointer" : ""}
        ${className}
      `}
      style={style}
      onClick={enabled && !hasHand ? onClick : undefined}
    >
      {/* Glow ring for active spot */}
      {isActive && hasHand && (
        <div className="absolute inset-0 rounded-xl border-2 border-yellow-400/60 bj-animate-spot-glow pointer-events-none" />
      )}

      {/* Hover pulse on valid betting spot */}
      {enabled && !hasHand && (
        <div className="absolute inset-0 rounded-xl border border-white/20 hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-300 pointer-events-none" />
      )}

      {/* "Tap to Bet" label for any enabled empty spot */}
      {!hasHand && !hasBet && enabled && (
        <span className="text-white/40 text-[8px] sm:text-[10px] font-medium uppercase tracking-wider pointer-events-none select-none">
          Tap to Bet
        </span>
      )}

      {/* Bet chips stacked on the spot */}
      {hasBet && (
        <div className="absolute bottom-[10%] flex flex-col items-center z-[15]">
          <BlackjackChip value={betAmount} size="sm" stacked disabled />
        </div>
      )}

      {/* Player cards above the betting spot */}
      {hasHand && (
        <div className="absolute -top-[80%] sm:-top-[90%] left-1/2 -translate-x-1/2 flex gap-0.5 z-[20]">
          {hand.cards.map((card, i) => (
            <BlackjackCard
              key={i}
              card={card}
              visible={i < visibleCards}
              isNew={i === visibleCards - 1}
              isWinning={showResult === "win" || showResult === "blackjack"}
              size="sm"
            />
          ))}
        </div>
      )}

      {/* Hand value badge */}
      {hasHand && visibleCards >= 2 && (
        <div className="absolute -top-[105%] sm:-top-[115%] left-1/2 -translate-x-1/2 z-[25]">
          <HandValueBadge
            value={hand.value}
            isSoft={hand.isSoft}
            isBlackjack={hand.isBlackjack}
            isBusted={hand.isBusted}
          />
        </div>
      )}

      {/* Result indicator */}
      {showResult && (
        <div className={`
          absolute -top-[130%] left-1/2 -translate-x-1/2 z-[30]
          px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-wider
          bj-animate-bounce-in
          ${showResult === "win" || showResult === "blackjack"
            ? "bg-green-500 text-white"
            : showResult === "lose"
            ? "bg-red-600 text-white"
            : "bg-gray-500 text-white"
          }
        `}>
          {showResult === "blackjack" ? "BJ!" : showResult}
        </div>
      )}
    </div>
  );
}

function HandValueBadge({ value, isSoft, isBlackjack, isBusted }: {
  value: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBusted: boolean;
}) {
  return (
    <div
      className={`
        inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold border whitespace-nowrap
        ${isBlackjack
          ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-300 animate-pulse"
          : isBusted
          ? "bg-red-700 text-white border-red-500"
          : "bg-black/70 text-yellow-200 border-yellow-600/50"
        }
      `}
    >
      {isBlackjack ? "BJ!" : isBusted ? "BUST" : isSoft && value <= 21 ? `S${value}` : value}
    </div>
  );
}
