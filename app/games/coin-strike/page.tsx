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
  X,
  Minus,
  Plus,
  RotateCcw,
  Zap,
  FastForward
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SlotSymbol } from "./symbols";

const REELS = 3;
const ROWS = 3;

const SYMBOL_COLORS: Record<string, string> = {
  "🍒": "from-red-500 to-red-700",
  "🍊": "from-orange-400 to-orange-600",
  "🍇": "from-purple-500 to-purple-700",
  "🔔": "from-yellow-500 to-amber-600",
  "📊": "from-amber-600 to-amber-800",
  "7️⃣": "from-red-600 to-red-800",
  "🪙": "from-yellow-400 to-amber-600",
  "⚡": "from-blue-400 to-blue-600",
};

const SYMBOL_NAMES: Record<string, string> = {
  "🍒": "Cherries",
  "🍊": "Oranges",
  "🍇": "Grapes",
  "🔔": "Bell",
  "📊": "Gold Bar",
  "7️⃣": "Lucky 7",
  "🪙": "Gold Coin",
  "⚡": "Wild",
};

const ALL_SYMBOLS = ["🍒", "🍊", "🍇", "🔔", "📊", "7️⃣", "🪙", "⚡"];

interface CoinData {
  position: [number, number];
  value: number;
}

export default function CoinStrikePage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(1.5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array(REELS).fill(null).map(() => 
      Array(ROWS).fill(null).map(() => 
        ALL_SYMBOLS[Math.floor(Math.random() * (ALL_SYMBOLS.length - 2))]
      )
    )
  );
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningPositions, setWinningPositions] = useState<Set<string>>(new Set());
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turboMode, setTurboMode] = useState(false);
  const [totalWon, setTotalWon] = useState(0);
  const [coinData, setCoinData] = useState<CoinData[]>([]);
  const [holdAndWinActive, setHoldAndWinActive] = useState(false);
  const [jackpotWon, setJackpotWon] = useState<string | null>(null);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const autoSpinRef = useRef(false);
  const holdSpinRef = useRef(false);

  // Jackpot display values (multiplied by bet)
  const jackpots = {
    grand: (betAmount * 1000).toFixed(2),
    major: (betAmount * 150).toFixed(2),
    minor: (betAmount * 50).toFixed(2),
    mini: (betAmount * 25).toFixed(2),
  };

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

  const showBigWinAnimation = useCallback((amount: number, jackpot?: string) => {
    setBigWinAmount(amount);
    setJackpotWon(jackpot || null);
    setShowBigWin(true);
    setTimeout(() => {
      setShowBigWin(false);
      setJackpotWon(null);
    }, 3000);
  }, []);

  const spin = useCallback(async () => {
    const totalBet = Math.round(betAmount * 100);
    if (totalBet > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setWinningPositions(new Set());
    setCoinData([]);

    const spinDuration = turboMode ? 300 : 600;

    // Spinning animation
    const animationInterval = setInterval(() => {
      setReels(
        Array(REELS).fill(null).map(() => 
          Array(ROWS).fill(null).map(() => 
            ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
          )
        )
      );
    }, 60);

    try {
      const res = await fetch("/api/games/coin-strike/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalBet }),
      });

      const data = await res.json();

      await new Promise(resolve => setTimeout(resolve, spinDuration));
      clearInterval(animationInterval);

      if (!res.ok) throw new Error(data.error);

      // Set final reels
      setReels(data.reels);

      // Highlight winning positions
      if (data.winningPositions && data.winningPositions.length > 0) {
        const positions = new Set<string>();
        data.winningPositions.forEach(([reel, row]: [number, number]) => {
          positions.add(`${reel}-${row}`);
        });
        setWinningPositions(positions);
      }

      // Handle coin data
      if (data.coinPositions && data.coinPositions.length > 0) {
        const coins: CoinData[] = data.coinPositions.map((pos: [number, number], idx: number) => ({
          position: pos,
          value: data.coinValues[idx],
        }));
        setCoinData(coins);
      }

      // Check for Hold & Win trigger
      if (data.holdAndWinTriggered) {
        setHoldAndWinActive(true);
        toast({ 
          title: "🪙 HOLD & WIN TRIGGERED!", 
          variant: "success" 
        });
        
        // Auto-trigger Hold & Win feature
        setTimeout(async () => {
          const holdRes = await fetch("/api/games/coin-strike/spin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              amount: totalBet,
              isHoldAndWin: true,
              initialCoinPositions: data.coinPositions,
              initialCoinValues: data.coinValues,
            }),
          });
          
          const holdData = await holdRes.json();
          setHoldAndWinActive(false);
          
          if (holdData.success) {
            const holdWin = parseInt(holdData.totalValue);
            setLastWin(holdWin);
            setBalance(parseInt(holdData.newBalance));
            setTotalWon(prev => prev + holdWin);
            
            // Update coin data with final positions
            if (holdData.coinPositions) {
              const finalCoins: CoinData[] = holdData.coinPositions.map((pos: [number, number], idx: number) => ({
                position: pos,
                value: holdData.coinValues[idx],
              }));
              setCoinData(finalCoins);
            }
            
            if (holdData.jackpotWon) {
              showBigWinAnimation(holdWin, holdData.jackpotWon);
              toast({ 
                title: `🏆 ${holdData.jackpotWon.toUpperCase()} JACKPOT! +${holdWin.toLocaleString()}!`, 
                variant: "success" 
              });
            } else if (holdWin >= totalBet * 20) {
              showBigWinAnimation(holdWin);
            }
          }
        }, 1500);
        
        setIsSpinning(false);
        return;
      }

      const winAmount = parseInt(data.totalWin);
      setLastWin(winAmount);
      setBalance(parseInt(data.newBalance));

      if (winAmount > 0) {
        setTotalWon(prev => prev + winAmount);
        
        if (winAmount >= totalBet * 50) {
          showBigWinAnimation(winAmount);
          toast({ title: `🎉 MEGA WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        } else if (winAmount >= totalBet * 20) {
          toast({ title: `🌟 BIG WIN! +${winAmount.toLocaleString()} tokens!`, variant: "success" });
        }
      }

      // Auto-spin continuation
      if (autoSpinRef.current && parseInt(data.newBalance) >= totalBet) {
        setTimeout(() => {
          if (autoSpinRef.current) spin();
        }, turboMode ? 500 : 1000);
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
  }, [betAmount, balance, toast, turboMode, showBigWinAnimation]);

  const adjustBet = (delta: number) => {
    const newBet = Math.max(0.10, Math.min(100, betAmount + delta));
    setBetAmount(parseFloat(newBet.toFixed(2)));
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

  const getCoinValue = (reel: number, row: number): number | null => {
    const coin = coinData.find(c => c.position[0] === reel && c.position[1] === row);
    return coin ? coin.value : null;
  };

  return (
    <main className="min-h-screen pb-8 relative overflow-hidden bg-gradient-to-b from-amber-950 via-orange-950 to-black">
      {/* Lightning Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-1 h-64 bg-gradient-to-b from-blue-400/50 to-transparent blur-sm animate-pulse" />
        <div className="absolute top-0 right-1/3 w-1 h-48 bg-gradient-to-b from-yellow-400/50 to-transparent blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Big Win Overlay */}
      {showBigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-bounce">
                {jackpotWon ? "🏆💰🏆" : "🪙⚡🪙"}
              </div>
            </div>
            <h2 className="text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent mb-4 drop-shadow-lg animate-pulse">
              {jackpotWon ? `${jackpotWon.toUpperCase()} JACKPOT!` : "COIN STRIKE!"}
            </h2>
            <p className="text-5xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              +{bigWinAmount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Hold & Win Overlay */}
      {holdAndWinActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🪙</div>
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">HOLD & WIN</h2>
            <p className="text-lg text-amber-300">Collecting coins...</p>
            <Loader2 className="w-8 h-8 text-yellow-400 mx-auto mt-4 animate-spin" />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/30">
                🪙
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  COIN STRIKE
                </h1>
                <p className="text-xs text-amber-300/80">Hold and Win</p>
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
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Card className="bg-gradient-to-br from-green-600/60 to-green-800/60 border-green-500/50">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-green-200 uppercase font-bold tracking-wider">GRAND</p>
              <p className="text-lg font-black text-green-300">{jackpots.grand}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-600/60 to-red-800/60 border-red-500/50">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-red-200 uppercase font-bold tracking-wider">MAJOR</p>
              <p className="text-lg font-black text-red-300">{jackpots.major}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-600/60 to-blue-800/60 border-blue-500/50">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">MINOR</p>
              <p className="text-lg font-black text-blue-300">{jackpots.minor}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-600/60 to-purple-800/60 border-purple-500/50">
            <CardContent className="p-2 text-center">
              <p className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">MINI</p>
              <p className="text-lg font-black text-purple-300">{jackpots.mini}</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Machine Frame */}
        <div className="relative rounded-2xl p-1 mb-3 bg-gradient-to-b from-amber-500 via-yellow-600 to-amber-700 shadow-2xl shadow-amber-600/30">
          {/* Title Banner */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 px-6 py-1 rounded-full border-2 border-yellow-400 shadow-lg">
              <span className="text-lg font-black text-amber-900 tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                COIN STRIKE
                <Zap className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 pt-4">
            {/* Reels Container */}
            <div className="p-4">
              <div className="bg-black/50 rounded-xl p-4 border-4 border-amber-600/60 shadow-inner">
                {/* 3x3 Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {reels.map((reel, reelIndex) => (
                    reel.map((symbol, rowIndex) => {
                      const isWinning = isPositionWinning(reelIndex, rowIndex);
                      const coinValue = getCoinValue(reelIndex, rowIndex);
                      const isCoin = symbol === "🪙";
                      const symbolColor = SYMBOL_COLORS[symbol] || "from-gray-400 to-gray-600";
                      
                      return (
                        <div
                          key={`${reelIndex}-${rowIndex}`}
                          className={`
                            relative aspect-square rounded-lg flex flex-col items-center justify-center
                            transition-all duration-300 overflow-hidden
                            ${isWinning 
                              ? `bg-gradient-to-br ${symbolColor} ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50` 
                              : "bg-gradient-to-br from-slate-700/80 to-slate-800/80"
                            }
                          `}
                        >
                          <div 
                            className={`absolute inset-0 flex items-center justify-center p-2 transition-all duration-300 ${isWinning ? 'scale-110 animate-pulse' : ''}`}
                            style={{
                              filter: isSpinning ? "blur(3px)" : "none",
                            }}
                          >
                            <SlotSymbol symbol={symbol} size={0} className="w-full h-full drop-shadow-lg" />
                          </div>
                          
                          {/* Coin value display */}
                          {isCoin && coinValue && (
                            <div className="absolute bottom-1 left-0 right-0 text-center">
                              <span className="text-xs sm:text-sm font-bold text-yellow-300 bg-black/60 px-2 py-0.5 rounded">
                                {coinValue.toFixed(2)}
                              </span>
                            </div>
                          )}
                          
                          {/* Win glow effect */}
                          {isWinning && (
                            <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded-lg" />
                          )}
                        </div>
                      );
                    })
                  )).flat()}
                </div>
              </div>

              {/* Win Display */}
              <div className="h-14 flex items-center justify-center mt-3">
                {lastWin > 0 ? (
                  <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 shadow-lg shadow-amber-500/40">
                    <Trophy className="w-5 h-5 text-yellow-900" />
                    <span className="text-2xl font-black text-yellow-900">+{lastWin.toLocaleString()}</span>
                    <Trophy className="w-5 h-5 text-yellow-900" />
                  </div>
                ) : isSpinning ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">Spinning...</span>
                  </div>
                ) : (
                  <p className="text-amber-300/80 text-sm">6+ 🪙 Coins trigger Hold & Win!</p>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-t border-amber-600/30">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-[10px] text-amber-300/70 uppercase">Credit</p>
                  <p className="text-lg font-bold text-white">{balance.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-amber-300/70 uppercase">Last Win</p>
                  <p className="text-lg font-bold text-yellow-400">{lastWin.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-amber-300/70 uppercase">Bet</p>
                  <p className="text-lg font-bold text-white">{betAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Bet Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(-0.10)}
                    disabled={isSpinning || betAmount <= 0.10}
                    className="border-amber-600/50 hover:bg-amber-600/20 text-white h-10 w-10"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-yellow-400">{betAmount.toFixed(2)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustBet(0.10)}
                    disabled={isSpinning || betAmount >= 100}
                    className="border-amber-600/50 hover:bg-amber-600/20 text-white h-10 w-10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Auto Spin */}
                <Button
                  onClick={toggleAutoSpin}
                  variant={autoSpin ? "destructive" : "outline"}
                  size="icon"
                  className={`h-10 w-10 ${autoSpin ? "" : "border-amber-600/50 hover:bg-amber-600/20 text-white"}`}
                  disabled={balance < betAmount * 100 || holdAndWinActive}
                >
                  <Zap className={`w-5 h-5 ${autoSpin ? "animate-pulse" : ""}`} />
                </Button>

                {/* Spin Button */}
                <Button
                  onClick={spin}
                  disabled={isSpinning || balance < betAmount * 100 || holdAndWinActive}
                  onMouseDown={() => { holdSpinRef.current = true; }}
                  onMouseUp={() => { holdSpinRef.current = false; }}
                  onMouseLeave={() => { holdSpinRef.current = false; }}
                  className="relative h-16 w-16 rounded-full text-xl font-black bg-gradient-to-b from-orange-500 via-orange-600 to-red-700 hover:from-orange-400 hover:via-orange-500 hover:to-red-600 text-white shadow-lg shadow-orange-600/50 disabled:opacity-50 overflow-hidden border-4 border-orange-400"
                >
                  <span className="relative z-10">
                    {isSpinning ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <RotateCcw className="w-6 h-6" />
                    )}
                  </span>
                </Button>

                {/* Turbo Mode */}
                <Button
                  onClick={() => setTurboMode(!turboMode)}
                  variant={turboMode ? "default" : "outline"}
                  size="icon"
                  className={`h-10 w-10 ${turboMode ? "bg-amber-600 hover:bg-amber-700" : "border-amber-600/50 hover:bg-amber-600/20 text-white"}`}
                >
                  <FastForward className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-xs text-amber-300/70">
          <span>RTP: 96.5% • 6+ Coins = Hold & Win • Max Win: 1000x (GRAND)</span>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-amber-600/30 max-w-lg w-full max-h-[80vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">Paytable</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPaytable(false)} className="text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Jackpots */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-amber-400 mb-3">Jackpots (Fill all 9 positions)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-green-600/20 border border-green-500/30 text-center">
                    <p className="text-green-400 font-bold">GRAND</p>
                    <p className="text-white">1000x Bet</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-600/20 border border-red-500/30 text-center">
                    <p className="text-red-400 font-bold">MAJOR</p>
                    <p className="text-white">150x Bet</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-600/20 border border-blue-500/30 text-center">
                    <p className="text-blue-400 font-bold">MINOR</p>
                    <p className="text-white">50x Bet</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-center">
                    <p className="text-purple-400 font-bold">MINI</p>
                    <p className="text-white">25x Bet</p>
                  </div>
                </div>
              </div>

              {/* Symbols */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-amber-400 mb-3">Symbol Payouts (3 of a kind)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SYMBOL_NAMES).filter(([emoji]) => emoji !== "🪙" && emoji !== "⚡").map(([emoji, name]) => (
                    <div key={emoji} className="p-3 rounded-lg bg-white/5 flex items-center gap-3">
                      <SlotSymbol symbol={emoji} size={40} />
                      <div>
                        <p className="text-white font-semibold">{name}</p>
                        <p className="text-amber-300 text-sm">
                          {emoji === "7️⃣" ? "50x" : 
                           emoji === "📊" ? "25x" : 
                           emoji === "🔔" ? "12x" : 
                           emoji === "🍇" ? "8x" : 
                           emoji === "🍊" ? "5x" : "3x"} Bet
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Symbols */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-amber-400 mb-3">Special Symbols</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-yellow-600/20 border border-yellow-500/30 flex items-center gap-3">
                    <SlotSymbol symbol="🪙" size={40} />
                    <div>
                      <p className="text-yellow-400 font-bold">Gold Coin</p>
                      <p className="text-white text-sm">6+ coins trigger Hold & Win feature. Each coin has a value from 1x to 20x bet.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center gap-3">
                    <SlotSymbol symbol="⚡" size={40} />
                    <div>
                      <p className="text-blue-400 font-bold">Wild</p>
                      <p className="text-white text-sm">Substitutes for all symbols except Gold Coin.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="p-4 rounded-lg bg-white/5">
                <h3 className="font-semibold text-white mb-2">How to Play</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  <li>• Match 3 symbols in a row, column, or diagonal to win</li>
                  <li>• Land 6+ Gold Coins to trigger Hold & Win</li>
                  <li>• In Hold & Win, coins lock and you get 3 respins</li>
                  <li>• New coins reset respins back to 3</li>
                  <li>• Fill all 9 positions for the GRAND Jackpot!</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
