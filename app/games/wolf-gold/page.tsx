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
  Moon,
  Star,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REELS = 5;
const ROWS = 3;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string; tier: string }> = {
  "9️⃣": { name: "Nine", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50", tier: "low" },
  "🔟": { name: "Ten", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50", tier: "low" },
  "🃏": { name: "Jack", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50", tier: "low" },
  "👸": { name: "Queen", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50", tier: "low" },
  "🤴": { name: "King", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50", tier: "low" },
  "🅰️": { name: "Ace", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50", tier: "low" },
  "🐎": { name: "Mustang", gradient: "from-amber-500 to-amber-700", glow: "shadow-amber-400/50", tier: "medium" },
  "🐆": { name: "Puma", gradient: "from-orange-500 to-orange-700", glow: "shadow-orange-400/50", tier: "medium" },
  "🦅": { name: "Eagle", gradient: "from-sky-400 to-sky-600", glow: "shadow-sky-400/50", tier: "high" },
  "🦬": { name: "Buffalo", gradient: "from-amber-600 to-amber-800", glow: "shadow-amber-500/50", tier: "high" },
  "🐺": { name: "Wolf", gradient: "from-indigo-500 via-purple-600 to-indigo-700", glow: "shadow-purple-400/50", tier: "wild" },
  "🏜️": { name: "Canyon", gradient: "from-orange-400 via-red-500 to-orange-600", glow: "shadow-orange-400/50", tier: "scatter" },
  "🌙": { name: "Moon", gradient: "from-yellow-300 via-amber-400 to-yellow-500", glow: "shadow-yellow-400/50", tier: "money" },
};

const ALL_SYMBOLS = ["9️⃣", "🔟", "🃏", "👸", "🤴", "🅰️", "🐎", "🐆", "🦅", "🦬", "🐺", "🏜️", "🌙"];

const STAR_POSITIONS = Array.from({ length: 50 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 60,
  size: Math.random() * 2 + 1,
  delay: Math.random() * 3,
  duration: Math.random() * 2 + 2,
}));

interface WinLineData {
  lineNumber: number;
  symbol: string;
  count: number;
  positions: [number, number][];
  payout: number;
  win: string;
}

export default function WolfGoldPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(25);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array(REELS).fill(null).map(() => 
      Array(ROWS).fill(null).map(() => 
        ALL_SYMBOLS[Math.floor(Math.random() * (ALL_SYMBOLS.length - 3))]
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
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<WinLineData[]>([]);
  const [stackedWildReels, setStackedWildReels] = useState<number[]>([]);
  const [moonPositions, setMoonPositions] = useState<[number, number][]>([]);
  const [moonValues, setMoonValues] = useState<number[]>([]);
  const [moonRespinActive, setMoonRespinActive] = useState(false);
  const [jackpotWon, setJackpotWon] = useState<string | null>(null);
  const [wolfHowl, setWolfHowl] = useState(false);
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

  const triggerWolfHowl = useCallback(() => {
    setWolfHowl(true);
    setTimeout(() => setWolfHowl(false), 2000);
  }, []);

  const showBigWinAnimation = useCallback((amount: number, jackpot?: string) => {
    setBigWinAmount(amount);
    setJackpotWon(jackpot || null);
    setShowBigWin(true);
    triggerWolfHowl();
    setTimeout(() => {
      setShowBigWin(false);
      setJackpotWon(null);
    }, 4000);
  }, [triggerWolfHowl]);

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
    setWinningLines([]);
    setStackedWildReels([]);
    setMoonPositions([]);
    setMoonValues([]);

    // Spinning animation
    const animationInterval = setInterval(() => {
      setReels(
        Array(REELS).fill(null).map(() => 
          Array(ROWS).fill(null).map(() => 
            ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
          )
        )
      );
    }, 80);

    try {
      const res = await fetch("/api/games/wolf-gold/spin", {
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

      // Set reels
      setReels(data.reels);

      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      // Handle stacked wilds
      if (data.stackedWildReels && data.stackedWildReels.length > 0) {
        setStackedWildReels(data.stackedWildReels);
        triggerWolfHowl();
      }

      // Handle free spins trigger
      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        triggerWolfHowl();
        toast({ 
          title: `🏜️ CANYON SCATTER! ${data.freeSpinsWon} FREE SPINS!`, 
          variant: "success" 
        });
      }

      // Handle moon respin trigger
      if (data.moonRespinTriggered) {
        setMoonRespinActive(true);
        setMoonPositions(data.moonPositions);
        setMoonValues(data.moonValues);
        toast({ 
          title: "🌙 MOON RESPIN TRIGGERED!", 
          variant: "success" 
        });
        
        // Auto-trigger moon respin
        setTimeout(async () => {
          const respinRes = await fetch("/api/games/wolf-gold/spin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              amount: currentBet,
              isMoonRespin: true,
              initialMoonPositions: data.moonPositions,
              initialMoonValues: data.moonValues,
            }),
          });
          
          const respinData = await respinRes.json();
          setMoonRespinActive(false);
          
          if (respinData.success) {
            const respinWin = parseInt(respinData.totalValue);
            setLastWin(respinWin);
            setBalance(parseInt(respinData.newBalance));
            setTotalWon(prev => prev + respinWin);
            
            if (respinData.jackpotWon) {
              showBigWinAnimation(respinWin, respinData.jackpotWon);
              toast({ 
                title: `🌙 ${respinData.jackpotWon.toUpperCase()} JACKPOT! +${respinWin.toLocaleString()}!`, 
                variant: "success" 
              });
            } else if (respinWin >= currentBet * 20) {
              showBigWinAnimation(respinWin);
            }
          }
        }, 2000);
        
        return; // Don't continue normal flow
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

      // Highlight scatter positions
      if (data.scatterPositions && data.scatterPositions.length >= 3) {
        const positions = new Set(winningPositions);
        data.scatterPositions.forEach(([reel, row]: [number, number]) => {
          positions.add(`${reel}-${row}`);
        });
        setWinningPositions(positions);
      }

      // Set moon positions for display
      if (data.moonPositions && data.moonPositions.length > 0) {
        setMoonPositions(data.moonPositions);
        setMoonValues(data.moonValues);
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `🐺 LEGENDARY HOWL! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🦬 BUFFALO STAMPEDE! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          triggerWolfHowl();
          toast({ title: `🦅 EAGLE WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 5) {
          triggerWolfHowl();
        }
      }

      // Check if free spins ended
      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        toast({ title: "Free spins ended! The sun rises over the canyon.", variant: "default" });
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
  }, [balance, toast, triggerWolfHowl, showBigWinAnimation, winningPositions]);

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

  const isStackedWild = (reel: number) => {
    return stackedWildReels.includes(reel);
  };

  const getMoonValue = (reel: number, row: number): number | null => {
    const idx = moonPositions.findIndex(([r, ro]) => r === reel && ro === row);
    return idx >= 0 ? moonValues[idx] : null;
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
      {/* Night Sky Background */}
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
              opacity: 0.6,
            }}
          />
        ))}
        
        {/* Moon glow */}
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-200/20 to-amber-300/10 blur-3xl" />
        
        {/* Desert horizon gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-950/50 via-amber-900/20 to-transparent" />
        
        {/* Canyon silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'%3E%3Cpath d='M0,200 L0,120 L100,80 L200,100 L300,60 L400,90 L500,50 L600,80 L700,40 L800,70 L900,30 L1000,60 L1100,40 L1200,80 L1200,200 Z' fill='%231a1a2e'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover',
          }}
        />
      </div>

      {/* Wolf Howl Effect */}
      {wolfHowl && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-indigo-600/10 animate-pulse" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl animate-bounce">
            🐺
          </div>
        </div>
      )}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">
                {jackpotWon ? "🌙💰🌙" : "🐺🌙🐺"}
              </div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">{jackpotWon ? "🌙💰🌙" : "🐺🌙🐺"}</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              {jackpotWon ? `${jackpotWon.toUpperCase()} JACKPOT!` : "WOLF GOLD!"}
            </h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-amber-300/80 mt-2">The pack howls at the moon!</p>
          </div>
        </div>
      )}

      {/* Moon Respin Overlay */}
      {moonRespinActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <Moon className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">MOON RESPIN</h2>
            <p className="text-lg text-amber-300">Collecting moon values...</p>
            <Loader2 className="w-8 h-8 text-yellow-400 mx-auto mt-4 animate-spin" />
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
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center text-xl shadow-lg shadow-purple-600/30 ${wolfHowl ? 'animate-pulse' : ''}`}>
                🐺
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  WOLF GOLD
                </h1>
                <p className="text-xs text-amber-300/80">5×3 • 25 Lines • Money Respin</p>
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

        {/* Jackpot Display */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-gradient-to-br from-amber-700/40 to-amber-900/40 border-amber-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-amber-300 uppercase font-bold">Mini</p>
              <p className="text-sm font-bold text-amber-400">30x</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-700/40 to-purple-900/40 border-purple-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-purple-300 uppercase font-bold">Major</p>
              <p className="text-sm font-bold text-purple-400">100x</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-600/40 to-yellow-800/40 border-yellow-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-yellow-300 uppercase font-bold">Mega</p>
              <p className="text-sm font-bold text-yellow-400">1000x</p>
            </CardContent>
          </Card>
        </div>

        {/* Free Spins Banner */}
        {isFreeSpinMode && (
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-orange-700/80 via-red-700/80 to-orange-700/80 border border-orange-500/50 backdrop-blur-sm shadow-lg shadow-orange-600/30">
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-lg font-bold text-white">BLAZIN&apos; REELS: {freeSpins} FREE SPINS</span>
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
          <Card className="bg-white/10 backdrop-blur-md border-blue-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-blue-300 uppercase">Spins</p>
              <p className="text-lg font-bold text-blue-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Reels */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-indigo-600 via-purple-700 to-indigo-800 shadow-xl shadow-purple-600/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-purple-500/30">
              <Moon className="w-4 h-4 text-yellow-300" />
              <span className="text-base font-bold text-white tracking-wide drop-shadow-lg">
                WOLF GOLD
              </span>
              <Moon className="w-4 h-4 text-yellow-300" />
            </div>

            {/* Reels Container */}
            <div className="bg-gradient-to-b from-slate-900 via-indigo-950/50 to-slate-900 p-2">
              <div className="bg-black/60 rounded-xl p-2 border-2 border-purple-600/40 overflow-hidden shadow-inner">
                {/* 5x3 Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {reels.map((reel, reelIndex) => (
                    reel.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(reelIndex, rowIndex);
                      const isStacked = isStackedWild(reelIndex) && symbol === "🐺";
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "", tier: "low" };
                      const moonValue = getMoonValue(reelIndex, rowIndex);
                      const isWolf = symbol === "🐺";
                      const isMoon = symbol === "🌙";
                      const isScatter = symbol === "🏜️";
                      
                      return (
                        <div
                          key={`${reelIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-3xl sm:text-4xl
                            transition-all duration-300 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-400 ring-inset shadow-lg ${symbolInfo.glow}` 
                              : isStacked
                                ? "bg-gradient-to-br from-purple-700/60 to-indigo-800/60 ring-1 ring-purple-400/50"
                                : "bg-gradient-to-br from-slate-800/80 to-slate-900/80"
                            }
                          `}
                        >
                          <span 
                            className={`transition-all duration-300 ${isStacked ? 'scale-110' : ''}`}
                            style={{
                              textShadow: isWinning 
                                ? "0 0 20px rgba(255,215,0,0.9)" 
                                : isWolf 
                                  ? "0 0 15px rgba(139,92,246,0.7)"
                                  : isMoon
                                    ? "0 0 15px rgba(250,204,21,0.7)"
                                    : "0 2px 4px rgba(0,0,0,0.5)",
                              filter: isWinning ? "brightness(1.3) drop-shadow(0 0 8px gold)" : "none",
                              transform: isWinning ? "scale(1.15)" : "scale(1)",
                            }}
                          >
                            {symbol}
                          </span>
                          
                          {/* Moon value overlay */}
                          {isMoon && moonValue && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-0.5">
                              <span className="text-xs font-bold text-yellow-400">{moonValue}x</span>
                            </div>
                          )}
                          
                          {/* Win glow effect */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-yellow-400/25 animate-pulse rounded-lg" />
                          )}
                          
                          {/* Wild glow */}
                          {isWolf && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-purple-400/60" />
                          )}
                          
                          {/* Scatter glow */}
                          {isScatter && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-orange-400/60" />
                          )}
                          
                          {/* Stacked wild indicator */}
                          {isStacked && (
                            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-lg" />
                          )}
                        </div>
                      );
                    })
                  )).flat()}
                </div>

                {/* Paylines indicator */}
                <div className="flex justify-center gap-0.5 mt-2 flex-wrap max-w-xs mx-auto">
                  {Array.from({ length: 25 }, (_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full text-[6px] font-bold flex items-center justify-center
                        ${winningLines.some(l => l.lineNumber === i + 1)
                          ? 'bg-yellow-500 text-black'
                          : 'bg-indigo-900/50 text-indigo-300/70'
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
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 shadow-lg shadow-amber-500/40">
                    <Trophy className="w-5 h-5 text-yellow-100" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-100" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">The wolf hunts...</span>
                  </div>
                ) : (
                  <p className="text-purple-300/80 text-sm">6+ 🌙 triggers Money Respin! 3+ 🏜️ = Free Spins!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 border-t border-purple-600/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-25)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-purple-600/50 hover:bg-purple-600/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-purple-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-yellow-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(25)}
                    disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                    className="border-purple-600/50 hover:bg-purple-600/20 text-white h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Quick Bet Buttons */}
                <div className="hidden lg:flex gap-1">
                  {[25, 50, 100, 250].map((amt) => (
                    <Button
                      key={amt}
                      variant={betAmount === amt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amt)}
                      disabled={isSpinning || isFreeSpinMode}
                      className={`h-8 px-2 text-xs ${betAmount === amt 
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold border-0" 
                        : "border-purple-600/30 hover:bg-purple-600/20 text-white"
                      }`}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>

                {/* Spin Button */}
                <Button
                  onClick={spin}
                  disabled={isSpinning || (!isFreeSpinMode && balance < betAmount) || moonRespinActive}
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-amber-500 via-yellow-600 to-orange-600 hover:from-amber-400 hover:via-yellow-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/50 disabled:opacity-50 overflow-hidden group border border-yellow-500/50"
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
                  className={`h-8 ${autoSpin ? "" : "border-purple-600/50 hover:bg-purple-600/20 text-white"}`}
                  disabled={balance < betAmount || isFreeSpinMode || moonRespinActive}
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
          <span>RTP: 96.01% • 6+ 🌙 = Money Respin • 3+ 🏜️ = 5 Free Spins • Max Win 2,500x!</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-purple-600/50 max-w-3xl w-full max-h-[85vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                  <Moon className="w-6 h-6" /> Wolf Gold Paytable
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Symbols Grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {Object.entries(SYMBOL_DATA).map(([symbol, info]) => (
                  <div
                    key={symbol}
                    className={`p-3 rounded-xl bg-gradient-to-br ${info.gradient} text-white text-center shadow-lg`}
                  >
                    <div className="text-4xl mb-1">{symbol}</div>
                    <p className="font-semibold text-xs">{info.name}</p>
                    <p className="text-[10px] opacity-75 capitalize">{info.tier}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-white/10 border border-purple-600/30">
                  <h3 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    🐺 Wolf Wild (Stacked)
                  </h3>
                  <p className="text-slate-300">
                    The 🐺 Wolf is <span className="text-purple-400 font-bold">WILD</span> and substitutes for all symbols 
                    except Scatter and Moon. Wolves appear <span className="text-purple-400 font-bold">STACKED</span> and 
                    can fill entire reels for massive wins!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-orange-600/30">
                  <h3 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    🏜️ Canyon Scatter (Free Spins)
                  </h3>
                  <p className="text-slate-300">
                    Land <span className="text-orange-400 font-bold">3+ Canyon Scatters</span> anywhere to trigger 
                    <span className="text-orange-400 font-bold"> BLAZIN&apos; REELS FREE SPINS</span> with giant symbols 
                    on the middle reels!
                  </p>
                  <ul className="text-slate-300 space-y-1 mt-2">
                    <li>• 3 Canyons = 5 Free Spins + 3x bet</li>
                    <li>• 4 Canyons = 5 Free Spins + 15x bet</li>
                    <li>• 5 Canyons = 5 Free Spins + 60x bet</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-yellow-600/30">
                  <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    🌙 Moon Money Respin
                  </h3>
                  <p className="text-slate-300">
                    Land <span className="text-yellow-400 font-bold">6+ Moon symbols</span> to trigger the 
                    <span className="text-yellow-400 font-bold"> MONEY RESPIN FEATURE!</span> Moons lock in place 
                    and display cash values. You get 3 respins - landing new Moons resets the count!
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-amber-700/30 rounded-lg">
                      <p className="text-amber-300 font-bold">MINI</p>
                      <p className="text-amber-400">30x</p>
                    </div>
                    <div className="text-center p-2 bg-purple-700/30 rounded-lg">
                      <p className="text-purple-300 font-bold">MAJOR</p>
                      <p className="text-purple-400">100x</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-700/30 rounded-lg">
                      <p className="text-yellow-300 font-bold">MEGA</p>
                      <p className="text-yellow-400">1000x</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-slate-600/30">
                  <h3 className="font-semibold text-slate-300 mb-2">Symbol Payouts (× Line Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>9️⃣🔟🃏 Nine/Ten/Jack: 5/20/50x</div>
                    <div>👸 Queen: 5/25/75x</div>
                    <div>🤴🅰️ King/Ace: 10/30/100x</div>
                    <div>🐎 Mustang: 15/40/150x</div>
                    <div>🐆 Puma: 15/50/200x</div>
                    <div>🦅 Eagle: 20/75/300x</div>
                    <div>🦬 Buffalo: 30/100/500x</div>
                  </div>
                </div>
              </div>

              {/* Promo Text */}
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30">
                <p className="text-center text-sm text-slate-300 italic">
                  &quot;Beneath the starlit desert sky, the wolf pack roams free. Chase the moon across the canyon 
                  and unlock treasures as ancient as the wilderness itself. Wolf Gold awaits those brave enough 
                  to answer the call of the wild!&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx>{`
        @keyframes howl {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.1) translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
