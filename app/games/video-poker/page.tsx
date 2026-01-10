"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Loader2, Volume2, VolumeX, Sparkles, Trophy, Coins, Lightbulb, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CardData {
  suit: string;
  rank: string;
}

const PAYOUTS = [
  { hand: "Royal Flush", multiplier: 800, coins: [250, 500, 750, 1000, 4000] },
  { hand: "Straight Flush", multiplier: 50, coins: [50, 100, 150, 200, 250] },
  { hand: "Four of a Kind", multiplier: 25, coins: [25, 50, 75, 100, 125] },
  { hand: "Full House", multiplier: 9, coins: [9, 18, 27, 36, 45] },
  { hand: "Flush", multiplier: 6, coins: [6, 12, 18, 24, 30] },
  { hand: "Straight", multiplier: 4, coins: [4, 8, 12, 16, 20] },
  { hand: "Three of a Kind", multiplier: 3, coins: [3, 6, 9, 12, 15] },
  { hand: "Two Pair", multiplier: 2, coins: [2, 4, 6, 8, 10] },
  { hand: "Jacks or Better", multiplier: 1, coins: [1, 2, 3, 4, 5] },
];

const getSuitSymbol = (suit: string) => {
  const symbols: Record<string, string> = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
  return symbols[suit] || suit;
};

const getSuitColor = (suit: string) => {
  return suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-slate-900";
};

const getOptimalHolds = (cards: CardData[]): number[] => {
  if (cards.length !== 5) return [];
  
  const rankValues: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14,
  };
  
  const holds: number[] = [];
  const rankCounts: Record<string, number[]> = {};
  const suitCounts: Record<string, number[]> = {};
  
  cards.forEach((c, i) => {
    if (!rankCounts[c.rank]) rankCounts[c.rank] = [];
    rankCounts[c.rank].push(i);
    if (!suitCounts[c.suit]) suitCounts[c.suit] = [];
    suitCounts[c.suit].push(i);
  });
  
  for (const indices of Object.values(rankCounts)) {
    if (indices.length >= 2) {
      holds.push(...indices);
    }
  }
  
  if (holds.length > 0) return Array.from(new Set(holds)).sort((a, b) => a - b);
  
  for (const indices of Object.values(suitCounts)) {
    if (indices.length >= 4) {
      return indices.sort((a, b) => a - b);
    }
  }
  
  cards.forEach((c, i) => {
    if (rankValues[c.rank] >= 11) {
      holds.push(i);
    }
  });
  
  return holds.sort((a, b) => a - b);
};

