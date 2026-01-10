/**
 * Big Bass Bonanza - 5×3 Fishing Slot by Pragmatic Play Style
 * 
 * Theme: Fishing / Lake life / Lighthearted outdoor fun
 * Core mechanics:
 * - 5×3 grid with 10 paylines
 * - Fish Scatter: 3/4/5 triggers 10/15/20 Free Spins
 * - Fisherman Wild: Only appears during Free Spins, collects Money Fish values
 * - Money Fish: Fish symbols with cash values (2x-2000x) during Free Spins
 * - Multiplier Boost: Every 4 Fisherman wilds collected = +1x multiplier
 * - Max Win: 2,100x stake
 * 
 * RTP: ~96.71%
 */

export type BassSymbol =
  | "ten"          // 10 - lowest
  | "jack"         // J
  | "queen"        // Q
  | "king"         // K
  | "ace"          // A
  | "tackleBox"    // Tackle Box - medium
  | "floater"      // Floater/Bobber
  | "dragonfly"    // Dragonfly
  | "fishingRod"   // Fishing Rod
  | "blueFish"     // Blue Fish - high
  | "greenFish"    // Green Fish
  | "yellowFish"   // Yellow/Gold Fish - highest regular
  | "scatter"      // Hooked Fish - triggers free spins
  | "fisherman";   // Fisherman Wild - only in free spins

export interface MoneyFish {
  position: [number, number];
  value: number; // Multiplier of bet (2x - 2000x)
}

export interface BigBassBonanzaResult {
  grid: BassSymbol[][];
  paylineWins: PaylineWin[];
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  scatterPositions: [number, number][];
  isFreeSpinMode: boolean;
  moneyFish: MoneyFish[];
  fishermanPositions: [number, number][];
  collectedValue: number;
  currentMultiplier: number;
  fishermenCollected: number;
}

export interface PaylineWin {
  paylineIndex: number;
  symbol: BassSymbol;
  count: number;
  positions: [number, number][];
  multiplier: number;
  win: bigint;
}

// 10 Paylines for 5x3 grid (positions are [col, row] where row 0 is top)
export const PAYLINES: [number, number][][] = [
  [[0,1], [1,1], [2,1], [3,1], [4,1]], // Line 1: Middle row
  [[0,0], [1,0], [2,0], [3,0], [4,0]], // Line 2: Top row
  [[0,2], [1,2], [2,2], [3,2], [4,2]], // Line 3: Bottom row
  [[0,0], [1,1], [2,2], [3,1], [4,0]], // Line 4: V shape
  [[0,2], [1,1], [2,0], [3,1], [4,2]], // Line 5: Inverted V
  [[0,0], [1,0], [2,1], [3,2], [4,2]], // Line 6: Descending stairs
  [[0,2], [1,2], [2,1], [3,0], [4,0]], // Line 7: Ascending stairs
  [[0,1], [1,0], [2,0], [3,0], [4,1]], // Line 8: Top plateau
  [[0,1], [1,2], [2,2], [3,2], [4,1]], // Line 9: Bottom plateau
  [[0,1], [1,0], [2,1], [3,2], [4,1]], // Line 10: Zigzag
];

// Symbol payouts for 3, 4, 5 of a kind (multiplier of line bet)
export const SYMBOL_PAYOUTS: Record<BassSymbol, number[]> = {
  ten:        [0.5,  1,    2.5],
  jack:       [0.5,  1,    2.5],
  queen:      [0.5,  1.5,  3],
  king:       [0.5,  1.5,  3],
  ace:        [0.5,  2,    4],
  tackleBox:  [1,    2.5,  5],
  floater:    [1,    2.5,  5],
  dragonfly:  [1.5,  4,    7.5],
  fishingRod: [2,    5,    10],
  blueFish:   [3,    7.5,  15],
  greenFish:  [4,    10,   20],
  yellowFish: [5,    15,   30],
  scatter:    [0, 0, 0], // Scatter pays differently
  fisherman:  [0, 0, 0], // Wild doesn't pay by itself, substitutes
};

// Symbol weights for base game (higher = more common)
export const BASE_SYMBOL_WEIGHTS: Record<BassSymbol, number> = {
  ten:        20,
  jack:       20,
  queen:      18,
  king:       18,
  ace:        16,
  tackleBox:  10,
  floater:    10,
  dragonfly:  8,
  fishingRod: 6,
  blueFish:   4,
  greenFish:  3,
  yellowFish: 2,
  scatter:    3,
  fisherman:  0, // No fisherman in base game
};

// Symbol weights for free spins (fisherman can appear)
export const FREE_SPIN_SYMBOL_WEIGHTS: Record<BassSymbol, number> = {
  ten:        18,
  jack:       18,
  queen:      16,
  king:       16,
  ace:        14,
  tackleBox:  9,
  floater:    9,
  dragonfly:  7,
  fishingRod: 5,
  blueFish:   4,
  greenFish:  3,
  yellowFish: 2,
  scatter:    2,
  fisherman:  4, // Fisherman appears in free spins!
};

