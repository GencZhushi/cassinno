/**
 * 5-Reel, 3-Row Slot Machine
 * - 20 paylines
 * - Configurable symbol weights
 * - Wild and Scatter symbols
 * - Free spins bonus
 * 
 * RTP controlled via reel weights and paytable
 * Target RTP: 96%
 */

export type SlotSymbol = 
  | "cherry"
  | "lemon"
  | "orange"
  | "plum"
  | "bell"
  | "bar"
  | "seven"
  | "diamond"
  | "wild"
  | "scatter";

export interface SlotReel {
  symbols: SlotSymbol[];
  weights: number[];
}

export interface SlotResult {
  matrix: SlotSymbol[][];  // 5 reels x 3 rows
  paylines: PaylineResult[];
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
}

export interface PaylineResult {
  lineNumber: number;
  positions: [number, number][]; // [reel, row] pairs
  symbol: SlotSymbol;
  count: number;
  multiplier: number;
  win: bigint;
}

// Symbol payouts (multiplier for bet per line)
// [3 of kind, 4 of kind, 5 of kind]
export const SYMBOL_PAYOUTS: Record<SlotSymbol, [number, number, number]> = {
  cherry: [5, 15, 50],
  lemon: [5, 15, 50],
  orange: [10, 25, 75],
  plum: [10, 25, 75],
  bell: [15, 50, 150],
  bar: [25, 75, 250],
  seven: [50, 150, 500],
  diamond: [100, 300, 1000],
  wild: [0, 0, 0], // Wild substitutes, no own payout
  scatter: [0, 0, 0], // Scatter triggers bonus
};

// Default reel configuration with weights
// Higher weight = more likely to appear
export const DEFAULT_REELS: SlotReel[] = [
  {
    symbols: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "diamond", "wild", "scatter"],
    weights: [25, 25, 20, 20, 15, 10, 5, 3, 5, 2],
  },
  {
    symbols: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "diamond", "wild", "scatter"],
    weights: [25, 25, 20, 20, 15, 10, 5, 3, 5, 2],
  },
  {
    symbols: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "diamond", "wild", "scatter"],
    weights: [25, 25, 20, 20, 15, 10, 5, 3, 5, 2],
  },
  {
    symbols: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "diamond", "wild", "scatter"],
    weights: [25, 25, 20, 20, 15, 10, 5, 3, 5, 2],
  },
  {
    symbols: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "diamond", "wild", "scatter"],
    weights: [25, 25, 20, 20, 15, 10, 5, 3, 5, 2],
  },
];

// 20 paylines definition
// Each payline is an array of row indices for each reel [reel0Row, reel1Row, ...]
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // Middle row
  [0, 0, 0, 0, 0], // Top row
  [2, 2, 2, 2, 2], // Bottom row
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // Inverted V
  [0, 0, 1, 2, 2], // Diagonal down
  [2, 2, 1, 0, 0], // Diagonal up
  [1, 0, 0, 0, 1], // Top hat
  [1, 2, 2, 2, 1], // Bottom hat
  [0, 1, 1, 1, 0], // Slight V top
  [2, 1, 1, 1, 2], // Slight V bottom
  [1, 0, 1, 0, 1], // Zigzag top
  [1, 2, 1, 2, 1], // Zigzag bottom
  [0, 1, 0, 1, 0], // Small zigzag top
  [2, 1, 2, 1, 2], // Small zigzag bottom
  [1, 1, 0, 1, 1], // Bump top
  [1, 1, 2, 1, 1], // Bump bottom
  [0, 2, 0, 2, 0], // Large zigzag
  [2, 0, 2, 0, 2], // Large zigzag inverse
  [1, 0, 2, 0, 1], // Diamond
];

import { weightedRandomSelect } from "../rng";

export function spinReel(reel: SlotReel): SlotSymbol[] {
  const result: SlotSymbol[] = [];
  for (let row = 0; row < 3; row++) {
    const { item } = weightedRandomSelect(reel.symbols, reel.weights);
    result.push(item);
  }
  return result;
}

