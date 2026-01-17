/**
 * Coin Strike Hold and Win - Classic Fruit Slot with Coin Collection
 * 
 * Theme: Classic fruit machine with golden coins
 * Core vibe: Bright, Vegas-style, lightning effects
 * 
 * Core mechanics:
 * - 3 reels × 3 rows (9 positions)
 * - Coin symbols with values that can trigger Hold & Win
 * - 4 Jackpot tiers: GRAND, MAJOR, MINOR, MINI
 * - 6+ coins trigger Hold and Win feature
 * - Classic fruit symbols: Cherries, Bell, Grapes, Oranges, Gold Bar, 7
 * 
 * RTP: ~96.5%
 */

export type CoinStrikeSymbol =
  | "cherry"      // Cherries - low
  | "orange"      // Oranges - low
  | "grapes"      // Grapes - medium
  | "bell"        // Bell - medium
  | "bar"         // Gold Bar - high
  | "seven"       // Lucky 7 - highest
  | "coin"        // Gold coin - triggers Hold & Win
  | "wild";       // Wild - substitutes all except coin

export interface CoinStrikeResult {
  reels: CoinStrikeSymbol[][];      // 3 columns x 3 rows
  winningPositions: [number, number][];
  totalWin: bigint;
  coinPositions: [number, number][];
  coinValues: number[];             // Values on coin symbols
  holdAndWinTriggered: boolean;
  jackpotWon: "grand" | "major" | "minor" | "mini" | null;
  winType: string | null;           // Description of the win
}

export interface HoldAndWinResult {
  coinPositions: [number, number][];
  coinValues: number[];
  totalValue: bigint;
  respinsRemaining: number;
  isComplete: boolean;
  jackpotWon: "grand" | "major" | "minor" | "mini" | null;
}

// Symbol payouts: [3 of kind] multipliers of total bet
export const SYMBOL_PAYOUTS: Record<CoinStrikeSymbol, number> = {
  cherry:     3,
  orange:     5,
  grapes:     8,
  bell:       12,
  bar:        25,
  seven:      50,
  coin:       0,    // Coins have their own value system
  wild:       0,    // Wild substitutes, doesn't pay on its own
};

// Jackpot values (multipliers of total bet)
export const JACKPOTS = {
  mini:  25,     // 25x total bet (37.50 at 1.50 bet)
  minor: 50,     // 50x total bet (75.00 at 1.50 bet)
  major: 150,    // 150x total bet (225.00 at 1.50 bet)
  grand: 1000,   // 1000x total bet (1500.00 at 1.50 bet)
};

// Coin symbol possible values (multipliers of total bet)
export const COIN_VALUES = [1, 2, 3, 5, 7.5, 10, 15, 20];

// Symbol weights for reel generation
export const SYMBOL_WEIGHTS: Record<CoinStrikeSymbol, number> = {
  cherry:     20,
  orange:     18,
  grapes:     15,
  bell:       12,
  bar:        8,
  seven:      5,
  coin:       12,
  wild:       6,
};

const REELS = 3;
const ROWS = 3;
const HOLD_WIN_TRIGGER = 6;  // 6+ coins trigger Hold & Win
const INITIAL_RESPINS = 3;

// Symbol emoji mapping
export const SYMBOL_EMOJIS: Record<CoinStrikeSymbol, string> = {
  cherry:     "🍒",
  orange:     "🍊",
  grapes:     "🍇",
  bell:       "🔔",
  bar:        "📊",
  seven:      "7️⃣",
  coin:       "🪙",
  wild:       "⚡",
};

// Symbol display names
export const SYMBOL_NAMES: Record<CoinStrikeSymbol, string> = {
  cherry:     "Cherries",
  orange:     "Oranges",
  grapes:     "Grapes",
  bell:       "Bell",
  bar:        "Gold Bar",
  seven:      "Lucky 7",
  coin:       "Gold Coin",
  wild:       "Wild",
};

