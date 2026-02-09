"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Loader2, Volume2, VolumeX, Info, Sparkles, X,
  Minus, Plus, RotateCcw, RefreshCw, Maximize2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_COLS = 6;
const GRID_ROWS = 5;

const SYMBOLS: Record<string, { name: string; color: string; image: string }> = {
  "🍌": { name: "Banana", color: "#FBBF24", image: "/symbols/bonanza/banana.png" },
  "🍇": { name: "Grapes", color: "#A855F7", image: "/symbols/bonanza/grapes.png" },
  "🍉": { name: "Watermelon", color: "#22C55E", image: "/symbols/bonanza/watermelon.png" },
  "🍑": { name: "Plum", color: "#F472B6", image: "/symbols/bonanza/plum.png" },
  "🍎": { name: "Apple", color: "#EF4444", image: "/symbols/bonanza/apple.png" },
  "🔵": { name: "Blue Candy", color: "#3B82F6", image: "/symbols/bonanza/blue-candy.png" },
  "💚": { name: "Green Candy", color: "#10B981", image: "/symbols/bonanza/green-candy.png" },
  "💜": { name: "Purple Candy", color: "#8B5CF6", image: "/symbols/bonanza/purple-candy.png" },
  "❤️": { name: "Red Heart", color: "#EC4899", image: "/symbols/bonanza/purple-candy.png" },
  "🍭": { name: "Lollipop", color: "#F59E0B", image: "/symbols/bonanza/scatter.png" },
};

