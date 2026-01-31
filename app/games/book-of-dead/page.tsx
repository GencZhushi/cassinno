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
  BookOpen,
  Scroll
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REELS = 5;
const ROWS = 3;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string; tier: string }> = {
  "🔟": { name: "Ten", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50", tier: "low" },
  "🃏": { name: "Jack", gradient: "from-slate-400 to-slate-600", glow: "shadow-slate-400/50", tier: "low" },
  "👸": { name: "Queen", gradient: "from-pink-400 to-pink-600", glow: "shadow-pink-400/50", tier: "low" },
  "🤴": { name: "King", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50", tier: "low" },
  "🅰️": { name: "Ace", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50", tier: "low" },
  "🪲": { name: "Scarab", gradient: "from-emerald-400 to-emerald-600", glow: "shadow-emerald-400/50", tier: "medium" },
  "🐺": { name: "Anubis", gradient: "from-indigo-400 to-indigo-600", glow: "shadow-indigo-400/50", tier: "high" },
  "🦅": { name: "Horus", gradient: "from-sky-400 to-sky-600", glow: "shadow-sky-400/50", tier: "high" },
  "👑": { name: "Pharaoh", gradient: "from-yellow-400 to-amber-600", glow: "shadow-yellow-400/50", tier: "premium" },
  "🤠": { name: "Rich Wilde", gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-400/50", tier: "premium" },
  "📖": { name: "Book of Dead", gradient: "from-yellow-300 via-amber-400 to-yellow-500", glow: "shadow-yellow-400/50", tier: "scatter" },
};

const ALL_SYMBOLS = ["🔟", "🃏", "👸", "🤴", "🅰️", "🪲", "🐺", "🦅", "👑", "🤠", "📖"];

const SAND_COLORS = ["#D4A574", "#C4956A", "#E6C9A8", "#BF8F5F", "#DEB887"];

interface SandParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

interface WinLineData {
  lineNumber: number;
  symbol: string;
  count: number;
  positions: [number, number][];
  payout: number;
  win: string;
}

export default function BookOfDeadPage() {
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
  const [displayReels, setDisplayReels] = useState<string[][]>(reels);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<Set<string>>(new Set());
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [sandParticles, setSandParticles] = useState<SandParticle[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [expandingSymbol, setExpandingSymbol] = useState<string | null>(null);
  const [expandingSymbolKey, setExpandingSymbolKey] = useState<string | null>(null);
  const [expandedReels, setExpandedReels] = useState<number[]>([]);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<WinLineData[]>([]);
  const [bookActive, setBookActive] = useState(false);
  const autoSpinRef = useRef(false);
  const freeSpinsRef = useRef(0);
  const betAmountRef = useRef(betAmount);
  const expandingSymbolKeyRef = useRef<string | null>(null);

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

  useEffect(() => {
    expandingSymbolKeyRef.current = expandingSymbolKey;
  }, [expandingSymbolKey]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  const triggerSandEffect = useCallback((intensity: number = 30) => {
    const particles: SandParticle[] = [];
    for (let i = 0; i < intensity; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)],
        size: Math.random() * 4 + 2,
        delay: Math.random() * 1,
        duration: Math.random() * 2 + 2,
      });
    }
    setSandParticles(particles);
    setBookActive(true);
    setTimeout(() => {
      setSandParticles([]);
      setBookActive(false);
    }, 3000);
  }, []);

  const showBigWinAnimation = useCallback((amount: number) => {
    setBigWinAmount(amount);
    setShowBigWin(true);
    triggerSandEffect(80);
    setTimeout(() => setShowBigWin(false), 3500);
  }, [triggerSandEffect]);

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
    setExpandedReels([]);

    // Spinning animation
    const animationInterval = setInterval(() => {
      setDisplayReels(
        Array(REELS).fill(null).map(() => 
          Array(ROWS).fill(null).map(() => 
            ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
          )
        )
      );
    }, 80);

    try {
      const res = await fetch("/api/games/book-of-dead/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: currentBet,
          isFreeSpinMode: isFreeSpin,
          expandingSymbol: isFreeSpin ? expandingSymbolKeyRef.current : null
        }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      // Set reels
      setReels(data.reels);
      setDisplayReels(data.displayReels);

      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      // Handle free spins trigger
      if (data.freeSpinsWon > 0) {
        if (!isFreeSpinMode) {
          // First trigger - set expanding symbol
          setExpandingSymbol(data.expandingSymbol);
          setExpandingSymbolKey(data.expandingSymbolKey);
        }
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        triggerSandEffect(60);
        toast({ 
          title: `📖 THE BOOK OPENS! ${data.freeSpinsWon} FREE SPINS!`, 
          variant: "success" 
        });
      }

      // Show expanded reels
      if (data.expandedReels && data.expandedReels.length > 0) {
        setExpandedReels(data.expandedReels);
        triggerSandEffect(40);
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

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `📖 LEGENDARY WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `👑 PHARAOH'S TREASURE! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          triggerSandEffect(50);
          toast({ title: `🦅 EPIC WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 5) {
          triggerSandEffect(30);
        }
      }

      // Check if free spins ended
      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        setExpandingSymbol(null);
        setExpandingSymbolKey(null);
        toast({ title: "Free spins ended! The tomb seals once more.", variant: "default" });
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
  }, [balance, isFreeSpinMode, toast, triggerSandEffect, showBigWinAnimation, winningPositions]);

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

  const isReelExpanded = (reel: number) => {
    return expandedReels.includes(reel);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-amber-950 via-yellow-950 to-stone-950">
      {/* Egyptian Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Dusty atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-transparent to-stone-900/50" />
        
        {/* Hieroglyphic patterns (subtle) */}
        <div className="absolute top-0 left-0 w-full h-32 opacity-10 bg-repeat-x" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 20H25L30 5zM15 25L25 30L15 35V25zM45 25V35L35 30L45 25zM30 40L25 55H35L30 40z' fill='%23D4A574' fill-opacity='0.4'/%3E%3C/svg%3E\")" }}
        />
        
        {/* Golden dust particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-400/40 rounded-full animate-pulse" style={{ animationDuration: "3s" }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-yellow-300/50 rounded-full animate-pulse" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
        <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-amber-500/30 rounded-full animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-yellow-400/40 rounded-full animate-pulse" style={{ animationDuration: "3.5s", animationDelay: "1.5s" }} />
      </div>

      {/* Sand Particle Effects */}
      {sandParticles.map((particle) => (
        <div
          key={particle.id}
          className="sand-particle pointer-events-none z-40"
          style={{
            position: "fixed",
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: "50%",
            animation: `fall ${particle.duration}s linear ${particle.delay}s forwards`,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">📖👑📖</div>
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="text-8xl">📖👑📖</div>
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              ANCIENT TREASURE!
            </h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
            <p className="text-xl text-amber-300/80 mt-2">Rich Wilde strikes gold!</p>
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
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 flex items-center justify-center text-xl shadow-lg shadow-amber-600/30 ${bookActive ? 'animate-pulse' : ''}`}>
                📖
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                  BOOK OF DEAD
                </h1>
                <p className="text-xs text-amber-300/80">5×3 • 10 Lines • Expanding Wilds</p>
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
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-amber-700/80 via-yellow-700/80 to-amber-700/80 border border-yellow-500/50 backdrop-blur-sm shadow-lg shadow-amber-600/30">
            <div className="flex items-center justify-center gap-3">
              <BookOpen className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-lg font-bold text-white">FREE SPINS: {freeSpins}</span>
              {expandingSymbol && (
                <span className="text-base font-semibold text-yellow-300 bg-black/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {expandingSymbol} EXPANDS
                </span>
              )}
              <BookOpen className="w-5 h-5 text-yellow-300 animate-pulse" />
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
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-amber-600 via-yellow-700 to-amber-800 shadow-xl shadow-amber-600/20">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner - Egyptian Style */}
            <div className="bg-gradient-to-r from-amber-800 via-yellow-700 to-amber-800 py-1.5 px-4 flex items-center justify-center gap-2 border-b border-yellow-500/30">
              <Scroll className="w-4 h-4 text-yellow-300" />
              <span className="text-base font-bold text-white tracking-wide drop-shadow-lg">
                BOOK OF DEAD
              </span>
              <Scroll className="w-4 h-4 text-yellow-300" />
            </div>

            {/* Reels Container */}
            <div className="bg-gradient-to-b from-stone-900 via-amber-950/50 to-stone-900 p-2">
              <div className="bg-black/60 rounded-xl p-2 border-2 border-amber-600/40 overflow-hidden shadow-inner">
                {/* 5x3 Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {displayReels.map((reel, reelIndex) => (
                    reel.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(reelIndex, rowIndex);
                      const isExpanded = isReelExpanded(reelIndex);
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "", tier: "low" };
                      const isScatter = symbol === "📖";
                      
                      return (
                        <div
                          key={`${reelIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-3xl sm:text-4xl
                            transition-all duration-300 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-400 ring-inset shadow-lg ${symbolInfo.glow}` 
                              : isExpanded && isFreeSpinMode
                                ? "bg-gradient-to-br from-amber-700/60 to-yellow-800/60 ring-1 ring-amber-400/50"
                                : "bg-gradient-to-br from-stone-800/80 to-stone-900/80"
                            }
                          `}
                        >
                          <span 
                            className={`transition-all duration-300 ${isExpanded && isFreeSpinMode ? 'scale-110' : ''}`}
                            style={{
                              textShadow: isWinning 
                                ? "0 0 20px rgba(255,215,0,0.9)" 
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
                          
                          {/* Scatter/Book special glow */}
                          {isScatter && !isWinning && (
                            <div className="absolute inset-0 rounded-lg border border-amber-400/60" />
                          )}
                          
                          {/* Expanded reel indicator */}
                          {isExpanded && isFreeSpinMode && (
                            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent rounded-lg" />
                          )}
                        </div>
                      );
                    })
                  )).flat()}
                </div>

                {/* Paylines indicator (subtle) */}
                <div className="flex justify-center gap-1 mt-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center
                        ${winningLines.some(l => l.lineNumber === i + 1)
                          ? 'bg-yellow-500 text-black'
                          : 'bg-amber-900/50 text-amber-300/70'
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
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 shadow-lg shadow-amber-500/40">
                    <Trophy className="w-5 h-5 text-yellow-100" />
                    <span className="text-xl font-black text-white drop-shadow-lg">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-100" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Exploring the tomb...</span>
                  </div>
                ) : (
                  <p className="text-amber-300/80 text-sm">Land 3+ 📖 to unlock the secrets!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 p-3 border-t border-amber-600/30">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-amber-600/50 hover:bg-amber-600/20 text-white h-8 w-8"
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
                    className="border-amber-600/50 hover:bg-amber-600/20 text-white h-8 w-8"
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
                        ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold border-0" 
                        : "border-amber-600/30 hover:bg-amber-600/20 text-white"
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
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-amber-500 via-yellow-600 to-amber-700 hover:from-amber-400 hover:via-yellow-500 hover:to-amber-600 text-white shadow-lg shadow-amber-600/50 disabled:opacity-50 overflow-hidden group border border-yellow-500/50"
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
                        <BookOpen className="w-4 h-4" />
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
                  className={`h-8 ${autoSpin ? "" : "border-amber-600/50 hover:bg-amber-600/20 text-white"}`}
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
        <div className="text-center text-xs text-amber-300/70">
          <span>RTP: 96.21% • 3+ 📖 = 10 Free Spins • Expanding Symbol • Max Win 5,000x!</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-stone-900 via-amber-950 to-stone-900 border-amber-600/50 max-w-3xl w-full max-h-[85vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" /> Book of Dead Paytable
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
                <div className="p-4 rounded-lg bg-white/10 border border-amber-600/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Book of Dead (Wild & Scatter)
                  </h3>
                  <p className="text-slate-300">
                    The 📖 Book acts as <span className="text-yellow-400 font-bold">WILD</span> (substitutes for all symbols) 
                    and <span className="text-yellow-400 font-bold">SCATTER</span> (3+ triggers Free Spins).
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-600/30">
                  <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Expanding Symbol Feature
                  </h3>
                  <p className="text-slate-300">
                    When Free Spins begin, a <span className="text-yellow-400 font-bold">random symbol</span> is chosen to become the Expanding Symbol.
                    When it appears on a reel during Free Spins, it <span className="text-yellow-400 font-bold">EXPANDS to fill the entire reel</span>, 
                    creating massive win potential across multiple paylines!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-600/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <Scroll className="w-4 h-4" /> Free Spins (3+ Scatters)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• 3 Books = 10 Free Spins + 2x total bet</li>
                    <li>• 4 Books = 10 Free Spins + 20x total bet</li>
                    <li>• 5 Books = 10 Free Spins + 200x total bet</li>
                  </ul>
                  <p className="text-yellow-400 mt-2 font-semibold">
                    Free Spins can be retriggered!
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-amber-600/30">
                  <h3 className="font-semibold text-slate-300 mb-2">Symbol Payouts (× Line Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>🔟🃏 Ten/Jack: 5/25/100x</div>
                    <div>👸 Queen: 5/25/100x</div>
                    <div>🤴🅰️ King/Ace: 5/40/150x</div>
                    <div>🪲 Scarab: 5/40/200x</div>
                    <div>🐺 Anubis: 5/30/200x</div>
                    <div>🦅 Horus: 5/40/400x</div>
                    <div className="text-amber-400 font-semibold">👑 Pharaoh: 10/100/750x</div>
                    <div className="text-amber-400 font-semibold">🤠 Rich Wilde: 10/100/500x</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-yellow-600/50">
                  <h3 className="font-bold text-yellow-400 text-center">📖 MAX WIN: 5,000x YOUR STAKE 📖</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .sand-particle {
          pointer-events: none;
        }
      `}</style>
    </main>
  );
}
