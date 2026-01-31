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
  Bomb,
  Gift,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_COLS = 6;
const GRID_ROWS = 5;

const SYMBOL_DATA: Record<string, { name: string; gradient: string; glow: string }> = {
  "🍌": { name: "Banana", gradient: "from-yellow-300 to-yellow-500", glow: "shadow-yellow-400/50" },
  "🍇": { name: "Grapes", gradient: "from-purple-400 to-purple-600", glow: "shadow-purple-400/50" },
  "🍉": { name: "Watermelon", gradient: "from-green-400 to-red-500", glow: "shadow-green-400/50" },
  "🍑": { name: "Peach", gradient: "from-orange-300 to-pink-400", glow: "shadow-orange-400/50" },
  "🍎": { name: "Apple", gradient: "from-red-400 to-red-600", glow: "shadow-red-400/50" },
  "🔵": { name: "Blue Candy", gradient: "from-blue-400 to-blue-600", glow: "shadow-blue-400/50" },
  "💚": { name: "Green Candy", gradient: "from-green-400 to-emerald-600", glow: "shadow-green-400/50" },
  "💜": { name: "Purple Candy", gradient: "from-violet-400 to-purple-600", glow: "shadow-violet-400/50" },
  "❤️": { name: "Red Heart", gradient: "from-pink-400 to-red-500", glow: "shadow-pink-400/50" },
  "🍭": { name: "Lollipop", gradient: "from-pink-400 via-purple-400 to-blue-400", glow: "shadow-pink-400/50" },
};

const CONFETTI_COLORS = ["#FF6B9D", "#C44CFF", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FCBAD3"];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  type: "circle" | "square" | "star";
}

interface TumbleData {
  grid: string[][];
  winningPositions: [number, number][];
  win: string;
  multiplier: number;
  multiplierBombs?: { position: [number, number]; value: number }[];
}

