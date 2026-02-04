"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
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
  RotateCcw,
  RefreshCw,
  Maximize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRID_COLS = 6;
const GRID_ROWS = 5;

// Symbol configuration with image paths
const SYMBOLS: Record<string, { image: string; name: string; color: string }> = {
  "purple-triangle": { image: "/symbols/olympus/purple-triangle.png", name: "Purple Gem", color: "#A855F7" },
  "green-triangle": { image: "/symbols/olympus/green-triangle.png", name: "Green Gem", color: "#22C55E" },
  "hourglass": { image: "/symbols/olympus/hourglass.png", name: "Hourglass", color: "#06B6D4" },
  "pink-ring": { image: "/symbols/olympus/pink-ring.png", name: "Pink Ring", color: "#EC4899" },
  "blue-diamond": { image: "/symbols/olympus/blue-diamond.png", name: "Blue Diamond", color: "#3B82F6" },
  "red-pentagon": { image: "/symbols/olympus/red-pentagon.png", name: "Red Gem", color: "#DC2626" },
  "yellow-hexagon": { image: "/symbols/olympus/yellow-hexagon.png", name: "Gold Gem", color: "#F59E0B" },
  "chalice": { image: "/symbols/olympus/chalice.png", name: "Chalice", color: "#6366F1" },
  "crown": { image: "/symbols/olympus/crown.png", name: "Crown", color: "#EAB308" },
  "scatter": { image: "/symbols/olympus/scatter.png", name: "Zeus Scatter", color: "#FBBF24" },
};

