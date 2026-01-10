"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Loader2, Bomb, Diamond, Shuffle, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  grid: (null | "gem" | "mine")[];
  revealed: boolean[];
  mineCount: number;
  multiplier: number;
  gameOver: boolean;
  won: boolean;
  gemsFound: number;
}

const MINE_PRESETS = [1, 3, 5, 10, 24];

function calculateNextMultiplier(mineCount: number, gemsRevealed: number): number {
  const n = 25;
  const safeTiles = n - mineCount;
  const nextRevealed = gemsRevealed + 1;
  
  if (nextRevealed > safeTiles) return 0;
  
  let probability = 1;
  for (let i = 0; i < nextRevealed; i++) {
    probability *= (safeTiles - i) / (n - i);
  }
  
  const multiplier = (1 / probability) * 0.99;
  return Math.floor(multiplier * 100) / 100;
}

export default function MinesPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [mineCount, setMineCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentWin, setCurrentWin] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(parseInt(data.balance));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playSound = useCallback((type: 'click' | 'gem' | 'mine' | 'cashout') => {
    if (!soundEnabled) return;
  }, [soundEnabled]);

  const startGame = async () => {
    if (betAmount <= 0 || betAmount > balance) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    playSound('click');
    try {
      const res = await fetch("/api/games/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount, mineCount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setGameState({
        grid: Array(25).fill(null),
        revealed: Array(25).fill(false),
        mineCount,
        multiplier: 1,
        gameOver: false,
        won: false,
        gemsFound: 0,
      });
      setCurrentWin(0);
      setBalance(parseInt(data.newBalance));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed to start", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const revealTile = async (index: number) => {
    if (!sessionId || !gameState || gameState.revealed[index] || gameState.gameOver || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/games/mines/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, index }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newRevealed = [...gameState.revealed];
      newRevealed[index] = true;

      const newGrid = [...gameState.grid];
      newGrid[index] = data.isMine ? "mine" : "gem";

      if (data.isMine) {
        playSound('mine');
        data.minePositions.forEach((pos: number) => {
          newGrid[pos] = "mine";
          newRevealed[pos] = true;
        });
      } else {
        playSound('gem');
      }

      const newGemsFound = data.isMine ? gameState.gemsFound : gameState.gemsFound + 1;

      setGameState({
        ...gameState,
        grid: newGrid,
        revealed: newRevealed,
        multiplier: data.multiplier,
        gameOver: data.gameOver,
        won: data.won,
        gemsFound: newGemsFound,
      });

      setCurrentWin(data.currentWin);
      setBalance(parseInt(data.newBalance));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const pickRandomTile = () => {
    if (!gameState || gameState.gameOver || isLoading) return;
    
    const unrevealedIndices = gameState.revealed
      .map((revealed, idx) => (!revealed ? idx : -1))
      .filter(idx => idx !== -1);
    
    if (unrevealedIndices.length === 0) return;
    
    const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    revealTile(randomIndex);
  };

  const cashout = async () => {
    if (!sessionId || !gameState || gameState.gameOver || currentWin === 0) return;

    setIsLoading(true);
    playSound('cashout');
    try {
      const res = await fetch("/api/games/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newGrid = [...gameState.grid];
      const newRevealed = Array(25).fill(true);
      data.minePositions.forEach((pos: number) => {
        newGrid[pos] = "mine";
      });
      for (let i = 0; i < 25; i++) {
        if (newGrid[i] === null) newGrid[i] = "gem";
      }

      setGameState({
        ...gameState,
        grid: newGrid,
        revealed: newRevealed,
        gameOver: true,
        won: true,
      });

      setBalance(parseInt(data.newBalance));
      toast({ title: `💰 Won ${parseInt(data.payout).toLocaleString()} tokens!`, variant: "default" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Cashout failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const newGame = () => {
    setSessionId(null);
    setGameState(null);
    setCurrentWin(0);
    fetchBalance();
  };

  const adjustBet = (action: 'half' | 'double' | 'max') => {
    if (gameState) return;
    if (action === 'half') setBetAmount(Math.max(1, Math.floor(betAmount / 2)));
    if (action === 'double') setBetAmount(Math.min(balance, betAmount * 2));
    if (action === 'max') setBetAmount(balance);
  };

  const nextTileMultiplier = gameState && !gameState.gameOver 
    ? calculateNextMultiplier(gameState.mineCount, gameState.gemsFound)
    : 0;

  const profit = currentWin > 0 ? currentWin - betAmount : 0;

  return (
    <main className="min-h-screen bg-[#0f1923]">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/lobby">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Bomb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Mines</h1>
                <p className="text-sm text-gray-400">{balance.toLocaleString()} tokens</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Panel - Controls */}
          <div className="w-full lg:w-80 space-y-4">
            <div className="bg-[#1a2c38] rounded-lg p-4 space-y-4">
              {/* Bet Amount */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                  Bet Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                    disabled={!!gameState}
                    className="bg-[#0f1923] border-[#2a3f4f] text-white h-12 pr-24 text-lg font-semibold"
                    min={1}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => adjustBet('half')}
                      disabled={!!gameState}
                      className="px-2 py-1 text-xs bg-[#2a3f4f] hover:bg-[#3a4f5f] rounded text-gray-300 disabled:opacity-50"
                    >
                      ½
                    </button>
                    <button
                      onClick={() => adjustBet('double')}
                      disabled={!!gameState}
                      className="px-2 py-1 text-xs bg-[#2a3f4f] hover:bg-[#3a4f5f] rounded text-gray-300 disabled:opacity-50"
                    >
                      2×
                    </button>
                    <button
                      onClick={() => adjustBet('max')}
                      disabled={!!gameState}
                      className="px-2 py-1 text-xs bg-[#2a3f4f] hover:bg-[#3a4f5f] rounded text-gray-300 disabled:opacity-50"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              {/* Mines Count */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                  Mines
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {MINE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => !gameState && setMineCount(preset)}
                      disabled={!!gameState}
                      className={`py-2 rounded text-sm font-semibold transition-all ${
                        mineCount === preset
                          ? "bg-blue-600 text-white"
                          : "bg-[#0f1923] text-gray-400 hover:bg-[#2a3f4f] disabled:opacity-50"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={mineCount}
                  onChange={(e) => !gameState && setMineCount(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={!!gameState}
                  className="bg-[#0f1923] border-[#2a3f4f] text-white h-10"
                  min={1}
                  max={24}
                />
              </div>

              {/* Game Stats (During Game) */}
              {gameState && !gameState.gameOver && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-3 bg-[#0f1923] rounded-lg">
                    <span className="text-gray-400 text-sm">Gems Found</span>
                    <span className="text-white font-bold">{gameState.gemsFound} / {25 - gameState.mineCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-[#0f1923] rounded-lg">
                    <span className="text-gray-400 text-sm">Current Multiplier</span>
                    <span className="text-green-400 font-bold">{gameState.multiplier.toFixed(2)}×</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#0f1923] rounded-lg">
                    <span className="text-gray-400 text-sm">Next Tile</span>
                    <span className="text-yellow-400 font-bold">{nextTileMultiplier.toFixed(2)}×</span>
                  </div>

                  {profit > 0 && (
                    <div className="flex justify-between items-center p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                      <span className="text-green-400 text-sm">Total Profit</span>
                      <span className="text-green-400 font-bold">+{profit.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              {!gameState ? (
                <Button
                  onClick={startGame}
                  disabled={isLoading || betAmount <= 0 || betAmount > balance}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Bet"}
                </Button>
              ) : gameState.gameOver ? (
                <Button
                  onClick={newGame}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
                >
                  New Game
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={pickRandomTile}
                    disabled={isLoading}
                    className="w-full h-10 bg-[#2a3f4f] hover:bg-[#3a4f5f] text-white font-semibold"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Pick Random Tile
                  </Button>
                  <Button
                    onClick={cashout}
                    disabled={isLoading || currentWin === 0}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : currentWin > 0 ? (
                      `Cashout ${currentWin.toLocaleString()}`
                    ) : (
                      "Pick a tile first"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Multiplier Table */}
            {!gameState && (
              <div className="bg-[#1a2c38] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Payout Table</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Array.from({ length: Math.min(10, 25 - mineCount) }, (_, i) => {
                    const gems = i + 1;
                    const mult = calculateNextMultiplier(mineCount, i);
                    return (
                      <div key={gems} className="flex justify-between text-sm py-1 px-2 rounded hover:bg-[#0f1923]">
                        <span className="text-gray-400">{gems} gem{gems > 1 ? 's' : ''}</span>
                        <span className="text-green-400 font-mono">{mult.toFixed(2)}×</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Game Grid */}
          <div className="flex-1">
            <div className="bg-[#1a2c38] rounded-lg p-6 min-h-[500px] flex items-center justify-center">
              {!gameState ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 flex items-center justify-center">
                    <Bomb className="w-10 h-10 text-yellow-500" />
                  </div>
                  <p className="text-gray-400 text-lg mb-2">Ready to play?</p>
                  <p className="text-gray-500 text-sm">Set your bet and number of mines to begin</p>
                </div>
              ) : (
                <div className="w-full max-w-md">
                  {/* Game Result Overlay */}
                  {gameState.gameOver && (
                    <div className={`text-center mb-4 p-4 rounded-lg ${
                      gameState.won 
                        ? "bg-green-900/30 border border-green-500/50" 
                        : "bg-red-900/30 border border-red-500/50"
                    }`}>
                      <p className={`text-2xl font-bold ${gameState.won ? "text-green-400" : "text-red-400"}`}>
                        {gameState.won ? `+${currentWin.toLocaleString()} tokens` : "Game Over"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {gameState.won 
                          ? `${gameState.gemsFound} gems found at ${gameState.multiplier.toFixed(2)}×` 
                          : "You hit a mine!"}
                      </p>
                    </div>
                  )}

                  {/* 5x5 Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {gameState.grid.map((cell, i) => {
                      const isRevealed = gameState.revealed[i];
                      const isMine = cell === "mine";
                      const isHovered = hoveredTile === i;

                      return (
                        <button
                          key={i}
                          onClick={() => revealTile(i)}
                          onMouseEnter={() => setHoveredTile(i)}
                          onMouseLeave={() => setHoveredTile(null)}
                          disabled={isRevealed || gameState.gameOver || isLoading}
                          className={`
                            aspect-square rounded-lg flex items-center justify-center
                            transition-all duration-200 transform
                            ${isRevealed
                              ? isMine
                                ? "bg-gradient-to-br from-red-600 to-red-800 scale-100"
                                : "bg-gradient-to-br from-green-500 to-green-700 scale-100"
                              : `bg-gradient-to-br from-[#2a3f4f] to-[#1f3040] 
                                 hover:from-[#3a5060] hover:to-[#2a4050] 
                                 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20
                                 active:scale-95 cursor-pointer`
                            }
                            ${isHovered && !isRevealed && !gameState.gameOver ? "ring-2 ring-blue-400/50" : ""}
                            disabled:cursor-default disabled:hover:scale-100
                          `}
                        >
                          {isRevealed ? (
                            isMine ? (
                              <div className="mines-mine-revealed">
                                <Bomb className="w-8 h-8 text-white drop-shadow-lg mines-mine-icon" />
                              </div>
                            ) : (
                              <div className="mines-gem-revealed">
                                <Diamond className="w-8 h-8 text-cyan-300 drop-shadow-lg mines-gem-icon" />
                              </div>
                            )
                          ) : (
                            <div className={`w-3 h-3 rounded-full bg-[#0f1923]/50 transition-all ${
                              isHovered && !gameState.gameOver ? "scale-150 bg-blue-400/50" : ""
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Game Info Footer */}
                  <div className="flex justify-between items-center mt-4 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        <Bomb className="w-4 h-4 inline mr-1" />
                        {gameState.mineCount} mines
                      </span>
                      <span className="text-gray-400">
                        <Diamond className="w-4 h-4 inline mr-1" />
                        {gameState.gemsFound} gems
                      </span>
                    </div>
                    {!gameState.gameOver && gameState.gemsFound > 0 && (
                      <span className="text-green-400 font-semibold">
                        {gameState.multiplier.toFixed(2)}× multiplier
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
