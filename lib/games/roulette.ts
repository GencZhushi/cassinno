/**
 * European Roulette (Single Zero)
 * Numbers: 0-36
 * 
 * Payouts:
 * - Straight (single number): 35:1
 * - Split (2 numbers): 17:1
 * - Street (3 numbers): 11:1
 * - Corner (4 numbers): 8:1
 * - Line (6 numbers): 5:1
 * - Dozen/Column (12 numbers): 2:1
 * - Even-money (red/black, odd/even, high/low): 1:1
 */

export type RouletteBetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "dozen"
  | "column"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "high"
  | "low";

export interface RouletteBet {
  type: RouletteBetType;
  numbers: number[];
  amount: bigint;
}

export interface RouletteResult {
  winningNumber: number;
  color: "red" | "black" | "green";
  isEven: boolean;
  isHigh: boolean;
  dozen: 1 | 2 | 3 | null;
  column: 1 | 2 | 3 | null;
}

export interface RoulettePayout {
  bet: RouletteBet;
  won: boolean;
  payout: bigint;
  multiplier: number;
}

// Red numbers on European roulette wheel
export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Payout multipliers (not including original bet return)
export const PAYOUTS: Record<RouletteBetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  high: 1,
  low: 1,
};

export function getRouletteResult(winningNumber: number): RouletteResult {
  const color: "red" | "black" | "green" =
    winningNumber === 0
      ? "green"
      : RED_NUMBERS.includes(winningNumber)
      ? "red"
      : "black";

  const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
  const isHigh = winningNumber >= 19 && winningNumber <= 36;

  let dozen: 1 | 2 | 3 | null = null;
  if (winningNumber >= 1 && winningNumber <= 12) dozen = 1;
  else if (winningNumber >= 13 && winningNumber <= 24) dozen = 2;
  else if (winningNumber >= 25 && winningNumber <= 36) dozen = 3;

  let column: 1 | 2 | 3 | null = null;
  if (winningNumber !== 0) {
    const mod = winningNumber % 3;
    column = mod === 1 ? 1 : mod === 2 ? 2 : 3;
  }

  return {
    winningNumber,
    color,
    isEven,
    isHigh,
    dozen,
    column,
  };
}

export function checkBetWin(bet: RouletteBet, result: RouletteResult): boolean {
  const { winningNumber } = result;

  switch (bet.type) {
    case "straight":
    case "split":
    case "street":
    case "corner":
    case "line":
      return bet.numbers.includes(winningNumber);

    case "dozen":
      if (winningNumber === 0) return false;
      const dozenNum = bet.numbers[0];
      if (dozenNum === 1) return winningNumber >= 1 && winningNumber <= 12;
      if (dozenNum === 2) return winningNumber >= 13 && winningNumber <= 24;
      if (dozenNum === 3) return winningNumber >= 25 && winningNumber <= 36;
      return false;

    case "column":
      if (winningNumber === 0) return false;
      const colNum = bet.numbers[0];
      const mod = winningNumber % 3;
      if (colNum === 1) return mod === 1;
      if (colNum === 2) return mod === 2;
      if (colNum === 3) return mod === 0;
      return false;

    case "red":
      return result.color === "red";

    case "black":
      return result.color === "black";

    case "even":
      return winningNumber !== 0 && result.isEven;

    case "odd":
      return winningNumber !== 0 && !result.isEven;

    case "high":
      return result.isHigh;

    case "low":
      return winningNumber >= 1 && winningNumber <= 18;

    default:
      return false;
  }
}

export function calculatePayout(bet: RouletteBet, result: RouletteResult): RoulettePayout {
  const won = checkBetWin(bet, result);
  const multiplier = PAYOUTS[bet.type];
  
  // Payout includes original bet + winnings
  const payout = won ? bet.amount + bet.amount * BigInt(multiplier) : BigInt(0);

  return {
    bet,
    won,
    payout,
    multiplier: won ? multiplier + 1 : 0, // Total return multiplier
  };
}

export function calculateTotalPayout(bets: RouletteBet[], result: RouletteResult): {
  totalBet: bigint;
  totalWin: bigint;
  netResult: bigint;
  payouts: RoulettePayout[];
} {
  const payouts = bets.map((bet) => calculatePayout(bet, result));
  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, BigInt(0));
  const totalWin = payouts.reduce((sum, p) => sum + p.payout, BigInt(0));

  return {
    totalBet,
    totalWin,
    netResult: totalWin - totalBet,
    payouts,
  };
}

// Validate bet structure
export function validateRouletteBet(bet: { type: RouletteBetType; numbers: number[] }): boolean {
  const { type, numbers } = bet;

  // Validate all numbers are in range
  if (numbers.some((n) => n < 0 || n > 36)) return false;

  switch (type) {
    case "straight":
      return numbers.length === 1;
    case "split":
      return numbers.length === 2;
    case "street":
      return numbers.length === 3;
    case "corner":
      return numbers.length === 4;
    case "line":
      return numbers.length === 6;
    case "dozen":
      return numbers.length === 1 && [1, 2, 3].includes(numbers[0]);
    case "column":
      return numbers.length === 1 && [1, 2, 3].includes(numbers[0]);
    case "red":
    case "black":
    case "even":
    case "odd":
    case "high":
    case "low":
      return numbers.length === 0;
    default:
      return false;
  }
}

// RTP for European Roulette: 97.3% (house edge 2.7%)
export const ROULETTE_RTP = 0.973;
export const ROULETTE_HOUSE_EDGE = 0.027;
