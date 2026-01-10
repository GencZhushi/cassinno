/**
 * Gonzo's Quest Megaways - Mayan Adventure Slot (Red Tiger / NetEnt)
 * 
 * Theme: Mayan jungle expedition, conquistador Gonzo searching for El Dorado
 * Core vibe: Adventurous, cascading stone blocks, increasing multipliers
 * 
 * Core mechanics:
 * - 6 reels with 2-7 symbols per reel (Megaways)
 * - 64 to 117,649 ways to win (varies each spin)
 * - Avalanche Feature: Winning symbols explode, new ones fall in
 * - Avalanche Multiplier: 
 *   - Base game: 1x → 2x → 3x → 5x
 *   - Free Spins: 3x → 6x → 9x → 15x
 * - Unbreakable Wilds: Stay on reels after wins (max 2 per spin)
 * - Earthquake Feature: Randomly removes low-pay symbols
 * - Free Fall (Free Spins): 3+ scatters = 9 free spins (+3 per extra)
 * - Max Win: 21,000x stake
 * 
 * RTP: ~96.0%
 * Volatility: HIGH
 */

export type GonzoSymbol =
  | "blueMask"      // Blue Mayan mask - highest pay
  | "greenMask"     // Green mask - high
  | "purpleMask"    // Purple mask - high
  | "brownMask"     // Brown/gold mask - medium
  | "grayMask"      // Gray mask - medium
  | "bird"          // Bird totem - low
  | "snake"         // Snake totem - low
  | "fish"          // Fish totem - low
  | "frog"          // Frog totem - lowest
  | "wild"          // Question mark Wild (Unbreakable)
  | "scatter";      // Golden Free Fall scatter

export interface GonzoResult {
  reels: GonzoSymbol[][];           // Variable columns (2-7 rows each)
  reelHeights: number[];            // Height of each reel (2-7)
  totalWays: number;                // Ways to win this spin
  avalanches: AvalancheResult[];    // All avalanche sequences
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  scatterPositions: [number, number][];
  isFreeSpinMode: boolean;
  earthquakeTriggered: boolean;
  finalMultiplier: number;
}

export interface AvalancheResult {
  reels: GonzoSymbol[][];
  reelHeights: number[];
  winningPositions: [number, number][];
  winningSymbol: GonzoSymbol | null;
  symbolCount: number;
  waysWon: number;
  multiplier: number;
  win: bigint;
  unbreakableWildPositions: [number, number][];
}

// Symbol payouts: [3 of kind, 4 of kind, 5 of kind, 6 of kind] multipliers of total bet
export const SYMBOL_PAYOUTS: Record<GonzoSymbol, number[]> = {
  blueMask:   [1.5, 3, 7.5, 15],     // Highest - Blue Mayan Mask
  greenMask:  [0.8, 2, 5, 10],       // High - Green Mask
  purpleMask: [0.6, 1.5, 4, 8],      // High - Purple Mask
  brownMask:  [0.4, 1, 2.5, 5],      // Medium - Brown Mask
  grayMask:   [0.3, 0.8, 2, 4],      // Medium - Gray Mask
  bird:       [0.2, 0.5, 1, 2],      // Low - Bird
  snake:      [0.2, 0.5, 1, 2],      // Low - Snake
  fish:       [0.15, 0.4, 0.8, 1.5], // Low - Fish
  frog:       [0.1, 0.3, 0.6, 1],    // Lowest - Frog
  wild:       [0, 0, 0, 0],          // Wild doesn't pay on its own
  scatter:    [0, 0, 0, 0],          // Scatter pays separately
};

// High pay symbols (for earthquake feature)
export const HIGH_PAY_SYMBOLS: GonzoSymbol[] = ["blueMask", "greenMask", "purpleMask", "brownMask", "grayMask"];
export const LOW_PAY_SYMBOLS: GonzoSymbol[] = ["bird", "snake", "fish", "frog"];

// Symbol weights for reel generation
export const SYMBOL_WEIGHTS: Record<GonzoSymbol, number> = {
  blueMask:   2,
  greenMask:  3,
  purpleMask: 4,
  brownMask:  6,
  grayMask:   7,
  bird:       12,
  snake:      12,
  fish:       14,
  frog:       14,
  wild:       2,
  scatter:    2.5,
};

// Free spin weights - more wilds and scatters
export const FREE_SPIN_WEIGHTS: Record<GonzoSymbol, number> = {
  blueMask:   3,
  greenMask:  4,
  purpleMask: 5,
  brownMask:  6,
  grayMask:   7,
  bird:       10,
  snake:      10,
  fish:       12,
  frog:       12,
  wild:       4,
  scatter:    3,
};

