/**
 * Wolf Gold - North American Desert Wildlife Slot (Pragmatic Play Style)
 * 
 * Theme: North American desert / wildlife / night sky
 * Core vibe: Cinematic western wilderness, howls + moonlight
 * 
 * Core mechanics:
 * - 5 reels × 3 rows with 25 paylines
 * - Stacked Wolf Wilds that can cover entire reels
 * - Free Spins with giant symbols on middle reels (Blazin Reels)
 * - Moon Money Respin feature: 6+ moons trigger respins
 *   - Values add up, can award Mini, Major, or Mega jackpots
 * - Max Win: 2,500x stake
 * 
 * RTP: ~96.01%
 */

export type WolfGoldSymbol =
  | "nine"        // 9 - lowest
  | "ten"         // 10
  | "jack"        // J
  | "queen"       // Q
  | "king"        // K
  | "ace"         // A
  | "horse"       // Horse - medium
  | "puma"        // Puma/Cougar - medium
  | "eagle"       // Eagle - high
  | "buffalo"     // Buffalo - high
  | "wolf"        // Wolf - Wild (stacked)
  | "canyon"      // Canyon sunset - Scatter
  | "moon";       // Moon - Money symbol (triggers respin)

export interface WolfGoldResult {
  reels: WolfGoldSymbol[][];         // 5 columns x 3 rows
  displayReels: WolfGoldSymbol[][];  // After stacked wilds applied
  winningLines: WinLine[];
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  scatterPositions: [number, number][];
  isFreeSpinMode: boolean;
  moonPositions: [number, number][];
  moonValues: number[];              // Values on moon symbols
  moonRespinTriggered: boolean;
  jackpotWon: "mini" | "major" | "mega" | null;
  stackedWildReels: number[];        // Which reels have stacked wilds
}

export interface MoonRespinResult {
  reels: (WolfGoldSymbol | null)[][];  // null = locked position without moon
  moonPositions: [number, number][];
  moonValues: number[];
  totalValue: bigint;
  respinsRemaining: number;
  isComplete: boolean;
  jackpotWon: "mini" | "major" | "mega" | null;
}

export interface WinLine {
  lineNumber: number;
  symbol: WolfGoldSymbol;
  count: number;
  positions: [number, number][];     // [reel, row] pairs
  payout: number;
  win: bigint;
}

// 25 paylines (standard Pragmatic Play layout)
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],  // Line 1: Middle row
  [0, 0, 0, 0, 0],  // Line 2: Top row
  [2, 2, 2, 2, 2],  // Line 3: Bottom row
  [0, 1, 2, 1, 0],  // Line 4: V shape
  [2, 1, 0, 1, 2],  // Line 5: Inverted V
  [0, 0, 1, 0, 0],  // Line 6
  [2, 2, 1, 2, 2],  // Line 7
  [1, 0, 0, 0, 1],  // Line 8
  [1, 2, 2, 2, 1],  // Line 9
  [0, 1, 1, 1, 0],  // Line 10
  [2, 1, 1, 1, 2],  // Line 11
  [1, 0, 1, 0, 1],  // Line 12
  [1, 2, 1, 2, 1],  // Line 13
  [0, 1, 0, 1, 0],  // Line 14
  [2, 1, 2, 1, 2],  // Line 15
  [1, 1, 0, 1, 1],  // Line 16
  [1, 1, 2, 1, 1],  // Line 17
  [0, 0, 1, 2, 2],  // Line 18
  [2, 2, 1, 0, 0],  // Line 19
  [0, 2, 0, 2, 0],  // Line 20
  [2, 0, 2, 0, 2],  // Line 21
  [1, 0, 2, 0, 1],  // Line 22
  [1, 2, 0, 2, 1],  // Line 23
  [0, 2, 2, 2, 0],  // Line 24
  [2, 0, 0, 0, 2],  // Line 25
];