export default function SweetBonanzaPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>(
    Array(GRID_COLS).fill(null).map(() => 
      Array(GRID_ROWS).fill(null).map(() => 
        ["🍌", "🍇", "🍉", "🍑", "🍎", "🔵", "💚", "💜", "❤️"][Math.floor(Math.random() * 9)]
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
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [tumbleIndex, setTumbleIndex] = useState(-1);
  const [tumbles, setTumbles] = useState<TumbleData[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [multiplierBombs, setMultiplierBombs] = useState<{ position: [number, number]; value: number }[]>([]);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
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

  const triggerConfetti = useCallback((intensity: number = 50) => {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < intensity; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.5,
        size: Math.random() * 10 + 6,
        type: ["circle", "square", "star"][Math.floor(Math.random() * 3)] as "circle" | "square" | "star",
      });
    }
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3000);
  }, []);

  const showBigWinAnimation = useCallback((amount: number) => {
    setBigWinAmount(amount);
    setShowBigWin(true);
    triggerConfetti(100);
    setTimeout(() => setShowBigWin(false), 3000);
  }, [triggerConfetti]);

  const animateTumbles = useCallback(async (tumbleData: TumbleData[]) => {
    for (let i = 0; i < tumbleData.length; i++) {
      setTumbleIndex(i);
      const tumble = tumbleData[i];
      
      // Show winning positions
      setWinningPositions(tumble.winningPositions);
      setMultiplierBombs(tumble.multiplierBombs || []);
      
      if (tumble.multiplier > 1) {
        setCurrentMultiplier(tumble.multiplier);
      }
      
      // Wait for explosion animation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Update grid with tumbled result
      setGrid(tumble.grid);
      setWinningPositions([]);
      
      // Wait before next tumble
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setTumbleIndex(-1);
    setMultiplierBombs([]);
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
    setMultiplierBombs([]);
    
    if (!isFreeSpin) {
      setCurrentMultiplier(1);
    }

    // Spinning animation
    const animationInterval = setInterval(() => {
      setGrid(prev => prev.map(() => 
        Array(GRID_ROWS).fill(null).map(() => 
          ["🍌", "🍇", "🍉", "🍑", "🍎", "🔵", "💚", "💜", "❤️", "🍭"][Math.floor(Math.random() * 10)]
        )
      ));
    }, 80);

    try {
      const res = await fetch("/api/games/sweet-bonanza/spin", {
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

      // Set initial grid
      setGrid(data.grid);
      
      // Decrement free spins if in free spin mode
      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      // Handle tumbles animation
      if (data.tumbles && data.tumbles.length > 0) {
        setTumbles(data.tumbles);
        await animateTumbles(data.tumbles);
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));
      setSpinCount(prev => prev + 1);

      // Check for free spins trigger
      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        toast({ 
          title: `🍭 FREE SPINS! +${data.freeSpinsWon} spins!`, 
          variant: "success" 
        });
        triggerConfetti(80);
      }

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🎉 SWEET WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          triggerConfetti(70);
          toast({ title: `🍬 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else {
          triggerConfetti(40);
        }
      }

      // Check if free spins ended
      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        setCurrentMultiplier(1);
        toast({ title: "Free spins ended!", variant: "default" });
      }

      // Auto-spin or free spin continuation
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
  }, [balance, currentMultiplier, toast, triggerConfetti, animateTumbles, showBigWinAnimation]);

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

  const getBombAtPosition = (col: number, row: number) => {
    return multiplierBombs.find(b => b.position[0] === col && b.position[1] === row);
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-pink-900 via-purple-900 to-indigo-900">
      {/* Animated background candy */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-4xl animate-bounce">🍬</div>
        <div className="absolute top-20 right-20 text-3xl animate-pulse">🍭</div>
        <div className="absolute bottom-40 left-20 text-3xl animate-bounce" style={{ animationDelay: "0.5s" }}>🍫</div>
        <div className="absolute bottom-20 right-10 text-4xl animate-pulse" style={{ animationDelay: "0.3s" }}>🧁</div>
      </div>

      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece pointer-events-none z-50"
          style={{
            position: "fixed",
            left: `${piece.x}%`,
            top: "-20px",
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: piece.type === "circle" ? "50%" : piece.type === "star" ? "0" : "2px",
            animationDelay: `${piece.delay}s`,
            transform: piece.type === "star" ? "rotate(45deg)" : "none",
          }}
        />
      ))}

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center animate-pulse">
            <div className="text-8xl mb-4">🍬🎉🍬</div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">
              SWEET WIN!
            </h2>
            <p className="text-5xl font-bold text-yellow-400">
              +{bigWinAmount.toLocaleString()}
            </p>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-xl shadow-lg shadow-pink-500/30">
                🍭
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  SWEET BONANZA
                </h1>
                <p className="text-xs text-pink-300/80">6×5 • Pay Anywhere • Tumble</p>
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
          <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-pink-600/80 via-purple-600/80 to-blue-600/80 border border-pink-400/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3">
              <Gift className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold text-white">FREE SPINS: {freeSpins}</span>
              <span className="text-base font-semibold text-yellow-400">×{currentMultiplier}</span>
              <Gift className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        )}

        {/* Balance & Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-white/10 backdrop-blur-md border-pink-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-pink-300 uppercase">Balance</p>
              <p className="text-lg font-bold text-yellow-400">{balance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-green-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-green-300 uppercase">Won</p>
              <p className="text-lg font-bold text-green-400">+{totalWon.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-purple-500/30">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-purple-300 uppercase">Spins</p>
              <p className="text-lg font-bold text-purple-400">{spinCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Grid */}
        <div className="relative rounded-2xl p-[3px] mb-3 bg-gradient-to-b from-pink-500 via-purple-600 to-blue-600">
          <div className="relative rounded-xl overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 py-1.5 px-4 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-base font-bold text-white tracking-wide">
                SWEET BONANZA
              </span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>

            {/* Grid Container */}
            <div className="bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 p-2">
              <div className="bg-black/40 rounded-xl p-2 border-2 border-purple-500/50 overflow-hidden">
                <div className="grid grid-cols-6 gap-1">
                  {grid.map((col, colIndex) => (
                    col.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(colIndex, rowIndex);
                      const bomb = getBombAtPosition(colIndex, rowIndex);
                      const symbolInfo = SYMBOL_DATA[symbol] || { name: "Unknown", gradient: "from-gray-400 to-gray-600", glow: "" };
                      
                      return (
                        <div
                          key={`${colIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex items-center justify-center text-2xl sm:text-3xl
                            transition-all duration-200 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolInfo.gradient} ring-2 ring-yellow-400 ring-inset` 
                              : "bg-gradient-to-br from-white/15 to-white/5"
                            }
                          `}
                        >
                          <span 
                            className="transition-all duration-200"
                            style={{
                              textShadow: isWinning 
                                ? "0 0 12px rgba(255,255,255,0.8)" 
                                : "0 1px 2px rgba(0,0,0,0.3)",
                              filter: isWinning ? "brightness(1.2)" : "none",
                            }}
                          >
                            {symbol}
                          </span>
                          
                          {/* Win glow effect inside cell */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded-lg" />
                          )}
                          
                          {/* Multiplier Bomb Overlay */}
                          {bomb && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                              <div className="flex flex-col items-center">
                                <Bomb className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs font-bold text-yellow-400">{bomb.value}x</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Scatter Highlight */}
                          {symbol === "🍭" && !isWinning && (
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
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-lg">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-black text-white">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                ) : tumbleIndex >= 0 ? (
                  <div className="flex items-center gap-2 text-pink-400">
                    <Star className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bold">Tumbling... ({tumbleIndex + 1}/{tumbles.length})</span>
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-pink-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Spinning...</span>
                  </div>
                ) : (
                  <p className="text-purple-300 text-sm">Match 8+ symbols to win!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 p-3">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-10)}
                    disabled={isSpinning || betAmount <= 1 || isFreeSpinMode}
                    className="border-pink-500/50 hover:bg-pink-500/20 text-white h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-[10px] text-pink-300 uppercase">Bet</p>
                    <p className="text-lg font-bold text-yellow-400">{betAmount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(10)}
                    disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                    className="border-pink-500/50 hover:bg-pink-500/20 text-white h-8 w-8"
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
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold border-0" 
                        : "border-pink-500/30 hover:bg-pink-500/20 text-white"
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
                  className="relative h-10 px-6 text-base font-bold bg-gradient-to-b from-pink-500 via-purple-500 to-purple-600 hover:from-pink-400 hover:via-purple-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/50 disabled:opacity-50 overflow-hidden group border border-pink-400/50"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isSpinning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFreeSpinMode ? (
                      <>
                        <Gift className="w-4 h-4" />
                        FREE
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
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
                  className={`h-8 ${autoSpin ? "" : "border-pink-500/50 hover:bg-pink-500/20 text-white"}`}
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
        <div className="text-center text-xs text-purple-300/70">
          <span>RTP: 96.5% • 8+ = win • 4+ 🍭 = Free Spins</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-purple-900 to-indigo-900 border-purple-500/50 max-w-3xl w-full max-h-[85vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-pink-400">🍭 Sweet Bonanza Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(SYMBOL_DATA).map(([symbol, info]) => (
                  <div
                    key={symbol}
                    className={`p-3 rounded-xl bg-gradient-to-br ${info.gradient} text-white text-center`}
                  >
                    <div className="text-4xl mb-1">{symbol}</div>
                    <p className="font-semibold text-xs">{info.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-white/10">
                  <h3 className="font-semibold text-pink-400 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Pay Anywhere System
                  </h3>
                  <p className="text-purple-200">
                    Match 8 or more identical symbols ANYWHERE on the grid to win! No paylines needed - 
                    symbols just need to appear on the reels.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10">
                  <h3 className="font-semibold text-pink-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Tumble Feature
                  </h3>
                  <p className="text-purple-200">
                    Winning symbols explode and disappear! New symbols tumble down from above, 
                    potentially creating more wins. Tumbles continue until no new wins form.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10">
                  <h3 className="font-semibold text-pink-400 mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4" /> Free Spins (4+ 🍭 Scatters)
                  </h3>
                  <ul className="text-purple-200 space-y-1">
                    <li>• 4 Scatters = 10 Free Spins</li>
                    <li>• 5 Scatters = 15 Free Spins</li>
                    <li>• 6 Scatters = 20 Free Spins</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-white/10">
                  <h3 className="font-semibold text-pink-400 mb-2 flex items-center gap-2">
                    <Bomb className="w-4 h-4" /> Multiplier Bombs (Free Spins Only)
                  </h3>
                  <p className="text-purple-200">
                    During Free Spins, multiplier bombs (2x-100x) can appear! All multipliers 
                    ADD UP and apply to all wins during the tumble sequence.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/10">
                  <h3 className="font-semibold text-purple-300 mb-2">Symbol Payouts (× Total Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
                    <div>🍌🍇 Low: 8+ = 0.25x to 5x</div>
                    <div>🍉🍑 Med-Low: 8+ = 0.4x to 8x</div>
                    <div>🍎 Medium: 8+ = 0.5x to 10x</div>
                    <div>🔵💚 High: 8+ = 1x to 20x</div>
                    <div>💜 Higher: 8+ = 2x to 25x</div>
                    <div>❤️ Premium: 8+ = 5x to 50x</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .confetti-piece {
          animation: confetti-fall 3s ease-out forwards;
        }
        
        .winning-symbol {
          animation: pulse 0.5s ease-in-out infinite;
        }
        
        @keyframes sweet-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(236, 72, 153, 0.8), 0 0 60px rgba(168, 85, 247, 0.4);
          }
        }
      `}</style>
    </main>
  );
}
