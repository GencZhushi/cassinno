/**
 * Starburst - Classic NetEnt Space Gem Slot
 * 
 * Theme: Cosmic space / colorful gems / arcade vibes
 * Core vibe: Vibrant, fast-paced, beginner-friendly
 * 
 * Core mechanics:
 * - 5 reels × 3 rows with 10 paylines
 * - WIN BOTH WAYS: Paylines pay left-to-right AND right-to-left
 * - Expanding Wilds: Wild (rainbow star) appears on reels 2, 3, 4 only
 *   - When wild lands, it EXPANDS to cover the entire reel
 *   - Triggers a RESPIN with the expanded wild held in place
 *   - Up to 3 consecutive respins possible (if new wilds land)
 * - No scatter or free spins - pure simplicity
 * - Max Win: 500x stake
 * 
 * RTP: ~96.09%
 * Volatility: LOW (frequent small wins)
 */

export type StarburstSymbol =
  | "bar"          // BAR symbol - highest regular
  | "seven"        // Lucky 7 - high
  | "yellowGem"    // Yellow diamond - medium-high
  | "greenGem"     // Green emerald - medium
  | "orangeGem"    // Orange gem - medium
  | "blueGem"      // Blue sapphire - low
  | "purpleGem"    // Purple amethyst - lowest
  | "wild";        // Rainbow Star Wild (reels 2,3,4 only)

export interface StarburstResult {
  reels: StarburstSymbol[][];           // 5 columns x 3 rows
  displayReels: StarburstSymbol[][];    // After wild expansion
  winningLines: WinLine[];
  totalWin: bigint;
  expandedWildReels: number[];          // Which reels have expanded wilds
  respinTriggered: boolean;
  respinsRemaining: number;
  isRespin: boolean;
}

export interface WinLine {
  lineNumber: number;
  symbol: StarburstSymbol;
  count: number;
  positions: [number, number][];        // [reel, row] pairs
  payout: number;
  win: bigint;
  direction: "left" | "right";          // Which direction the win came from
}

// 10 paylines - standard configuration
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],  // Line 1: Middle row
  [0, 0, 0, 0, 0],  // Line 2: Top row
  [2, 2, 2, 2, 2],  // Line 3: Bottom row
  [0, 1, 2, 1, 0],  // Line 4: V shape
  [2, 1, 0, 1, 2],  // Line 5: Inverted V (^)
  [1, 0, 0, 0, 1],  // Line 6
  [1, 2, 2, 2, 1],  // Line 7
  [0, 0, 1, 2, 2],  // Line 8
  [2, 2, 1, 0, 0],  // Line 9
  [1, 0, 1, 0, 1],  // Line 10
];

// Symbol payouts: [3 of kind, 4 of kind, 5 of kind] multipliers of line bet
// Starburst has relatively modest payouts due to both-ways pay
export const SYMBOL_PAYOUTS: Record<StarburstSymbol, number[]> = {
  bar:        [25, 50, 125],    // Highest - BAR
  seven:      [10, 25, 60],     // High - Lucky 7
  yellowGem:  [8, 20, 50],      // Medium-high - Yellow Diamond
  greenGem:   [5, 10, 25],      // Medium - Green Gem
  orangeGem:  [5, 10, 25],      // Medium - Orange Gem
  blueGem:    [4, 8, 20],       // Low - Blue Gem
  purpleGem:  [4, 8, 20],       // Lowest - Purple Gem
  wild:       [0, 0, 0],        // Wild doesn't pay on its own
};

// Symbol weights for reel generation (higher = more common)
// Reels 1 and 5: No wilds
const BASE_WEIGHTS: Record<StarburstSymbol, number> = {
  bar:        3,
  seven:      5,
  yellowGem:  8,
  greenGem:   12,
  orangeGem:  12,
  blueGem:    15,
  purpleGem:  15,
  wild:       0,
};

// Reels 2, 3, 4: Can have wilds
const MIDDLE_REEL_WEIGHTS: Record<StarburstSymbol, number> = {
  bar:        3,
  seven:      5,
  yellowGem:  8,
  greenGem:   11,
  orangeGem:  11,
  blueGem:    14,
  purpleGem:  14,
  wild:       4,  // ~5.7% chance per position
};

const REELS = 5;
const ROWS = 3;
const MAX_RESPINS = 3;