// Avalanche multipliers
export const BASE_MULTIPLIERS = [1, 2, 3, 5];
export const FREE_SPIN_MULTIPLIERS = [3, 6, 9, 15];

const REELS = 6;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIN_REEL_HEIGHT = 2;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MAX_REEL_HEIGHT = 7;
const FREE_SPINS_BASE = 9;
const FREE_SPINS_EXTRA = 3;
const EARTHQUAKE_CHANCE = 0.05; // 5% chance per spin

// Get random symbol based on weights
function getRandomSymbol(
  random: number,
  weights: Record<GonzoSymbol, number>,
  excludeScatter: boolean = false
): GonzoSymbol {
  const symbols = Object.keys(weights) as GonzoSymbol[];
  const adjustedWeights = symbols.map(s => 
    (excludeScatter && s === "scatter") ? 0 : weights[s]
  );
  const totalWeight = adjustedWeights.reduce((a, b) => a + b, 0);
  
  let threshold = random * totalWeight;
  for (let i = 0; i < symbols.length; i++) {
    threshold -= adjustedWeights[i];
    if (threshold <= 0) return symbols[i];
  }
  return symbols[0];
}

// Generate random reel height (2-7)
function getRandomReelHeight(random: number): number {
  // Weighted towards middle values for better gameplay
  const heights = [2, 3, 4, 5, 6, 7];
  const weights = [5, 15, 25, 25, 20, 10]; // Favor 4-5 symbols
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let threshold = random * totalWeight;
  for (let i = 0; i < heights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return heights[i];
  }
  return 4;
}

// Calculate total ways to win based on reel heights
function calculateWays(reelHeights: number[]): number {
  return reelHeights.reduce((ways, height) => ways * height, 1);
}

// Generate Megaways reels with variable heights
export function generateReels(
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  lockedWildPositions: [number, number][] = []
): { reels: GonzoSymbol[][]; reelHeights: number[] } {
  const weights = isFreeSpinMode ? FREE_SPIN_WEIGHTS : SYMBOL_WEIGHTS;
  const reels: GonzoSymbol[][] = [];
  const reelHeights: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    const height = getRandomReelHeight(randomFn());
    reelHeights.push(height);
    
    const column: GonzoSymbol[] = [];
    for (let row = 0; row < height; row++) {
      // Check if this position has a locked wild
      const hasLockedWild = lockedWildPositions.some(
        ([r, ro]) => r === reel && ro === row
      );
      
      if (hasLockedWild) {
        column.push("wild");
      } else {
        column.push(getRandomSymbol(randomFn(), weights));
      }
    }
    reels.push(column);
  }
  
  return { reels, reelHeights };
}

// Apply earthquake feature - replace low pay symbols with high pay
function applyEarthquake(
  reels: GonzoSymbol[][],
  randomFn: () => number
): GonzoSymbol[][] {
  return reels.map(column => 
    column.map(symbol => {
      if (LOW_PAY_SYMBOLS.includes(symbol)) {
        // Replace with random high pay symbol
        const highPayIndex = Math.floor(randomFn() * HIGH_PAY_SYMBOLS.length);
        return HIGH_PAY_SYMBOLS[highPayIndex];
      }
      return symbol;
    })
  );
}