// Symbol payouts: [3 of kind, 4 of kind, 5 of kind] multipliers of line bet
export const SYMBOL_PAYOUTS: Record<WolfGoldSymbol, number[]> = {
  nine:     [5, 20, 50],
  ten:      [5, 20, 50],
  jack:     [5, 20, 50],
  queen:    [5, 25, 75],
  king:     [10, 30, 100],
  ace:      [10, 30, 100],
  horse:    [15, 40, 150],
  puma:     [15, 50, 200],
  eagle:    [20, 75, 300],
  buffalo:  [30, 100, 500],
  wolf:     [0, 0, 0],     // Wild - substitutes, doesn't pay on its own
  canyon:   [0, 0, 0],     // Scatter - pays separately
  moon:     [0, 0, 0],     // Money symbol - triggers respin
};

// Scatter payouts (based on total bet)
export const SCATTER_PAYOUTS: Record<number, number> = {
  3: 3,     // 3 canyons = 3x total bet + 5 free spins
  4: 15,    // 4 canyons = 15x total bet + 5 free spins
  5: 60,    // 5 canyons = 60x total bet + 5 free spins
};

// Moon symbol possible values (multipliers of total bet)
export const MOON_VALUES = [1, 2, 3, 5, 8, 10, 15, 20, 25, 50];

// Jackpot values (multipliers of total bet)
export const JACKPOTS = {
  mini: 30,    // 30x total bet
  major: 100,  // 100x total bet  
  mega: 1000,  // 1000x total bet (can be progressive)
};

// Symbol weights for reel generation
export const SYMBOL_WEIGHTS: Record<WolfGoldSymbol, number> = {
  nine:     18,
  ten:      18,
  jack:     16,
  queen:    14,
  king:     12,
  ace:      10,
  horse:    8,
  puma:     7,
  eagle:    5,
  buffalo:  4,
  wolf:     4,      // Stacked - appears in groups
  canyon:   2.5,    // Scatter
  moon:     3,      // Money symbol
};

// Free spin weights - more wilds and moons
export const FREE_SPIN_WEIGHTS: Record<WolfGoldSymbol, number> = {
  nine:     15,
  ten:      15,
  jack:     14,
  queen:    12,
  king:     10,
  ace:      8,
  horse:    8,
  puma:     7,
  eagle:    6,
  buffalo:  5,
  wolf:     6,      // More wilds in free spins
  canyon:   3,
  moon:     4,
};

const REELS = 5;
const ROWS = 3;
const FREE_SPINS_COUNT = 5;
const MOON_RESPIN_TRIGGER = 6;  // 6+ moons trigger respin
const INITIAL_RESPINS = 3;

// Get random symbol based on weights
function getRandomSymbol(
  random: number, 
  weights: Record<WolfGoldSymbol, number>
): WolfGoldSymbol {
  const symbols = Object.keys(weights) as WolfGoldSymbol[];
  const totalWeight = symbols.reduce((sum, s) => sum + weights[s], 0);
  
  let threshold = random * totalWeight;
  for (const symbol of symbols) {
    threshold -= weights[symbol];
    if (threshold <= 0) return symbol;
  }
  return symbols[0];
}

// Generate random moon value
function getRandomMoonValue(random: number): number {
  // Weighted towards lower values
  const weights = [25, 20, 15, 12, 10, 8, 5, 3, 1.5, 0.5]; // Matches MOON_VALUES
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let threshold = random * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return MOON_VALUES[i];
  }
  return MOON_VALUES[0];
}

// Generate the 5x3 reel grid with stacked wilds
export function generateReels(
  randomFn: () => number,
  isFreeSpinMode: boolean = false
): { reels: WolfGoldSymbol[][]; stackedWildReels: number[] } {
  const weights = isFreeSpinMode ? FREE_SPIN_WEIGHTS : SYMBOL_WEIGHTS;
  const reels: WolfGoldSymbol[][] = [];
  const stackedWildReels: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    const column: WolfGoldSymbol[] = [];
    
    // Check for stacked wilds (wolf can fill entire reel)
    const stackedWildChance = isFreeSpinMode ? 0.12 : 0.08;
    if (randomFn() < stackedWildChance) {
      // Fill entire reel with wolves
      for (let row = 0; row < ROWS; row++) {
        column.push("wolf");
      }
      stackedWildReels.push(reel);
    } else {
      // Normal reel generation
      for (let row = 0; row < ROWS; row++) {
        column.push(getRandomSymbol(randomFn(), weights));
      }
    }
    reels.push(column);
  }
  return { reels, stackedWildReels };
}