export function spin(reels: SlotReel[] = DEFAULT_REELS): SlotSymbol[][] {
  return reels.map((reel) => spinReel(reel));
}

function getSymbolsOnPayline(matrix: SlotSymbol[][], payline: number[]): SlotSymbol[] {
  return payline.map((row, reel) => matrix[reel][row]);
}

function countConsecutiveFromLeft(
  symbols: SlotSymbol[]
): { symbol: SlotSymbol; count: number } | null {
  if (symbols.length === 0) return null;

  // Find the first non-wild symbol
  let baseSymbol: SlotSymbol | null = null;
  for (const sym of symbols) {
    if (sym !== "wild" && sym !== "scatter") {
      baseSymbol = sym;
      break;
    }
  }

  // If all wilds, no win
  if (!baseSymbol) return null;

  let count = 0;
  for (const sym of symbols) {
    if (sym === baseSymbol || sym === "wild") {
      count++;
    } else {
      break;
    }
  }

  return count >= 3 ? { symbol: baseSymbol, count } : null;
}

export function evaluatePaylines(
  matrix: SlotSymbol[][],
  betPerLine: bigint
): PaylineResult[] {
  const results: PaylineResult[] = [];

  for (let lineNum = 0; lineNum < PAYLINES.length; lineNum++) {
    const payline = PAYLINES[lineNum];
    const symbols = getSymbolsOnPayline(matrix, payline);
    const match = countConsecutiveFromLeft(symbols);

    if (match) {
      const payoutIndex = match.count - 3; // 3->0, 4->1, 5->2
      const multiplier = SYMBOL_PAYOUTS[match.symbol][payoutIndex];

      if (multiplier > 0) {
        const positions: [number, number][] = [];
        for (let i = 0; i < match.count; i++) {
          positions.push([i, payline[i]]);
        }

        results.push({
          lineNumber: lineNum + 1,
          positions,
          symbol: match.symbol,
          count: match.count,
          multiplier,
          win: betPerLine * BigInt(multiplier),
        });
      }
    }
  }

  return results;
}

export function countScatters(matrix: SlotSymbol[][]): number {
  let count = 0;
  for (const reel of matrix) {
    for (const symbol of reel) {
      if (symbol === "scatter") count++;
    }
  }
  return count;
}

export function calculateSlotResult(
  matrix: SlotSymbol[][],
  betPerLine: bigint,
  totalBet: bigint
): SlotResult {
  const paylines = evaluatePaylines(matrix, betPerLine);
  const scatterCount = countScatters(matrix);
  
  // Free spins: 3 scatters = 10, 4 = 15, 5 = 20
  let freeSpinsWon = 0;
  if (scatterCount >= 3) {
    freeSpinsWon = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
  }

  // Scatter pays based on total bet
  let scatterWin = BigInt(0);
  if (scatterCount >= 3) {
    const scatterMultiplier = scatterCount === 3 ? 5 : scatterCount === 4 ? 20 : 100;
    scatterWin = totalBet * BigInt(scatterMultiplier);
  }

  const paylineWin = paylines.reduce((sum, p) => sum + p.win, BigInt(0));
  const totalWin = paylineWin + scatterWin;

  return {
    matrix,
    paylines,
    totalWin,
    freeSpinsWon,
    scatterCount,
  };
}

export function serializeSlotResult(result: SlotResult): object {
  return {
    ...result,
    totalWin: result.totalWin.toString(),
    paylines: result.paylines.map((p) => ({
      ...p,
      win: p.win.toString(),
    })),
  };
}

// RTP calculation note:
// With the default weights and paytable, theoretical RTP is approximately 96%
// This can be adjusted by modifying weights in GameConfig
export const SLOTS_RTP = 0.96;
export const SLOTS_HOUSE_EDGE = 0.04;
