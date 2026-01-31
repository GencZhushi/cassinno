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
  Zap, 
  Trophy,
  Sparkles,
  X,
  Minus,
  Plus,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🎰"];

const SYMBOL_INFO: Record<string, { name: string; color: string; payout: number }> = {
  "🍒": { name: "Cherry", color: "from-red-500 to-red-700", payout: 2 },
  "🍋": { name: "Lemon", color: "from-yellow-400 to-yellow-600", payout: 3 },
  "🍊": { name: "Orange", color: "from-orange-400 to-orange-600", payout: 4 },
  "🍇": { name: "Grapes", color: "from-purple-500 to-purple-700", payout: 5 },
  "⭐": { name: "Star", color: "from-yellow-300 to-amber-500", payout: 10 },
  "💎": { name: "Diamond", color: "from-cyan-400 to-blue-600", payout: 25 },
  "7️⃣": { name: "Lucky 7", color: "from-red-600 to-red-800", payout: 50 },
  "🎰": { name: "Jackpot", color: "from-amber-400 to-yellow-600", payout: 100 },
};

const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

export default function SlotsPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>([
    ["🍒", "🍋", "🍊"],
    ["🍇", "⭐", "🍒"],
    ["💎", "🍋", "🍇"],
    ["7️⃣", "🍊", "⭐"],
    ["🎰", "💎", "7️⃣"],
  ]);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winLines, setWinLines] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [reelAnimations, setReelAnimations] = useState<boolean[]>([false, false, false, false, false]);
  const [winningPositions, setWinningPositions] = useState<{reel: number, row: number}[]>([]);
  const autoSpinRef = useRef(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const triggerConfetti = useCallback(() => {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 6,
      });
    }
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3000);
  }, []);

  const spin = useCallback(async () => {
    const totalBet = betAmount * 20;
    if (betAmount <= 0 || totalBet > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setWinLines([]);
    setWinningPositions([]);
    setReelAnimations([true, true, true, true, true]);

    // Smooth spinning animation - faster interval for smoother effect
    const animationInterval = setInterval(() => {
      setReels(prev => prev.map(() => 
        Array(3).fill(0).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      ));
    }, 80);

    try {
      const res = await fetch("/api/games/slots/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount }),
      });

      const data = await res.json();

      // Let the animation run for a bit before stopping
      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      // Stop reels sequentially with smooth timing
      for (let i = 0; i < 5; i++) {
        // Staggered delay - each reel stops slightly later
        await new Promise(resolve => setTimeout(resolve, 200 + (i * 50)));
        
        setReelAnimations(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        
        // Small delay before showing final symbol for smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setReels(prev => {
          const next = [...prev];
          next[i] = data.reels[i];
          return next;
        });
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setWinLines(data.winningLines || []);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      // Calculate winning positions for visual linking
      if (data.winningLines && data.winningLines.length > 0) {
        const positions: {reel: number, row: number}[] = [];
        data.winningLines.forEach((lineIndex: number) => {
          // Find consecutive matching symbols from left
          const lineSymbols = data.reels.map((reel: string[]) => reel[lineIndex]);
          const firstSymbol = lineSymbols[0];
          for (let i = 0; i < 5; i++) {
            if (lineSymbols[i] === firstSymbol) {
              positions.push({ reel: i, row: lineIndex });
            } else {
              break;
            }
          }
        });
        setWinningPositions(positions);
      }

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        triggerConfetti();
        
        if (winAmount >= betAmount * 50) {
          toast({ title: `🎉 MEGA WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= betAmount * 20) {
          toast({ title: `🌟 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        }
      }

      // Auto-spin continuation
      if (autoSpinRef.current && parseInt(data.newBalance) >= betAmount * 20) {
        setTimeout(() => {
          if (autoSpinRef.current) spin();
        }, 1000);
      } else if (autoSpinRef.current) {
        setAutoSpin(false);
        toast({ title: "Auto-spin stopped: Insufficient balance", variant: "destructive" });
      }

    } catch (error) {
      clearInterval(animationInterval);
      setReelAnimations([false, false, false, false, false]);
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
      setAutoSpin(false);
    } finally {
      setIsSpinning(false);
    }
  }, [betAmount, balance, toast, triggerConfetti]);

  const adjustBet = (delta: number) => {
    const newBet = Math.max(1, Math.min(100, betAmount + delta));
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

  return (
    <main className="min-h-screen pb-20 relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece rounded-sm pointer-events-none z-50"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                🎰
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  MEGA SLOTS
                </h1>
                <p className="text-sm text-muted-foreground">5 Reels • 20 Paylines</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPaytable(true)}
              className="hover:bg-white/10"
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="glass border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
              <p className="text-2xl font-bold text-yellow-400">{balance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass border-green-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Session Wins</p>
              <p className="text-2xl font-bold text-green-400">+{totalWon.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass border-purple-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Spins</p>
              <p className="text-2xl font-bold text-purple-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Slot Machine */}
        <div className={`slot-machine-frame relative rounded-2xl p-1 mb-6 ${lastWin > 0 ? "winning" : ""}`}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-yellow-600 via-amber-700 to-yellow-900 opacity-80" />
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Decoration */}
            <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 py-3 px-6 flex items-center justify-center gap-4">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400 tracking-wider">★ MEGA SLOTS ★</span>
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>

            {/* Reels Container */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
              <div className="bg-black/50 rounded-xl p-4 border-4 border-yellow-600/50 shadow-inner relative">
                {/* Payline Indicators - Left Side */}
                <div className="absolute -left-1 top-4 bottom-4 flex flex-col justify-between z-20 py-2">
                  {[0, 1, 2].map((line) => (
                    <div key={line} className="flex items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                          winLines.includes(line)
                            ? "bg-yellow-400 text-black border-yellow-300 scale-110 shadow-lg shadow-yellow-400/50"
                            : "bg-slate-800 text-slate-400 border-slate-600"
                        }`}
                      >
                        {line + 1}
                      </div>
                      {/* Connecting line to reel */}
                      <div 
                        className={`w-3 h-0.5 transition-all duration-300 ${
                          winLines.includes(line) ? "bg-yellow-400 shadow-lg shadow-yellow-400/50" : "bg-slate-600"
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {/* Reels */}
                <div className="grid grid-cols-5 gap-2 mx-6">
                  {reels.map((reel, reelIndex) => (
                    <div
                      key={reelIndex}
                      className="slot-reel-container bg-gradient-to-b from-slate-200 via-white to-slate-200 rounded-lg overflow-hidden shadow-lg border border-slate-300"
                      style={{ height: "246px" }}
                    >
                      <div
                        className={`flex flex-col transition-all duration-300 ${
                          reelAnimations[reelIndex] ? "slot-reel-strip spinning" : "slot-reel-strip stopping"
                        }`}
                      >
                        {reel.map((symbol, rowIndex) => {
                          const isWinning = winningPositions.some(
                            pos => pos.reel === reelIndex && pos.row === rowIndex
                          );
                          return (
                            <div
                              key={rowIndex}
                              className={`h-[82px] flex items-center justify-center text-5xl transition-all duration-300 relative ${
                                isWinning && !isSpinning
                                  ? "bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300"
                                  : rowIndex === 1 ? "bg-white/80" : "bg-slate-100/50"
                              }`}
                            >
                              {/* Win highlight border */}
                              {isWinning && !isSpinning && (
                                <div className="absolute inset-1 rounded-lg border-2 border-yellow-500 win-line-connector" style={{ color: '#facc15' }} />
                              )}
                              <span
                                className={`transform transition-all duration-300 ${
                                  isWinning && !isSpinning ? "winning-symbol scale-110" : ""
                                }`}
                                style={{
                                  filter: reelAnimations[reelIndex] ? "blur(2px)" : "none",
                                  textShadow: isWinning && !isSpinning 
                                    ? "0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.5)" 
                                    : "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                              >
                                {symbol}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Win Line Connectors - SVG overlay for linking winning symbols */}
                {winningPositions.length > 0 && !isSpinning && (
                  <svg 
                    className="absolute inset-0 pointer-events-none z-10 mx-6"
                    style={{ left: '24px', right: '24px', top: '16px', bottom: '16px' }}
                  >
                    {winLines.map((lineIndex) => {
                      const linePositions = winningPositions.filter(p => p.row === lineIndex);
                      if (linePositions.length < 2) return null;
                      
                      const reelWidth = 100 / 5;
                      const rowHeight = 82;
                      const rowOffset = 41;
                      
                      return linePositions.slice(0, -1).map((pos, idx) => {
                        const x1 = (pos.reel * reelWidth) + (reelWidth / 2);
                        const x2 = ((pos.reel + 1) * reelWidth) + (reelWidth / 2);
                        const y = (lineIndex * rowHeight) + rowOffset;
                        
                        return (
                          <line
                            key={`${lineIndex}-${idx}`}
                            x1={`${x1}%`}
                            y1={y}
                            x2={`${x2}%`}
                            y2={y}
                            stroke="#facc15"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="win-line-connector"
                            style={{ filter: "drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))" }}
                          />
                        );
                      });
                    })}
                  </svg>
                )}

                {/* Payline Indicators - Right Side */}
                <div className="absolute -right-1 top-4 bottom-4 flex flex-col justify-between z-20 py-2">
                  {[0, 1, 2].map((line) => (
                    <div key={line} className="flex items-center">
                      {/* Connecting line to reel */}
                      <div 
                        className={`w-3 h-0.5 transition-all duration-300 ${
                          winLines.includes(line) ? "bg-yellow-400 shadow-lg shadow-yellow-400/50" : "bg-slate-600"
                        }`}
                      />
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                          winLines.includes(line)
                            ? "bg-yellow-400 text-black border-yellow-300 scale-110 shadow-lg shadow-yellow-400/50"
                            : "bg-slate-800 text-slate-400 border-slate-600"
                        }`}
                      >
                        {line + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Display */}
              <div className="h-16 flex items-center justify-center mt-4">
                {lastWin > 0 ? (
                  <div className="win-amount flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 shadow-lg shadow-yellow-500/50">
                    <Trophy className="w-6 h-6 text-yellow-900" />
                    <span className="text-3xl font-black text-yellow-900">
                      +{lastWin.toLocaleString()}
                    </span>
                    <Trophy className="w-6 h-6 text-yellow-900" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg font-semibold animate-pulse">Spinning...</span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-lg">Spin to win!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6">
              <div className="flex items-center justify-between gap-4">
                {/* Bet Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-5)}
                    disabled={isSpinning || betAmount <= 1}
                    className="border-yellow-600/50 hover:bg-yellow-600/20"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="text-center min-w-[100px]">
                    <p className="text-xs text-muted-foreground uppercase">Bet/Line</p>
                    <p className="text-2xl font-bold text-yellow-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(5)}
                    disabled={isSpinning || betAmount >= 100}
                    className="border-yellow-600/50 hover:bg-yellow-600/20"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Bet Buttons */}
                <div className="hidden md:flex gap-2">
                  {[1, 5, 10, 25, 50, 100].map((amt) => (
                    <Button
                      key={amt}
                      variant={betAmount === amt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amt)}
                      disabled={isSpinning}
                      className={betAmount === amt 
                        ? "bg-yellow-600 hover:bg-yellow-700 text-black font-bold" 
                        : "border-yellow-600/30 hover:bg-yellow-600/20"
                      }
                    >
                      {amt}
                    </Button>
                  ))}
                </div>

                {/* Total Bet Display */}
                <div className="text-center min-w-[120px]">
                  <p className="text-xs text-muted-foreground uppercase">Total Bet</p>
                  <p className="text-2xl font-bold text-white">{(betAmount * 20).toLocaleString()}</p>
                </div>

                {/* Spin Button */}
                <Button
                  onClick={spin}
                  disabled={isSpinning || balance < betAmount * 20}
                  className="relative h-16 px-10 text-xl font-black bg-gradient-to-b from-green-500 via-green-600 to-green-700 hover:from-green-400 hover:via-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isSpinning ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-6 h-6" />
                        SPIN
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 shimmer-effect opacity-30" />
                </Button>

                {/* Auto Spin */}
                <Button
                  onClick={toggleAutoSpin}
                  variant={autoSpin ? "destructive" : "outline"}
                  className={`h-12 ${autoSpin ? "" : "border-yellow-600/50 hover:bg-yellow-600/20"}`}
                  disabled={balance < betAmount * 20}
                >
                  <Zap className={`w-5 h-5 mr-2 ${autoSpin ? "animate-pulse" : ""}`} />
                  {autoSpin ? "STOP" : "AUTO"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-sm text-muted-foreground">
          <span>RTP: 96% • </span>
          <span>Min Bet: 20 • </span>
          <span>Max Win: 100x per line</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass max-w-2xl w-full max-h-[80vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(SYMBOL_INFO).map(([symbol, info]) => (
                  <div
                    key={symbol}
                    className={`p-4 rounded-xl bg-gradient-to-br ${info.color} text-white text-center`}
                  >
                    <div className="text-4xl mb-2">{symbol}</div>
                    <p className="font-semibold text-sm">{info.name}</p>
                    <p className="text-xs opacity-80">3x = {info.payout}x</p>
                    <p className="text-xs opacity-80">4x = {info.payout * 3}x</p>
                    <p className="text-xs opacity-80">5x = {info.payout * 10}x</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="p-4 rounded-lg bg-white/5">
                  <h3 className="font-semibold text-white mb-2">How to Play</h3>
                  <ul className="space-y-1">
                    <li>• Match 3 or more symbols on a payline to win</li>
                    <li>• Wins are calculated from left to right</li>
                    <li>• 20 paylines are always active</li>
                    <li>• Bet per line multiplied by symbol payout = win</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <h3 className="font-semibold text-white mb-2">Paylines</h3>
                  <p>Top row (Line 1), Middle row (Line 2), Bottom row (Line 3) plus 17 additional diagonal and zigzag patterns.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