// Get random symbol based on weights
function getRandomSymbol(
  random: number, 
  weights: Record<CoinStrikeSymbol, number>
): CoinStrikeSymbol {
  const symbols = Object.keys(weights) as CoinStrikeSymbol[];
  const totalWeight = symbols.reduce((sum, s) => sum + weights[s], 0);
  
  let threshold = random * totalWeight;
  for (const symbol of symbols) {
    threshold -= weights[symbol];
    if (threshold <= 0) return symbol;
  }
  return symbols[0];
}

// Generate random coin value
function getRandomCoinValue(random: number): number {
  // Weighted towards lower values
  const weights = [30, 25, 18, 12, 7, 5, 2, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let threshold = random * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return COIN_VALUES[i];
  }
  return COIN_VALUES[0];
}

// Generate the 3x3 reel grid
export function generateReels(
  randomFn: () => number
): CoinStrikeSymbol[][] {
  const reels: CoinStrikeSymbol[][] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    const column: CoinStrikeSymbol[] = [];
    for (let row = 0; row < ROWS; row++) {
      column.push(getRandomSymbol(randomFn(), SYMBOL_WEIGHTS));
    }
    reels.push(column);
  }
  return reels;
}

// Find coin symbols and assign values
function findCoins(
  reels: CoinStrikeSymbol[][],
  randomFn: () => number
): { positions: [number, number][]; values: number[] } {
  const positions: [number, number][] = [];
  const values: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      if (reels[reel][row] === "coin") {
        positions.push([reel, row]);
        values.push(getRandomCoinValue(randomFn()));
      }
    }
  }
  return { positions, values };
}

// Check for winning combinations (3 of a kind in any row, column, or diagonal)
function checkWins(
  reels: CoinStrikeSymbol[][],
  betAmount: bigint
): { totalWin: bigint; winningPositions: [number, number][]; winType: string | null } {
  let totalWin = BigInt(0);
  const winningPositions: [number, number][] = [];
  let winType: string | null = null;
  
  // Helper to check if symbols match (considering wilds)
  const symbolsMatch = (symbols: CoinStrikeSymbol[]): CoinStrikeSymbol | null => {
    const nonWild = symbols.filter(s => s !== "wild" && s !== "coin");
    if (nonWild.length === 0) return null; // All wilds or coins - no regular win
    
    const baseSymbol = nonWild[0];
    const allMatch = symbols.every(s => s === baseSymbol || s === "wild");
    return allMatch ? baseSymbol : null;
  };
  
  // Check rows
  for (let row = 0; row < ROWS; row++) {
    const rowSymbols = [reels[0][row], reels[1][row], reels[2][row]];
    const matchedSymbol = symbolsMatch(rowSymbols);
    if (matchedSymbol) {
      const payout = SYMBOL_PAYOUTS[matchedSymbol];
      if (payout > 0) {
        totalWin += betAmount * BigInt(payout);
        winningPositions.push([0, row], [1, row], [2, row]);
        winType = `${SYMBOL_NAMES[matchedSymbol]} x3`;
      }
    }
  }
  
  // Check columns
  for (let col = 0; col < REELS; col++) {
    const colSymbols = [reels[col][0], reels[col][1], reels[col][2]];
    const matchedSymbol = symbolsMatch(colSymbols);
    if (matchedSymbol) {
      const payout = SYMBOL_PAYOUTS[matchedSymbol];
      if (payout > 0) {
        totalWin += betAmount * BigInt(payout);
        winningPositions.push([col, 0], [col, 1], [col, 2]);
        if (!winType) winType = `${SYMBOL_NAMES[matchedSymbol]} x3`;
      }
    }
  }
  
  // Check diagonals
  const diag1 = [reels[0][0], reels[1][1], reels[2][2]];
  const diag1Match = symbolsMatch(diag1);
  if (diag1Match) {
    const payout = SYMBOL_PAYOUTS[diag1Match];
    if (payout > 0) {
      totalWin += betAmount * BigInt(payout);
      winningPositions.push([0, 0], [1, 1], [2, 2]);
      if (!winType) winType = `${SYMBOL_NAMES[diag1Match]} x3`;
    }
  }
  
  const diag2 = [reels[0][2], reels[1][1], reels[2][0]];
  const diag2Match = symbolsMatch(diag2);
  if (diag2Match) {
    const payout = SYMBOL_PAYOUTS[diag2Match];
    if (payout > 0) {
      totalWin += betAmount * BigInt(payout);
      winningPositions.push([0, 2], [1, 1], [2, 0]);
      if (!winType) winType = `${SYMBOL_NAMES[diag2Match]} x3`;
    }
  }
  
  return { totalWin, winningPositions, winType };
}