const PlayingCard = ({ 
  card, 
  held, 
  onClick, 
  disabled, 
  isNew, 
  index,
  showHint
}: { 
  card: CardData | null; 
  held: boolean; 
  onClick: () => void; 
  disabled: boolean;
  isNew?: boolean;
  index: number;
  showHint?: boolean;
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showCard, setShowCard] = useState(!isNew);

  useEffect(() => {
    if (isNew && card) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setShowCard(true);
        setIsFlipping(false);
      }, 150 + index * 100);
      return () => clearTimeout(timer);
    }
  }, [isNew, card, index]);

  if (!card) {
    return (
      <div className="video-poker-card-container">
        <div className="video-poker-card video-poker-card-back">
          <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-2xl">🎰</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-poker-card-container">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`video-poker-card-wrapper ${held ? "video-poker-held" : ""} ${isFlipping ? "video-poker-flipping" : ""}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className={`video-poker-card ${showCard ? "video-poker-card-front" : "video-poker-card-back"}`}>
          {showCard ? (
            <>
              <div className={`absolute top-2 left-2 flex flex-col items-center ${getSuitColor(card.suit)}`}>
                <span className="text-lg font-bold leading-none">{card.rank}</span>
                <span className="text-lg leading-none">{getSuitSymbol(card.suit)}</span>
              </div>
              <div className={`absolute bottom-2 right-2 flex flex-col items-center rotate-180 ${getSuitColor(card.suit)}`}>
                <span className="text-lg font-bold leading-none">{card.rank}</span>
                <span className="text-lg leading-none">{getSuitSymbol(card.suit)}</span>
              </div>
              <div className={`text-5xl ${getSuitColor(card.suit)}`}>
                {getSuitSymbol(card.suit)}
              </div>
            </>
          ) : (
            <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-2xl">🎰</span>
              </div>
            </div>
          )}
        </div>
        {held && (
          <div className="video-poker-held-badge">
            HOLD
          </div>
        )}
        {showHint && !held && (
          <div className="video-poker-hint-badge">
            <Lightbulb className="w-3 h-3" />
          </div>
        )}
      </button>
    </div>
  );
};

export default function VideoPokerPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [coinValue, setCoinValue] = useState<number>(1);
  const [coinsPlayed, setCoinsPlayed] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<(CardData | null)[]>([null, null, null, null, null]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<"betting" | "holding" | "result">("betting");
  const [result, setResult] = useState<{ hand: string; multiplier: number; payout: number } | null>(null);
  const [isNewDeal, setIsNewDeal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [optimalHolds, setOptimalHolds] = useState<number[]>([]);
  const [winAnimation, setWinAnimation] = useState(false);

  const betAmount = coinValue * coinsPlayed;

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playSound = useCallback((type: "deal" | "hold" | "win" | "lose" | "click") => {
    if (!soundEnabled) return;
  }, [soundEnabled]);

  const deal = async () => {
    if (betAmount <= 0 || betAmount > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setHeld([false, false, false, false, false]);
    setIsNewDeal(true);
    setWinAnimation(false);
    playSound("deal");

    try {
      const res = await fetch("/api/games/video-poker/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setCards(data.cards);
      setPhase("holding");
      setBalance(parseInt(data.newBalance));
      
      if (showHints) {
        setOptimalHolds(getOptimalHolds(data.cards));
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Deal failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsNewDeal(false), 800);
    }
  };

  const toggleHold = (index: number) => {
    if (phase !== "holding") return;
    playSound("hold");
    const newHeld = [...held];
    newHeld[index] = !newHeld[index];
    setHeld(newHeld);
  };

  const draw = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setIsNewDeal(true);
    
    try {
      const res = await fetch("/api/games/video-poker/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, held }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCards(data.cards);
      setResult({
        hand: data.hand,
        multiplier: data.multiplier,
        payout: parseInt(data.payout),
      });
      setPhase("result");
      setBalance(parseInt(data.newBalance));
      setOptimalHolds([]);

      if (data.multiplier > 0) {
        setWinAnimation(true);
        playSound("win");
        toast({ title: `${data.hand}! Won ${parseInt(data.payout).toLocaleString()} tokens!`, variant: "default" });
      } else {
        playSound("lose");
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Draw failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsNewDeal(false), 800);
    }
  };

  const newGame = () => {
    setSessionId(null);
    setCards([null, null, null, null, null]);
    setHeld([false, false, false, false, false]);
    setPhase("betting");
    setResult(null);
    setWinAnimation(false);
    setOptimalHolds([]);
    fetchBalance();
  };

  const increaseCoin = () => {
    if (phase !== "betting") return;
    setCoinsPlayed(prev => prev >= 5 ? 1 : prev + 1);
    playSound("click");
  };

  const betMax = () => {
    if (phase !== "betting") return;
    setCoinsPlayed(5);
    playSound("click");
  };

  return (
    <main className="min-h-screen pb-20 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-2xl">🃏</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Jacks or Better</h1>
                <p className="text-sm text-purple-300">Video Poker</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHints(!showHints)}
              className={`${showHints ? "text-yellow-400" : "text-white/50"}`}
              title="Show optimal holds"
            >
              <Lightbulb className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white/50"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-xl border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-400">{balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className={`video-poker-machine ${winAnimation ? "video-poker-winning" : ""}`}>
          {/* Paytable */}
          <div className="video-poker-paytable">
            <div className="grid grid-cols-6 gap-px text-xs sm:text-sm">
              <div className="video-poker-paytable-header">Hand</div>
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  className={`video-poker-paytable-header ${coinsPlayed === i ? "video-poker-paytable-active" : ""}`}
                >
                  {i} Coin{i > 1 ? "s" : ""}
                </div>
              ))}
              {PAYOUTS.map((p) => (
                <React.Fragment key={p.hand}>
                  <div 
                    className={`video-poker-paytable-cell video-poker-paytable-hand ${
                      result?.hand === p.hand ? "video-poker-paytable-winner" : ""
                    }`}
                  >
                    {p.hand}
                  </div>
                  {p.coins.map((coin, i) => (
                    <div
                      key={`${p.hand}-${i}`}
                      className={`video-poker-paytable-cell ${
                        coinsPlayed === i + 1 ? "video-poker-paytable-active" : ""
                      } ${result?.hand === p.hand ? "video-poker-paytable-winner" : ""}`}
                    >
                      {coin * coinValue}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Cards Display */}
          <div className="video-poker-cards-area">
            <div className="flex justify-center gap-2 sm:gap-4">
              {cards.map((card, i) => (
                <PlayingCard
                  key={i}
                  card={card}
                  held={held[i]}
                  onClick={() => toggleHold(i)}
                  disabled={phase !== "holding"}
                  isNew={isNewDeal && !held[i]}
                  index={i}
                  showHint={showHints && phase === "holding" && optimalHolds.includes(i)}
                />
              ))}
            </div>

            {/* Result Display */}
            {result && (
              <div className={`video-poker-result ${winAnimation ? "video-poker-result-win" : ""}`}>
                {result.multiplier > 0 ? (
                  <>
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-400">{result.hand}</span>
                    <span className="text-lg text-green-400">+{result.payout.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-lg text-gray-400">No Win - Try Again</span>
                )}
              </div>
            )}

            {phase === "holding" && (
              <p className="text-center text-sm text-purple-300 mt-4 animate-pulse">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Click cards to HOLD, then press DRAW
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="video-poker-controls">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Coin Value */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">COIN</span>
                <div className="flex gap-1">
                  {[1, 5, 10, 25].map(val => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => phase === "betting" && setCoinValue(val)}
                      disabled={phase !== "betting"}
                      className={`w-10 ${coinValue === val ? "bg-purple-600 border-purple-400 text-white" : "bg-black/50 border-gray-600"}`}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bet Controls */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={increaseCoin}
                  disabled={phase !== "betting"}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  BET ONE
                </Button>
                <Button
                  onClick={betMax}
                  disabled={phase !== "betting"}
                  className="bg-red-600 hover:bg-red-700 text-white px-6"
                >
                  BET MAX
                </Button>
              </div>

              {/* Current Bet Display */}
              <div className="bg-black/50 px-4 py-2 rounded-lg border border-gray-600">
                <span className="text-xs text-gray-400">BET: </span>
                <span className="font-bold text-white">{betAmount}</span>
              </div>

              {/* Action Buttons */}
              {phase === "betting" && (
                <Button 
                  onClick={deal} 
                  disabled={isLoading || betAmount > balance}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg font-bold shadow-lg shadow-green-500/30"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "DEAL"}
                </Button>
              )}
              {phase === "holding" && (
                <Button 
                  onClick={draw} 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black px-8 py-6 text-lg font-bold shadow-lg shadow-yellow-500/30"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "DRAW"}
                </Button>
              )}
              {phase === "result" && (
                <Button 
                  onClick={newGame}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-bold shadow-lg shadow-purple-500/30"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  NEW GAME
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mt-6 bg-black/30 border-purple-500/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-bold text-purple-400 mb-2">How to Play</h3>
                <ol className="text-gray-400 space-y-1 text-xs">
                  <li>1. Set your coin value and coins played</li>
                  <li>2. Click DEAL to receive 5 cards</li>
                  <li>3. Click cards to HOLD the ones you want to keep</li>
                  <li>4. Click DRAW to replace non-held cards</li>
                  <li>5. Win with Jacks or Better!</li>
                </ol>
              </div>
              <div>
                <h3 className="font-bold text-purple-400 mb-2">Tips</h3>
                <ul className="text-gray-400 space-y-1 text-xs">
                  <li>• Always bet max coins for Royal Flush bonus</li>
                  <li>• Hold high pairs (Jacks or better)</li>
                  <li>• Keep 4 to a flush or straight</li>
                  <li>• Use the hint button for optimal plays</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-purple-400 mb-2">RTP: 99.54%</h3>
                <p className="text-gray-400 text-xs">
                  Jacks or Better offers one of the highest return-to-player rates of any casino game when played with optimal strategy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
