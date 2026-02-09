"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, Skull, Trophy, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Difficulty = "easy" | "medium" | "hard" | "hardcore";

const ROAD_COLUMNS = 10;
const TILES_PER_COLUMN = 5;
const FREE_GAMES_LIMIT = 5;
const FREE_PLAY_BALANCE = 10000;
const STORAGE_KEY = "chicken_road_free_plays";

const DIFFICULTY_CONFIG: Record<Difficulty, { bones: number; label: string; color: string }> = {
  easy: { bones: 1, label: "Easy", color: "bg-green-600 hover:bg-green-700" },
  medium: { bones: 2, label: "Medium", color: "bg-yellow-600 hover:bg-yellow-700" },
  hard: { bones: 3, label: "Hard", color: "bg-orange-600 hover:bg-orange-700" },
  hardcore: { bones: 4, label: "Hardcore", color: "bg-red-600 hover:bg-red-700" },
};

function calculateMultiplier(difficulty: Difficulty, steps: number): number {
  if (steps <= 0) return 1;
  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  const safeTiles = TILES_PER_COLUMN - bones;
  const raw = Math.pow(TILES_PER_COLUMN / safeTiles, steps);
  return Math.floor(raw * 0.98 * 100) / 100;
}

function getCollisionChance(difficulty: Difficulty): number {
  return Math.round((DIFFICULTY_CONFIG[difficulty].bones / TILES_PER_COLUMN) * 100);
}

/** Generate bone positions for all columns client-side */
function generateBonePositions(difficulty: Difficulty): number[][] {
  const bones = DIFFICULTY_CONFIG[difficulty].bones;
  const positions: number[][] = [];
  for (let col = 0; col < ROAD_COLUMNS; col++) {
    const rows = Array.from({ length: TILES_PER_COLUMN }, (_, i) => i);
    const columnBones: number[] = [];
    for (let b = 0; b < bones; b++) {
      const idx = Math.floor(Math.random() * rows.length);
      columnBones.push(rows.splice(idx, 1)[0]);
    }
    positions.push(columnBones.sort((a, b) => a - b));
  }
  return positions;
}

function getFreeGamesUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function incrementFreeGames(): number {
  const current = getFreeGamesUsed() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(current));
  } catch { /* noop */ }
  return current;
}

interface TileState {
  revealed: boolean;
  isBone: boolean;
  isChosen: boolean;
  isSafe: boolean;
}

