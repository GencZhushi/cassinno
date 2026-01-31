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
  FastForward,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SlotSymbol } from "./symbols";

const REELS = 3;
const ROWS = 3;
const REEL_STRIP_LENGTH = 30; // Number of symbols in each reel strip for spinning
const SYMBOL_HEIGHT = 100; // Height of each symbol in pixels (will be adjusted by CSS)

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

// Generate a random reel strip with symbols
const generateReelStrip = (finalSymbols?: string[]): string[] => {
  const strip: string[] = [];
  for (let i = 0; i < REEL_STRIP_LENGTH; i++) {
    strip.push(ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]);
  }
  // If final symbols provided, place them at the end positions that will be visible
  if (finalSymbols) {
    // The visible window shows 3 symbols, place finals at positions that will show after spin
    strip[REEL_STRIP_LENGTH - 3] = finalSymbols[0];
    strip[REEL_STRIP_LENGTH - 2] = finalSymbols[1];
    strip[REEL_STRIP_LENGTH - 1] = finalSymbols[2];
  }
  return strip;
};

interface CoinData {
  position: [number, number];
  value: number;
}

const GUEST_FREE_ROUNDS = 5;
const GUEST_DEMO_BALANCE = 10000;

export default function CoinStrikePage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(1.5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestFreeRoundsUsed, setGuestFreeRoundsUsed] = useState(0);
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [winLines, setWinLines] = useState<string[]>([]); // 'row-0', 'row-1', 'row-2', 'col-0', 'col-1', 'col-2', 'diag-1', 'diag-2'
  const autoSpinRef = useRef(false);
  const holdSpinRef = useRef(false);
  
  // Reel spinning state
  const [reelStrips, setReelStrips] = useState<string[][]>(() => 
    Array(REELS).fill(null).map(() => generateReelStrip())
  );
  const [reelPositions, setReelPositions] = useState<number[]>([0, 0, 0]);
  const [reelSpinning, setReelSpinning] = useState<boolean[]>([false, false, false]);
  const [reelBlur, setReelBlur] = useState<boolean[]>([false, false, false]);
  const spinAnimationRef = useRef<number | null>(null);
  const reelStopTimeouts = useRef<NodeJS.Timeout[]>([]);

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

  // Check if user is guest and set demo balance
  useEffect(() => {
    const checkGuestStatus = async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        // User is not logged in - guest mode
        setIsGuest(true);
        setBalance(GUEST_DEMO_BALANCE);
      }
    };
    checkGuestStatus();
  }, []);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
      setIsGuest(false);
    } else {
      // Guest mode
      setIsGuest(true);
      setBalance(GUEST_DEMO_BALANCE);
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

  // Start the spinning animation for all reels
  const startReelSpin = useCallback((finalReels: string[][]) => {
    // Clear any existing timeouts
    reelStopTimeouts.current.forEach(t => clearTimeout(t));
    reelStopTimeouts.current = [];
    
    // Generate new reel strips with final symbols at the end
    const newStrips = finalReels.map((reelSymbols) => generateReelStrip(reelSymbols));
    setReelStrips(newStrips);
    
    // Reset positions and start all reels spinning
    setReelPositions([0, 0, 0]);
    setReelSpinning([true, true, true]);
    setReelBlur([true, true, true]);
    
    // Base timing for spin - even slower and smoother
    const baseSpinTime = turboMode ? 1500 : 3000;
    const reelDelay = turboMode ? 400 : 700; // Delay between each reel stopping
    
    // Schedule each reel to stop with staggered timing
    return new Promise<void>((resolve) => {
      for (let i = 0; i < REELS; i++) {
        const stopTime = baseSpinTime + (i * reelDelay);
        
        const timeout = setTimeout(() => {
          // Stop this reel - remove blur first for slowdown effect
          setReelBlur(prev => {
            const newBlur = [...prev];
            newBlur[i] = false;
            return newBlur;
          });
          
          // Then stop spinning after a brief slowdown - smoother transition
          setTimeout(() => {
            setReelSpinning(prev => {
              const newSpinning = [...prev];
              newSpinning[i] = false;
              return newSpinning;
            });
            
            // Set final position for this reel
            setReelPositions(prev => {
              const newPositions = [...prev];
              newPositions[i] = REEL_STRIP_LENGTH - ROWS; // Position to show last 3 symbols
              return newPositions;
            });
            
            // Update the visible reels state for this column
            setReels(prev => {
              const newReels = [...prev];
              newReels[i] = finalReels[i];
              return newReels;
            });
            
            // If this is the last reel, resolve
            if (i === REELS - 1) {
              setTimeout(resolve, 150);
            }
          }, turboMode ? 350 : 600);
        }, stopTime);
        
        reelStopTimeouts.current.push(timeout);
      }
    });
  }, [turboMode]);

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
    setShowConfetti(false);
    setWinLines([]);

    try {
      // Fetch result from server first
      const res = await fetch("/api/games/coin-strike/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: totalBet,
          guestFreeRoundsUsed: isGuest ? guestFreeRoundsUsed : 0,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.requiresLogin) {
          toast({ 
            title: "Free rounds exhausted!", 
            description: "Please login to continue playing.",
            variant: "destructive" 
          });
          setAutoSpin(false);
          return;
        }
        throw new Error(data.error);
      }

      // Track guest free rounds
      if (isGuest && !data.isHoldAndWin) {
        setGuestFreeRoundsUsed(prev => prev + 1);
      }

      // Start the realistic spinning animation with the final results
      await startReelSpin(data.reels);

      // Highlight winning positions and detect win lines
      if (data.winningPositions && data.winningPositions.length > 0) {
        const positions = new Set<string>();
        const detectedLines: string[] = [];
        
        data.winningPositions.forEach(([reel, row]: [number, number]) => {
          positions.add(`${reel}-${row}`);
        });
        setWinningPositions(positions);
        
        // Detect which lines won based on positions
        for (let row = 0; row < 3; row++) {
          if (positions.has(`0-${row}`) && positions.has(`1-${row}`) && positions.has(`2-${row}`)) {
            detectedLines.push(`row-${row}`);
          }
        }
        for (let col = 0; col < 3; col++) {
          if (positions.has(`${col}-0`) && positions.has(`${col}-1`) && positions.has(`${col}-2`)) {
            detectedLines.push(`col-${col}`);
          }
        }
        if (positions.has('0-0') && positions.has('1-1') && positions.has('2-2')) {
          detectedLines.push('diag-1');
        }
        if (positions.has('0-2') && positions.has('1-1') && positions.has('2-0')) {
          detectedLines.push('diag-2');
        }
        
        setWinLines(detectedLines);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
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
      toast({ title: error instanceof Error ? error.message : "Spin failed", variant: "destructive" });
      setAutoSpin(false);
    } finally {
      setIsSpinning(false);
    }
  }, [betAmount, balance, toast, turboMode, showBigWinAnimation, startReelSpin]);

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
    <main className="h-screen max-h-screen overflow-hidden relative flex flex-col bg-gradient-to-b from-blue-950 via-indigo-950 to-slate-950">
      {/* Lightning Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
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

      {/* Confetti Overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
          {/* Sparkles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `sparkle ${0.5 + Math.random() * 1}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-3 py-2 max-w-5xl relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href="/">
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

          <div className="flex items-center gap-2">
            {/* Guest Free Rounds Indicator */}
            {isGuest && (
              <div className="flex items-center gap-1 bg-amber-600/20 border border-amber-500/30 rounded-lg px-2 py-1">
                <span className="text-xs text-amber-300">Free Spins:</span>
                <span className="text-sm font-bold text-yellow-400">
                  {Math.max(0, GUEST_FREE_ROUNDS - guestFreeRoundsUsed)}/{GUEST_FREE_ROUNDS}
                </span>
              </div>
            )}
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

        {/* Jackpot Display - Matching reference image style */}
        <div className="flex justify-center gap-4 mb-2">
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-b from-red-500 to-red-700 px-4 py-1 rounded-t-lg border-2 border-red-400 shadow-lg">
              <p className="text-xs font-bold text-white uppercase tracking-wider">GRAND</p>
            </div>
            <div className="bg-gradient-to-b from-red-600 to-red-800 px-6 py-2 rounded-b-lg border-2 border-t-0 border-red-400">
              <p className="text-2xl font-black text-yellow-300 drop-shadow-lg">{jackpots.grand}</p>
            </div>
            <p className="text-[10px] text-yellow-400 mt-1 font-bold">MINOR <span className="text-yellow-300">{jackpots.minor}</span></p>
          </div>
          
          {/* Center Logo */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/50 border-4 border-yellow-300">
              <Zap className="w-8 h-8 text-yellow-900" />
            </div>
            <h1 className="text-xl font-black mt-1">
              <span className="text-yellow-400">COIN</span>
              <span className="text-red-500">STR</span>
              <span className="text-yellow-400">IKE</span>
            </h1>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-b from-green-500 to-green-700 px-4 py-1 rounded-t-lg border-2 border-green-400 shadow-lg">
              <p className="text-xs font-bold text-white uppercase tracking-wider">MAJOR</p>
            </div>
            <div className="bg-gradient-to-b from-green-600 to-green-800 px-6 py-2 rounded-b-lg border-2 border-t-0 border-green-400">
              <p className="text-2xl font-black text-yellow-300 drop-shadow-lg">{jackpots.major}</p>
            </div>
            <p className="text-[10px] text-yellow-400 mt-1 font-bold">MINI <span className="text-yellow-300">{jackpots.mini}</span></p>
          </div>
        </div>

        {/* Game Machine Frame - New Layout with Spin Button on Right */}
        <div className="flex gap-4 mb-2 flex-1 min-h-0">
          {/* Main Slot Machine */}
          <div className="flex-1 relative flex flex-col">
            {/* Chrome/Silver Frame */}
            <div className="rounded-xl p-1 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 shadow-2xl h-full flex flex-col">
              <div className="rounded-lg p-1 bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700 flex-1 flex flex-col">
                <div className="rounded-md overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex-1 flex flex-col">
                  {/* 5 LINES indicators on sides */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                    <div className="text-[8px] text-white/60 font-bold rotate-[-90deg] whitespace-nowrap">5 LINES</div>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    <div className="text-[8px] text-white/60 font-bold rotate-90 whitespace-nowrap">5 LINES</div>
                  </div>

                  {/* Reels Container - 3 Vertical Spinning Reels */}
                  <div className="p-2 flex-1 flex items-stretch justify-stretch relative">
                    <div className="flex gap-2 w-full h-full relative">
                      {/* Each Reel Column */}
                      {[0, 1, 2].map((reelIndex) => (
                        <div 
                          key={`reel-${reelIndex}`}
                          className={`
                            flex-1 relative overflow-hidden rounded-lg 
                            bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900
                            ${reelSpinning[reelIndex] ? 'reel-frame-spinning' : ''}
                          `}
                        >
                          {/* Speed lines during fast spin */}
                          {reelBlur[reelIndex] && (
                            <>
                              <div className="speed-line" style={{ left: '20%', animationDelay: '0ms' }} />
                              <div className="speed-line" style={{ left: '50%', animationDelay: '50ms' }} />
                              <div className="speed-line" style={{ left: '80%', animationDelay: '100ms' }} />
                            </>
                          )}
                          
                          {/* Reel Strip Container */}
                          <div 
                            className={`
                              absolute inset-x-0 top-0 flex flex-col
                              ${reelSpinning[reelIndex] ? 'reel-spinning' : 'reel-stopped'}
                              ${reelBlur[reelIndex] ? 'blur-[3px]' : ''}
                              transition-[filter] duration-200
                            `}
                            style={{
                              height: reelSpinning[reelIndex] ? `${REEL_STRIP_LENGTH * 33.333}%` : '100%',
                            }}
                          >
                            {/* Render symbols */}
                            {(reelSpinning[reelIndex] ? reelStrips[reelIndex] : reels[reelIndex]).map((symbol, symbolIndex) => {
                              const isWinning = !reelSpinning[reelIndex] && isPositionWinning(reelIndex, symbolIndex);
                              const coinValue = getCoinValue(reelIndex, symbolIndex);
                              const isCoin = symbol === "🪙" || symbol === "coin";
                              
                              return (
                                <div
                                  key={`${reelIndex}-${symbolIndex}-${reelSpinning[reelIndex] ? 'spin' : 'stop'}`}
                                  className={`
                                    relative flex-shrink-0
                                    bg-gradient-to-b from-blue-500/40 via-blue-600/50 to-blue-700/40
                                    border-b border-blue-400/30
                                    ${isWinning ? 'winning-symbol-animate ring-2 ring-inset ring-yellow-400 shadow-lg shadow-yellow-400/50 z-10' : ''}
                                  `}
                                  style={{
                                    height: reelSpinning[reelIndex] 
                                      ? `${100 / REEL_STRIP_LENGTH}%` 
                                      : '33.333%',
                                  }}
                                >
                                  {/* Symbol */}
                                  <div 
                                    className={`
                                      absolute inset-1 flex items-center justify-center
                                      ${isWinning ? 'scale-105' : ''}
                                      ${!reelSpinning[reelIndex] && !isWinning ? 'symbol-landing' : ''}
                                    `}
                                  >
                                    <SlotSymbol 
                                      symbol={symbol} 
                                      size={0} 
                                      className="w-full h-full drop-shadow-lg" 
                                    />
                                  </div>
                                  
                                  {/* Win effects */}
                                  {isWinning && (
                                    <>
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent animate-pulse" />
                                      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(250,204,21,0.4)] animate-pulse" />
                                    </>
                                  )}
                                  
                                  {/* Coin value */}
                                  {isCoin && coinValue && !isSpinning && !reelSpinning[reelIndex] && (
                                    <div className="absolute bottom-1 left-0 right-0 text-center z-10">
                                      <span className="text-[10px] font-bold text-yellow-300 bg-black/70 px-1.5 py-0.5 rounded">
                                        {coinValue.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Reel frame overlay - top and bottom shadows for depth */}
                          <div className="absolute inset-0 pointer-events-none z-20">
                            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-blue-950/90 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-blue-950/90 to-transparent" />
                            {/* Side shadows */}
                            <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-blue-950/50 to-transparent" />
                            <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-l from-blue-950/50 to-transparent" />
                          </div>
                          
                          {/* Center payline indicator */}
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-yellow-500/30 pointer-events-none z-10" />
                        </div>
                      ))}
                      
                      {/* Reel separators */}
                      <div className="reel-separator" style={{ left: 'calc(33.333% - 1px)' }} />
                      <div className="reel-separator" style={{ left: 'calc(66.666% - 1px)' }} />
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex flex-col items-center justify-center gap-3 w-24">
            {/* Info Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPaytable(true)}
              className="w-12 h-12 rounded-full border-2 border-white/30 hover:bg-white/10 text-white"
            >
              <Info className="w-5 h-5" />
            </Button>

            {/* Auto Spin */}
            <Button
              onClick={toggleAutoSpin}
              size="icon"
              className={`w-12 h-12 rounded-full border-2 ${autoSpin ? "bg-red-600 border-red-400" : "border-white/30 hover:bg-white/10"} text-white`}
              disabled={balance < betAmount * 100 || holdAndWinActive}
            >
              <Zap className={`w-5 h-5 ${autoSpin ? "animate-pulse" : ""}`} />
            </Button>

            {/* Main Spin Button - Large Orange */}
            <div className="relative">
              <Button
                onClick={spin}
                disabled={isSpinning || balance < betAmount * 100 || holdAndWinActive}
                onMouseDown={() => { holdSpinRef.current = true; }}
                onMouseUp={() => { holdSpinRef.current = false; }}
                onMouseLeave={() => { holdSpinRef.current = false; }}
                className="relative h-24 w-24 rounded-full text-xl font-black bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 hover:from-orange-300 hover:via-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/50 disabled:opacity-50 overflow-hidden border-4 border-orange-300"
              >
                <div className="absolute inset-2 rounded-full border-2 border-orange-200/30" />
                <span className="relative z-10">
                  {isSpinning ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : (
                    <RefreshCw className="w-10 h-10" />
                  )}
                </span>
              </Button>
              {/* Hold for Turbo text */}
              {!isSpinning && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[8px] text-orange-300 font-bold uppercase bg-orange-900/80 px-2 py-0.5 rounded">
                    HOLD FOR TURBO
                  </span>
                </div>
              )}
            </div>

            {/* Fast Forward / Turbo */}
            <Button
              onClick={() => setTurboMode(!turboMode)}
              size="icon"
              className={`w-12 h-12 rounded-full border-2 ${turboMode ? "bg-amber-600 border-amber-400" : "border-white/30 hover:bg-white/10"} text-white`}
            >
              <FastForward className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Bottom Stats Bar - Compact */}
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 rounded-lg p-3 backdrop-blur-sm border border-slate-700/50 flex-shrink-0">
          {/* Stats and Controls in one row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">CRÉDIT</p>
              <p className="text-lg font-bold text-white">{balance.toLocaleString()}</p>
            </div>
            
            {/* Bet Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustBet(-0.10)}
                disabled={isSpinning || betAmount <= 0.10}
                className="border-slate-600 hover:bg-slate-700 text-white h-8 w-8 rounded-full"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="text-center min-w-[70px] px-3 py-1 bg-slate-800 rounded-lg border border-slate-600">
                <p className="text-[9px] text-slate-400 uppercase">MISE</p>
                <p className="text-base font-bold text-yellow-400">{betAmount.toFixed(2)}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustBet(0.10)}
                disabled={isSpinning || betAmount >= 100}
                className="border-slate-600 hover:bg-slate-700 text-white h-8 w-8 rounded-full"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">DERNIERS GAINS</p>
              <p className="text-lg font-bold text-yellow-400">{lastWin.toFixed(2)}</p>
            </div>
          </div>
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
