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
  Crown,
  Gem
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_COLS = 6;
const GRID_ROWS = 5;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string }> = {
  "💎": { name: "Blue Crown", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50" },
  "🔷": { name: "Green Crown", gradient: "from-teal-400 to-cyan-600", glow: "shadow-teal-400/50" },
  "🟣": { name: "Purple Crown", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50" },
  "🔴": { name: "Red Crown", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50" },
  "💠": { name: "Sapphire Gem", gradient: "from-sky-400 to-blue-600", glow: "shadow-sky-400/50" },
  "✳️": { name: "Emerald Gem", gradient: "from-emerald-400 to-green-600", glow: "shadow-emerald-400/50" },
  "🔮": { name: "Amethyst Gem", gradient: "from-violet-400 to-purple-600", glow: "shadow-violet-400/50" },
  "👑": { name: "Golden Chalice", gradient: "from-yellow-400 to-amber-600", glow: "shadow-yellow-400/50" },
  "❤️‍🔥": { name: "Ruby Ring", gradient: "from-rose-500 to-red-600", glow: "shadow-rose-400/50" },
  "⚡": { name: "Zeus Lightning", gradient: "from-yellow-300 via-amber-400 to-orange-500", glow: "shadow-yellow-400/50" },
};

const LIGHTNING_COLORS = ["#FFD700", "#FFA500", "#87CEEB", "#E6E6FA", "#FFFFFF", "#FFE4B5", "#B8860B", "#DAA520"];

interface LightningBolt {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  opacity: number;
}

interface TumbleData {
  grid: string[][];
  winningPositions: [number, number][];
  win: string;
  multiplier: number;
  multiplierOrbs?: { position: [number, number]; value: number }[];
}

export default function GatesOfOlympusPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>(
    Array(GRID_COLS).fill(null).map(() => 
      Array(GRID_ROWS).fill(null).map(() => 
        ["💎", "🔷", "🟣", "🔴", "💠", "✳️", "🔮", "👑"][Math.floor(Math.random() * 8)]
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
  const [lightning, setLightning] = useState<LightningBolt[]>([]);
  const [tumbleIndex, setTumbleIndex] = useState(-1);
  const [tumbles, setTumbles] = useState<TumbleData[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [multiplierOrbs, setMultiplierOrbs] = useState<{ position: [number, number]; value: number }[]>([]);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [zeusActive, setZeusActive] = useState(false);
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

  const triggerLightning = useCallback((intensity: number = 30) => {
    const bolts: LightningBolt[] = [];
    for (let i = 0; i < intensity; i++) {
      bolts.push({
        id: i,
        x: Math.random() * 100,
        color: LIGHTNING_COLORS[Math.floor(Math.random() * LIGHTNING_COLORS.length)],
        delay: Math.random() * 0.5,
        size: Math.random() * 15 + 8,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }
    setLightning(bolts);
    setZeusActive(true);
    setTimeout(() => {
      setLightning([]);
      setZeusActive(false);
    }, 2000);
  }, []);

  const showBigWinAnimation = useCallback((amount: number) => {
    setBigWinAmount(amount);
    setShowBigWin(true);
    triggerLightning(60);
    setTimeout(() => setShowBigWin(false), 3500);
  }, [triggerLightning]);

  const animateTumbles = useCallback(async (tumbleData: TumbleData[]) => {
    for (let i = 0; i < tumbleData.length; i++) {
      setTumbleIndex(i);
      const tumble = tumbleData[i];
      
      setWinningPositions(tumble.winningPositions);
      setMultiplierOrbs(tumble.multiplierOrbs || []);
      
      if (tumble.multiplier > 1) {
        setCurrentMultiplier(tumble.multiplier);
      }
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setGrid(tumble.grid);
      setWinningPositions([]);
      
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setTumbleIndex(-1);
    setMultiplierOrbs([]);
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
    setTumbles([]);
    setMultiplierOrbs([]);
    
    if (!isFreeSpin) {
      setCurrentMultiplier(1);
    }

    const animationInterval = setInterval(() => {
      setGrid(prev => prev.map(() => 
        Array(GRID_ROWS).fill(null).map(() => 
          ["💎", "🔷", "🟣", "🔴", "💠", "✳️", "🔮", "👑", "❤️‍🔥", "⚡"][Math.floor(Math.random() * 10)]
        )
      ));
    }, 80);

    try {
      const res = await fetch("/api/games/gates-of-olympus/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: currentBet,
          isFreeSpinMode: isFreeSpin,
          currentMultiplier: isFreeSpin ? currentMultiplier : 1
        }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, 500));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      setGrid(data.grid);
      
      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      if (data.tumbles && data.tumbles.length > 0) {
        setTumbles(data.tumbles);
        await animateTumbles(data.tumbles);
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        triggerLightning(50);
        toast({ 
          title: `⚡ ZEUS GRANTS ${data.freeSpinsWon} FREE SPINS!`, 
          variant: "success" 
        });
      }

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `⚡ GODLY WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🏛️ OLYMPIAN WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          triggerLightning(40);
          toast({ title: `👑 EPIC WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else {
          triggerLightning(20);
        }
      }

      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        setCurrentMultiplier(1);
        toast({ title: "Free spins ended! Zeus bids you farewell.", variant: "default" });
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
  }, [balance, currentMultiplier, toast, triggerLightning, animateTumbles, showBigWinAnimation]);

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

  const getOrbAtPosition = (col: number, row: number) => {
    return multiplierOrbs.find(o => o.position[0] === col && o.position[1] === row);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900">
      {/* Olympus Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Clouds and sky effect */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-900/20 via-orange-900/10 to-transparent" />
        <div className="absolute top-10 left-10 w-32 h-16 bg-white/5 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-48 h-20 bg-white/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: "1s" }} />
        
        {/* Temple pillars aesthetic */}
        <div className="absolute bottom-0 left-5 w-4 h-40 bg-gradient-to-t from-amber-800/30 to-amber-600/10 rounded-t-lg" />
        <div className="absolute bottom-0 right-5 w-4 h-40 bg-gradient-to-t from-amber-800/30 to-amber-600/10 rounded-t-lg" />
        
        {/* Golden particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400/40 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-amber-300/50 rounded-full animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
        <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-yellow-500/30 rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
      </div>

      {/* Lightning Effects */}
      {lightning.map((bolt) => (
        <div
          key={bolt.id}
          className="lightning-bolt pointer-events-none z-40"
          style={{
            position: "fixed",
            left: `${bolt.x}%`,
            top: "-20px",
            background: `linear-gradient(180deg, ${bolt.color}, transparent)`,
            width: bolt.size / 3,
            height: bolt.size * 8,
            opacity: bolt.opacity,
            animationDelay: `${bolt.delay}s`,
            filter: `blur(${bolt.size / 10}px)`,
            boxShadow: `0 0 ${bolt.size}px ${bolt.color}`,
          }}
        />
      ))}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">⚡👑⚡</div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">⚡👑⚡</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              OLYMPIAN WIN!
            </h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-amber-300/80 mt-2">Zeus has blessed you!</p>
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
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/30 ${zeusActive ? 'animate-pulse' : ''}`}>
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  GATES OF OLYMPUS
                </h1>
                <p className="text-xs text-amber-300/80">6×5 • Pay Anywhere • Multipliers up to 500x</p>
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
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-amber-600/80 via-yellow-600/80 to-orange-600/80 border border-yellow-400/50 backdrop-blur-sm shadow-lg shadow-amber-500/30">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-lg font-bold text-white">ZEUS FREE SPINS: {freeSpins}</span>
              <span className="text-base font-semibold text-yellow-300 bg-black/30 px-2 py-0.5 rounded">×{currentMultiplier}</span>
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
          </div>
        )}

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-white/10 backdrop-blur-md border-amber-500/30">
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
          <Card className="bg-white/10 backdrop-blur-md border-blue-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-blue-300 uppercase">Spins</p>
              <p className="text-lg font-bold text-blue-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Grid */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-amber-500 via-yellow-600 to-orange-600 shadow-xl shadow-amber-500/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner - Olympus Style */}
            <div className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-yellow-400/30">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-base font-bold text-white tracking-wide drop-shadow-lg">
                GATES OF OLYMPUS
              </span>
              <Crown className="w-4 h-4 text-yellow-300" />
            </div>

            {/* Grid Container */}
            <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 p-2">
              <div className="bg-black/50 rounded-xl p-2 border-2 border-amber-500/40 overflow-hidden shadow-inner">
                <div className="grid grid-cols-6 gap-1">
                  {grid.map((col, colIndex) => (
                    col.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(colIndex, rowIndex);
                      const orb = getOrbAtPosition(colIndex, rowIndex);
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "" };
                      
                      return (
                        <div
                          key={`${colIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-2xl sm:text-3xl
                            transition-all duration-200 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-400 ring-inset shadow-lg ${symbolInfo.glow}` 
                              : "bg-gradient-to-br from-slate-800/80 to-slate-900/80"
                            }
                          `}
                        >
                          <span 
                            className="transition-all duration-200"
                            style={{
                              textShadow: isWinning 
                                ? "0 0 20px rgba(255,215,0,0.9)" 
                                : "0 2px 4px rgba(0,0,0,0.5)",
                              filter: isWinning ? "brightness(1.3) drop-shadow(0 0 8px gold)" : "none",
                              transform: isWinning ? "scale(1.1)" : "scale(1)",
                            }}
                          >
                            {symbol}
                          </span>
                          
                          {/* Win glow effect */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-yellow-400/25 animate-pulse rounded-lg" />
                          )}
                          
                          {/* Multiplier Orb Overlay */}
                          {orb && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/90 to-yellow-600/90 rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-500/50">
                              <div className="flex flex-col items-center">
                                <Sparkles className="w-3 h-3 text-yellow-200 animate-spin" />
                                <span className="text-sm font-black text-white drop-shadow-lg">{orb.value}x</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Scatter glow */}
                          {symbol === "⚡" && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-yellow-400/60" />
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
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 shadow-lg shadow-amber-500/40">
                    <Trophy className="w-5 h-5 text-yellow-100" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-100" />
                  </div>
                ) : tumbleIndex >= 0 ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bold">Divine Tumble... ({tumbleIndex + 1}/{tumbles.length})</span>
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Zeus spins the reels...</span>
                  </div>
                ) : (
                  <p className="text-amber-300/80 text-sm">Match 8+ symbols to receive Zeus&apos; blessing!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 border-t border-amber-500/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-amber-500/50 hover:bg-amber-500/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-amber-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-yellow-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(10)}
                    disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                    className="border-amber-500/50 hover:bg-amber-500/20 text-white h-8 w-8"
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
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold border-0" 
                        : "border-amber-500/30 hover:bg-amber-500/20 text-white"
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
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-amber-400 via-yellow-500 to-orange-500 hover:from-amber-300 hover:via-yellow-400 hover:to-orange-400 text-slate-900 shadow-lg shadow-amber-500/50 disabled:opacity-50 overflow-hidden group border border-yellow-300/50"
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
                        <Zap className="w-4 h-4" />
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
                  className={`h-8 ${autoSpin ? "" : "border-amber-500/50 hover:bg-amber-500/20 text-white"}`}
                  disabled={balance < betAmount || isFreeSpinMode}
                >
                  <Zap className={`w-3 h-3 mr-1 ${autoSpin ? "animate-pulse" : ""}`} />
                  {autoSpin ? "STOP" : "AUTO"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-xs text-amber-300/70">
          <span>RTP: 96.5% • 8+ symbols = win • 4+ ⚡ = 15 Free Spins • Multipliers up to 500x!</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-amber-500/50 max-w-3xl w-full max-h-[85vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                  <Crown className="w-6 h-6" /> Gates of Olympus Paytable
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(SYMBOL_DATA).map(([symbol, info]) => (
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
                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <Gem className="w-4 h-4" /> Pay Anywhere (Cluster Pays)
                  </h3>
                  <p className="text-slate-300">
                    Match 8 or more identical symbols ANYWHERE on the 6×5 grid to win! 
                    No paylines required - just cluster matching symbols anywhere on the reels.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Tumble Feature
                  </h3>
                  <p className="text-slate-300">
                    Winning symbols vanish and new ones tumble down from above! 
                    This continues until no new wins form, creating epic chain reactions.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Zeus Multiplier Orbs
                  </h3>
                  <p className="text-slate-300">
                    Zeus can drop glowing multiplier orbs worth <span className="text-yellow-400 font-bold">2x to 500x</span> on any winning spin!
                    During Free Spins, all multipliers <span className="text-yellow-400 font-bold">ACCUMULATE</span> for massive payouts!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Free Spins (4+ ⚡ Scatters)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• 4 Scatters = 15 Free Spins + 3x bet</li>
                    <li>• 5 Scatters = 20 Free Spins + 5x bet</li>
                    <li>• 6 Scatters = 25 Free Spins + 100x bet</li>
                  </ul>
                  <p className="text-yellow-400 mt-2 font-semibold">
                    All multipliers ADD UP during Free Spins and apply to ALL wins!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-slate-300 mb-2">Symbol Payouts (× Total Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>💎🔷 Crowns: 8+ = 0.25x to 10x</div>
                    <div>🟣🔴 Crowns: 8+ = 0.3x to 15x</div>
                    <div>💠 Sapphire: 8+ = 1x to 30x</div>
                    <div>✳️ Emerald: 8+ = 1.5x to 40x</div>
                    <div>🔮 Amethyst: 8+ = 2x to 50x</div>
                    <div>👑 Chalice: 8+ = 4x to 75x</div>
                    <div className="col-span-2 text-amber-400 font-semibold">❤️‍🔥 Ruby Ring: 8+ = 10x to 150x</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-yellow-500/50">
                  <h3 className="font-bold text-yellow-400 text-center">⚡ MAX WIN: 5,000x YOUR STAKE ⚡</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes lightning-strike {
          0% {
            transform: translateY(-100%) scaleY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(0) scaleY(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) scaleY(0.5);
            opacity: 0;
          }
        }
        
        .lightning-bolt {
          animation: lightning-strike 0.8s ease-out forwards;
        }
        
        @keyframes divine-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 50px rgba(251, 191, 36, 0.8), 0 0 80px rgba(245, 158, 11, 0.4);
          }
        }
        
        @keyframes zeus-pulse {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.5) drop-shadow(0 0 20px gold);
          }
        }
      `}</style>
    </main>
  );
}