export default function ChickenRoadPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(FREE_PLAY_BALANCE);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hitBone, setHitBone] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(-1);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [currentWin, setCurrentWin] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bonePositions, setBonePositions] = useState<number[][]>([]);
  const [freeGamesUsed, setFreeGamesUsed] = useState(0);
  const freeGamesLeft = FREE_GAMES_LIMIT - freeGamesUsed;
  const isLocked = freeGamesLeft <= 0;

  // Grid state: [column][row]
  const [grid, setGrid] = useState<TileState[][]>(() =>
    Array.from({ length: ROAD_COLUMNS }, () =>
      Array.from({ length: TILES_PER_COLUMN }, () => ({
        revealed: false,
        isBone: false,
        isChosen: false,
        isSafe: false,
      }))
    )
  );

  useEffect(() => {
    setFreeGamesUsed(getFreeGamesUsed());
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playSound = useCallback((type: "step" | "bone" | "cashout" | "click") => {
    if (!soundEnabled) return;
  }, [soundEnabled]);

  const resetGrid = () => {
    setGrid(
      Array.from({ length: ROAD_COLUMNS }, () =>
        Array.from({ length: TILES_PER_COLUMN }, () => ({
          revealed: false,
          isBone: false,
          isChosen: false,
          isSafe: false,
        }))
      )
    );
  };

  const startGame = () => {
    if (isLocked) {
      toast({ title: "Free games used up! Register to keep playing.", variant: "destructive" });
      return;
    }
    if (betAmount <= 0 || betAmount > balance) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    playSound("click");

    // Generate bones client-side
    const bones = generateBonePositions(difficulty);
    setBonePositions(bones);

    // Deduct bet from demo balance
    setBalance((prev) => prev - betAmount);
    setGameActive(true);
    setGameOver(false);
    setWon(false);
    setHitBone(false);
    setCurrentColumn(-1);
    setCurrentMultiplier(1);
    setCurrentWin(0);
    resetGrid();

    // Count this free game
    const newCount = incrementFreeGames();
    setFreeGamesUsed(newCount);
  };

  const takeStep = (row: number) => {
    if (!gameActive || gameOver) return;

    const nextCol = currentColumn + 1;
    if (nextCol >= ROAD_COLUMNS) return;

    const isBone = bonePositions[nextCol].includes(row);
    const newGrid = grid.map((col) => col.map((t) => ({ ...t })));

    if (isBone) {
      playSound("bone");
      // Reveal all bones
      bonePositions.forEach((bones, colIdx) => {
        bones.forEach((boneRow) => {
          newGrid[colIdx][boneRow].revealed = true;
          newGrid[colIdx][boneRow].isBone = true;
        });
      });
      newGrid[nextCol][row].isChosen = true;

      setGrid(newGrid);
      setCurrentColumn(nextCol);
      setGameOver(true);
      setHitBone(true);
      setCurrentMultiplier(0);
      setCurrentWin(0);
    } else {
      playSound("step");
      newGrid[nextCol][row].revealed = true;
      newGrid[nextCol][row].isSafe = true;
      newGrid[nextCol][row].isChosen = true;

      const stepsCompleted = nextCol + 1;
      const mult = calculateMultiplier(difficulty, stepsCompleted);
      const win = Math.floor(betAmount * mult);

      // Auto cash out at end of road
      if (nextCol === ROAD_COLUMNS - 1) {
        bonePositions.forEach((bones, colIdx) => {
          bones.forEach((boneRow) => {
            newGrid[colIdx][boneRow].revealed = true;
            newGrid[colIdx][boneRow].isBone = true;
          });
        });
        setWon(true);
        setGameOver(true);
        setBalance((prev) => prev + win);
        playSound("cashout");
        toast({ title: `🏆 Crossed the road! Won ${win.toLocaleString()} tokens!` });
      }

      setGrid(newGrid);
      setCurrentColumn(nextCol);
      setCurrentMultiplier(mult);
      setCurrentWin(win);
      if (nextCol === ROAD_COLUMNS - 1) {
        setGameOver(true);
      }
    }
  };

  const cashout = () => {
    if (!gameActive || gameOver || currentWin === 0) return;

    playSound("cashout");

    // Reveal all bones
    const newGrid = grid.map((col) => col.map((t) => ({ ...t })));
    bonePositions.forEach((bones, colIdx) => {
      bones.forEach((boneRow) => {
        newGrid[colIdx][boneRow].revealed = true;
        newGrid[colIdx][boneRow].isBone = true;
      });
    });
    setGrid(newGrid);

    setBalance((prev) => prev + currentWin);
    setGameOver(true);
    setWon(true);
    toast({
      title: `💰 Cashed out ${currentWin.toLocaleString()} tokens at ${currentMultiplier.toFixed(2)}×!`,
    });
  };

  const newGame = () => {
    setGameActive(false);
    setGameOver(false);
    setWon(false);
    setHitBone(false);
    setCurrentColumn(-1);
    setCurrentMultiplier(1);
    setCurrentWin(0);
    setBonePositions([]);
    resetGrid();
  };

  const adjustBet = (action: "half" | "double" | "max") => {
    if (gameActive) return;
    if (action === "half") setBetAmount(Math.max(1, Math.floor(betAmount / 2)));
    if (action === "double") setBetAmount(Math.min(balance, betAmount * 2));
    if (action === "max") setBetAmount(balance);
  };

  const nextStepMultiplier = gameActive && !gameOver
    ? calculateMultiplier(difficulty, currentColumn + 2)
    : 0;

  const profit = currentWin > 0 ? currentWin - betAmount : 0;

  const multiplierTable = Array.from({ length: ROAD_COLUMNS }, (_, i) =>
    calculateMultiplier(difficulty, i + 1)
  );

  return (
    <main className="min-h-screen bg-[#0a0e13]">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl">
                🐔
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">
                  CHICKEN R
                  <span className="inline-block w-5 h-5 rounded-full bg-yellow-400 align-middle mx-0.5 relative -top-px" />
                  AD
                </h1>
                <p className="text-sm text-gray-400">
                  {balance.toLocaleString()} tokens
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                    {freeGamesLeft > 0 ? `${freeGamesLeft} free game${freeGamesLeft !== 1 ? "s" : ""} left` : "No free games left"}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-white"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Panel - Controls */}
          <div className="w-full lg:w-80 space-y-4">
            <div className="bg-[#141b24] rounded-xl p-4 space-y-4 border border-[#1e2a36]">
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
                    disabled={gameActive}
                    className="bg-[#0a0e13] border-[#1e2a36] text-white h-12 pr-28 text-lg font-semibold"
                    min={1}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => adjustBet("half")}
                      disabled={gameActive}
                      className="px-2 py-1 text-xs bg-[#1e2a36] hover:bg-[#2a3a4a] rounded text-gray-300 disabled:opacity-50 transition-colors"
                    >
                      ½
                    </button>
                    <button
                      onClick={() => adjustBet("double")}
                      disabled={gameActive}
                      className="px-2 py-1 text-xs bg-[#1e2a36] hover:bg-[#2a3a4a] rounded text-gray-300 disabled:opacity-50 transition-colors"
                    >
                      2×
                    </button>
                    <button
                      onClick={() => adjustBet("max")}
                      disabled={gameActive}
                      className="px-2 py-1 text-xs bg-[#1e2a36] hover:bg-[#2a3a4a] rounded text-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                  Difficulty
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => !gameActive && setDifficulty(d)}
                      disabled={gameActive}
                      className={`py-2 rounded-lg text-xs font-bold transition-all uppercase ${
                        difficulty === d
                          ? d === "easy"
                            ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                            : d === "medium"
                            ? "bg-yellow-600 text-white shadow-lg shadow-yellow-600/30"
                            : d === "hard"
                            ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                            : "bg-red-600 text-white shadow-lg shadow-red-600/30"
                          : "bg-[#0a0e13] text-gray-500 hover:bg-[#1e2a36] disabled:opacity-50"
                      }`}
                    >
                      {DIFFICULTY_CONFIG[d].label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Collision chance</span>
                  <span
                    className={`font-bold ${
                      difficulty === "easy"
                        ? "text-green-400"
                        : difficulty === "medium"
                        ? "text-yellow-400"
                        : difficulty === "hard"
                        ? "text-orange-400"
                        : "text-red-400"
                    }`}
                  >
                    {getCollisionChance(difficulty)}%
                  </span>
                </div>
              </div>

              {/* Game Stats (During Game) */}
              {gameActive && !gameOver && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center p-3 bg-[#0a0e13] rounded-lg">
                    <span className="text-gray-400 text-sm">Step</span>
                    <span className="text-white font-bold">
                      {currentColumn + 1} / {ROAD_COLUMNS}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#0a0e13] rounded-lg">
                    <span className="text-gray-400 text-sm">Multiplier</span>
                    <span className="text-green-400 font-bold text-lg">
                      {currentMultiplier.toFixed(2)}×
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#0a0e13] rounded-lg">
                    <span className="text-gray-400 text-sm">Next step</span>
                    <span className="text-yellow-400 font-bold">
                      {nextStepMultiplier.toFixed(2)}×
                    </span>
                  </div>

                  {profit > 0 && (
                    <div className="flex justify-between items-center p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <span className="text-green-400 text-sm">Profit</span>
                      <span className="text-green-400 font-bold">
                        +{profit.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {isLocked && !gameActive ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-xl text-center">
                    <Lock className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-red-400 text-sm font-semibold">Free games used up!</p>
                    <p className="text-gray-500 text-xs mt-1">Register to play unlimited</p>
                  </div>
                  <Link href="/auth/register">
                    <Button className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl">
                      Register to Play More
                    </Button>
                  </Link>
                </div>
              ) : !gameActive ? (
                <Button
                  onClick={startGame}
                  disabled={betAmount <= 0 || betAmount > balance}
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl transition-all hover:shadow-lg hover:shadow-green-600/30"
                >
                  <span className="mr-2 text-xl">🐔</span>
                  Play ({freeGamesLeft} free)
                </Button>
              ) : gameOver ? (
                <Button
                  onClick={newGame}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl"
                >
                  New Game
                </Button>
              ) : (
                <Button
                  onClick={cashout}
                  disabled={currentWin === 0}
                  className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-bold text-lg rounded-xl transition-all hover:shadow-lg hover:shadow-green-600/30"
                >
                  {currentWin > 0 ? (
                    `Cash Out ${currentWin.toLocaleString()}`
                  ) : (
                    "Pick a tile to start"
                  )}
                </Button>
              )}
            </div>

            {/* Multiplier Table */}
            {!gameActive && (
              <div className="bg-[#141b24] rounded-xl p-4 border border-[#1e2a36]">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Multiplier Table
                </h3>
                <div className="space-y-1">
                  {multiplierTable.map((mult, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-[#0a0e13] transition-colors"
                    >
                      <span className="text-gray-400">Step {i + 1}</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {mult.toFixed(2)}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Game Board */}
          <div className="flex-1">
            <div className="bg-[#141b24] rounded-xl p-4 sm:p-6 min-h-[500px] border border-[#1e2a36] relative overflow-hidden">
              {/* Road Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-white"
                    style={{ top: `${(i + 1) * (100 / 7)}%` }}
                  />
                ))}
              </div>

              {!gameActive ? (
                /* Pre-game state */
                <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[450px]">
                  <div className="text-7xl mb-6 animate-bounce">🐔</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Chicken Road
                  </h2>
                  <p className="text-gray-400 text-center max-w-md mb-6">
                    Guide the chicken across 10 dangerous columns. Pick safe
                    tiles to increase your multiplier. Cash out anytime or risk
                    it all!
                  </p>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-400">98%</p>
                      <p className="text-xs text-gray-500 uppercase">RTP</p>
                    </div>
                    <div className="w-px bg-[#1e2a36]" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">
                        {multiplierTable[ROAD_COLUMNS - 1].toFixed(0)}×
                      </p>
                      <p className="text-xs text-gray-500 uppercase">Max Win</p>
                    </div>
                    <div className="w-px bg-[#1e2a36]" />
                    <div>
                      <p className="text-2xl font-bold text-purple-400">10</p>
                      <p className="text-xs text-gray-500 uppercase">Steps</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active game board */
                <div className="relative z-10">
                  {/* Game Over Overlay */}
                  {gameOver && (
                    <div
                      className={`text-center mb-4 p-4 rounded-xl border ${
                        won
                          ? "bg-green-900/20 border-green-500/30"
                          : "bg-red-900/20 border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {won ? (
                          <Trophy className="w-6 h-6 text-green-400" />
                        ) : (
                          <Skull className="w-6 h-6 text-red-400" />
                        )}
                        <p
                          className={`text-2xl font-bold ${
                            won ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {won
                            ? `+${currentWin.toLocaleString()} tokens`
                            : "Game Over!"}
                        </p>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {won
                          ? `${currentColumn + 1} steps at ${currentMultiplier.toFixed(2)}×`
                          : "The chicken hit a bone! 💀"}
                      </p>
                    </div>
                  )}

                  {/* Road Grid */}
                  <div className="overflow-x-auto pb-2">
                    <div
                      className="grid gap-2 min-w-[600px]"
                      style={{
                        gridTemplateColumns: `40px repeat(${ROAD_COLUMNS}, 1fr)`,
                      }}
                    >
                      {/* Row labels */}
                      {Array.from({ length: TILES_PER_COLUMN }).map((_, row) => (
                        <div
                          key={`label-${row}`}
                          className="flex items-center justify-center text-gray-600 text-xs font-mono"
                          style={{ gridColumn: 1, gridRow: row + 1 }}
                        >
                          {row + 1}
                        </div>
                      ))}

                      {/* Tiles */}
                      {Array.from({ length: ROAD_COLUMNS }).map((_, col) =>
                        Array.from({ length: TILES_PER_COLUMN }).map((_, row) => {
                          const tile = grid[col][row];
                          const isNextColumn = col === currentColumn + 1;
                          const isPastColumn = col <= currentColumn;
                          const isClickable =
                            isNextColumn && !gameOver;
                          const showMultiplier =
                            col <= currentColumn && !tile.isBone;

                          return (
                            <button
                              key={`${col}-${row}`}
                              onClick={() => isClickable && takeStep(row)}
                              disabled={!isClickable}
                              style={{
                                gridColumn: col + 2,
                                gridRow: row + 1,
                              }}
                              className={`
                                aspect-square rounded-lg flex items-center justify-center
                                transition-all duration-200 transform text-sm font-bold
                                ${
                                  tile.revealed && tile.isBone
                                    ? tile.isChosen
                                      ? "bg-gradient-to-br from-red-600 to-red-800 scale-95 ring-2 ring-red-400 shadow-lg shadow-red-600/40"
                                      : "bg-gradient-to-br from-red-900/60 to-red-950/60 scale-95"
                                    : tile.revealed && tile.isSafe
                                    ? "bg-gradient-to-br from-green-500 to-green-700 scale-100 shadow-lg shadow-green-500/20"
                                    : isClickable
                                    ? `bg-gradient-to-br from-[#1e3a4f] to-[#162a3a] 
                                       hover:from-[#2a5060] hover:to-[#1e4050]
                                       hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20
                                       active:scale-95 cursor-pointer
                                       border border-cyan-900/30 hover:border-cyan-500/50`
                                    : isPastColumn && !tile.revealed
                                    ? "bg-[#0d1218] opacity-40"
                                    : "bg-gradient-to-br from-[#151e28] to-[#111920] border border-[#1e2a36]/50"
                                }
                                disabled:cursor-default disabled:hover:scale-100
                              `}
                            >
                              {tile.revealed && tile.isBone ? (
                                <span className="text-lg">🦴</span>
                              ) : tile.revealed && tile.isSafe ? (
                                <span className="text-lg">🐔</span>
                              ) : isClickable ? (
                                <span className="text-gray-500 text-lg opacity-50">?</span>
                              ) : showMultiplier ? null : (
                                <div className="w-2 h-2 rounded-full bg-[#1e2a36]" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Multiplier Bar below grid */}
                  <div
                    className="grid gap-2 mt-2 min-w-[600px]"
                    style={{
                      gridTemplateColumns: `40px repeat(${ROAD_COLUMNS}, 1fr)`,
                    }}
                  >
                    <div />
                    {multiplierTable.map((mult, col) => {
                      const isCompleted = col <= currentColumn;
                      const isNext = col === currentColumn + 1;
                      return (
                        <div
                          key={col}
                          className={`text-center text-xs font-mono font-bold py-1.5 rounded-lg transition-all ${
                            isCompleted && !hitBone
                              ? "text-green-400 bg-green-900/20"
                              : isCompleted && hitBone && col === currentColumn
                              ? "text-red-400 bg-red-900/20"
                              : isNext && !gameOver
                              ? "text-cyan-400 bg-cyan-900/20 animate-pulse"
                              : "text-gray-600"
                          }`}
                        >
                          {mult.toFixed(2)}×
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e2a36] text-sm min-w-[600px]">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        💰 {betAmount.toLocaleString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          difficulty === "easy"
                            ? "bg-green-900/30 text-green-400"
                            : difficulty === "medium"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : difficulty === "hard"
                            ? "bg-orange-900/30 text-orange-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {DIFFICULTY_CONFIG[difficulty].label}
                      </span>
                      <span className="text-gray-500">
                        Max {multiplierTable[ROAD_COLUMNS - 1].toFixed(0)}×
                      </span>
                    </div>
                    {!gameOver && currentColumn >= 0 && (
                      <span className="text-green-400 font-semibold">
                        {currentMultiplier.toFixed(2)}× multiplier
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