const BASE_SYMBOLS = ["purple-triangle", "green-triangle", "hourglass", "pink-ring", "blue-diamond", "red-pentagon", "yellow-hexagon", "chalice", "crown"];
const ALL_SYMBOLS = [...BASE_SYMBOLS, "scatter"];

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
  const [betAmount, setBetAmount] = useState<number>(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [symbolBounce, setSymbolBounce] = useState(false);
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
  const [multiplierOrbs, setMultiplierOrbs] = useState<{ position: [number, number]; value: number }[]>([]);
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
    setTumbleWin(0);
    setWinningPositions([]);
    setTumbles([]);
    setMultiplierOrbs([]);
    setSymbolBounce(false);
    
    if (!isFreeSpin) {
      setCurrentMultiplier(1);
    }

    const animationInterval = setInterval(() => {
      setGrid(prev => prev.map(() => 
        Array(GRID_ROWS).fill(null).map(() => 
          ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
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
      
      // Trigger bounce animation when symbols land
      setSymbolBounce(true);
      setTimeout(() => setSymbolBounce(false), 500);
      
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
        toast({ 
          title: `⚡ ZEUS GRANTS ${data.freeSpinsWon} FREE SPINS!`, 
          variant: "success" 
        });
      }

      if (winAmount > 0) {
        if (winAmount >= currentBet * 100) {
          showBigWinAnimation(winAmount);
          toast({ title: `⚡ GODLY WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🏛️ OLYMPIAN WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= currentBet * 20) {
          toast({ title: `👑 EPIC WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
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

  const getOrbAtPosition = (col: number, row: number) => {
    return multiplierOrbs.find(o => o.position[0] === col && o.position[1] === row);
  };

  const buyFreeSpinsPrice = betAmount * 100;

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e]">
      {/* Background with Greek temple aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Sky gradient with sunset colors */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-orange-500/20 via-pink-500/10 to-transparent" />
        
        {/* Flame effects on sides */}
        <div className="absolute top-20 left-4 w-8 h-32 bg-gradient-to-t from-orange-600/60 via-yellow-500/40 to-transparent rounded-full blur-md animate-pulse" />
        <div className="absolute top-20 right-4 w-8 h-32 bg-gradient-to-t from-orange-600/60 via-yellow-500/40 to-transparent rounded-full blur-md animate-pulse" style={{ animationDelay: "0.5s" }} />
        
        {/* Temple pillars */}
        <div className="absolute bottom-0 left-2 w-6 h-48 bg-gradient-to-t from-amber-900/40 via-amber-700/20 to-transparent rounded-t-lg" />
        <div className="absolute bottom-0 right-2 w-6 h-48 bg-gradient-to-t from-amber-900/40 via-amber-700/20 to-transparent rounded-t-lg" />
        
        {/* Golden particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400/50 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-amber-300/60 rounded-full animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
      </div>

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

      <div className="container mx-auto px-2 py-2 max-w-7xl relative z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70 h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <span className="font-semibold">Gates of Olympus</span>
              <span className="px-2 py-0.5 bg-green-500/80 text-white text-xs rounded ml-2">Demo</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70 h-8 w-8">
              <Info className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70 h-8 w-8">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="flex gap-2">
          {/* Left Panel - Buy Feature & Bet Options */}
          <div className="hidden lg:flex flex-col gap-2 w-44">
            {/* Buy Free Spins */}
            <div className="bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] rounded-lg p-3 border border-cyan-500/30">
              <div className="text-center">
                <p className="text-[10px] text-cyan-300 uppercase tracking-wider">ACHETER DES</p>
                <p className="text-[10px] text-cyan-300 uppercase tracking-wider">SPINS GRATUITS</p>
                <p className="text-2xl font-black text-yellow-400 mt-1">{buyFreeSpinsPrice.toFixed(0)} CHF</p>
              </div>
            </div>

            {/* Double Chance / Mise Option */}
            <div className="bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] rounded-lg p-3 border border-cyan-500/30">
              <div className="text-center">
                <p className="text-[10px] text-white uppercase tracking-wider">MISE</p>
                <p className="text-xl font-black text-yellow-400">{(betAmount * 1.25).toFixed(2)} CHF</p>
                <p className="text-[10px] text-amber-400 uppercase">DOUBLE</p>
                <p className="text-[8px] text-white/60 mt-1">CHANCE DE</p>
                <p className="text-[8px] text-white/60">GAGNER UNE FONCTION</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button 
                    onClick={() => setDoubleChanceEnabled(!doubleChanceEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors ${doubleChanceEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doubleChanceEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs text-white/60">{doubleChanceEnabled ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>

            {/* Bet Display */}
            <div className="bg-black/40 rounded-lg p-2 border border-amber-500/20">
              <p className="text-[10px] text-amber-300/60 text-center">10 ▼</p>
            </div>
          </div>

          {/* Center - Main Game Area */}
          <div className="flex-1">
            {/* Tumble Win Banner */}
            <div className="relative mb-2">
              <div className="bg-gradient-to-r from-amber-900/80 via-red-900/90 to-amber-900/80 rounded-t-xl py-2 px-4 border-2 border-amber-500/50 shadow-lg">
                <div className="text-center">
                  <p className="text-[10px] text-amber-200/80 uppercase tracking-widest">GAIN DE LA DÉGRINGOLADE</p>
                  <p className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                    {tumbleWin > 0 ? tumbleWin.toFixed(2) : "0,00"}
                  </p>
                </div>
              </div>
            </div>

            {/* Game Grid Frame */}
            <div className="relative">
              {/* Golden ornate frame */}
              <div className="absolute -inset-1 bg-gradient-to-b from-amber-400 via-yellow-600 to-amber-700 rounded-xl opacity-80" />
              <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 rounded-xl" />
              
              {/* Inner frame with purple background */}
              <div className="relative bg-gradient-to-b from-[#3d1f5c] via-[#2a1541] to-[#3d1f5c] rounded-lg p-1 overflow-hidden">
                {/* Grid */}
                <div className="bg-[#1a0a2e]/90 rounded-lg p-2 backdrop-blur-sm">
                  <div className="grid grid-cols-6 gap-1">
                    {grid.map((col, colIndex) => (
                      col.map((symbol, rowIndex) => {
                        const isWinning = isPositionWinning(colIndex, rowIndex);
                        const orb = getOrbAtPosition(colIndex, rowIndex);
                        const symbolData = SYMBOLS[symbol] || SYMBOLS["purple-triangle"];
                        const symbolColor = symbolData.color;
                        
                        return (
                          <div
                            key={`${colIndex}-${rowIndex}`}
                            className={`
                              relative aspect-square rounded-lg flex items-center justify-center
                              overflow-visible
                              ${isWinning ? "winning-symbol-container z-10" : ""}
                              ${symbolBounce && !isSpinning ? "symbol-bounce" : ""}
                            `}
                            style={{
                              animationDelay: symbolBounce ? `${(colIndex * GRID_ROWS + rowIndex) * 30}ms` : "0ms"
                            }}
                          >
                            {/* Golden glow background for winning symbols */}
                            {isWinning && (
                              <div className="absolute -inset-1 rounded-xl winning-glow-bg" />
                            )}
                            
                            {/* Golden border frame for winning */}
                            {isWinning && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-yellow-400 winning-border-pulse" />
                            )}
                            
                            {/* Symbol container with pop-up animation */}
                            <div 
                              className={`
                                relative w-full h-full p-0.5 transition-all duration-300
                                ${isWinning ? "winning-symbol-pop" : ""}
                              `}
                            >
                              <Image
                                src={symbolData.image}
                                alt={symbolData.name}
                                fill
                                className={`object-contain ${isWinning ? "winning-symbol-glow" : ""}`}
                                sizes="(max-width: 768px) 50px, 80px"
                              />
                            </div>
                            
                            {/* Shimmer/shine effect overlay */}
                            {isWinning && (
                              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                                <div className="winning-shimmer" />
                              </div>
                            )}
                            
                            {/* Golden sparkle particles */}
                            {isWinning && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 winning-sparkle" style={{ animationDelay: "0ms" }}>✦</div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 winning-sparkle" style={{ animationDelay: "200ms" }}>✦</div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 winning-sparkle" style={{ animationDelay: "400ms" }}>✦</div>
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 winning-sparkle" style={{ animationDelay: "600ms" }}>✦</div>
                              </>
                            )}
                            
                            {orb && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/90 to-yellow-600/90 rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-500/50 z-20">
                                <div className="flex flex-col items-center">
                                  <Sparkles className="w-3 h-3 text-yellow-200 animate-spin" />
                                  <span className="text-sm font-black text-white drop-shadow-lg">{orb.value}x</span>
                                </div>
                              </div>
                            )}
                            
                            {symbol === "scatter" && !isWinning && (
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
              <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-amber-600/80 via-yellow-600/80 to-orange-600/80 border border-yellow-400/50 backdrop-blur-sm shadow-lg shadow-amber-500/30">
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  <span className="text-lg font-bold text-white">ZEUS FREE SPINS: {freeSpins}</span>
                  <span className="text-base font-semibold text-yellow-300 bg-black/30 px-2 py-0.5 rounded">×{currentMultiplier}</span>
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Zeus Character & Logo */}
          <div className="hidden lg:flex flex-col items-center w-64 relative">
            {/* Gates of Olympus Logo Image */}
            <div className="relative w-full h-28 mb-2 z-10" style={{ filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))" }}>
              <Image
                src="/symbols/olympus/logo.png"
                alt="Gates of Olympus"
                fill
                className="object-contain"
                sizes="260px"
                priority
              />
            </div>
            
            {/* Zeus Character Image - Full height matching game grid */}
            <div className="relative flex-1 w-full flex items-stretch justify-center overflow-visible" style={{ minHeight: "450px" }}>
              <div className="relative w-full h-full" style={{ filter: "drop-shadow(0 0 25px rgba(251, 191, 36, 0.5))" }}>
                <Image
                  src="/symbols/olympus/zeus.png"
                  alt="Zeus"
                  fill
                  className="object-contain object-bottom"
                  sizes="260px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="mt-2 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 rounded-xl p-3 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Left - Volume & Info */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="hover:bg-white/10 text-white/70 h-8 w-8"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              
              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <span className="text-white/60 text-xs w-6">{volume}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPaytable(true)}
                className="hover:bg-white/10 text-white/70 h-8 w-8"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>

            {/* Center - Credit & Bet Display */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase">CREDIT</p>
                <p className="text-lg font-bold text-white">{balance.toLocaleString("fr-CH", { minimumFractionDigits: 2 })} CHF</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase">MISE</p>
                <p className="text-lg font-bold text-white">{betAmount.toFixed(2)} CHF</p>
              </div>
              
              {/* Gains Display */}
              <div className="text-center min-w-[120px]">
                <p className="text-[10px] text-white/50 uppercase">GAINS</p>
                <p className="text-2xl font-black text-yellow-400">
                  {lastWin > 0 ? `${lastWin.toFixed(2)} CHF` : "0,00 CHF"}
                </p>
              </div>
            </div>

            {/* Right - Spin Controls */}
            <div className="flex items-center gap-2">
              {/* Bet Adjust */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustBet(-0.5)}
                disabled={isSpinning || betAmount <= 0.5 || isFreeSpinMode}
                className="border-white/20 hover:bg-white/10 text-white h-10 w-10 rounded-full"
              >
                <Minus className="w-4 h-4" />
              </Button>

              {/* Main Spin Button */}
              <Button
                onClick={spin}
                disabled={isSpinning || (!isFreeSpinMode && balance < betAmount)}
                className="relative h-14 w-14 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 hover:from-slate-500 hover:via-slate-600 hover:to-slate-700 text-white shadow-lg border-2 border-slate-500/50 disabled:opacity-50"
              >
                {isSpinning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <RefreshCw className="w-6 h-6" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustBet(0.5)}
                disabled={isSpinning || betAmount >= 500 || isFreeSpinMode}
                className="border-white/20 hover:bg-white/10 text-white h-10 w-10 rounded-full"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Auto Spin */}
              <Button
                onClick={toggleAutoSpin}
                variant={autoSpin ? "destructive" : "outline"}
                className={`h-10 px-4 rounded-full ${autoSpin ? "" : "border-white/20 hover:bg-white/10 text-white"}`}
                disabled={balance < betAmount || isFreeSpinMode}
              >
                <RotateCcw className={`w-4 h-4 mr-1 ${autoSpin ? "animate-spin" : ""}`} />
                AUTO
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Stats */}
        <div className="lg:hidden mt-2 text-center text-xs text-amber-300/70">
          <span>RTP: 96.5% • 8+ symbols = win • 4+ ⚡ = 15 Free Spins</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-amber-500/50 max-w-3xl w-full max-h-[85vh] overflow-auto rounded-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                  ⚡ Gates of Olympus Paytable
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-6">
                {Object.entries(SYMBOLS).map(([key, symbolData]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl text-white text-center"
                    style={{ background: `linear-gradient(135deg, ${symbolData.color}40, ${symbolData.color}20)` }}
                  >
                    <div className="relative w-12 h-12 mx-auto mb-1">
                      <Image
                        src={symbolData.image}
                        alt={symbolData.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-xs">{symbolData.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-white/10 border border-amber-500/30">
                  <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    💎 Pay Anywhere (Cluster Pays)
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
                    ⚡ Free Spins (4+ Scatters)
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

                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-yellow-500/50">
                  <h3 className="font-bold text-yellow-400 text-center">⚡ MAX WIN: 5,000x YOUR STAKE ⚡</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        /* Symbol bounce on landing */
        @keyframes symbol-bounce {
          0% {
            transform: translateY(-10px);
          }
          50% {
            transform: translateY(5px);
          }
          75% {
            transform: translateY(-3px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        .symbol-bounce {
          animation: symbol-bounce 0.4s ease-out forwards;
        }
        
        /* Winning symbol pop-up animation */
        @keyframes winning-pop {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.15) translateY(-4px);
          }
          50% {
            transform: scale(1.1) translateY(-2px);
          }
          75% {
            transform: scale(1.12) translateY(-3px);
          }
          100% {
            transform: scale(1.1) translateY(-2px);
          }
        }
        
        .winning-symbol-pop {
          animation: winning-pop 0.5s ease-out forwards;
        }
        
        /* Golden glow effect for winning symbols */
        @keyframes winning-glow {
          0%, 100% {
            filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 16px rgba(255, 165, 0, 0.6));
          }
          50% {
            filter: brightness(1.4) drop-shadow(0 0 15px rgba(255, 215, 0, 1)) drop-shadow(0 0 30px rgba(255, 165, 0, 0.8));
          }
        }
        
        .winning-symbol-glow {
          animation: winning-glow 0.8s ease-in-out infinite;
        }
        
        /* Golden background glow */
        @keyframes glow-bg-pulse {
          0%, 100% {
            background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.2) 50%, transparent 70%);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          }
          50% {
            background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, rgba(255, 165, 0, 0.4) 50%, transparent 70%);
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.4);
          }
        }
        
        .winning-glow-bg {
          animation: glow-bg-pulse 0.8s ease-in-out infinite;
        }
        
        /* Golden border pulse */
        @keyframes border-pulse {
          0%, 100% {
            border-color: rgba(255, 215, 0, 0.8);
            box-shadow: inset 0 0 8px rgba(255, 215, 0, 0.4), 0 0 8px rgba(255, 215, 0, 0.4);
          }
          50% {
            border-color: rgba(255, 255, 0, 1);
            box-shadow: inset 0 0 15px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.8);
          }
        }
        
        .winning-border-pulse {
          animation: border-pulse 0.6s ease-in-out infinite;
        }
        
        /* Shimmer/shine effect moving across symbol */
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) rotate(25deg);
          }
          100% {
            transform: translateX(200%) rotate(25deg);
          }
        }
        
        .winning-shimmer {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 25%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0.1) 75%,
            transparent 100%
          );
          animation: shimmer 1.5s ease-in-out infinite;
        }
        
        /* Sparkle particles */
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
            text-shadow: 0 0 10px rgba(255, 215, 0, 1), 0 0 20px rgba(255, 165, 0, 0.8);
          }
        }
        
        .winning-sparkle {
          color: #FFD700;
          font-size: 10px;
          animation: sparkle 0.8s ease-in-out infinite;
          pointer-events: none;
          z-index: 30;
        }
        
        /* Container for winning symbols - slight elevation */
        .winning-symbol-container {
          transform: translateY(-2px);
          transition: transform 0.3s ease-out;
        }
        
        @keyframes olympus-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 50px rgba(251, 191, 36, 0.8), 0 0 80px rgba(245, 158, 11, 0.4);
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </main>
  );
}