// Get random symbol based on weights
function getRandomSymbol(
  random: number,
  reelIndex: number
): StarburstSymbol {
  // Use different weights for middle reels (where wilds can appear)
  const weights = (reelIndex >= 1 && reelIndex <= 3) 
    ? MIDDLE_REEL_WEIGHTS 
    : BASE_WEIGHTS;
  
  const symbols = Object.keys(weights) as StarburstSymbol[];
  const totalWeight = symbols.reduce((sum, s) => sum + weights[s], 0);
  
  let threshold = random * totalWeight;
  for (const symbol of symbols) {
    threshold -= weights[symbol];
    if (threshold <= 0) return symbol;
  }
  return symbols[0];
}

// Generate the 5x3 reel grid
export function generateReels(
  randomFn: () => number,
  lockedWildReels: number[] = []
): { reels: StarburstSymbol[][]; newWildReels: number[] } {
  const reels: StarburstSymbol[][] = [];
  const newWildReels: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    const column: StarburstSymbol[] = [];
    
    // If this reel has a locked expanded wild, keep it
    if (lockedWildReels.includes(reel)) {
      for (let row = 0; row < ROWS; row++) {
        column.push("wild");
      }
      newWildReels.push(reel);
    } else {
      // Normal reel generation
      let reelHasNewWild = false;
      for (let row = 0; row < ROWS; row++) {
        const symbol = getRandomSymbol(randomFn(), reel);
        column.push(symbol);
        if (symbol === "wild") {
          reelHasNewWild = true;
        }
      }
      
      // Track if a new wild appeared on this reel
      if (reelHasNewWild) {
        newWildReels.push(reel);
      }
    }
    reels.push(column);
  }
  
  return { reels, newWildReels };
}

// Expand wilds - when a wild appears on reels 2,3,4, it expands to fill the reel
function expandWilds(reels: StarburstSymbol[][]): {
  expandedReels: StarburstSymbol[][];
  expandedWildReels: number[];
} {
  const expandedReels = reels.map(col => [...col]);
  const expandedWildReels: number[] = [];
  
  // Only reels 2, 3, 4 (indices 1, 2, 3) can have expanding wilds
  for (let reel = 1; reel <= 3; reel++) {
    const hasWild = expandedReels[reel].some(s => s === "wild");
    if (hasWild) {
      // Expand wild to cover entire reel
      for (let row = 0; row < ROWS; row++) {
        expandedReels[reel][row] = "wild";
      }
      expandedWildReels.push(reel);
    }
  }
  
  return { expandedReels, expandedWildReels };
}

// Check winning lines in a specific direction
function checkWinningLinesDirection(
  reels: StarburstSymbol[][],
  lineBet: bigint,
  direction: "left" | "right"
): WinLine[] {
  const winningLines: WinLine[] = [];
  
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const line = PAYLINES[lineIndex];
    const positions: [number, number][] = [];
    
    // Get symbols on this line
    const lineSymbols: StarburstSymbol[] = [];
    for (let reel = 0; reel < REELS; reel++) {
      const row = line[reel];
      lineSymbols.push(reels[reel][row]);
      positions.push([reel, row]);
    }
    
    // Reverse for right-to-left checking
    const checkSymbols = direction === "right" 
      ? [...lineSymbols].reverse() 
      : lineSymbols;
    const checkPositions = direction === "right"
      ? [...positions].reverse()
      : positions;
    
    // Find the first non-wild symbol (this determines the winning symbol type)
    let baseSymbol: StarburstSymbol | null = null;
    for (const sym of checkSymbols) {
      if (sym !== "wild") {
        baseSymbol = sym;
        break;
      }
    }
    
    // If all wilds, treat as BAR (highest paying)
    if (baseSymbol === null) {
      baseSymbol = "bar";
    }
    
    // Count consecutive matching symbols from start
    let matchCount = 0;
    const matchedPositions: [number, number][] = [];
    
    for (let i = 0; i < REELS; i++) {
      const sym = checkSymbols[i];
      const isMatch = sym === "wild" || sym === baseSymbol;
      
      if (isMatch) {
        matchCount++;
        matchedPositions.push(checkPositions[i]);
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
          direction,
        });
      }
    }
  }
  
  return winningLines;
}

// Check winning lines - BOTH WAYS (left-to-right AND right-to-left)
function checkWinningLines(
  reels: StarburstSymbol[][],
  lineBet: bigint
): WinLine[] {
  const leftWins = checkWinningLinesDirection(reels, lineBet, "left");
  const rightWins = checkWinningLinesDirection(reels, lineBet, "right");
  
  // Combine wins (both directions can win simultaneously)
  return [...leftWins, ...rightWins];
}