const BASE_SYMBOLS = ["🍌", "🍇", "🍉", "🍑", "🍎", "🔵", "💚", "💜", "❤️"];
const ALL_SYMBOLS = [...BASE_SYMBOLS, "🍭"];

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
  const [betAmount, setBetAmount] = useState<number>(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState<"idle" | "dropping" | "cascading" | "landing">("idle");
  const [tumblePhase, setTumblePhase] = useState<"idle" | "exploding" | "filling">("idle");
  const [grid, setGrid] = useState<string[][]>(
    Array(GRID_COLS).fill(null).map(() =>
      Array(GRID_ROWS).fill(null).map(() =>
        BASE_SYMBOLS[Math.floor(Math.random() * BASE_SYMBOLS.length)]
      )
    )
  );
  const [lastWin, setLastWin] = useState<number>(0);
  const [tumbleWin, setTumbleWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<[number, number][]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [autoSpin, setAutoSpin] = useState(false);
  const [tumbleIndex, setTumbleIndex] = useState(-1);
  const [tumbles, setTumbles] = useState<TumbleData[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [multiplierBombs, setMultiplierBombs] = useState<{ position: [number, number]; value: number }[]>([]);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [doubleChanceEnabled, setDoubleChanceEnabled] = useState(false);
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
    setTimeout(() => setShowBigWin(false), 3500);
  }, []);

  const animateTumbles = useCallback(async (tumbleData: TumbleData[]) => {
    for (let i = 0; i < tumbleData.length; i++) {
      setTumbleIndex(i);
      const tumble = tumbleData[i];

      setWinningPositions(tumble.winningPositions);
      setMultiplierBombs(tumble.multiplierBombs || []);

      if (tumble.multiplier > 1) {
        setCurrentMultiplier(tumble.multiplier);
      }

      // Phase 1: highlight winners briefly
      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 2: explode winning symbols
      setTumblePhase("exploding");
      await new Promise(resolve => setTimeout(resolve, 400));

      // Phase 3: fill with new symbols cascading down
      setWinningPositions([]);
      setGrid(tumble.grid);
      setTumblePhase("filling");
      await new Promise(resolve => setTimeout(resolve, 500));

      setTumblePhase("idle");
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
    setTumbleWin(0);
    setWinningPositions([]);
    setTumbles([]);
    setMultiplierBombs([]);
    setTumblePhase("idle");

    if (!isFreeSpin) {
      setCurrentMultiplier(1);
    }

    // Phase 1: Drop all current symbols downward smoothly
    setSpinPhase("dropping");
    await new Promise(resolve => setTimeout(resolve, 350));

    // Phase 2: Cascade random symbols while waiting for API
    setSpinPhase("cascading");
    const cascadeInterval = setInterval(() => {
      setGrid(prev => prev.map(() =>
        Array(GRID_ROWS).fill(null).map(() =>
          ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
        )
      ));
    }, 100);

    try {
      const res = await fetch("/api/games/sweet-bonanza/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: currentBet,
          isFreeSpinMode: isFreeSpin,
          currentMultiplier: isFreeSpin ? currentMultiplier : 1,
        }),
      });

      const data = await res.json();

      // Minimum cascade time for visual effect
      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(cascadeInterval);

      if (!res.ok) throw new Error(data.error);

      // Phase 3: Land final symbols with bounce (drop in from top)
      setGrid(data.grid);
      setSpinPhase("landing");
      await new Promise(resolve => setTimeout(resolve, 600));
      setSpinPhase("idle");

      if (isFreeSpin) {
        setFreeSpins(prev => Math.max(0, prev - 1));
      }

      if (data.tumbles && data.tumbles.length > 0) {
        setTumbles(data.tumbles);
        await animateTumbles(data.tumbles);
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setTumbleWin(winAmount);
      setBalance(parseInt(data.newBalance));

      if (data.freeSpinsWon > 0) {
        setFreeSpins(prev => prev + data.freeSpinsWon);
        setIsFreeSpinMode(true);
        toast({ title: `🍭 SWEET FREE SPINS! +${data.freeSpinsWon} spins!`, variant: "success" });
      }

      if (winAmount > 0) {
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `🍬 SUGAR RUSH! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🎉 SWEET WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          toast({ title: `🍭 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        }
      }

      const remainingFreeSpins = isFreeSpin ? freeSpinsRef.current - 1 : freeSpinsRef.current;
      if (isFreeSpin && remainingFreeSpins <= 0 && data.freeSpinsWon === 0) {
        setIsFreeSpinMode(false);
        setCurrentMultiplier(1);
        toast({ title: "Free spins ended! The candy party is over.", variant: "default" });
      }

      const shouldContinue =
        (autoSpinRef.current && parseInt(data.newBalance) >= currentBet) ||
        (remainingFreeSpins > 0 || data.freeSpinsWon > 0);

      if (shouldContinue) {
        setTimeout(() => { spin(); }, 1000);
      } else if (autoSpinRef.current) {
        setAutoSpin(false);
        toast({ title: "Auto-spin stopped: Insufficient balance", variant: "destructive" });
      }
    } catch (error) {
      clearInterval(cascadeInterval);
      setSpinPhase("idle");
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
      setAutoSpin(false);
    } finally {
      setIsSpinning(false);
    }
  }, [balance, currentMultiplier, toast, animateTumbles, showBigWinAnimation]);

  const adjustBet = (delta: number) => {
    if (isFreeSpinMode) return;
    const newBet = Math.max(0.5, Math.min(500, betAmount + delta));
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

  const buyFreeSpinsPrice = betAmount * 100;

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#87CEEB] via-[#E8A0BF] to-[#F5C6D0]">
      {/* Candy sky background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#87CEEB]/80 via-[#B8D4E3]/40 to-transparent" />
        <div className="absolute top-8 left-[10%] w-40 h-16 bg-white/30 rounded-full blur-xl" />
        <div className="absolute top-4 right-[15%] w-52 h-20 bg-white/25 rounded-full blur-xl" />
        <div className="absolute top-16 left-[40%] w-36 h-14 bg-white/20 rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#F8BBD0]/60 via-[#F48FB1]/30 to-transparent" />
        <div className="absolute bottom-10 left-[5%] w-48 h-24 bg-[#F8BBD0]/40 rounded-full blur-2xl" />
        <div className="absolute bottom-5 right-[10%] w-56 h-28 bg-[#F48FB1]/30 rounded-full blur-2xl" />
        <div className="absolute top-1/4 left-8 text-2xl opacity-20 animate-bounce" style={{ animationDuration: "4s" }}>🍬</div>
        <div className="absolute top-1/3 right-12 text-xl opacity-15 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>🍭</div>
        <div className="absolute bottom-1/3 left-16 text-xl opacity-15 animate-bounce" style={{ animationDuration: "5s", animationDelay: "1s" }}>🧁</div>
      </div>

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">🍬🎉🍬</div>
              <div className="absolute inset-0 animate-ping opacity-30"><div className="text-8xl">🍬🎉🍬</div></div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-pink-300 via-yellow-400 to-pink-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">SWEET WIN!</h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">+{bigWinAmount.toLocaleString()}</p>
            <p className="text-xl text-pink-300/80 mt-2">Sugar Rush!</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 py-2 max-w-7xl relative z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <Link href="/"><Button variant="ghost" size="icon" className="hover:bg-white/20 text-white/80 h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <span className="font-semibold drop-shadow-md">Sweet Bonanza</span>
              <span className="px-2 py-0.5 bg-green-500/80 text-white text-xs rounded ml-2">Demo</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white/80 h-8 w-8" onClick={() => setShowPaytable(true)}><Info className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white/80 h-8 w-8"><Maximize2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="flex gap-2">
          {/* Left Panel */}
          <div className="hidden lg:flex flex-col gap-2 w-44">
            <div className="bg-gradient-to-b from-[#E91E63] to-[#AD1457] rounded-lg p-3 border border-pink-400/40 shadow-lg cursor-pointer hover:brightness-110 transition-all">
              <div className="text-center">
                <p className="text-[10px] text-pink-100 uppercase tracking-wider">BUY</p>
                <p className="text-[10px] text-pink-100 uppercase tracking-wider">FREE SPINS</p>
                <p className="text-2xl font-black text-yellow-300 mt-1">CHF{buyFreeSpinsPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-b from-[#FF6F00] to-[#E65100] rounded-lg p-3 border border-orange-400/40 shadow-lg cursor-pointer hover:brightness-110 transition-all">
              <div className="text-center">
                <p className="text-[10px] text-orange-100 uppercase tracking-wider">BUY SUPER</p>
                <p className="text-[10px] text-orange-100 uppercase tracking-wider font-bold">FREE SPINS</p>
                <p className="text-2xl font-black text-yellow-300 mt-1">CHF{(buyFreeSpinsPrice * 5).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-b from-[#4A148C] to-[#311B92] rounded-lg p-3 border border-purple-400/30">
              <div className="text-center">
                <p className="text-[10px] text-purple-200 uppercase tracking-wider">BET</p>
                <p className="text-xl font-black text-yellow-300">CHF{betAmount.toFixed(2)}</p>
                <p className="text-[10px] text-pink-300 uppercase mt-2">DOUBLE</p>
                <p className="text-[8px] text-white/60">CHANCE TO WIN FEATURE</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={() => setDoubleChanceEnabled(!doubleChanceEnabled)} className={`w-10 h-5 rounded-full transition-colors ${doubleChanceEnabled ? "bg-green-500" : "bg-gray-600"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doubleChanceEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-xs text-white/60">{doubleChanceEnabled ? "ON" : "OFF"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Main Game Area */}
          <div className="flex-1">
            {/* Top Banner */}
            <div className="relative mb-2">
              <div className="bg-gradient-to-r from-[#880E4F] via-[#AD1457] to-[#880E4F] rounded-t-xl py-2 px-4 border-2 border-pink-400/50 shadow-lg">
                <div className="text-center">
                  <p className="text-[10px] text-pink-200/80 uppercase tracking-widest">
                    {isFreeSpinMode ? `🍭 FREE SPINS: ${freeSpins} • ×${currentMultiplier}` : "4× 🍭 WINS FREE SPINS"}
                  </p>
                  <p className="text-3xl font-black text-yellow-300 drop-shadow-lg">{tumbleWin > 0 ? tumbleWin.toFixed(2) : "0.00"}</p>
                </div>
              </div>
            </div>

            {/* Game Grid Frame */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 rounded-xl opacity-80" />
              <div className="absolute -inset-0.5 bg-gradient-to-b from-pink-300 via-[#F8BBD0] to-pink-400 rounded-xl" />

              <div className="relative bg-gradient-to-b from-[#E8A0BF]/90 via-[#D4E4F7]/80 to-[#E8A0BF]/90 rounded-lg p-1 overflow-hidden">
                <div className="bg-gradient-to-b from-[#B3E5FC]/40 via-[#E1BEE7]/30 to-[#F8BBD0]/40 rounded-lg p-2 backdrop-blur-sm">
                  <div className="grid grid-cols-6 gap-1">
                    {grid.map((col, colIndex) => (
                      col.map((symbol, rowIndex) => {
                        const isWinning = isPositionWinning(colIndex, rowIndex);
                        const bomb = getBombAtPosition(colIndex, rowIndex);
                        const symbolData = SYMBOLS[symbol] || SYMBOLS["🍌"];

                        const isExploding = tumblePhase === "exploding" && isWinning;
                        const isFilling = tumblePhase === "filling";
                        const dropDelay = colIndex * 60 + rowIndex * 30;
                        const landDelay = colIndex * 50 + rowIndex * 40;

                        let cellAnimClass = "";
                        let cellDelay = "0ms";
                        if (spinPhase === "dropping") {
                          cellAnimClass = "sb-drop-out";
                          cellDelay = `${dropDelay}ms`;
                        } else if (spinPhase === "cascading") {
                          cellAnimClass = "sb-cascading";
                          cellDelay = `${(colIndex * GRID_ROWS + rowIndex) * 15}ms`;
                        } else if (spinPhase === "landing") {
                          cellAnimClass = "sb-drop-in";
                          cellDelay = `${landDelay}ms`;
                        } else if (isExploding) {
                          cellAnimClass = "sb-tumble-explode";
                          cellDelay = `${Math.random() * 100}ms`;
                        } else if (isFilling) {
                          cellAnimClass = "sb-drop-in";
                          cellDelay = `${landDelay}ms`;
                        } else if (isWinning) {
                          cellAnimClass = "sb-winning-container z-10";
                        }

                        return (
                          <div
                            key={`${colIndex}-${rowIndex}`}
                            className={`relative aspect-square rounded-lg flex items-center justify-center overflow-visible ${cellAnimClass}`}
                            style={{ animationDelay: cellDelay }}
                          >
                            {isWinning && tumblePhase !== "exploding" && <div className="absolute -inset-1 rounded-xl sb-winning-glow-bg" />}
                            {isWinning && tumblePhase !== "exploding" && <div className="absolute -inset-0.5 rounded-lg border-2 border-yellow-400 sb-winning-border-pulse" />}

                            <div className={`relative w-full h-full p-0.5 transition-all duration-300 ${isWinning && tumblePhase !== "exploding" ? "sb-winning-symbol-pop" : ""}`}>
                              <Image
                                src={symbolData.image}
                                alt={symbolData.name}
                                fill
                                className={`object-contain ${isWinning && tumblePhase !== "exploding" ? "sb-winning-symbol-glow" : ""}`}
                                sizes="(max-width: 768px) 50px, 80px"
                              />
                            </div>

                            {isWinning && (
                              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"><div className="sb-winning-shimmer" /></div>
                            )}

                            {isWinning && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 sb-winning-sparkle" style={{ animationDelay: "0ms" }}>✦</div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 sb-winning-sparkle" style={{ animationDelay: "200ms" }}>✦</div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 sb-winning-sparkle" style={{ animationDelay: "400ms" }}>✦</div>
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 sb-winning-sparkle" style={{ animationDelay: "600ms" }}>✦</div>
                              </>
                            )}

                            {bomb && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/90 to-yellow-600/90 rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-500/50 z-20">
                                <div className="flex flex-col items-center">
                                  <Sparkles className="w-3 h-3 text-yellow-200 animate-spin" />
                                  <span className="text-sm font-black text-white drop-shadow-lg">{bomb.value}x</span>
                                </div>
                              </div>
                            )}

                            {symbol === "🍭" && !isWinning && (
                              <div className="absolute inset-0 rounded-lg border border-yellow-400/60 animate-pulse" />
                            )}
                          </div>
                        );
                      })
                    )).flat()}
                  </div>
                </div>
              </div>
            </div>

            {/* Free Spins Banner */}
            {isFreeSpinMode && (
              <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-pink-600/80 via-purple-600/80 to-pink-600/80 border border-pink-400/50 backdrop-blur-sm shadow-lg shadow-pink-500/30">
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  <span className="text-lg font-bold text-white">🍭 FREE SPINS: {freeSpins}</span>
                  <span className="text-base font-semibold text-yellow-300 bg-black/30 px-2 py-0.5 rounded">×{currentMultiplier}</span>
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Logo */}
          <div className="hidden lg:flex flex-col items-center w-48 relative">
            <div className="bg-gradient-to-b from-[#E91E63]/20 to-[#AD1457]/20 rounded-xl p-4 border border-pink-400/20 text-center">
              <div className="text-6xl mb-2">🍭</div>
              <h2 className="text-2xl font-black bg-gradient-to-b from-[#FF1744] via-[#E91E63] to-[#AD1457] bg-clip-text text-transparent leading-tight">Sweet</h2>
              <h2 className="text-2xl font-black bg-gradient-to-b from-[#FFD600] via-[#FF9100] to-[#FF6D00] bg-clip-text text-transparent leading-tight">Bonanza</h2>
              <div className="mt-3 text-xs text-pink-300/60">
                <p>6×5 Grid</p>
                <p>Cluster Pays</p>
                <p>RTP: 96.5%</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 w-full">
              <div className="text-4xl text-center animate-bounce" style={{ animationDuration: "3s" }}>🍬</div>
              <div className="text-4xl text-center animate-bounce" style={{ animationDuration: "4s", animationDelay: "0.5s" }}>🍫</div>
              <div className="text-4xl text-center animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "1s" }}>🧁</div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="mt-2 bg-gradient-to-r from-[#311B92]/95 via-[#4A148C]/95 to-[#311B92]/95 rounded-xl p-3 border border-pink-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Left - Volume & Info */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="hover:bg-white/10 text-white/70 h-8 w-8">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                <span className="text-white/60 text-xs w-6">{volume}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPaytable(true)} className="hover:bg-white/10 text-white/70 h-8 w-8">
                <Info className="w-4 h-4" />
              </Button>
            </div>

            {/* Center - Credit & Bet Display */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase">CREDIT</p>
                <p className="text-lg font-bold text-white">CHF{balance.toLocaleString("fr-CH", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase">BET</p>
                <p className="text-lg font-bold text-white">CHF{betAmount.toFixed(2)}</p>
              </div>
              <div className="text-center min-w-[120px]">
                <p className="text-[10px] text-white/50 uppercase">WIN</p>
                <p className="text-2xl font-black text-yellow-400">{lastWin > 0 ? `CHF${lastWin.toFixed(2)}` : "CHF0.00"}</p>
              </div>
            </div>

            {/* Right - Spin Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => adjustBet(-0.5)} disabled={isSpinning || betAmount <= 0.5 || isFreeSpinMode} className="border-white/20 hover:bg-white/10 text-white h-10 w-10 rounded-full">
                <Minus className="w-4 h-4" />
              </Button>
              <Button onClick={spin} disabled={isSpinning || (!isFreeSpinMode && balance < betAmount)} className="relative h-14 w-14 rounded-full bg-gradient-to-b from-pink-500 via-pink-600 to-purple-700 hover:from-pink-400 hover:via-pink-500 hover:to-purple-600 text-white shadow-lg border-2 border-pink-400/50 disabled:opacity-50">
                {isSpinning ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => adjustBet(0.5)} disabled={isSpinning || betAmount >= 500 || isFreeSpinMode} className="border-white/20 hover:bg-white/10 text-white h-10 w-10 rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
              <Button onClick={toggleAutoSpin} variant={autoSpin ? "destructive" : "outline"} className={`h-10 px-4 rounded-full ${autoSpin ? "" : "border-white/20 hover:bg-white/10 text-white"}`} disabled={balance < betAmount || isFreeSpinMode}>
                <RotateCcw className={`w-4 h-4 mr-1 ${autoSpin ? "animate-spin" : ""}`} />AUTO
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Stats */}
        <div className="lg:hidden mt-2 text-center text-xs text-pink-800/70">
          <span>RTP: 96.5% • 8+ symbols = win • 4+ 🍭 = Free Spins</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#311B92] via-[#4A148C] to-[#311B92] border border-pink-500/50 max-w-3xl w-full max-h-[85vh] overflow-auto rounded-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">🍭 Sweet Bonanza Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10"><X className="w-5 h-5" /></Button>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-6">
                {Object.entries(SYMBOLS).map(([emoji, data]) => (
                  <div key={emoji} className="p-3 rounded-xl text-white text-center" style={{ background: `linear-gradient(135deg, ${data.color}40, ${data.color}20)` }}>
                    <div className="relative w-12 h-12 mx-auto mb-1">
                      <Image src={data.image} alt={data.name} fill className="object-contain" />
                    </div>
                    <p className="text-xs">{data.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-white/10 border border-pink-500/30">
                  <h3 className="font-semibold text-pink-400 mb-2">💎 Pay Anywhere (Cluster Pays)</h3>
                  <p className="text-slate-300">Match 8 or more identical symbols ANYWHERE on the 6×5 grid to win! No paylines required.</p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-pink-500/30">
                  <h3 className="font-semibold text-pink-400 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Tumble Feature</h3>
                  <p className="text-slate-300">Winning symbols vanish and new ones tumble down! Continues until no new wins form.</p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-pink-500/30">
                  <h3 className="font-semibold text-yellow-400 mb-2">🍭 Free Spins (4+ Scatters)</h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• 4 Scatters = 10 Free Spins + 3x bet</li>
                    <li>• 5 Scatters = 15 Free Spins + 5x bet</li>
                    <li>• 6 Scatters = 20 Free Spins + 100x bet</li>
                  </ul>
                  <p className="text-yellow-400 mt-2 font-semibold">Multiplier bombs (2x-100x) appear during Free Spins and ADD UP!</p>
                </div>
                <div className="p-4 rounded-lg bg-white/10 border border-pink-500/30">
                  <h3 className="font-semibold text-purple-300 mb-2">Symbol Payouts (× Total Bet)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
                    <div>🍌🍇 Low: 8+ = 0.25x → 5x</div>
                    <div>🍉🍑 Med: 8+ = 0.4x → 8x</div>
                    <div>🍎 Apple: 8+ = 0.5x → 10x</div>
                    <div>🔵💚 High: 8+ = 1x → 20x</div>
                    <div>💜 Premium: 8+ = 2x → 25x</div>
                    <div>❤️ Heart: 8+ = 5x → 50x</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-pink-900/50 to-purple-900/50 border border-pink-500/50">
                  <h3 className="font-bold text-yellow-400 text-center">🍬 MAX WIN: 21,175x YOUR STAKE 🍬</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style jsx global>{`
        /* === SPIN PHASE: Drop Out (symbols fall down smoothly) === */
        @keyframes sb-drop-out-kf {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          60% { transform: translateY(120%) scale(0.9); opacity: 0.5; }
          100% { transform: translateY(200%) scale(0.7); opacity: 0; }
        }
        .sb-drop-out {
          animation: sb-drop-out-kf 0.3s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        /* === SPIN PHASE: Cascading (rapid symbol cycling during spin) === */
        @keyframes sb-cascading-kf {
          0% { transform: translateY(-60%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(60%); opacity: 0; }
        }
        .sb-cascading {
          animation: sb-cascading-kf 0.18s linear infinite;
        }

        /* === SPIN PHASE: Landing (symbols drop in from top with bounce) === */
        @keyframes sb-drop-in-kf {
          0% { transform: translateY(-180%) scale(0.8); opacity: 0; }
          40% { transform: translateY(8%) scale(1.02); opacity: 1; }
          60% { transform: translateY(-4%); }
          75% { transform: translateY(2%); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .sb-drop-in {
          animation: sb-drop-in-kf 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* === TUMBLE: Explode (winning symbols pop and vanish) === */
        @keyframes sb-tumble-explode-kf {
          0% { transform: scale(1); opacity: 1; filter: brightness(1); }
          30% { transform: scale(1.3); opacity: 1; filter: brightness(1.8) drop-shadow(0 0 15px rgba(255,105,180,1)); }
          60% { transform: scale(1.4) rotate(10deg); opacity: 0.6; filter: brightness(2) drop-shadow(0 0 25px rgba(255,215,0,1)); }
          100% { transform: scale(0) rotate(30deg); opacity: 0; filter: brightness(2); }
        }
        .sb-tumble-explode {
          animation: sb-tumble-explode-kf 0.4s cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
        }

        /* === WINNING: Symbol pop up === */
        @keyframes sb-winning-pop {
          0% { transform: scale(1); }
          25% { transform: scale(1.15) translateY(-4px); }
          50% { transform: scale(1.1) translateY(-2px); }
          100% { transform: scale(1.1) translateY(-2px); }
        }
        .sb-winning-symbol-pop { animation: sb-winning-pop 0.5s ease-out forwards; }

        /* === WINNING: Glow pulse === */
        @keyframes sb-winning-glow-kf {
          0%, 100% { filter: brightness(1.2) drop-shadow(0 0 8px rgba(255,105,180,0.8)) drop-shadow(0 0 16px rgba(236,72,153,0.6)); }
          50% { filter: brightness(1.4) drop-shadow(0 0 15px rgba(255,105,180,1)) drop-shadow(0 0 30px rgba(236,72,153,0.8)); }
        }
        .sb-winning-symbol-glow { animation: sb-winning-glow-kf 0.8s ease-in-out infinite; }

        /* === WINNING: Background glow === */
        @keyframes sb-glow-bg-pulse {
          0%, 100% { background: radial-gradient(circle, rgba(255,105,180,0.4) 0%, rgba(236,72,153,0.2) 50%, transparent 70%); box-shadow: 0 0 20px rgba(255,105,180,0.5); }
          50% { background: radial-gradient(circle, rgba(255,105,180,0.6) 0%, rgba(236,72,153,0.4) 50%, transparent 70%); box-shadow: 0 0 40px rgba(255,105,180,0.8), 0 0 60px rgba(236,72,153,0.4); }
        }
        .sb-winning-glow-bg { animation: sb-glow-bg-pulse 0.8s ease-in-out infinite; }

        /* === WINNING: Border pulse === */
        @keyframes sb-border-pulse {
          0%, 100% { border-color: rgba(255,105,180,0.8); box-shadow: inset 0 0 8px rgba(255,105,180,0.4), 0 0 8px rgba(255,105,180,0.4); }
          50% { border-color: rgba(255,255,0,1); box-shadow: inset 0 0 15px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.8); }
        }
        .sb-winning-border-pulse { animation: sb-border-pulse 0.6s ease-in-out infinite; }

        /* === WINNING: Shimmer sweep === */
        @keyframes sb-shimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        .sb-winning-shimmer {
          position: absolute; top: -50%; left: -50%; width: 50%; height: 200%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.1) 75%, transparent 100%);
          animation: sb-shimmer 1.5s ease-in-out infinite;
        }

        /* === WINNING: Corner sparkles === */
        @keyframes sb-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); text-shadow: 0 0 10px rgba(255,105,180,1), 0 0 20px rgba(236,72,153,0.8); }
        }
        .sb-winning-sparkle { color: #FF69B4; font-size: 10px; animation: sb-sparkle 0.8s ease-in-out infinite; pointer-events: none; z-index: 30; }

        .sb-winning-container { transform: translateY(-2px); transition: transform 0.3s ease-out; }

        /* === Range slider === */
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #ec4899; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #ec4899; cursor: pointer; border: none; }
      `}</style>
    </main>
  );
}