// Find all winning combinations (Megaways style - adjacent reels from left)
function findWinningCombinations(
  reels: GonzoSymbol[][],
  betAmount: bigint,
  multiplier: number
): {
  winningPositions: [number, number][];
  wins: { symbol: GonzoSymbol; count: number; ways: number; win: bigint }[];
  totalWin: bigint;
} {
  const wins: { symbol: GonzoSymbol; count: number; ways: number; win: bigint }[] = [];
  const winningPositions: [number, number][] = [];
  let totalWin = BigInt(0);
  
  // Get all unique symbols (excluding wild and scatter)
  const payingSymbols = Object.keys(SYMBOL_PAYOUTS).filter(
    s => s !== "wild" && s !== "scatter"
  ) as GonzoSymbol[];
  
  for (const targetSymbol of payingSymbols) {
    // Count ways for this symbol starting from reel 0
    let consecutiveReels = 0;
    let totalWays = 1;
    const positions: [number, number][] = [];
    
    for (let reel = 0; reel < REELS; reel++) {
      const column = reels[reel];
      let matchCount = 0;
      const reelPositions: [number, number][] = [];
      
      for (let row = 0; row < column.length; row++) {
        const symbol = column[row];
        if (symbol === targetSymbol || symbol === "wild") {
          matchCount++;
          reelPositions.push([reel, row]);
        }
      }
      
      if (matchCount > 0) {
        consecutiveReels++;
        totalWays *= matchCount;
        positions.push(...reelPositions);
      } else {
        break; // No match on this reel, stop counting
      }
    }
    
    // Need at least 3 consecutive reels for a win
    if (consecutiveReels >= 3) {
      const payoutIndex = Math.min(consecutiveReels - 3, 3);
      const basePayout = SYMBOL_PAYOUTS[targetSymbol][payoutIndex];
      const winAmount = BigInt(Math.floor(Number(betAmount) * basePayout * totalWays * multiplier));
      
      if (winAmount > 0) {
        wins.push({
          symbol: targetSymbol,
          count: consecutiveReels,
          ways: totalWays,
          win: winAmount,
        });
        winningPositions.push(...positions);
        totalWin += winAmount;
      }
    }
  }
  
  return { winningPositions, wins, totalWin };
}

// Count scatter symbols
function countScatters(reels: GonzoSymbol[][]): { 
  count: number; 
  positions: [number, number][] 
} {
  const positions: [number, number][] = [];
  
  for (let reel = 0; reel < reels.length; reel++) {
    for (let row = 0; row < reels[reel].length; row++) {
      if (reels[reel][row] === "scatter") {
        positions.push([reel, row]);
      }
    }
  }
  
  return { count: positions.length, positions };
}

// Find unbreakable wild positions
function findUnbreakableWilds(reels: GonzoSymbol[][]): [number, number][] {
  const positions: [number, number][] = [];
  let foundFirstHalf = false;
  let foundSecondHalf = false;
  
  // Can have max 1 wild in reels 0-2 and 1 wild in reels 3-5
  for (let reel = 0; reel < reels.length; reel++) {
    for (let row = 0; row < reels[reel].length; row++) {
      if (reels[reel][row] === "wild") {
        if (reel < 3 && !foundFirstHalf) {
          positions.push([reel, row]);
          foundFirstHalf = true;
        } else if (reel >= 3 && !foundSecondHalf) {
          positions.push([reel, row]);
          foundSecondHalf = true;
        }
      }
    }
  }
  
  return positions;
}

// Avalanche: Remove winning symbols and drop new ones
function avalancheReels(
  reels: GonzoSymbol[][],
  reelHeights: number[],
  winningPositions: [number, number][],
  unbreakableWildPositions: [number, number][],
  randomFn: () => number,
  isFreeSpinMode: boolean
): { reels: GonzoSymbol[][]; reelHeights: number[] } {
  const weights = isFreeSpinMode ? FREE_SPIN_WEIGHTS : SYMBOL_WEIGHTS;
  const newReels = reels.map(col => [...col]);
  
  // Create set of positions to remove (excluding unbreakable wilds)
  const toRemove = new Set<string>();
  for (const [reel, row] of winningPositions) {
    const isUnbreakable = unbreakableWildPositions.some(
      ([r, ro]) => r === reel && ro === row
    );
    if (!isUnbreakable) {
      toRemove.add(`${reel},${row}`);
    }
  }
  
  // Process each column
  for (let reel = 0; reel < REELS; reel++) {
    const height = reelHeights[reel];
    const survivors: GonzoSymbol[] = [];
    
    // Keep non-removed symbols
    for (let row = 0; row < height; row++) {
      if (!toRemove.has(`${reel},${row}`)) {
        survivors.push(newReels[reel][row]);
      }
    }
    
    // Fill remaining positions with new symbols
    const newColumn: GonzoSymbol[] = [];
    const newSymbolsNeeded = height - survivors.length;
    
    // New symbols fall from top
    for (let i = 0; i < newSymbolsNeeded; i++) {
      newColumn.push(getRandomSymbol(randomFn(), weights, true)); // No scatters in avalanche
    }
    
    // Then survivors below
    newColumn.push(...survivors);
    
    newReels[reel] = newColumn;
  }
  
  return { reels: newReels, reelHeights };
}