// Count scatter symbols (Canyon)
function countScatters(reels: WolfGoldSymbol[][]): { 
  count: number; 
  positions: [number, number][] 
} {
  const positions: [number, number][] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      if (reels[reel][row] === "canyon") {
        positions.push([reel, row]);
      }
    }
  }
  return { count: positions.length, positions };
}

// Find moon symbols and assign values
function findMoons(
  reels: WolfGoldSymbol[][],
  randomFn: () => number
): { positions: [number, number][]; values: number[] } {
  const positions: [number, number][] = [];
  const values: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      if (reels[reel][row] === "moon") {
        positions.push([reel, row]);
        values.push(getRandomMoonValue(randomFn()));
      }
    }
  }
  return { positions, values };
}

// Check winning lines
function checkWinningLines(
  reels: WolfGoldSymbol[][],
  lineBet: bigint
): WinLine[] {
  const winningLines: WinLine[] = [];
  
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const line = PAYLINES[lineIndex];
    const positions: [number, number][] = [];
    
    // Get symbols on this line
    const lineSymbols: WolfGoldSymbol[] = [];
    for (let reel = 0; reel < REELS; reel++) {
      const row = line[reel];
      lineSymbols.push(reels[reel][row]);
      positions.push([reel, row]);
    }
    
    // Find the first non-wild, non-scatter, non-moon symbol
    let baseSymbol: WolfGoldSymbol | null = null;
    for (const sym of lineSymbols) {
      if (sym !== "wolf" && sym !== "canyon" && sym !== "moon") {
        baseSymbol = sym;
        break;
      }
    }
    
    // If all wilds, use buffalo (highest)
    if (baseSymbol === null) {
      const hasWild = lineSymbols.some(s => s === "wolf");
      if (hasWild) {
        baseSymbol = "buffalo";
      } else {
        continue; // No valid line
      }
    }
    
    // Count consecutive matching symbols from left
    let matchCount = 0;
    const matchedPositions: [number, number][] = [];
    
    for (let reel = 0; reel < REELS; reel++) {
      const sym = lineSymbols[reel];
      // Wolf (wild) matches everything except scatter/moon
      const isMatch = sym === "wolf" || sym === baseSymbol;
      
      if (isMatch) {
        matchCount++;
        matchedPositions.push(positions[reel]);
      } else {
        break;
      }
    }
    
    // Need at least 3 matching symbols for a win
    if (matchCount >= 3 && baseSymbol && SYMBOL_PAYOUTS[baseSymbol]) {
      const payoutIndex = matchCount - 3;
      const payoutMultiplier = SYMBOL_PAYOUTS[baseSymbol][payoutIndex] || 0;
      
      if (payoutMultiplier > 0) {
        const win = lineBet * BigInt(payoutMultiplier);
        winningLines.push({
          lineNumber: lineIndex + 1,
          symbol: baseSymbol,
          count: matchCount,
          positions: matchedPositions,
          payout: payoutMultiplier,
          win,
        });
      }
    }
  }
  
  return winningLines;
}

// Main game function
export function playWolfGold(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false
): WolfGoldResult {
  // Generate reels
  const { reels, stackedWildReels } = generateReels(randomFn, isFreeSpinMode);
  
  // Check for scatters
  const scatterResult = countScatters(reels);
  let freeSpinsWon = 0;
  
  // 3+ scatters trigger free spins
  if (scatterResult.count >= 3) {
    freeSpinsWon = FREE_SPINS_COUNT;
  }
  
  // Calculate scatter wins
  let totalWin = BigInt(0);
  if (scatterResult.count >= 3) {
    const scatterMultiplier = SCATTER_PAYOUTS[scatterResult.count] || 0;
    totalWin += betAmount * BigInt(scatterMultiplier);
  }
  
  // Find moon symbols
  const moonResult = findMoons(reels, randomFn);
  const moonRespinTriggered = moonResult.positions.length >= MOON_RESPIN_TRIGGER;
  
  // Calculate line bet (total bet / 25 lines)
  const lineBet = betAmount / BigInt(25);
  
  // Check winning lines
  const winningLines = checkWinningLines(reels, lineBet);
  
  // Sum line wins
  for (const line of winningLines) {
    totalWin += line.win;
  }
  
  return {
    reels,
    displayReels: reels,
    winningLines,
    totalWin,
    freeSpinsWon,
    scatterCount: scatterResult.count,
    scatterPositions: scatterResult.positions,
    isFreeSpinMode,
    moonPositions: moonResult.positions,
    moonValues: moonResult.values,
    moonRespinTriggered,
    jackpotWon: null,
    stackedWildReels,
  };
}