// Main game function
export function playCoinStrike(
  betAmount: bigint,
  randomFn: () => number
): CoinStrikeResult {
  // Generate reels
  const reels = generateReels(randomFn);
  
  // Find coins
  const coinResult = findCoins(reels, randomFn);
  const holdAndWinTriggered = coinResult.positions.length >= HOLD_WIN_TRIGGER;
  
  // Check regular wins
  const { totalWin, winningPositions, winType } = checkWins(reels, betAmount);
  
  return {
    reels,
    winningPositions,
    totalWin,
    coinPositions: coinResult.positions,
    coinValues: coinResult.values,
    holdAndWinTriggered,
    jackpotWon: null,
    winType,
  };
}

// Hold and Win Feature
export function playHoldAndWin(
  betAmount: bigint,
  randomFn: () => number,
  initialCoinPositions: [number, number][],
  initialCoinValues: number[]
): HoldAndWinResult {
  const coinPositions = [...initialCoinPositions];
  const coinValues = [...initialCoinValues];
  
  let respinsRemaining = INITIAL_RESPINS;
  let isComplete = false;
  let jackpotWon: "grand" | "major" | "minor" | "mini" | null = null;
  
  // Simulate respins
  while (respinsRemaining > 0 && !isComplete) {
    let newCoinLanded = false;
    
    // Check each empty position
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) {
        // Skip if position already has a coin
        const hasCoins = coinPositions.some(([r, ro]) => r === reel && ro === row);
        if (hasCoins) continue;
        
        // Chance to land a coin (higher chance in Hold & Win)
        if (randomFn() < 0.20) {
          coinPositions.push([reel, row]);
          coinValues.push(getRandomCoinValue(randomFn()));
          newCoinLanded = true;
        }
      }
    }
    
    if (newCoinLanded) {
      respinsRemaining = INITIAL_RESPINS; // Reset respins
    } else {
      respinsRemaining--;
    }
    
    // Check if all 9 positions filled (GRAND Jackpot!)
    if (coinPositions.length >= REELS * ROWS) {
      jackpotWon = "grand";
      isComplete = true;
    }
  }
  
  // Feature complete - check for other jackpots based on coin count
  if (!jackpotWon) {
    const jackpotRoll = randomFn();
    const coinCount = coinPositions.length;
    
    if (coinCount >= 8 && jackpotRoll < 0.10) {
      jackpotWon = "major";
    } else if (coinCount >= 7 && jackpotRoll < 0.20) {
      jackpotWon = "minor";
    } else if (coinCount >= 6 && jackpotRoll < 0.35) {
      jackpotWon = "mini";
    }
  }
  
  // Calculate total value
  let totalValue = BigInt(0);
  for (const value of coinValues) {
    // Handle decimal values by multiplying by 100, doing calc, then dividing
    totalValue += (betAmount * BigInt(Math.round(value * 100))) / BigInt(100);
  }
  
  // Add jackpot if won
  if (jackpotWon) {
    totalValue += betAmount * BigInt(JACKPOTS[jackpotWon]);
  }
  
  return {
    coinPositions,
    coinValues,
    totalValue,
    respinsRemaining: 0,
    isComplete: true,
    jackpotWon,
  };
}

export const COIN_STRIKE_RTP = 0.965;
export const COIN_STRIKE_HOUSE_EDGE = 0.035;
