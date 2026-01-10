"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Volume2, 
  VolumeX,
  RotateCcw,
  Trophy,
  Zap,
  Target,
  DollarSign,
  History,
  Settings,
  HelpCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RollHistory {
  roll: number;
  target: number;
  isOver: boolean;
  won: boolean;
  payout: string;
  multiplier: number;
  betAmount: number;
  timestamp: Date;
}

const QUICK_TARGETS = [
  { label: "10%", target: 90, isOver: true },
  { label: "25%", target: 75, isOver: true },
  { label: "50%", target: 50, isOver: true },
  { label: "75%", target: 25, isOver: true },
  { label: "90%", target: 10, isOver: true },
];

export default function DicePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [target, setTarget] = useState<number>(50);
  const [isOver, setIsOver] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [rollHistory, setRollHistory] = useState<RollHistory[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<RollHistory | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Auto-bet settings
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);
  const [autoBetCount, setAutoBetCount] = useState<number>(0);
  const [maxAutoBets, setMaxAutoBets] = useState<number>(10);
  const [stopOnWin, setStopOnWin] = useState(false);
  const [stopOnLoss, setStopOnLoss] = useState(false);
  const autoBetRef = useRef<boolean>(false);

  const winChance = isOver ? (99.99 - target) : target;
  const multiplier = winChance > 0 ? ((100 / winChance) * 0.99) : 0;
  const potentialWin = Math.floor(betAmount * multiplier);

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoading || isRolling) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'enter':
          e.preventDefault();
          handleBet();
          break;
        case 'arrowup':
          setIsOver(true);
          break;
        case 'arrowdown':
          setIsOver(false);
          break;
        case 'arrowleft':
          setTarget(t => Math.max(1, t - 1));
          break;
        case 'arrowright':
          setTarget(t => Math.min(98, t + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, isRolling, target]);

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setBalance(parseInt(data.user.balance));
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const animateRoll = async (finalRoll: number): Promise<void> => {
    setIsRolling(true);
    const duration = 1000;
    const steps = 20;
    const stepTime = duration / steps;

    for (let i = 0; i < steps; i++) {
      const randomRoll = Math.floor(Math.random() * 10000) / 100;
      setDisplayRoll(randomRoll);
      await new Promise(resolve => setTimeout(resolve, stepTime));
    }
    
    setDisplayRoll(finalRoll);
    setIsRolling(false);
  };

  const handleBet = async () => {
    if (betAmount <= 0) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }
    if (betAmount > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/games/dice/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount, target, isOver }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bet failed");
      }

      await animateRoll(data.roll);

      const result: RollHistory = {
        roll: data.roll,
        target,
        isOver,
        won: data.won,
        payout: data.payout,
        multiplier: data.multiplier,
        betAmount,
        timestamp: new Date(),
      };

      setLastResult(result);
      setRollHistory(prev => [result, ...prev].slice(0, 50));
      setBalance(parseInt(data.newBalance));

      // Handle auto-bet
      if (autoBetEnabled && autoBetRef.current) {
        setAutoBetCount(prev => prev + 1);
        
        if ((stopOnWin && data.won) || (stopOnLoss && !data.won)) {
          setAutoBetEnabled(false);
          autoBetRef.current = false;
          toast({ 
            title: data.won ? "Auto-bet stopped on win!" : "Auto-bet stopped on loss!", 
            variant: data.won ? "success" : "destructive" 
          });
        } else if (autoBetCount + 1 >= maxAutoBets) {
          setAutoBetEnabled(false);
          autoBetRef.current = false;
          toast({ title: "Auto-bet completed!", variant: "success" });
        } else {
          // Continue auto-betting
          setTimeout(() => {
            if (autoBetRef.current) handleBet();
          }, 500);
        }
      }
    } catch (error) {
      toast({
        title: "Bet failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setAutoBetEnabled(false);
      autoBetRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoBet = () => {
    setAutoBetEnabled(true);
    setAutoBetCount(0);
    autoBetRef.current = true;
    handleBet();
  };

  const stopAutoBet = () => {
    setAutoBetEnabled(false);
    autoBetRef.current = false;
    toast({ title: "Auto-bet stopped", variant: "default" });
  };

  const quickBet = (multiplierValue: number) => {
    if (multiplierValue === 0) {
      setBetAmount(1);
    } else if (multiplierValue === -1) {
      setBetAmount(balance);
    } else {
      setBetAmount(Math.min(balance, Math.max(1, Math.floor(betAmount * multiplierValue))));
    }
  };

  const setQuickTarget = (quickTarget: { target: number; isOver: boolean }) => {
    setTarget(quickTarget.target);
    setIsOver(quickTarget.isOver);
  };

  const getSliderBackground = () => {
    const percentage = target;
    if (isOver) {
      return `linear-gradient(to right, #ef4444 0%, #ef4444 ${percentage}%, #22c55e ${percentage}%, #22c55e 100%)`;
    } else {
      return `linear-gradient(to right, #22c55e 0%, #22c55e ${percentage}%, #ef4444 ${percentage}%, #ef4444 100%)`;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-purple-900/10 to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiPjwvY2lyY2xlPgo8L3N2Zz4=')] opacity-50" />
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-2xl sm:text-3xl">🎲</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Dice</h1>
                <p className="text-blue-400 font-semibold text-sm sm:text-base">
                  {balance.toLocaleString()} tokens
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowRules(!showRules)}
              className="text-white hover:bg-white/10"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Rules Panel */}
        {showRules && (
          <div className="mb-6 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 text-white text-sm">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" /> How to Play
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300">
              <div>• Set your bet amount using chips or input</div>
              <div>• Choose a target number (1-98)</div>
              <div>• Select <span className="text-green-400">Roll Over</span> or <span className="text-red-400">Roll Under</span></div>
              <div>• The dice rolls a number from 0.00 to 99.99</div>
              <div>• <span className="text-yellow-400">Lower chance = Higher reward</span></div>
              <div>• Keyboard: Space/Enter=Roll, ↑↓=Direction, ←→=Target</div>
            </div>
            <p className="text-xs text-yellow-500 mt-3">RTP: 99% | House Edge: 1%</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roll Display */}
            <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 overflow-hidden">
              {/* Animated background on roll */}
              {isRolling && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
              )}
              
              {/* Main Roll Number */}
              <div className="text-center mb-8">
                <div className={`
                  text-7xl sm:text-9xl font-black transition-all duration-300
                  ${isRolling ? 'text-white animate-pulse scale-110' : 
                    lastResult ? (lastResult.won ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}
                `}>
                  {displayRoll !== null ? displayRoll.toFixed(2) : '??:??'}
                </div>
                
                {lastResult && !isRolling && (
                  <div className={`
                    mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full text-xl font-bold
                    ${lastResult.won ? 
                      'bg-gradient-to-r from-green-500 to-emerald-600 text-white animate-bounce' : 
                      'bg-gradient-to-r from-red-500 to-red-700 text-white'}
                  `}>
                    {lastResult.won ? (
                      <>
                        <Trophy className="w-6 h-6" />
                        WIN +{parseInt(lastResult.payout).toLocaleString()}
                      </>
                    ) : (
                      <>LOST</>
                    )}
                  </div>
                )}
              </div>

              {/* Target Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">0</span>
                  <span className="text-white font-bold text-lg">Target: {target}</span>
                  <span className="text-gray-400">100</span>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="98"
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value))}
                    disabled={isLoading || isRolling}
                    className="w-full h-4 rounded-full appearance-none cursor-pointer disabled:opacity-50"
                    style={{ background: getSliderBackground() }}
                  />
                  {/* Target marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-lg pointer-events-none"
                    style={{ left: `${target}%` }}
                  />
                </div>

                {/* Direction Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={() => setIsOver(false)}
                    disabled={isLoading || isRolling}
                    className={`
                      relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl font-bold
                      transition-all duration-300 transform
                      ${!isOver ? 
                        'bg-gradient-to-br from-red-500 to-red-700 text-white scale-105 shadow-lg shadow-red-500/30' : 
                        'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                      disabled:opacity-50
                    `}
                  >
                    <TrendingDown className="w-8 h-8 mb-2" />
                    <span className="text-lg">Roll Under</span>
                    <span className="text-2xl font-black">{target}</span>
                    {!isOver && <span className="text-sm opacity-75 mt-1">{target}% chance</span>}
                  </button>
                  
                  <button
                    onClick={() => setIsOver(true)}
                    disabled={isLoading || isRolling}
                    className={`
                      relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl font-bold
                      transition-all duration-300 transform
                      ${isOver ? 
                        'bg-gradient-to-br from-green-500 to-emerald-700 text-white scale-105 shadow-lg shadow-green-500/30' : 
                        'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                      disabled:opacity-50
                    `}
                  >
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <span className="text-lg">Roll Over</span>
                    <span className="text-2xl font-black">{target}</span>
                    {isOver && <span className="text-sm opacity-75 mt-1">{(99.99 - target).toFixed(2)}% chance</span>}
                  </button>
                </div>
              </div>

              {/* Quick Targets */}
              <div className="flex justify-center gap-2 mt-6 flex-wrap">
                {QUICK_TARGETS.map((qt) => (
                  <button
                    key={qt.label}
                    onClick={() => setQuickTarget(qt)}
                    disabled={isLoading || isRolling}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 text-center border border-white/5">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-1">
                  <Target className="w-4 h-4" />
                  Win Chance
                </div>
                <div className="text-2xl font-bold text-green-400">{winChance.toFixed(2)}%</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 text-center border border-white/5">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-1">
                  <Zap className="w-4 h-4" />
                  Multiplier
                </div>
                <div className="text-2xl font-bold text-yellow-400">{multiplier.toFixed(4)}×</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 text-center border border-white/5">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Potential Win
                </div>
                <div className="text-2xl font-bold text-blue-400">{potentialWin.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Betting Panel */}
          <div className="space-y-6">
            {/* Bet Amount */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Bet Amount
              </h3>
              
              <div className="space-y-4">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  min={1}
                  max={balance}
                  disabled={isLoading || isRolling || autoBetEnabled}
                  className="bg-gray-900 border-gray-700 text-white text-xl text-center font-bold h-14"
                />
                
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickBet(0)}
                    disabled={isLoading || autoBetEnabled}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Min
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickBet(0.5)}
                    disabled={isLoading || autoBetEnabled}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    ½
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickBet(2)}
                    disabled={isLoading || autoBetEnabled}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    2×
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickBet(-1)}
                    disabled={isLoading || autoBetEnabled}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Max
                  </Button>
                </div>
              </div>
            </div>

            {/* Roll Button */}
            <Button
              onClick={handleBet}
              disabled={isLoading || isRolling || betAmount <= 0 || betAmount > balance || autoBetEnabled}
              className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02]"
            >
              {isLoading || isRolling ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Rolling...
                </>
              ) : (
                <>
                  🎲 ROLL DICE
                </>
              )}
            </Button>

            {/* Auto-bet Section */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" /> Auto-Bet
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              {showSettings && (
                <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Number of Bets</span>
                    <Input
                      type="number"
                      value={maxAutoBets}
                      onChange={(e) => setMaxAutoBets(parseInt(e.target.value) || 1)}
                      min={1}
                      max={100}
                      className="w-20 bg-gray-900 border-gray-700 text-white text-center h-8"
                    />
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-400 text-sm">Stop on Win</span>
                    <input
                      type="checkbox"
                      checked={stopOnWin}
                      onChange={(e) => setStopOnWin(e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-900 border-gray-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-400 text-sm">Stop on Loss</span>
                    <input
                      type="checkbox"
                      checked={stopOnLoss}
                      onChange={(e) => setStopOnLoss(e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-900 border-gray-700"
                    />
                  </label>
                </div>
              )}

              {autoBetEnabled ? (
                <div className="space-y-3">
                  <div className="text-center text-white">
                    <span className="text-gray-400">Bets: </span>
                    <span className="font-bold">{autoBetCount} / {maxAutoBets}</span>
                  </div>
                  <Button
                    onClick={stopAutoBet}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Stop Auto-Bet
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startAutoBet}
                  disabled={isLoading || isRolling || betAmount <= 0 || betAmount > balance}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Start Auto-Bet ({maxAutoBets} bets)
                </Button>
              )}
            </div>

            {/* Roll History */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" /> Recent Rolls
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rollHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No rolls yet</p>
                ) : (
                  rollHistory.map((roll, index) => (
                    <div 
                      key={index}
                      className={`
                        flex items-center justify-between p-3 rounded-lg
                        ${roll.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${roll.won ? 'text-green-400' : 'text-red-400'}`}>
                          {roll.roll.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {roll.isOver ? '>' : '<'} {roll.target}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${roll.won ? 'text-green-400' : 'text-red-400'}`}>
                        {roll.won ? `+${parseInt(roll.payout).toLocaleString()}` : `-${roll.betAmount.toLocaleString()}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
          border: 3px solid #1f2937;
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
          border: 3px solid #1f2937;
        }
      `}</style>
    </main>
  );
}
