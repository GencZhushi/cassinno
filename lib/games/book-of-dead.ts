/**
 * Book of Dead - Classic Egyptian Adventure Slot (Play'n GO Style)
 * 
 * Theme: Ancient Egypt / Rich Wilde expedition / Dusty tombs / Golden relics
 * Core mechanics:
 * - 5 reels × 3 rows with 10 paylines
 * - Book symbol acts as both Wild AND Scatter
 * - 3+ Scatters trigger 10 Free Spins
 * - Expanding Symbol feature: Random symbol chosen at free spin start
 *   expands to fill entire reels for massive wins
 * - Free spins can retrigger
 * - Max Win: 5,000x stake
 * 
 * RTP: ~96.21%
 */

export type BookOfDeadSymbol =
  | "ten"         // 10 - lowest
  | "jack"        // J
  | "queen"       // Q
  | "king"        // K
  | "ace"         // A
  | "scarab"      // Scarab beetle - medium
  | "anubis"      // Anubis - high
  | "horus"       // Horus - high
  | "pharaoh"     // Pharaoh - high
  | "richWilde"   // Rich Wilde - highest regular symbol
  | "book";       // Book of Dead - Wild & Scatter

export interface BookOfDeadResult {
  reels: BookOfDeadSymbol[][];      // 5 columns x 3 rows
  displayReels: BookOfDeadSymbol[][];  // After expanding symbol applied
  winningLines: WinLine[];
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  scatterPositions: [number, number][];
  isFreeSpinMode: boolean;
  expandingSymbol: BookOfDeadSymbol | null;
  expandedReels: number[];          // Which reels had expanding symbols
}

export interface WinLine {
  lineNumber: number;
  symbol: BookOfDeadSymbol;
  count: number;
  positions: [number, number][];    // [reel, row] pairs
  payout: number;
  win: bigint;
}

// 10 Classic paylines (left to right)
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],  // Line 1: Middle row
  [0, 0, 0, 0, 0],  // Line 2: Top row
  [2, 2, 2, 2, 2],  // Line 3: Bottom row
  [0, 1, 2, 1, 0],  // Line 4: V shape
  [2, 1, 0, 1, 2],  // Line 5: Inverted V
  [0, 0, 1, 2, 2],  // Line 6: Ascending stairs
  [2, 2, 1, 0, 0],  // Line 7: Descending stairs
  [1, 0, 0, 0, 1],  // Line 8: U shape top
  [1, 2, 2, 2, 1],  // Line 9: U shape bottom
  [1, 0, 1, 0, 1],  // Line 10: Zigzag
];

// Symbol payouts: [3 of kind, 4 of kind, 5 of kind] multipliers of line bet
export const SYMBOL_PAYOUTS: Record<BookOfDeadSymbol, number[]> = {
  ten:        [5, 25, 100],
  jack:       [5, 25, 100],
  queen:      [5, 25, 100],
  king:       [5, 40, 150],
  ace:        [5, 40, 150],
  scarab:     [5, 40, 200],
  anubis:     [5, 30, 200],
  horus:      [5, 40, 400],
  pharaoh:    [10, 100, 750],
  richWilde:  [10, 100, 500],
  book:       [0, 0, 0],  // Book doesn't pay on lines, only as scatter
};

// Scatter payouts (based on total bet)
export const SCATTER_PAYOUTS: Record<number, number> = {
  3: 2,     // 3 books = 2x total bet
  4: 20,    // 4 books = 20x total bet
  5: 200,   // 5 books = 200x total bet
};

// Symbol weights for reel generation (higher = more common)
export const SYMBOL_WEIGHTS: Record<BookOfDeadSymbol, number> = {
  ten:        18,
  jack:       18,
  queen:      16,
  king:       14,
  ace:        12,
  scarab:     10,
  anubis:     8,
  horus:      6,
  pharaoh:    4,
  richWilde:  3,
  book:       3.5,
};

// Free spin weights - slightly more generous
export const FREE_SPIN_WEIGHTS: Record<BookOfDeadSymbol, number> = {
  ten:        16,
  jack:       16,
  queen:      14,
  king:       12,
  ace:        10,
  scarab:     10,
  anubis:     9,
  horus:      7,
  pharaoh:    5,
  richWilde:  4,
  book:       4,
};