// Main game function
export function playGonzosQuestMegaways(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  existingMultiplierIndex: number = 0
): GonzoResult {
  // Generate initial reels
  let { reels } = generateReels(randomFn, isFreeSpinMode);
  const { reelHeights } = generateReels(randomFn, isFreeSpinMode);
  const totalWays = calculateWays(reelHeights);
  
  // Check for earthquake feature (base game only, random trigger)
  let earthquakeTriggered = false;
  if (!isFreeSpinMode && randomFn() < EARTHQUAKE_CHANCE) {
    earthquakeTriggered = true;
    reels = applyEarthquake(reels, randomFn);
  }
  
  // Check for scatters (free spins trigger)
  const scatterResult = countScatters(reels);
  let freeSpinsWon = 0;
  if (scatterResult.count >= 3) {
    freeSpinsWon = FREE_SPINS_BASE + (scatterResult.count - 3) * FREE_SPINS_EXTRA;
  }
  
  // Process avalanches
  const avalanches: AvalancheResult[] = [];
  let totalWin = BigInt(0);
  let currentReels = reels;
  let currentHeights = reelHeights;
  let multiplierIndex = existingMultiplierIndex;
  const multipliers = isFreeSpinMode ? FREE_SPIN_MULTIPLIERS : BASE_MULTIPLIERS;
  let avalancheCount = 0;
  const maxAvalanches = 50; // Safety limit
  
  while (avalancheCount < maxAvalanches) {
    const multiplier = multipliers[Math.min(multiplierIndex, multipliers.length - 1)];
    const unbreakableWilds = findUnbreakableWilds(currentReels);
    
    const { winningPositions, wins, totalWin: avalancheWin } = findWinningCombinations(
      currentReels,
      betAmount,
      multiplier
    );
    
    if (wins.length === 0) break; // No more wins
    
    // Record this avalanche
    avalanches.push({
      reels: currentReels.map(col => [...col]),
      reelHeights: [...currentHeights],
      winningPositions,
      winningSymbol: wins[0]?.symbol || null,
      symbolCount: wins.reduce((sum, w) => sum + w.count, 0),
      waysWon: wins.reduce((sum, w) => sum + w.ways, 0),
      multiplier,
      win: avalancheWin,
      unbreakableWildPositions: unbreakableWilds,
    });
    
    totalWin += avalancheWin;
    
    // Increase multiplier for next avalanche
    if (multiplierIndex < multipliers.length - 1) {
      multiplierIndex++;
    }
    
    // Perform avalanche
    const avalancheResult = avalancheReels(
      currentReels,
      currentHeights,
      winningPositions,
      unbreakableWilds,
      randomFn,
      isFreeSpinMode
    );
    currentReels = avalancheResult.reels;
    currentHeights = avalancheResult.reelHeights;
    
    avalancheCount++;
  }
  
  return {
    reels: currentReels,
    reelHeights: currentHeights,
    totalWays,
    avalanches,
    totalWin,
    freeSpinsWon,
    scatterCount: scatterResult.count,
    scatterPositions: scatterResult.positions,
    isFreeSpinMode,
    earthquakeTriggered,
    finalMultiplier: multipliers[Math.min(multiplierIndex, multipliers.length - 1)],
  };
}

// Symbol emoji mapping - Mayan theme
export const SYMBOL_EMOJIS: Record<GonzoSymbol, string> = {
  blueMask:   "🔵",  // Blue Mask (highest)
  greenMask:  "💚",  // Green Mask
  purpleMask: "💜",  // Purple Mask
  brownMask:  "🟤",  // Brown Mask
  grayMask:   "⚪",  // Gray Mask
  bird:       "🦅",  // Bird totem
  snake:      "🐍",  // Snake totem
  fish:       "🐟",  // Fish totem
  frog:       "🐸",  // Frog totem
  wild:       "❓",  // Question mark Wild
  scatter:    "🌟",  // Golden scatter
};

// Symbol display names
export const SYMBOL_NAMES: Record<GonzoSymbol, string> = {
  blueMask:   "Blue Mayan Mask",
  greenMask:  "Green Mask",
  purpleMask: "Purple Mask",
  brownMask:  "Golden Mask",
  grayMask:   "Stone Mask",
  bird:       "Eagle Totem",
  snake:      "Serpent Totem",
  fish:       "Fish Totem",
  frog:       "Frog Totem",
  wild:       "Wild (Unbreakable)",
  scatter:    "Free Fall Scatter",
};

export const GONZOS_QUEST_RTP = 0.96;
export const GONZOS_QUEST_HOUSE_EDGE = 0.04;
export const GONZOS_QUEST_VOLATILITY = "HIGH";
export const GONZOS_QUEST_MAX_WIN = 21000; // 21,000x stake