// Moon Respin Feature
export function playMoonRespin(
  betAmount: bigint,
  randomFn: () => number,
  initialMoonPositions: [number, number][],
  initialMoonValues: number[]
): MoonRespinResult {
  // Start with initial moons locked
  const reels: (WolfGoldSymbol | null)[][] = Array(REELS).fill(null).map(() => 
    Array(ROWS).fill(null)
  );
  
  const moonPositions = [...initialMoonPositions];
  const moonValues = [...initialMoonValues];
  
  // Place initial moons
  for (let i = 0; i < initialMoonPositions.length; i++) {
    const [reel, row] = initialMoonPositions[i];
    reels[reel][row] = "moon";
  }
  
  let respinsRemaining = INITIAL_RESPINS;
  let isComplete = false;
  let jackpotWon: "mini" | "major" | "mega" | null = null;
  
  // Simulate respins
  while (respinsRemaining > 0 && !isComplete) {
    let newMoonLanded = false;
    
    // Spin only non-locked positions
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) {
        if (reels[reel][row] === null) {
          // Chance to land a moon (higher chance in respin)
          if (randomFn() < 0.15) {
            reels[reel][row] = "moon";
            const value = getRandomMoonValue(randomFn());
            moonPositions.push([reel, row]);
            moonValues.push(value);
            newMoonLanded = true;
          }
        }
      }
    }
    
    if (newMoonLanded) {
      respinsRemaining = INITIAL_RESPINS; // Reset respins
    } else {
      respinsRemaining--;
    }
    
    // Check if all positions filled (Mega Jackpot!)
    const filledCount = moonPositions.length;
    if (filledCount >= REELS * ROWS) {
      jackpotWon = "mega";
      isComplete = true;
    }
  }
  
  // Feature complete - check for jackpots
  if (!jackpotWon) {
    const filledCount = moonPositions.length;
    // Random jackpot chance based on moon count
    const jackpotRoll = randomFn();
    if (filledCount >= 12 && jackpotRoll < 0.05) {
      jackpotWon = "major";
    } else if (filledCount >= 9 && jackpotRoll < 0.15) {
      jackpotWon = "mini";
    }
  }
  
  // Calculate total value
  let totalValue = BigInt(0);
  for (const value of moonValues) {
    totalValue += betAmount * BigInt(value);
  }
  
  // Add jackpot if won
  if (jackpotWon) {
    totalValue += betAmount * BigInt(JACKPOTS[jackpotWon]);
  }
  
  return {
    reels,
    moonPositions,
    moonValues,
    totalValue,
    respinsRemaining: 0,
    isComplete: true,
    jackpotWon,
  };
}

// Symbol emoji mapping - Desert Wildlife theme
export const SYMBOL_EMOJIS: Record<WolfGoldSymbol, string> = {
  nine:     "9️⃣",
  ten:      "🔟",
  jack:     "🃏",
  queen:    "👸",
  king:     "🤴",
  ace:      "🅰️",
  horse:    "🐎",
  puma:     "🐆",
  eagle:    "🦅",
  buffalo:  "🦬",
  wolf:     "🐺",
  canyon:   "🏜️",
  moon:     "🌙",
};

// Symbol display names
export const SYMBOL_NAMES: Record<WolfGoldSymbol, string> = {
  nine:     "Nine",
  ten:      "Ten",
  jack:     "Jack",
  queen:    "Queen",
  king:     "King",
  ace:      "Ace",
  horse:    "Mustang",
  puma:     "Puma",
  eagle:    "Eagle",
  buffalo:  "Buffalo",
  wolf:     "Wolf (Wild)",
  canyon:   "Canyon (Scatter)",
  moon:     "Moon (Money)",
};

export const WOLF_GOLD_RTP = 0.9601;
export const WOLF_GOLD_HOUSE_EDGE = 0.0399;
