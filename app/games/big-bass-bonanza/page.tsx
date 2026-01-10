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
  Trophy,
  Sparkles,
  X,
  Minus,
  Plus,
  Fish,
  Anchor,
  Waves
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_COLS = 5;
const GRID_ROWS = 3;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string }> = {
  "🔟": { name: "Ten", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50" },
  "🃏": { name: "Jack", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50" },
  "👸": { name: "Queen", gradient: "from-pink-400 to-pink-600", glow: "shadow-pink-400/50" },
  "🤴": { name: "King", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50" },
  "🅰️": { name: "Ace", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50" },
  "🧰": { name: "Tackle Box", gradient: "from-orange-400 to-orange-600", glow: "shadow-orange-400/50" },
  "🔴": { name: "Floater", gradient: "from-red-500 to-rose-600", glow: "shadow-red-400/50" },
  "🪰": { name: "Dragonfly", gradient: "from-emerald-400 to-green-600", glow: "shadow-emerald-400/50" },
  "🎣": { name: "Fishing Rod", gradient: "from-amber-400 to-yellow-600", glow: "shadow-amber-400/50" },
  "🐟": { name: "Blue Bass", gradient: "from-cyan-400 to-blue-600", glow: "shadow-cyan-400/50" },
  "🐠": { name: "Green Bass", gradient: "from-green-400 to-emerald-600", glow: "shadow-green-400/50" },
  "🐡": { name: "Golden Bass", gradient: "from-yellow-400 to-amber-600", glow: "shadow-yellow-400/50" },
  "🪝": { name: "Hooked Fish", gradient: "from-sky-400 via-cyan-500 to-blue-600", glow: "shadow-sky-400/50" },
  "🧔": { name: "Fisherman", gradient: "from-amber-500 via-yellow-500 to-orange-500", glow: "shadow-amber-400/50" },
};

const WATER_COLORS = ["#0EA5E9", "#06B6D4", "#22D3EE", "#38BDF8", "#7DD3FC", "#0284C7", "#0369A1"];

interface Bubble {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
}

interface MoneyFishData {
  position: [number, number];
  value: number;
}

interface PaylineWin {
  paylineIndex: number;
  positions: [number, number][];
  win: string;
}

export default function BigBassBonanzaPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>(
    Array(GRID_COLS).fill(null).map(() => 
      Array(GRID_ROWS).fill(null).map(() => 
        ["🔟", "🃏", "👸", "🤴", "🅰️", "🧰", "🔴", "🪰", "🎣", "🐟", "🐠", "🐡"][Math.floor(Math.random() * 12)]
      )
    )
  );
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<[number, number][]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [fishermenCollected, setFishermenCollected] = useState(0);
  const [moneyFish, setMoneyFish] = useState<MoneyFishData[]>([]);
  const [fishermanPositions, setFishermanPositions] = useState<[number, number][]>([]);
  const [collectedValue, setCollectedValue] = useState(0);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [showCatch, setShowCatch] = useState(false);
  const autoSpinRef = useRef(false);
  const freeSpinsRef = useRef(0);
  const betAmountRef = useRef(betAmount);
  const multiplierRef = useRef(1);
  const fishermenRef = useRef(0);

  useEffect(() => {
    fetchBalance();
    generateBubbles();
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

  useEffect(() => {
    multiplierRef.current = currentMultiplier;
  }, [currentMultiplier]);

  useEffect(() => {
    fishermenRef.current = fishermenCollected;
  }, [fishermenCollected]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const generateBubbles = () => {
    const newBubbles: Bubble[] = [];
    for (let i = 0; i < 20; i++) {
      newBubbles.push({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 12 + 4,
        delay: Math.random() * 8,
        duration: Math.random() * 4 + 6,
      });
    }
    setBubbles(newBubbles);
  };

  const triggerSplash = useCallback(() => {
    generateBubbles();
  }, []);

  const showBigWinAnimation = useCallback((amount: number) => {
    setBigWinAmount(amount);
    setShowBigWin(true);
    triggerSplash();
    setTimeout(() => setShowBigWin(false), 3500);
  }, [triggerSplash]);

  const showCatchAnimation = useCallback((value: number) => {
    setCollectedValue(value);
    setShowCatch(true);
    setTimeout(() => setShowCatch(false), 2000);
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
    setWinningPositions([]);
    setMoneyFish([]);
    setFishermanPositions([]);
    setCollectedValue(0);

    const animationInterval = setInterval(() => {
      setGrid(prev => prev.map(() => 
        Array(GRID_ROWS).fill(null).map(() => 
          ["🔟", "🃏", "👸", "🤴", "🅰️", "🧰", "🔴", "🪰", "🎣", "🐟", "🐠", "🐡", "🪝", "🧔"][Math.floor(Math.random() * 14)]
        )
      ));
    }, 80);

    try {
      const res = await fetch("/api/games/big-bass-bonanza/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: currentBet,
          isFreeSpinMode: isFreeSpin,
          currentMultiplier: multiplierRef.current,
          fishermenCollected: fishermenRef.current
        }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      setGrid(data.grid);
      
      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      // Handle payline wins
      if (data.paylineWins && data.paylineWins.length > 0) {
        const allPositions: [number, number][] = [];
        data.paylineWins.forEach((pw: PaylineWin) => {
          allPositions.push(...pw.positions);
        });
        setWinningPositions(allPositions);
      }

      // Handle money fish and fisherman collection
      if (data.moneyFish && data.moneyFish.length > 0) {
        setMoneyFish(data.moneyFish);
      }
      if (data.fishermanPositions && data.fishermanPositions.length > 0) {
        setFishermanPositions(data.fishermanPositions);
        if (data.collectedValue > 0) {
          showCatchAnimation(data.collectedValue);
        }
      }

      // Update multiplier and fishermen collected
      setCurrentMultiplier(data.currentMultiplier);
      setFishermenCollected(data.fishermenCollected);

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        triggerSplash();
        toast({ 
          title: `🎣 HOOKED! ${data.freeSpinsWon} FREE SPINS!`, 
          variant: "success" 
        });
      }

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `🐋 WHALE CATCH! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🐟 MONSTER BASS! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          triggerSplash();
          toast({ title: `🎣 BIG CATCH! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else {
          triggerSplash();
        }
      }

      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        setCurrentMultiplier(1);
        setFishermenCollected(0);
        toast({ title: "Free spins ended! Time to head back to shore.", variant: "default" });
      }

      const shouldContinue = 
        (autoSpinRef.current && parseInt(data.newBalance) >= currentBet) ||
        (remainingFreeSpins > 0 || data.freeSpinsWon > 0);
        
      if (shouldContinue) {
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
  }, [balance, toast, triggerSplash, showBigWinAnimation, showCatchAnimation]);

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

  const isPositionWinning = (col: number, row: number) => {
    return winningPositions.some(([c, r]) => c === col && r === row);
  };

  const getMoneyFishValue = (col: number, row: number) => {
    const mf = moneyFish.find(m => m.position[0] === col && m.position[1] === row);
    return mf?.value;
  };

  const isFishermanPosition = (col: number, row: number) => {
    return fishermanPositions.some(([c, r]) => c === col && r === row);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-sky-600 via-cyan-700 to-blue-900">
      {/* Underwater Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Water surface shimmer */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sky-400/30 via-cyan-400/20 to-transparent" />
        
        {/* Seaweed */}
        <div className="absolute bottom-0 left-10 w-6 h-32 bg-gradient-to-t from-green-800/60 to-emerald-600/40 rounded-t-full transform -skew-x-6 animate-pulse" style={{ animationDuration: "3s" }} />
        <div className="absolute bottom-0 left-16 w-4 h-24 bg-gradient-to-t from-green-700/50 to-emerald-500/30 rounded-t-full transform skew-x-3 animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }} />
        <div className="absolute bottom-0 right-10 w-5 h-28 bg-gradient-to-t from-green-800/60 to-emerald-600/40 rounded-t-full transform skew-x-6 animate-pulse" style={{ animationDuration: "3.5s" }} />
        <div className="absolute bottom-0 right-20 w-4 h-20 bg-gradient-to-t from-green-700/50 to-emerald-500/30 rounded-t-full transform -skew-x-3 animate-pulse" style={{ animationDuration: "4.5s", animationDelay: "0.5s" }} />
        
        {/* Sandy bottom */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-amber-700/40 to-transparent" />
      </div>

      {/* Animated Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble pointer-events-none z-10 opacity-60"
          style={{
            position: "fixed",
            left: `${bubble.x}%`,
            bottom: "-20px",
            width: bubble.size,
            height: bubble.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${WATER_COLORS[bubble.id % WATER_COLORS.length]}40)`,
            animation: `rise ${bubble.duration}s ease-in-out infinite`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">🐟🎣🐟</div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">🐟🎣🐟</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-sky-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              BIG CATCH!
            </h2>
            <p className="text-5xl font-bold text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-sky-300/80 mt-2">Reel in the winnings!</p>
          </div>
        </div>
      )}

      {/* Money Fish Collection Animation */}
      {showCatch && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🧔💰</div>
            <div className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg">
              <span className="text-2xl font-black text-white">COLLECTED: {collectedValue}x</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 py-3 max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-sky-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/30">
                🎣
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                  BIG BASS BONANZA
                </h1>
                <p className="text-xs text-cyan-300/80">5×3 • 10 Paylines • Fisherman Collects!</p>
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

        {/* Free Spins Banner */}
        {isFreeSpinMode && (
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-cyan-600/80 via-blue-600/80 to-sky-600/80 border border-cyan-400/50 backdrop-blur-sm shadow-lg shadow-cyan-500/30">
            <div className="flex items-center justify-center gap-3">
              <Fish className="w-5 h-5 text-cyan-300 animate-pulse" />
              <span className="text-lg font-bold text-white">FREE FISHING: {freeSpins}</span>
              <span className="text-base font-semibold text-cyan-300 bg-black/30 px-2 py-0.5 rounded">×{currentMultiplier}</span>
              <span className="text-xs text-cyan-200 bg-black/20 px-2 py-0.5 rounded">🧔 {fishermenCollected}/4</span>
              <Fish className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
          </div>
        )}

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-white/10 backdrop-blur-md border-cyan-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-cyan-300 uppercase">Balance</p>
              <p className="text-lg font-bold text-cyan-400">{balance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-green-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-green-300 uppercase">Won</p>
              <p className="text-lg font-bold text-green-400">+{totalWon.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-blue-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-blue-300 uppercase">Casts</p>
              <p className="text-lg font-bold text-blue-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Grid */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-cyan-500 via-blue-600 to-sky-700 shadow-xl shadow-cyan-500/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner - Fishing Style */}
            <div className="bg-gradient-to-r from-cyan-700 via-blue-600 to-cyan-700 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-cyan-400/30">
              <Anchor className="w-4 h-4 text-cyan-300" />
              <span className="text-base font-bold text-white tracking-wide drop-shadow-lg">
                BIG BASS BONANZA
              </span>
              <Anchor className="w-4 h-4 text-cyan-300" />
            </div>

            {/* Grid Container */}
            <div className="bg-gradient-to-b from-blue-950 via-cyan-950 to-blue-950 p-2">
              <div className="bg-black/50 rounded-xl p-2 border-2 border-cyan-500/40 overflow-hidden shadow-inner">
                <div className="grid grid-cols-5 gap-1">
                  {grid.map((col, colIndex) => (
                    col.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(colIndex, rowIndex);
                      const moneyValue = getMoneyFishValue(colIndex, rowIndex);
                      const isFisherman = isFishermanPosition(colIndex, rowIndex);
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "" };
                      
                      return (
                        <div
                          key={`${colIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-3xl sm:text-4xl
                            transition-all duration-200 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-cyan-400 ring-inset shadow-lg ${symbolInfo.glow}` 
                              : "bg-gradient-to-br from-slate-800/80 to-slate-900/80"
                            }
                            ${isFisherman ? "ring-2 ring-amber-400 animate-pulse" : ""}
                          `}
                        >
                          <span 
                            className="transition-all duration-200"
                            style={{
                              textShadow: isWinning 
                                ? "0 0 20px rgba(34,211,238,0.9)" 
                                : "0 2px 4px rgba(0,0,0,0.5)",
                              filter: isWinning ? "brightness(1.3) drop-shadow(0 0 8px cyan)" : "none",
                              transform: isWinning ? "scale(1.1)" : "scale(1)",
                            }}
                          >
                            {symbol}
                          </span>
                          
                          {/* Win glow effect */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-cyan-400/25 animate-pulse rounded-lg" />
                          )}
                          
                          {/* Money Fish Value Overlay */}
                          {moneyValue && (
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-gradient-to-t from-amber-600/95 to-amber-500/80 py-0.5 rounded-b-lg">
                              <span className="text-xs font-black text-white drop-shadow-lg">{moneyValue}x</span>
                            </div>
                          )}
                          
                          {/* Scatter glow */}
                          {symbol === "🪝" && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-sky-400/60" />
                          )}
                          
                          {/* Fisherman glow */}
                          {symbol === "🧔" && (
                            <div className="absolute inset-0 rounded-lg bg-amber-500/20 animate-pulse" />
                          )}
                        </div>
                      );
                    })
                  )).flat()}
                </div>
              </div>

              {/* Win Display */}
              <div className="h-12 flex items-center justify-center mt-2">
                {lastWin > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-500 shadow-lg shadow-cyan-500/40">
                    <Trophy className="w-5 h-5 text-cyan-100" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-cyan-100" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Casting the line...</span>
                  </div>
                ) : (
                  <p className="text-cyan-300/80 text-sm">Match 3+ symbols to reel in a catch!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-3 border-t border-cyan-500/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-cyan-500/50 hover:bg-cyan-500/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-cyan-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-cyan-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(10)}
                    disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                    className="border-cyan-500/50 hover:bg-cyan-500/20 text-white h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Quick Bet Buttons */}
                <div className="hidden lg:flex gap-1">
                  {[10, 50, 100, 250].map((amt) => (
                    <Button
                      key={amt}
                      variant={betAmount === amt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amt)}
                      disabled={isSpinning || isFreeSpinMode}
                      className={`h-8 px-2 text-xs ${betAmount === amt 
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold border-0" 
                        : "border-cyan-500/30 hover:bg-cyan-500/20 text-white"
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
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-cyan-400 via-blue-500 to-sky-600 hover:from-cyan-300 hover:via-blue-400 hover:to-sky-500 text-white shadow-lg shadow-cyan-500/50 disabled:opacity-50 overflow-hidden group border border-cyan-300/50"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isSpinning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFreeSpinMode ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        FREE
                      </>
                    ) : (
                      <>
                        <Waves className="w-4 h-4" />
                        CAST
                      </>
                    )}
                  </span>
                </Button>

                {/* Auto Spin */}
                <Button
                  onClick={toggleAutoSpin}
                  variant={autoSpin ? "destructive" : "outline"}
                  size="sm"
                  className={`h-8 ${autoSpin ? "" : "border-cyan-500/50 hover:bg-cyan-500/20 text-white"}`}
                  disabled={balance < betAmount || isFreeSpinMode}
                >
                  <Waves className={`w-3 h-3 mr-1 ${autoSpin ? "animate-pulse" : ""}`} />
                  {autoSpin ? "STOP" : "AUTO"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-xs text-cyan-300/70">
          <span>RTP: 96.71% • 3+ 🪝 = Free Spins • 🧔 Fisherman Collects Money Fish! • Every 4 🧔 = +1x Multiplier</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 border-cyan-500/50 max-w-3xl w-full max-h-[85vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                  <Fish className="w-6 h-6" /> Big Bass Bonanza Paytable
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(SYMBOL_DATA).slice(0, 14).map(([symbol, info]) => (
                  <div
                    key={symbol}
                    className={`p-3 rounded-xl bg-gradient-to-br ${info.gradient} text-white text-center shadow-lg`}
                  >
                    <div className="text-4xl mb-1">{symbol}</div>
                    <p className="font-semibold text-xs">{info.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-white/10 border border-cyan-500/30">
                  <h3 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Anchor className="w-4 h-4" /> 10 Paylines
                  </h3>
                  <p className="text-slate-300">
                    Match 3, 4, or 5 symbols from left to right on any of the 10 paylines to win!
                    The more symbols you match, the bigger the payout.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-cyan-500/30">
                  <h3 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Free Spins (3+ 🪝 Scatters)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• 3 Scatters = 10 Free Spins + 2x bet</li>
                    <li>• 4 Scatters = 15 Free Spins + 20x bet</li>
                    <li>• 5 Scatters = 20 Free Spins + 200x bet</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    🧔 Fisherman Wild (Free Spins Only)
                  </h3>
                  <p className="text-slate-300">
                    The Fisherman only appears during Free Spins! He&apos;s WILD and substitutes for all 
                    symbols except Scatter. When he lands, he <span className="text-amber-400 font-bold">COLLECTS</span> all 
                    Money Fish values on the reels!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-cyan-500/30">
                  <h3 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    💰 Money Fish (Free Spins Only)
                  </h3>
                  <p className="text-slate-300">
                    During Free Spins, fish symbols can have <span className="text-cyan-400 font-bold">cash values</span> attached 
                    (2x - 2000x your bet)! When Fisherman lands, he collects ALL money fish values. 
                    Multiple fishermen <span className="text-cyan-400 font-bold">MULTIPLY</span> the collection!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-yellow-500/30">
                  <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    ⭐ Multiplier Boost
                  </h3>
                  <p className="text-slate-300">
                    Every <span className="text-yellow-400 font-bold">4 Fishermen</span> collected during Free Spins triggers:
                  </p>
                  <ul className="text-slate-300 space-y-1 mt-2">
                    <li>• +10 Extra Free Spins (Re-trigger!)</li>
                    <li>• +1x Multiplier on ALL wins!</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-cyan-500/30">
                  <h3 className="font-semibold text-slate-300 mb-2">Symbol Payouts (× Line Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>🔟🃏 (10, J): 3+ = 0.5x to 2.5x</div>
                    <div>👸🤴 (Q, K): 3+ = 0.5x to 3x</div>
                    <div>🅰️ (Ace): 3+ = 0.5x to 4x</div>
                    <div>🧰🔴 (Tackle, Float): 3+ = 1x to 5x</div>
                    <div>🪰 (Dragonfly): 3+ = 1.5x to 7.5x</div>
                    <div>🎣 (Fishing Rod): 3+ = 2x to 10x</div>
                    <div>🐟 (Blue Bass): 3+ = 3x to 15x</div>
                    <div>🐠 (Green Bass): 3+ = 4x to 20x</div>
                    <div className="col-span-2 text-amber-400 font-semibold">🐡 Golden Bass: 3+ = 5x to 30x</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/50">
                  <h3 className="font-bold text-cyan-400 text-center">🐋 MAX WIN: 2,100x YOUR STAKE 🐋</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes rise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-50vh) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) scale(0.8);
            opacity: 0;
          }
        }
        
        .bubble {
          animation: rise linear infinite;
        }
      `}</style>
    </main>
  );
}