// Money Fish values (multiplier of total bet) and their weights
export const MONEY_FISH_VALUES = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000, 2000];
export const MONEY_FISH_WEIGHTS = [30, 25, 22, 20, 18, 15, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1, 0.6, 0.3, 0.08, 0.02];

const GRID_COLS = 5;
const GRID_ROWS = 3;
const SCATTERS_FOR_FREE_SPINS = 3;
const FREE_SPINS_BASE = 10;
const FISHERMEN_FOR_RETRIGGER = 4;

// Non-paying symbols for payline evaluation
const NON_PAYING_SYMBOLS: BassSymbol[] = ["scatter", "fisherman"];

function getRandomSymbol(random: number, isFreeSpinMode: boolean): BassSymbol {
  const weights = isFreeSpinMode ? FREE_SPIN_SYMBOL_WEIGHTS : BASE_SYMBOL_WEIGHTS;
  const symbols = Object.keys(weights) as BassSymbol[];
  const totalWeight = symbols.reduce((sum, s) => sum + weights[s], 0);
  
  let threshold = random * totalWeight;
  for (const symbol of symbols) {
    threshold -= weights[symbol];
    if (threshold <= 0) return symbol;
  }
  return symbols[0];
}

function getRandomMoneyValue(random: number): number {
  const totalWeight = MONEY_FISH_WEIGHTS.reduce((a, b) => a + b, 0);
  let threshold = random * totalWeight;
  
  for (let i = 0; i < MONEY_FISH_VALUES.length; i++) {
    threshold -= MONEY_FISH_WEIGHTS[i];
    if (threshold <= 0) return MONEY_FISH_VALUES[i];
  }
  return MONEY_FISH_VALUES[0];
}

export function generateGrid(randomFn: () => number, isFreeSpinMode: boolean): BassSymbol[][] {
  const grid: BassSymbol[][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const column: BassSymbol[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      column.push(getRandomSymbol(randomFn(), isFreeSpinMode));
    }
    grid.push(column);
  }
  return grid;
}

function countScatters(grid: BassSymbol[][]): { count: number; positions: [number, number][] } {
  const positions: [number, number][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row] === "scatter") {
        positions.push([col, row]);
      }
    }
  }
  return { count: positions.length, positions };
}

function findFishermanPositions(grid: BassSymbol[][]): [number, number][] {
  const positions: [number, number][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row] === "fisherman") {
        positions.push([col, row]);
      }
    }
  }
  return positions;
}

function generateMoneyFish(
  grid: BassSymbol[][], 
  randomFn: () => number, 
  isFreeSpinMode: boolean
): MoneyFish[] {
  if (!isFreeSpinMode) return [];
  
  const moneyFish: MoneyFish[] = [];
  const fishSymbols: BassSymbol[] = ["blueFish", "greenFish", "yellowFish"];
  
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (fishSymbols.includes(grid[col][row])) {
        // 70% chance fish becomes a money fish in free spins
        if (randomFn() < 0.70) {
          moneyFish.push({
            position: [col, row],
            value: getRandomMoneyValue(randomFn()),
          });
        }
      }
    }
  }
  return moneyFish;
}

function evaluatePaylines(
  grid: BassSymbol[][],
  betPerLine: bigint,
  isFreeSpinMode: boolean
): PaylineWin[] {
  const wins: PaylineWin[] = [];
  
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const payline = PAYLINES[lineIndex];
    const symbols = payline.map(([col, row]) => grid[col][row]);
    
    // Get first non-wild symbol (wilds only appear in free spins)
    let baseSymbol: BassSymbol | null = null;
    for (const symbol of symbols) {
      if (symbol !== "fisherman" && !NON_PAYING_SYMBOLS.includes(symbol)) {
        baseSymbol = symbol;
        break;
      }
    }
    
    if (!baseSymbol) continue;
    
    // Count consecutive matches from left (wilds substitute)
    let count = 0;
    const positions: [number, number][] = [];
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const isWild = symbol === "fisherman" && isFreeSpinMode;
      const isMatch = symbol === baseSymbol || isWild;
      
      if (isMatch) {
        count++;
        positions.push(payline[i]);
      } else {
        break;
      }
    }
    
    // Need at least 3 matching symbols for a win
    if (count >= 3) {
      const payoutIndex = count - 3; // 0 for 3, 1 for 4, 2 for 5
      const multiplier = SYMBOL_PAYOUTS[baseSymbol][payoutIndex] || 0;
      
      if (multiplier > 0) {
        const win = BigInt(Math.floor(Number(betPerLine) * multiplier));
        wins.push({
          paylineIndex: lineIndex,
          symbol: baseSymbol,
          count,
          positions,
          multiplier,
          win,
        });
      }
    }
  }
  
  return wins;
}