// Main game function - single spin (or respin)
export function playStarburst(
  betAmount: bigint,
  randomFn: () => number,
  isRespin: boolean = false,
  lockedWildReels: number[] = [],
  respinsRemaining: number = MAX_RESPINS
): StarburstResult {
  // Generate reels
  const { reels, newWildReels } = generateReels(randomFn, lockedWildReels);
  
  // Expand any wilds that appeared
  const { expandedReels, expandedWildReels } = expandWilds(reels);
  
  // Calculate line bet (total bet / 10 lines)
  const lineBet = betAmount / BigInt(10);
  
  // Check winning lines on expanded reels
  const winningLines = checkWinningLines(expandedReels, lineBet);
  
  // Sum all wins
  let totalWin = BigInt(0);
  for (const line of winningLines) {
    totalWin += line.win;
  }
  
  // Check if new wilds appeared (not counting already locked ones)
  const trulyNewWilds = newWildReels.filter(r => !lockedWildReels.includes(r));
  const anyNewWilds = trulyNewWilds.length > 0;
  
  // Determine if a respin should be triggered
  const respinTriggered = anyNewWilds && respinsRemaining > 0;
  
  return {
    reels,
    displayReels: expandedReels,
    winningLines,
    totalWin,
    expandedWildReels,
    respinTriggered,
    respinsRemaining: respinTriggered ? respinsRemaining - 1 : 0,
    isRespin,
  };
}

// Play a full Starburst spin including all respins
export function playStarburstFull(
  betAmount: bigint,
  randomFn: () => number
): {
  spins: StarburstResult[];
  totalWin: bigint;
  totalRespins: number;
} {
  const spins: StarburstResult[] = [];
  let totalWin = BigInt(0);
  let lockedWildReels: number[] = [];
  let respinsRemaining = MAX_RESPINS;
  let isRespin = false;
  
  // Initial spin
  let result = playStarburst(betAmount, randomFn, false, [], respinsRemaining);
  spins.push(result);
  totalWin += result.totalWin;
  
  // Process respins
  while (result.respinTriggered && result.respinsRemaining > 0) {
    // Lock the expanded wild reels for next spin
    const combined = [...lockedWildReels, ...result.expandedWildReels];
    lockedWildReels = combined.filter((v, i, a) => a.indexOf(v) === i);
    respinsRemaining = result.respinsRemaining;
    isRespin = true;
    
    result = playStarburst(betAmount, randomFn, isRespin, lockedWildReels, respinsRemaining);
    spins.push(result);
    totalWin += result.totalWin;
  }
  
  return {
    spins,
    totalWin,
    totalRespins: spins.length - 1,
  };
}

// Symbol emoji mapping - Space/Gem theme
export const SYMBOL_EMOJIS: Record<StarburstSymbol, string> = {
  bar:        "📊",  // BAR
  seven:      "7️⃣",   // Lucky 7
  yellowGem:  "💎",  // Yellow diamond (using general gem)
  greenGem:   "💚",  // Green gem
  orangeGem:  "🔶",  // Orange gem
  blueGem:    "💙",  // Blue gem
  purpleGem:  "💜",  // Purple gem
  wild:       "⭐",  // Rainbow Star Wild
};

// Symbol display names
export const SYMBOL_NAMES: Record<StarburstSymbol, string> = {
  bar:        "BAR",
  seven:      "Lucky 7",
  yellowGem:  "Yellow Diamond",
  greenGem:   "Green Emerald",
  orangeGem:  "Orange Gem",
  blueGem:    "Blue Sapphire",
  purpleGem:  "Purple Amethyst",
  wild:       "Starburst Wild",
};

// Symbol colors for UI theming
export const SYMBOL_COLORS: Record<StarburstSymbol, { primary: string; glow: string }> = {
  bar:        { primary: "#FFD700", glow: "rgba(255, 215, 0, 0.6)" },
  seven:      { primary: "#FF4444", glow: "rgba(255, 68, 68, 0.6)" },
  yellowGem:  { primary: "#FFFF00", glow: "rgba(255, 255, 0, 0.6)" },
  greenGem:   { primary: "#00FF00", glow: "rgba(0, 255, 0, 0.6)" },
  orangeGem:  { primary: "#FF8800", glow: "rgba(255, 136, 0, 0.6)" },
  blueGem:    { primary: "#0088FF", glow: "rgba(0, 136, 255, 0.6)" },
  purpleGem:  { primary: "#AA00FF", glow: "rgba(170, 0, 255, 0.6)" },
  wild:       { primary: "#FFFFFF", glow: "rgba(255, 255, 255, 0.8)" },
};

export const STARBURST_RTP = 0.9609;
export const STARBURST_HOUSE_EDGE = 0.0391;
export const STARBURST_VOLATILITY = "LOW";
export const STARBURST_MAX_WIN = 500; // 500x stake