const REELS = 5;
const ROWS = 3;
const FREE_SPINS_COUNT = 10;

// Expandable symbols (all regular paying symbols can be chosen)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EXPANDABLE_SYMBOLS: BookOfDeadSymbol[] = [
  "ten", "jack", "queen", "king", "ace", 
  "scarab", "anubis", "horus", "pharaoh", "richWilde"
];

// Get random symbol based on weights
function getRandomSymbol(
  random: number, 
  weights: Record<BookOfDeadSymbol, number>
): BookOfDeadSymbol {
  const symbols = Object.keys(weights) as BookOfDeadSymbol[];
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
  isFreeSpinMode: boolean = false
): BookOfDeadSymbol[][] {
  const weights = isFreeSpinMode ? FREE_SPIN_WEIGHTS : SYMBOL_WEIGHTS;
  const reels: BookOfDeadSymbol[][] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    const column: BookOfDeadSymbol[] = [];
    for (let row = 0; row < ROWS; row++) {
      column.push(getRandomSymbol(randomFn(), weights));
    }
    reels.push(column);
  }
  return reels;
}

// Count scatter symbols (Book of Dead)
function countScatters(reels: BookOfDeadSymbol[][]): { 
  count: number; 
  positions: [number, number][] 
} {
  const positions: [number, number][] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      if (reels[reel][row] === "book") {
        positions.push([reel, row]);
      }
    }
  }
  return { count: positions.length, positions };
}

// Select random expanding symbol for free spins
function selectExpandingSymbol(randomFn: () => number): BookOfDeadSymbol {
  // Weight towards higher-paying symbols for more exciting free spins
  const expandWeights: Record<BookOfDeadSymbol, number> = {
    ten:        5,
    jack:       5,
    queen:      8,
    king:       10,
    ace:        12,
    scarab:     15,
    anubis:     15,
    horus:      15,
    pharaoh:    10,
    richWilde:  5,
    book:       0,  // Book can't be expanding symbol
  };
  
  return getRandomSymbol(randomFn(), expandWeights);
}

// Apply expanding symbol to reels - symbol expands to fill entire reel
function applyExpandingSymbol(
  reels: BookOfDeadSymbol[][],
  expandingSymbol: BookOfDeadSymbol
): { expandedReels: BookOfDeadSymbol[][]; expandedReelIndices: number[] } {
  const expandedReels = reels.map(reel => [...reel]);
  const expandedReelIndices: number[] = [];
  
  for (let reel = 0; reel < REELS; reel++) {
    // Check if this reel contains the expanding symbol (or Book which acts as wild)
    const hasExpandingSymbol = reels[reel].some(
      s => s === expandingSymbol || s === "book"
    );
    
    if (hasExpandingSymbol) {
      // Expand: Fill entire reel with the expanding symbol
      for (let row = 0; row < ROWS; row++) {
        // Keep books as-is for scatter wins, but they count as the expanding symbol for line wins
        if (expandedReels[reel][row] !== "book") {
          expandedReels[reel][row] = expandingSymbol;
        }
      }
      expandedReelIndices.push(reel);
    }
  }
  
  return { expandedReels, expandedReelIndices };
}

