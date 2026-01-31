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
  Star,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REELS = 5;
const ROWS = 3;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string; tier: string }> = {
  "📊": { name: "BAR", gradient: "from-yellow-400 to-amber-600", glow: "shadow-yellow-400/50", tier: "highest" },
  "7️⃣": { name: "Seven", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50", tier: "high" },
  "💎": { name: "Yellow Diamond", gradient: "from-yellow-300 to-yellow-500", glow: "shadow-yellow-300/50", tier: "medium-high" },
  "💚": { name: "Green Gem", gradient: "from-green-400 to-emerald-600", glow: "shadow-green-400/50", tier: "medium" },
  "🔶": { name: "Orange Gem", gradient: "from-orange-400 to-orange-600", glow: "shadow-orange-400/50", tier: "medium" },
  "💙": { name: "Blue Gem", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50", tier: "low" },
  "💜": { name: "Purple Gem", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50", tier: "low" },
  "⭐": { name: "Starburst Wild", gradient: "from-white via-yellow-200 to-cyan-300", glow: "shadow-white/70", tier: "wild" },
};

const ALL_SYMBOLS = ["📊", "7️⃣", "💎", "💚", "🔶", "💙", "💜", "⭐"];

const STAR_POSITIONS = Array.from({ length: 80 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  delay: Math.random() * 4,
  duration: Math.random() * 2 + 1,
}));

interface WinLineData {
  lineNumber: number;
  symbol: string;
  count: number;
  positions: [number, number][];
  payout: number;
  win: string;
  direction: "left" | "right";
}

export default function StarburstPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array(REELS).fill(null).map(() =>
      Array(ROWS).fill(null).map(() =>
        ALL_SYMBOLS[Math.floor(Math.random() * (ALL_SYMBOLS.length - 1))]
      )
    )
  );
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<Set<string>>(new Set());
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<WinLineData[]>([]);
  const [expandedWildReels, setExpandedWildReels] = useState<number[]>([]);
  const [totalRespins, setTotalRespins] = useState(0);
  const [showRespinAnimation, setShowRespinAnimation] = useState(false);
  const autoSpinRef = useRef(false);
  const betAmountRef = useRef(betAmount);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

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
    }, 3500);
  }, []);

  const spin = useCallback(async () => {
    const currentBet = betAmountRef.current;

    if (currentBet > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setWinningPositions(new Set());
    setWinningLines([]);
    setExpandedWildReels([]);
    setTotalRespins(0);
    setShowRespinAnimation(false);

    // Spinning animation
    const animationInterval = setInterval(() => {
      setReels(
        Array(REELS).fill(null).map(() =>
          Array(ROWS).fill(null).map(() =>
            ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
          )
        )
      );
    }, 70);

    try {
      const res = await fetch("/api/games/starburst/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: currentBet }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      // Set final reels
      setReels(data.displayReels);

      // Handle respins animation
      if (data.totalRespins > 0) {
        setTotalRespins(data.totalRespins);
        setShowRespinAnimation(true);
        setTimeout(() => setShowRespinAnimation(false), 2000);
      }

      // Set expanded wild reels
      if (data.expandedWildReels && data.expandedWildReels.length > 0) {
        setExpandedWildReels(data.expandedWildReels);
      }

      // Highlight winning positions
      if (data.winningLines && data.winningLines.length > 0) {
        const positions = new Set<string>();
        data.winningLines.forEach((line: WinLineData) => {
          line.positions.forEach(([reel, row]: [number, number]) => {
            positions.add(`${reel}-${row}`);
          });
        });
        setWinningPositions(positions);
        setWinningLines(data.winningLines);
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);

        if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `⭐ STARBURST MEGA WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          showBigWinAnimation(winAmount);
          toast({ title: `💎 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 5) {
          toast({ title: `✨ Nice win! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        }
      }

      // Continue spinning if auto
      if (autoSpinRef.current && parseInt(data.newBalance) >= currentBet) {
        setTimeout(() => {
          spin();
        }, 1200);
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

  const isExpandedWild = (reel: number) => {
    return expandedWildReels.includes(reel);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950">
      {/* Cosmic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
        {STAR_POSITIONS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              opacity: 0.7,
            }}
          />
        ))}

        {/* Nebula effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-purple-600/10 to-pink-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-600/10 to-blue-600/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-yellow-500/5 to-orange-500/3 blur-3xl" />
      </div>

      {/* Respin Animation Overlay */}
      {showRespinAnimation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">⭐</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-cyan-300">
              {totalRespins} RESPIN{totalRespins > 1 ? "S" : ""}!
            </h2>
            <p className="text-lg text-purple-300">Expanding Wild!</p>
          </div>
        </div>
      )}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">⭐💎⭐</div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">⭐💎⭐</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              STARBURST!
            </h2>
            <p className="text-5xl font-bold text-yellow-300 drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-purple-300/80 mt-2">Cosmic Riches!</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 py-3 max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
                ⭐
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent">
                  STARBURST
                </h1>
                <p className="text-xs text-purple-300/80">5×3 • 10 Lines • Both Ways Pay</p>
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

        {/* Feature Banner */}
        <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-cyan-900/50 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-purple-200">Expanding Wilds</span>
            </div>
            <div className="w-px h-4 bg-purple-500/50" />
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-cyan-300" />
              <span className="text-purple-200">Up to 3 Respins</span>
            </div>
            <div className="w-px h-4 bg-purple-500/50" />
            <div className="flex items-center gap-1">
              <span className="text-yellow-300">⟷</span>
              <span className="text-purple-200">Win Both Ways</span>
            </div>
          </div>
        </div>

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-white/10 backdrop-blur-md border-purple-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-purple-300 uppercase">Balance</p>
              <p className="text-lg font-bold text-yellow-300">{balance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-green-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-green-300 uppercase">Won</p>
              <p className="text-lg font-bold text-green-400">+{totalWon.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-cyan-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-cyan-300 uppercase">Spins</p>
              <p className="text-lg font-bold text-cyan-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Reels */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-purple-500 via-pink-500 to-cyan-500 shadow-xl shadow-purple-500/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-purple-500/30">
              <Star className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span className="text-base font-bold bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent tracking-wide">
                STARBURST
              </span>
              <Star className="w-4 h-4 text-yellow-300 animate-pulse" />
            </div>

            {/* Reels Container */}
            <div className="bg-gradient-to-b from-slate-900 via-purple-950/50 to-slate-900 p-2">
              <div className="bg-black/60 rounded-xl p-2 border-2 border-purple-500/40 overflow-hidden shadow-inner">
                {/* 5x3 Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {reels.map((reel, reelIndex) => (
                    reel.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(reelIndex, rowIndex);
                      const isExpanded = isExpandedWild(reelIndex) && symbol === "⭐";
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "", tier: "low" };
                      const isWild = symbol === "⭐";

                      return (
                        <div
                          key={`${reelIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-3xl sm:text-4xl
                            transition-all duration-300 overflow-hidden
                            ${isWinning
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-300 ring-inset shadow-lg ${symbolInfo.glow}`
                              : isExpanded
                                ? "bg-gradient-to-br from-yellow-500/30 via-white/20 to-cyan-500/30 ring-1 ring-white/50"
                                : "bg-gradient-to-br from-slate-800/80 to-slate-900/80"
                            }
                          `}
                        >
                          <span
                            className={`transition-all duration-300 ${isExpanded ? 'scale-110' : ''}`}
                            style={{
                              textShadow: isWinning
                                ? "0 0 20px rgba(255,255,255,0.9)"
                                : isWild
                                  ? "0 0 20px rgba(255,255,255,0.8)"
                                  : "0 2px 4px rgba(0,0,0,0.5)",
                              filter: isWinning ? "brightness(1.4) drop-shadow(0 0 10px white)" : "none",
                              transform: isWinning ? "scale(1.15)" : "scale(1)",
                            }}
                          >
                            {symbol}
                          </span>

                          {/* Win glow effect */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-lg" />
                          )}

                          {/* Expanded wild rainbow border */}
                          {isExpanded && (
                            <div className="absolute inset-0 rounded-lg border-2 border-white/60 animate-pulse" />
                          )}

                          {/* Wild sparkle effect */}
                          {isWild && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-yellow-300/40" />
                          )}
                        </div>
                      );
                    })
                  )).flat()}
                </div>

                {/* Paylines indicator */}
                <div className="flex justify-center gap-1 mt-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center
                        ${winningLines.some(l => l.lineNumber === i + 1)
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                          : 'bg-purple-900/50 text-purple-300/70'
                        }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Display */}
              <div className="h-12 flex items-center justify-center mt-2">
                {lastWin > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 shadow-lg shadow-purple-500/40">
                    <Trophy className="w-5 h-5 text-yellow-200" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-200" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Spinning through the cosmos...</span>
                  </div>
                ) : (
                  <p className="text-purple-300/80 text-sm">⭐ Wilds expand on reels 2, 3, 4 and trigger respins!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-3 border-t border-purple-500/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1}
                    className="border-purple-500/50 hover:bg-purple-600/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-purple-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-yellow-300">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(10)}
                    disabled={isSpinning || betAmount >= 500}
                    className="border-purple-500/50 hover:bg-purple-600/20 text-white h-8 w-8"
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
                      disabled={isSpinning}
                      className={`h-8 px-2 text-xs ${betAmount === amt
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold border-0"
                        : "border-purple-500/30 hover:bg-purple-600/20 text-white"
                        }`}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>

                {/* Spin Button */}
                <Button
                  onClick={spin}
                  disabled={isSpinning || balance < betAmount}
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-400 hover:via-pink-400 hover:to-cyan-400 text-white shadow-lg shadow-purple-500/50 disabled:opacity-50 overflow-hidden group border border-white/20"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isSpinning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Star className="w-4 h-4" />
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
                  className={`h-8 ${autoSpin ? "" : "border-purple-500/50 hover:bg-purple-600/20 text-white"}`}
                  disabled={balance < betAmount}
                >
                  <Sparkles className={`w-3 h-3 mr-1 ${autoSpin ? "animate-pulse" : ""}`} />
                  {autoSpin ? "STOP" : "AUTO"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-xs text-purple-300/70">
          <span>RTP: 96.09% • Low Volatility • ⭐ Wilds on reels 2-4 expand & respin • Max Win 500x!</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto bg-gradient-to-b from-slate-900 to-purple-950 border-purple-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-cyan-300 bg-clip-text text-transparent">Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Wild Feature */}
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <span className="font-bold text-white">STARBURST WILD</span>
                </div>
                <p className="text-xs text-purple-200">
                  Appears on reels 2, 3, and 4 only. When it lands, it <span className="text-yellow-300 font-bold">EXPANDS</span> to cover the entire reel and triggers a <span className="text-cyan-300 font-bold">RESPIN</span>. Up to 3 consecutive respins possible!
                </p>
              </div>

              {/* Win Both Ways */}
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⟷</span>
                  <span className="font-bold text-white">WIN BOTH WAYS</span>
                </div>
                <p className="text-xs text-cyan-200">
                  Winning combinations pay from <span className="text-yellow-300">left-to-right</span> AND <span className="text-yellow-300">right-to-left</span>!
                </p>
              </div>

              {/* Symbol Payouts */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-purple-300 mb-2">Symbol Payouts (per line bet)</h3>
                {[
                  { sym: "📊", name: "BAR", pays: "25 / 50 / 125" },
                  { sym: "7️⃣", name: "Lucky 7", pays: "10 / 25 / 60" },
                  { sym: "💎", name: "Yellow Diamond", pays: "8 / 20 / 50" },
                  { sym: "💚", name: "Green Gem", pays: "5 / 10 / 25" },
                  { sym: "🔶", name: "Orange Gem", pays: "5 / 10 / 25" },
                  { sym: "💙", name: "Blue Gem", pays: "4 / 8 / 20" },
                  { sym: "💜", name: "Purple Gem", pays: "4 / 8 / 20" },
                ].map((item) => (
                  <div key={item.sym} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.sym}</span>
                      <span className="text-sm text-white">{item.name}</span>
                    </div>
                    <span className="text-xs text-yellow-300 font-mono">{item.pays}</span>
                  </div>
                ))}
                <p className="text-[10px] text-purple-400 mt-2 text-center">Payouts shown for 3 / 4 / 5 of a kind</p>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-500/30 text-center">
                <p className="text-xs text-purple-300">10 Paylines • RTP 96.09% • Low Volatility</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