export function playBigBassBonanza(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  existingMultiplier: number = 1,
  existingFishermenCollected: number = 0
): BigBassBonanzaResult {
  const grid = generateGrid(randomFn, isFreeSpinMode);
  const betPerLine = betAmount / BigInt(PAYLINES.length);
  
  // Count scatters
  const scatterResult = countScatters(grid);
  
  // Calculate free spins won
  let freeSpinsWon = 0;
  if (scatterResult.count >= SCATTERS_FOR_FREE_SPINS) {
    if (scatterResult.count === 3) freeSpinsWon = FREE_SPINS_BASE;      // 10
    else if (scatterResult.count === 4) freeSpinsWon = FREE_SPINS_BASE + 5; // 15
    else if (scatterResult.count >= 5) freeSpinsWon = FREE_SPINS_BASE + 10;  // 20
  }
  
  // Find fisherman positions (only relevant in free spins)
  const fishermanPositions = findFishermanPositions(grid);
  
  // Generate money fish (only in free spins)
  const moneyFish = generateMoneyFish(grid, randomFn, isFreeSpinMode);
  
  // Calculate collected value from money fish (if fisherman present)
  let collectedValue = 0;
  let fishermenCollected = existingFishermenCollected;
  let currentMultiplier = existingMultiplier;
  
  if (isFreeSpinMode && fishermanPositions.length > 0 && moneyFish.length > 0) {
    // Fisherman collects all money fish values
    const baseCollection = moneyFish.reduce((sum, mf) => sum + mf.value, 0);
    // Multiple fishermen multiply the collection!
    collectedValue = baseCollection * fishermanPositions.length;
    
    // Track fishermen for multiplier boost
    fishermenCollected += fishermanPositions.length;
    
    // Every 4 fishermen collected = +1x multiplier boost
    const multiplierBoosts = Math.floor(fishermenCollected / FISHERMEN_FOR_RETRIGGER);
    currentMultiplier = 1 + multiplierBoosts;
    
    // Check for retrigger (every 4 fishermen = +10 free spins)
    const newBoosts = Math.floor(fishermenCollected / FISHERMEN_FOR_RETRIGGER) - 
                      Math.floor(existingFishermenCollected / FISHERMEN_FOR_RETRIGGER);
    if (newBoosts > 0) {
      freeSpinsWon += newBoosts * 10;
    }
  }
  
  // Evaluate payline wins
  const paylineWins = evaluatePaylines(grid, betPerLine, isFreeSpinMode);
  
  // Calculate total win
  let totalWin = BigInt(0);
  
  // Add payline wins
  for (const win of paylineWins) {
    totalWin += win.win;
  }
  
  // Add collected money fish value (multiplied by bet and current multiplier)
  if (collectedValue > 0) {
    const fishWin = BigInt(Math.floor(Number(betAmount) * collectedValue * currentMultiplier));
    totalWin += fishWin;
  }
  
  // Apply multiplier to payline wins in free spins
  if (isFreeSpinMode && currentMultiplier > 1) {
    const bonusFromMultiplier = BigInt(Math.floor(Number(totalWin) * (currentMultiplier - 1)));
    totalWin += bonusFromMultiplier;
  }
  
  // Scatter pays (based on total bet)
  if (scatterResult.count >= 3) {
    const scatterMultiplier = scatterResult.count === 3 ? 2 : 
                              scatterResult.count === 4 ? 20 : 200;
    totalWin += betAmount * BigInt(scatterMultiplier);
  }
  
  return {
    grid,
    paylineWins,
    totalWin,
    freeSpinsWon,
    scatterCount: scatterResult.count,
    scatterPositions: scatterResult.positions,
    isFreeSpinMode,
    moneyFish,
    fishermanPositions,
    collectedValue,
    currentMultiplier,
    fishermenCollected,
  };
}

export function serializeBigBassBonanzaResult(result: BigBassBonanzaResult): object {
  return {
    ...result,
    totalWin: result.totalWin.toString(),
    paylineWins: result.paylineWins.map(pw => ({
      ...pw,
      win: pw.win.toString(),
    })),
  };
}

// Symbol emoji mapping for frontend
export const SYMBOL_EMOJIS: Record<BassSymbol, string> = {
  ten:        "🔟",
  jack:       "🃏",
  queen:      "👸",
  king:       "🤴",
  ace:        "🅰️",
  tackleBox:  "🧰",
  floater:    "🔴",
  dragonfly:  "🪰",
  fishingRod: "🎣",
  blueFish:   "🐟",
  greenFish:  "🐠",
  yellowFish: "🐡",
  scatter:    "🪝",
  fisherman:  "🧔",
};

// Symbol display names
export const SYMBOL_NAMES: Record<BassSymbol, string> = {
  ten:        "Ten",
  jack:       "Jack",
  queen:      "Queen",
  king:       "King",
  ace:        "Ace",
  tackleBox:  "Tackle Box",
  floater:    "Floater",
  dragonfly:  "Dragonfly",
  fishingRod: "Fishing Rod",
  blueFish:   "Blue Bass",
  greenFish:  "Green Bass",
  yellowFish: "Golden Bass",
  scatter:    "Hooked Fish",
  fisherman:  "Fisherman",
};

export const BIG_BASS_BONANZA_RTP = 0.9671;
export const BIG_BASS_BONANZA_HOUSE_EDGE = 0.0329;
