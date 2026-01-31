"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Info,
  Sparkles,
  Trophy,
  X,
  Minus,
  Plus,
  Zap,
  Mountain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REELS = 6;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string; tier: string }> = {
  "🔵": { name: "Blue Mask", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50", tier: "highest" },
  "💚": { name: "Green Mask", gradient: "from-green-400 to-green-600", glow: "shadow-green-400/50", tier: "high" },
  "💜": { name: "Purple Mask", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50", tier: "high" },
  "🟤": { name: "Brown Mask", gradient: "from-amber-600 to-amber-800", glow: "shadow-amber-500/50", tier: "medium" },
  "⚪": { name: "Stone Mask", gradient: "from-gray-400 to-gray-600", glow: "shadow-gray-400/50", tier: "medium" },
  "🦅": { name: "Eagle", gradient: "from-amber-500 to-amber-700", glow: "shadow-amber-400/50", tier: "low" },
  "🐍": { name: "Snake", gradient: "from-green-600 to-green-800", glow: "shadow-green-500/50", tier: "low" },
  "🐟": { name: "Fish", gradient: "from-cyan-500 to-cyan-700", glow: "shadow-cyan-400/50", tier: "low" },
  "🐸": { name: "Frog", gradient: "from-lime-500 to-lime-700", glow: "shadow-lime-400/50", tier: "lowest" },
  "❓": { name: "Wild", gradient: "from-yellow-400 via-orange-500 to-red-500", glow: "shadow-orange-400/50", tier: "wild" },
  "🌟": { name: "Free Fall", gradient: "from-yellow-300 via-amber-400 to-yellow-500", glow: "shadow-yellow-400/50", tier: "scatter" },
};

const ALL_SYMBOLS = ["🔵", "💚", "💜", "🟤", "⚪", "🦅", "🐍", "🐟", "🐸", "❓", "🌟"];

interface AvalancheData {
  reels: string[][];
  reelHeights: number[];
  winningPositions: [number, number][];
  winningSymbol: string | null;
  waysWon: number;
  multiplier: number;
  win: string;
  unbreakableWildPositions: [number, number][];
}

export default function GonzosQuestMegawaysPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array(REELS).fill(null).map(() => {
      const height = Math.floor(Math.random() * 4) + 3;
      return Array(height).fill(null).map(() =>
        ALL_SYMBOLS[Math.floor(Math.random() * (ALL_SYMBOLS.length - 2))]
      );
    })
  );
  const [, setReelHeights] = useState<number[]>([4, 5, 6, 6, 5, 4]);
  const [totalWays, setTotalWays] = useState<number>(14400);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<Set<string>>(new Set());
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [avalancheCount, setAvalancheCount] = useState(0);
  const [earthquakeActive, setEarthquakeActive] = useState(false);
  const [unbreakableWilds, setUnbreakableWilds] = useState<[number, number][]>([]);
  const autoSpinRef = useRef(false);
  const freeSpinsRef = useRef(0);
  const betAmountRef = useRef(betAmount);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    freeSpinsRef.current = freeSpins;
  }, [freeSpins]);

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const showBigWinAnimation = useCallback((amount: number) => {
    setBigWinAmount(amount);
    setShowBigWin(true);
    setTimeout(() => {
      setShowBigWin(false);
    }, 4000);
  }, []);

  const spin = useCallback(async () => {
    const currentBet = betAmountRef.current;
    const isFreeSpin = freeSpinsRef.current > 0;

    if (!isFreeSpin && currentBet > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setWinningPositions(new Set());
    setAvalancheCount(0);
    setCurrentMultiplier(isFreeSpin ? 3 : 1);
    setEarthquakeActive(false);
    setUnbreakableWilds([]);

    // Spinning animation with variable heights
    const animationInterval = setInterval(() => {
      const newReels = Array(REELS).fill(null).map(() => {
        const height = Math.floor(Math.random() * 6) + 2;
        return Array(height).fill(null).map(() =>
          ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
        );
      });
      setReels(newReels);
      setReelHeights(newReels.map(r => r.length));
    }, 80);

    try {
      const res = await fetch("/api/games/gonzos-quest-megaways/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: currentBet,
          isFreeSpinMode: isFreeSpin,
        }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, 700));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      // Set final reels
      setReels(data.reels);
      setReelHeights(data.reelHeights);
      setTotalWays(data.totalWays);

      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      // Handle earthquake
      if (data.earthquakeTriggered) {
        setEarthquakeActive(true);
        toast({ title: "🌋 EARTHQUAKE! Low symbols removed!", variant: "success" });
        setTimeout(() => setEarthquakeActive(false), 2000);
      }

      // Handle free spins trigger
      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        toast({
          title: `🌟 FREE FALL! ${data.freeSpinsWon} FREE SPINS!`,
          variant: "success"
        });
      }

      // Handle avalanche results
      if (data.avalanches && data.avalanches.length > 0) {
        setAvalancheCount(data.avalanches.length);
        setCurrentMultiplier(data.finalMultiplier);

        // Highlight all winning positions
        const positions = new Set<string>();
        data.avalanches.forEach((av: AvalancheData) => {
          av.winningPositions.forEach(([reel, row]: [number, number]) => {
            positions.add(`${reel}-${row}`);
          });
        });
        setWinningPositions(positions);

        // Track unbreakable wilds
        const lastAvalanche = data.avalanches[data.avalanches.length - 1];
        if (lastAvalanche.unbreakableWildPositions) {
          setUnbreakableWilds(lastAvalanche.unbreakableWildPositions);
        }
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);

        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `🏆 MEGA WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `💎 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 10) {
          toast({ title: `🔵 Great win! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        }
      }

      // Check if free spins ended
      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        toast({ title: "Free spins ended! Gonzo continues his quest.", variant: "default" });
      }

      // Continue spinning if auto or free spins
      const shouldContinue =
        (autoSpinRef.current && parseInt(data.newBalance) >= currentBet) ||
        (remainingFreeSpins > 0 || data.freeSpinsWon > 0);

      if (shouldContinue) {
        setTimeout(() => {
          spin();
        }, 1500);
      } else if (autoSpinRef.current) {
        setAutoSpin(false);
        toast({ title: "Auto-spin stopped: Insufficient balance", variant: "destructive" });
      }

    } catch (error) {
      clearInterval(animationInterval);
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
      setAutoSpin(false);
    } finally {
      setIsSpinning(false);
    }
  }, [balance, toast, showBigWinAnimation]);

  const adjustBet = (delta: number) => {
    if (isFreeSpinMode) return;
    const newBet = Math.max(1, Math.min(500, betAmount + delta));
    setBetAmount(newBet);
  };

  const toggleAutoSpin = () => {
    if (autoSpin) {
      setAutoSpin(false);
    } else {
      setAutoSpin(true);
      if (!isSpinning) spin();
    }
  };

  const isPositionWinning = (reel: number, row: number) => {
    return winningPositions.has(`${reel}-${row}`);
  };

  const isUnbreakableWild = (reel: number, row: number) => {
    return unbreakableWilds.some(([r, ro]) => r === reel && ro === row);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-emerald-950 via-green-950 to-stone-950">
      {/* Jungle Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Jungle mist */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-emerald-900/30 to-transparent" />

        {/* Stone temple shadows */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-stone-900/50 via-emerald-950/30 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-amber-600/10 to-yellow-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-600/10 to-green-600/5 blur-3xl" />
      </div>

      {/* Earthquake Effect */}
      {earthquakeActive && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-pulse">
          <div className="absolute inset-0 bg-amber-600/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
            🌋
          </div>
        </div>
      )}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">🔵💎🔵</div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">🔵💎🔵</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              MEGA WIN!
            </h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-emerald-300/80 mt-2">Gonzo found treasure!</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 py-3 max-w-5xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-green-600 to-amber-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-600/30">
                🗿
              </div>
              <div>
                <h1 className="text-lg font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 bg-clip-text text-transparent">
                  GONZO&apos;S QUEST MEGAWAYS
                </h1>
                <p className="text-[10px] text-emerald-300/80">6 Reels • Up to 117,649 Ways • Avalanche</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:bg-white/10 text-white h-8 w-8"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPaytable(true)}
              className="hover:bg-white/10 text-white h-8 w-8"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Multiplier & Ways Display */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-gradient-to-br from-amber-700/40 to-amber-900/40 border-amber-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-amber-300 uppercase font-bold">Multiplier</p>
              <p className="text-lg font-bold text-amber-400">{currentMultiplier}x</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-700/40 to-emerald-900/40 border-emerald-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-emerald-300 uppercase font-bold">Ways to Win</p>
              <p className="text-lg font-bold text-emerald-400">{totalWays.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-700/40 to-purple-900/40 border-purple-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-purple-300 uppercase font-bold">Avalanches</p>
              <p className="text-lg font-bold text-purple-400">{avalancheCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Free Spins Banner */}
        {isFreeSpinMode && (
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-amber-700/80 via-yellow-700/80 to-amber-700/80 border border-amber-500/50 backdrop-blur-sm shadow-lg shadow-amber-600/30">
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-lg font-bold text-white">FREE FALL: {freeSpins} SPINS (Multipliers: 3x→6x→9x→15x)</span>
              <Zap className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
          </div>
        )}

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-white/10 backdrop-blur-md border-amber-600/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-amber-300 uppercase">Balance</p>
              <p className="text-lg font-bold text-yellow-400">{balance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-green-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-green-300 uppercase">Won</p>
              <p className="text-lg font-bold text-green-400">+{totalWon.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-emerald-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-emerald-300 uppercase">Spins</p>
              <p className="text-lg font-bold text-emerald-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Reels - Megaways Variable Height */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-amber-600 via-emerald-700 to-stone-800 shadow-xl shadow-emerald-600/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-stone-900 via-emerald-900 to-stone-900 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-emerald-500/30">
              <Mountain className="w-4 h-4 text-amber-400" />
              <span className="text-base font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent tracking-wide">
                GONZO&apos;S QUEST MEGAWAYS
              </span>
              <Mountain className="w-4 h-4 text-amber-400" />
            </div>

            {/* Reels Container */}
            <div className="bg-gradient-to-b from-stone-900 via-emerald-950/50 to-stone-900 p-2">
              <div className="bg-black/60 rounded-xl p-2 border-2 border-emerald-600/40 overflow-hidden shadow-inner">
                {/* 6-Reel Megaways Grid */}
                <div className="flex gap-1 justify-center">
                  {reels.map((reel, reelIndex) => (
                    <div key={reelIndex} className="flex flex-col gap-1">
                      {reel.map((symbol, rowIndex) => {
                        const isWinning = isPositionWinning(reelIndex, rowIndex);
                        const isWild = symbol === "❓";
                        const isScatter = symbol === "🌟";
                        const isUnbreakable = isUnbreakableWild(reelIndex, rowIndex);
                        const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "", tier: "low" };

                        return (
                          <div
                            key={`${reelIndex}-${rowIndex}`}
                            className={`
                              relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-2xl sm:text-3xl
                              transition-all duration-300 overflow-hidden
                              ${isWinning
                                ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-400 ring-inset shadow-lg ${symbolInfo.glow}`
                                : isUnbreakable
                                  ? "bg-gradient-to-br from-orange-600/60 to-amber-700/60 ring-1 ring-orange-400/50"
                                  : "bg-gradient-to-br from-stone-700/80 to-stone-800/80"
                              }
                            `}
                          >
                            <span
                              className={`transition-all duration-300 ${isUnbreakable ? 'scale-110' : ''}`}
                              style={{
                                textShadow: isWinning
                                  ? "0 0 20px rgba(255,215,0,0.9)"
                                  : isWild
                                    ? "0 0 15px rgba(255,165,0,0.7)"
                                    : isScatter
                                      ? "0 0 15px rgba(255,215,0,0.7)"
                                      : "0 2px 4px rgba(0,0,0,0.5)",
                                filter: isWinning ? "brightness(1.3) drop-shadow(0 0 8px gold)" : "none",
                                transform: isWinning ? "scale(1.15)" : "scale(1)",
                              }}
                            >
                              {symbol}
                            </span>

                            {/* Win glow effect */}
                            {isWinning && (
                              <div className="absolute inset-0 bg-yellow-400/25 animate-pulse rounded-lg" />
                            )}

                            {/* Unbreakable wild indicator */}
                            {isUnbreakable && (
                              <div className="absolute inset-0 rounded-lg border-2 border-orange-400/80 animate-pulse" />
                            )}

                            {/* Wild glow */}
                            {isWild && !isWinning && (
                              <div className="absolute inset-0 rounded-lg border border-orange-400/60" />
                            )}

                            {/* Scatter glow */}
                            {isScatter && !isWinning && (
                              <div className="absolute inset-0 rounded-lg border border-yellow-400/60" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Display */}
              <div className="h-12 flex items-center justify-center mt-2">
                {lastWin > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-emerald-600 shadow-lg shadow-amber-500/40">
                    <Trophy className="w-5 h-5 text-yellow-100" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-100" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Gonzo searches for El Dorado...</span>
                  </div>
                ) : (
                  <p className="text-emerald-300/80 text-sm">3+ 🌟 triggers Free Fall! Wins cascade with multipliers!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 p-3 border-t border-emerald-600/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-emerald-600/50 hover:bg-emerald-600/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-emerald-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-yellow-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(10)}
                    disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                    className="border-emerald-600/50 hover:bg-emerald-600/20 text-white h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Quick Bet Buttons */}
                <div className="hidden lg:flex gap-1">
                  {[10, 25, 50, 100].map((amt) => (
                    <Button
                      key={amt}
                      variant={betAmount === amt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amt)}
                      disabled={isSpinning || isFreeSpinMode}
                      className={`h-8 px-2 text-xs ${betAmount === amt
                        ? "bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold border-0"
                        : "border-emerald-600/30 hover:bg-emerald-600/20 text-white"
                        }`}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>

                {/* Spin Button */}
                <Button
                  onClick={spin}
                  disabled={isSpinning || (!isFreeSpinMode && balance < betAmount)}
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-amber-500 via-yellow-600 to-emerald-600 hover:from-amber-400 hover:via-yellow-500 hover:to-emerald-500 text-white shadow-lg shadow-amber-600/50 disabled:opacity-50 overflow-hidden group border border-yellow-500/50"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isSpinning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFreeSpinMode ? (
                      <>
                        <Zap className="w-4 h-4" />
                        FREE
                      </>
                    ) : (
                      <>
                        <Mountain className="w-4 h-4" />
                        SPIN
                      </>
                    )}
                  </span>
                </Button>

                {/* Auto Spin */}
                <Button
                  onClick={toggleAutoSpin}
                  variant={autoSpin ? "destructive" : "outline"}
                  size="sm"
                  className={`h-8 ${autoSpin ? "" : "border-emerald-600/50 hover:bg-emerald-600/20 text-white"}`}
                  disabled={balance < betAmount || isFreeSpinMode}
                >
                  <Sparkles className={`w-3 h-3 mr-1 ${autoSpin ? "animate-pulse" : ""}`} />
                  {autoSpin ? "STOP" : "AUTO"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-xs text-emerald-300/70">
          <span>RTP: 96% • High Volatility • Max Win 21,000x • Avalanche Multipliers up to 15x!</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto bg-gradient-to-b from-stone-900 to-emerald-950 border-emerald-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Megaways Feature */}
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-900/50 to-amber-900/50 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🗿</span>
                  <span className="font-bold text-white">MEGAWAYS</span>
                </div>
                <p className="text-xs text-emerald-200">
                  Each reel has 2-7 symbols, creating up to <span className="text-yellow-300 font-bold">117,649 ways to win</span>!
                </p>
              </div>

              {/* Avalanche Feature */}
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💥</span>
                  <span className="font-bold text-white">AVALANCHE & MULTIPLIERS</span>
                </div>
                <p className="text-xs text-amber-200 mb-2">
                  Winning symbols explode and new ones fall in! Each avalanche increases the multiplier:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-emerald-300">Base: 1x→2x→3x→5x</div>
                  <div className="text-yellow-300">Free Spins: 3x→6x→9x→15x</div>
                </div>
              </div>

              {/* Unbreakable Wilds */}
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">❓</span>
                  <span className="font-bold text-white">UNBREAKABLE WILDS</span>
                </div>
                <p className="text-xs text-orange-200">
                  Wilds don&apos;t disappear after wins - they stay to help form more combinations!
                </p>
              </div>

              {/* Symbol Payouts */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-300 mb-2">Symbol Payouts (per total bet)</h3>
                {[
                  { sym: "🔵", name: "Blue Mask", pays: "1.5 / 3 / 7.5 / 15" },
                  { sym: "💚", name: "Green Mask", pays: "0.8 / 2 / 5 / 10" },
                  { sym: "💜", name: "Purple Mask", pays: "0.6 / 1.5 / 4 / 8" },
                  { sym: "🟤", name: "Golden Mask", pays: "0.4 / 1 / 2.5 / 5" },
                  { sym: "⚪", name: "Stone Mask", pays: "0.3 / 0.8 / 2 / 4" },
                  { sym: "🦅", name: "Eagle", pays: "0.2 / 0.5 / 1 / 2" },
                  { sym: "🐍", name: "Serpent", pays: "0.2 / 0.5 / 1 / 2" },
                  { sym: "🐟", name: "Fish", pays: "0.15 / 0.4 / 0.8 / 1.5" },
                  { sym: "🐸", name: "Frog", pays: "0.1 / 0.3 / 0.6 / 1" },
                ].map((item) => (
                  <div key={item.sym} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.sym}</span>
                      <span className="text-sm text-white">{item.name}</span>
                    </div>
                    <span className="text-xs text-yellow-300 font-mono">{item.pays}</span>
                  </div>
                ))}
                <p className="text-[10px] text-emerald-400 mt-2 text-center">Payouts for 3 / 4 / 5 / 6 of a kind × ways</p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-500/30 text-center">
                <p className="text-xs text-emerald-300">117,649 Ways • RTP 96% • High Volatility • Max 21,000x</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
