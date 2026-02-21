"use client";

import React from "react";
import { RotateCcw, Sparkles, Trophy } from "lucide-react";

interface ResultOverlayProps {
  result: string;         // "win" | "lose" | "push" | "blackjack"
  payout: number;
  onNewGame: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const RESULT_CONFIG: Record<string, { text: string; bg: string; icon: React.ReactNode }> = {
  blackjack: {
    text: "BLACKJACK!",
    bg: "linear-gradient(135deg, #B8860B, #FFD700, #B8860B)",
    icon: <Sparkles className="w-8 h-8 text-yellow-900" />,
  },
  win: {
    text: "YOU WIN!",
    bg: "linear-gradient(135deg, #2F855A, #48BB78, #2F855A)",
    icon: <Trophy className="w-8 h-8 text-yellow-300" />,
  },
  lose: {
    text: "DEALER WINS",
    bg: "linear-gradient(135deg, #9B2C2C, #E53E3E, #9B2C2C)",
    icon: <span className="text-3xl">💔</span>,
  },
  push: {
    text: "PUSH",
    bg: "linear-gradient(135deg, #4A5568, #718096, #4A5568)",
    icon: <span className="text-3xl">🤝</span>,
  },
};

export default function ResultOverlay({
  result,
  payout,
  onNewGame,
  style,
  className = "",
}: ResultOverlayProps) {
  const config = RESULT_CONFIG[result] || RESULT_CONFIG.lose;

  return (
    <div
      className={`absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm bj-animate-fade-in ${className}`}
      style={style}
    >
      <div className="text-center space-y-3">
        <div
          className="inline-flex flex-col items-center gap-2 px-8 py-5 rounded-xl shadow-2xl bj-animate-bounce-in border-2 border-yellow-600/50"
          style={{ background: config.bg }}
        >
          {config.icon}
          <span className="text-xl sm:text-2xl font-black text-white drop-shadow-lg tracking-wide">
            {config.text}
          </span>
          {payout > 0 && (
            <span className="text-sm sm:text-base font-bold text-white/90">
              +{payout.toLocaleString()} tokens
            </span>
          )}
        </div>
        <div>
          <button
            onClick={onNewGame}
            className="
              bg-gradient-to-b from-yellow-600 to-yellow-800
              hover:from-yellow-500 hover:to-yellow-700
              text-white font-bold px-6 py-2.5 text-sm rounded-lg
              shadow-xl border border-yellow-500/50
              inline-flex items-center gap-2
              transition-all hover:scale-105 active:scale-95
            "
          >
            <RotateCcw className="w-4 h-4" />
            New Hand
          </button>
        </div>
      </div>
    </div>
  );
}