// Check winning lines
function checkWinningLines(
  reels: BookOfDeadSymbol[][],
  lineBet: bigint,
  expandingSymbol: BookOfDeadSymbol | null
): WinLine[] {
  const winningLines: WinLine[] = [];
  
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const line = PAYLINES[lineIndex];
    const positions: [number, number][] = [];
    
    // Get symbols on this line
    const lineSymbols: BookOfDeadSymbol[] = [];
    for (let reel = 0; reel < REELS; reel++) {
      const row = line[reel];
      lineSymbols.push(reels[reel][row]);
      positions.push([reel, row]);
    }
    
    // Find the first non-wild symbol (Book is wild)
    let baseSymbol: BookOfDeadSymbol | null = null;
    for (const sym of lineSymbols) {
      if (sym !== "book") {
        baseSymbol = sym;
        break;
      }
    }
    
    // If all wilds, use the highest paying wild combination
    if (baseSymbol === null) {
      baseSymbol = "richWilde"; // Treat all-wild line as Rich Wilde
    }
    
    // Count consecutive matching symbols from left (wilds match anything)
    let matchCount = 0;
    const matchedPositions: [number, number][] = [];
    
    for (let reel = 0; reel < REELS; reel++) {
      const sym = lineSymbols[reel];
      // Book (wild) matches everything, or symbol matches base
      // During free spins, expanding symbol on expanded reels also counts
      const isMatch = sym === "book" || 
                      sym === baseSymbol || 
                      (expandingSymbol && sym === expandingSymbol && baseSymbol === expandingSymbol);
      
      if (isMatch) {
        matchCount++;
        matchedPositions.push(positions[reel]);
      } else {
        break; // Must be consecutive from left
      }
    }
    
    // Need at least 3 matching symbols for a win
    if (matchCount >= 3) {
      const payoutIndex = matchCount - 3; // 0 for 3, 1 for 4, 2 for 5
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
export function playBookOfDead(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  existingExpandingSymbol: BookOfDeadSymbol | null = null
): BookOfDeadResult {
  // Generate base reels
  const reels = generateReels(randomFn, isFreeSpinMode);
  
  // Check for scatters
  const scatterResult = countScatters(reels);
  let freeSpinsWon = 0;
  
  // 3+ scatters trigger/retrigger free spins
  if (scatterResult.count >= 3) {
    freeSpinsWon = FREE_SPINS_COUNT;
  }
  
  // Calculate scatter wins
  let totalWin = BigInt(0);
  if (scatterResult.count >= 3) {
    const scatterMultiplier = SCATTER_PAYOUTS[scatterResult.count] || 0;
    totalWin += betAmount * BigInt(scatterMultiplier);
  }
  
  // Handle expanding symbol for free spins
  let expandingSymbol = existingExpandingSymbol;
  let displayReels = reels;
  let expandedReels: number[] = [];
  
  if (isFreeSpinMode) {
    // If starting free spins (no existing expanding symbol), select one
    if (!expandingSymbol) {
      expandingSymbol = selectExpandingSymbol(randomFn);
    }
    
    // Apply expanding symbol
    const expanded = applyExpandingSymbol(reels, expandingSymbol);
    displayReels = expanded.expandedReels;
    expandedReels = expanded.expandedReelIndices;
  }
  
  // Calculate line bet (total bet / 10 lines)
  const lineBet = betAmount / BigInt(10);
  
  // Check winning lines (use display reels which have expansion applied)
  const winningLines = checkWinningLines(displayReels, lineBet, expandingSymbol);
  
  // Sum line wins
  for (const line of winningLines) {
    totalWin += line.win;
  }
  
  return {
    reels,
    displayReels,
    winningLines,
    totalWin,
    freeSpinsWon,
    scatterCount: scatterResult.count,
    scatterPositions: scatterResult.positions,
    isFreeSpinMode,
    expandingSymbol: isFreeSpinMode ? expandingSymbol : null,
    expandedReels,
  };
}

// Serialize for JSON response
export function serializeBookOfDeadResult(result: BookOfDeadResult): object {
  return {
    ...result,
    totalWin: result.totalWin.toString(),
    winningLines: result.winningLines.map(line => ({
      ...line,
      win: line.win.toString(),
    })),
  };
}

// Symbol emoji mapping - Egyptian theme
export const SYMBOL_EMOJIS: Record<BookOfDeadSymbol, string> = {
  ten:        "🔟",
  jack:       "🃏",
  queen:      "👸",
  king:       "🤴",
  ace:        "🅰️",
  scarab:     "🪲",
  anubis:     "🐺",
  horus:      "🦅",
  pharaoh:    "👑",
  richWilde:  "🤠",
  book:       "📖",
};

// Symbol display names
export const SYMBOL_NAMES: Record<BookOfDeadSymbol, string> = {
  ten:        "Ten",
  jack:       "Jack",
  queen:      "Queen",
  king:       "King",
  ace:        "Ace",
  scarab:     "Scarab",
  anubis:     "Anubis",
  horus:      "Horus",
  pharaoh:    "Pharaoh",
  richWilde:  "Rich Wilde",
  book:       "Book of Dead",
};

export const BOOK_OF_DEAD_RTP = 0.9621;
export const BOOK_OF_DEAD_HOUSE_EDGE = 0.0379;
