/**
 * Sweet Bonanza - 6x5 Candy Slot
 * - Pay Anywhere (Cluster Pays): 8+ matching symbols anywhere = win
 * - Tumble Feature: Winning symbols explode, new ones fall
 * - Free Spins: 4+ scatters = 10 free spins with multiplier bombs
 * - Multiplier Bombs: 2x-100x during free spins
 * 
 * RTP: ~96.5%
 */

export type CandySymbol =
  | "banana"      // Yellow banana
  | "grape"       // Purple grapes  
  | "watermelon"  // Watermelon slice
  | "plum"        // Purple plum
  | "apple"       // Red apple
  | "blueCandy"   // Blue wrapped candy (high)
  | "greenCandy"  // Green wrapped candy (high)
  | "purpleCandy" // Purple wrapped candy (high)
  | "redCandy"    // Red heart candy (highest)
  | "scatter";    // Lollipop scatter

export interface SweetBonanzaResult {
  grid: CandySymbol[][];        // 6 columns x 5 rows
  tumbles: TumbleResult[];      // All tumble sequences
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  isFreeSpinMode: boolean;
  totalMultiplier: number;
}

export interface TumbleResult {
  grid: CandySymbol[][];
  winningPositions: [number, number][];  // [col, row] pairs
  winningSymbol: CandySymbol | null;
  symbolCount: number;
  multiplier: number;
  win: bigint;
  multiplierBombs?: MultiplierBomb[];
}

export interface MultiplierBomb {
  position: [number, number];
  value: number;
}

// Symbol payouts based on count (8+, 10+, 12+, 15+, 20+)
// Values are multipliers of total bet
export const SYMBOL_PAYOUTS: Record<CandySymbol, [number, number, number, number, number]> = {
  banana:      [0.25, 0.5,  0.75, 1,    5],
  grape:       [0.25, 0.5,  0.75, 1,    5],
  watermelon:  [0.4,  0.6,  1,    1.5,  8],
  plum:        [0.4,  0.6,  1,    1.5,  8],
  apple:       [0.5,  0.8,  1.5,  2,    10],
  blueCandy:   [1,    2,    4,    6,    15],
  greenCandy:  [1.5,  3,    5,    8,    20],
  purpleCandy: [2,    4,    6,    10,   25],
  redCandy:    [5,    8,    12,   20,   50],
  scatter:     [0, 0, 0, 0, 0], // Scatter doesn't pay via clusters
};

// Min symbol count thresholds for payouts
export const COUNT_THRESHOLDS = [8, 10, 12, 15, 20];

// Symbol weights (higher = more common)
export const SYMBOL_WEIGHTS: Record<CandySymbol, number> = {
  banana:      20,
  grape:       20,
  watermelon:  18,
  plum:        18,
  apple:       15,
  blueCandy:   8,
  greenCandy:  6,
  purpleCandy: 4,
  redCandy:    2,
  scatter:     3,
};

// Free spin multiplier bomb values and weights
export const MULTIPLIER_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100];
export const MULTIPLIER_WEIGHTS = [30, 25, 20, 15, 12, 10, 8, 6, 4, 3, 2, 1, 0.5];

const GRID_COLS = 6;
const GRID_ROWS = 5;
const SCATTER_FOR_FREE_SPINS = 4;
const FREE_SPINS_COUNT = 10;
const FREE_SPINS_RETRIGGER = 5;

// Generate a random symbol based on weights
function getRandomSymbol(random: number, excludeScatter: boolean = false): CandySymbol {
  const symbols = Object.keys(SYMBOL_WEIGHTS) as CandySymbol[];
  const weights = symbols.map(s => excludeScatter && s === "scatter" ? 0 : SYMBOL_WEIGHTS[s]);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let threshold = random * totalWeight;
  for (let i = 0; i < symbols.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return symbols[i];
  }
  return symbols[0];
}

// Generate initial 6x5 grid
export function generateGrid(randomFn: () => number): CandySymbol[][] {
  const grid: CandySymbol[][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const column: CandySymbol[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      column.push(getRandomSymbol(randomFn()));
    }
    grid.push(column);
  }
  return grid;
}

// Count symbols on grid (excluding scatters from cluster pays)
function countSymbols(grid: CandySymbol[][]): Map<CandySymbol, [number, number][]> {
  const counts = new Map<CandySymbol, [number, number][]>();
  
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const symbol = grid[col][row];
      if (symbol !== "scatter") {
        if (!counts.has(symbol)) {
          counts.set(symbol, []);
        }
        counts.get(symbol)!.push([col, row]);
      }
    }
  }
  return counts;
}

// Get payout multiplier for symbol count
function getPayoutMultiplier(symbol: CandySymbol, count: number): number {
  const payouts = SYMBOL_PAYOUTS[symbol];
  for (let i = COUNT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= COUNT_THRESHOLDS[i]) {
      return payouts[i];
    }
  }
  return 0;
}

// Find winning clusters (8+ matching symbols)
function findWinningClusters(grid: CandySymbol[][]): { 
  symbol: CandySymbol; 
  positions: [number, number][]; 
  multiplier: number 
}[] {
  const symbolCounts = countSymbols(grid);
  const winners: { symbol: CandySymbol; positions: [number, number][]; multiplier: number }[] = [];
  
  symbolCounts.forEach((positions, symbol) => {
    if (positions.length >= 8) {
      const multiplier = getPayoutMultiplier(symbol, positions.length);
      if (multiplier > 0) {
        winners.push({ symbol, positions, multiplier });
      }
    }
  });
  
  return winners;
}

// Count scatters on grid
function countScatters(grid: CandySymbol[][]): { count: number; positions: [number, number][] } {
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

// Generate multiplier bombs for free spins
function generateMultiplierBombs(
  randomFn: () => number, 
  grid: CandySymbol[][]
): MultiplierBomb[] {
  const bombs: MultiplierBomb[] = [];
  const bombChance = 0.15; // 15% chance per cell during free spins
  
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (randomFn() < bombChance && grid[col][row] !== "scatter") {
        // Select multiplier value
        const totalWeight = MULTIPLIER_WEIGHTS.reduce((a, b) => a + b, 0);
        let threshold = randomFn() * totalWeight;
        let value = MULTIPLIER_VALUES[0];
        
        for (let i = 0; i < MULTIPLIER_VALUES.length; i++) {
          threshold -= MULTIPLIER_WEIGHTS[i];
          if (threshold <= 0) {
            value = MULTIPLIER_VALUES[i];
            break;
          }
        }
        
        bombs.push({ position: [col, row], value });
      }
    }
  }
  
  return bombs;
}

// Tumble: Remove winning symbols and drop new ones
function tumbleGrid(
  grid: CandySymbol[][], 
  winningPositions: [number, number][],
  randomFn: () => number
): CandySymbol[][] {
  const newGrid = grid.map(col => [...col]);
  
  // Mark positions to remove
  const toRemove = new Set(winningPositions.map(([c, r]) => `${c},${r}`));
  
  // Process each column
  for (let col = 0; col < GRID_COLS; col++) {
    // Get surviving symbols (from bottom to top)
    const survivors: CandySymbol[] = [];
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (!toRemove.has(`${col},${row}`)) {
        survivors.push(newGrid[col][row]);
      }
    }
    
    // Fill column from bottom with survivors, then new symbols
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const survivorIndex = GRID_ROWS - 1 - row;
      if (survivorIndex < survivors.length) {
        newGrid[col][row] = survivors[survivorIndex];
      } else {
        newGrid[col][row] = getRandomSymbol(randomFn());
      }
    }
  }
  
  return newGrid;
}

// Main game function - process a full spin with tumbles
export function playSweetBonanza(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  existingMultiplier: number = 1
): SweetBonanzaResult {
  const grid = generateGrid(randomFn);
  const tumbles: TumbleResult[] = [];
  let totalWin = BigInt(0);
  let freeSpinsWon = 0;
  let totalMultiplier = existingMultiplier;
  
  // Check for scatter free spins trigger (only on initial spin)
  const scatterResult = countScatters(grid);
  if (scatterResult.count >= SCATTER_FOR_FREE_SPINS && !isFreeSpinMode) {
    freeSpinsWon = FREE_SPINS_COUNT;
    if (scatterResult.count >= 5) freeSpinsWon += 5;
    if (scatterResult.count >= 6) freeSpinsWon += 5;
  } else if (scatterResult.count >= SCATTER_FOR_FREE_SPINS && isFreeSpinMode) {
    // Retrigger during free spins
    freeSpinsWon = FREE_SPINS_RETRIGGER;
  }
  
  // Scatter pay (based on total bet)
  if (scatterResult.count >= 4) {
    const scatterMultiplier = scatterResult.count === 4 ? 3 : 
                              scatterResult.count === 5 ? 5 : 100;
    totalWin += betAmount * BigInt(scatterMultiplier);
  }
  
  // Process tumbles
  let currentGrid = grid;
  let tumbleCount = 0;
  const maxTumbles = 50; // Safety limit
  
  while (tumbleCount < maxTumbles) {
    const clusters = findWinningClusters(currentGrid);
    
    if (clusters.length === 0) break;
    
    // Collect all winning positions
    const allWinningPositions: [number, number][] = [];
    let tumbleWin = BigInt(0);
    let multiplierBombs: MultiplierBomb[] = [];
    
    // Generate multiplier bombs during free spins
    if (isFreeSpinMode) {
      multiplierBombs = generateMultiplierBombs(randomFn, currentGrid);
      // Add bomb multipliers to total
      for (const bomb of multiplierBombs) {
        totalMultiplier += bomb.value;
      }
    }
    
    // Calculate wins for each cluster
    for (const cluster of clusters) {
      allWinningPositions.push(...cluster.positions);
      const clusterWin = BigInt(Math.floor(Number(betAmount) * cluster.multiplier));
      tumbleWin += clusterWin;
    }
    
    // Apply multiplier (only in free spins)
    const multipliedWin = isFreeSpinMode ? tumbleWin * BigInt(totalMultiplier) : tumbleWin;
    totalWin += multipliedWin;
    
    // Record tumble result
    tumbles.push({
      grid: currentGrid.map(col => [...col]),
      winningPositions: allWinningPositions,
      winningSymbol: clusters[0]?.symbol || null,
      symbolCount: clusters.reduce((sum, c) => sum + c.positions.length, 0),
      multiplier: isFreeSpinMode ? totalMultiplier : 1,
      win: multipliedWin,
      multiplierBombs: isFreeSpinMode ? multiplierBombs : undefined,
    });
    
    // Tumble the grid
    currentGrid = tumbleGrid(currentGrid, allWinningPositions, randomFn);
    tumbleCount++;
  }
  
  return {
    grid: tumbles.length > 0 ? tumbles[tumbles.length - 1].grid : grid,
    tumbles,
    totalWin,
    freeSpinsWon,
    scatterCount: scatterResult.count,
    isFreeSpinMode,
    totalMultiplier,
  };
}

// Serialize for JSON response
export function serializeSweetBonanzaResult(result: SweetBonanzaResult): object {
  return {
    ...result,
    totalWin: result.totalWin.toString(),
    tumbles: result.tumbles.map(t => ({
      ...t,
      win: t.win.toString(),
    })),
  };
}

// Symbol emoji mapping for frontend
export const SYMBOL_EMOJIS: Record<CandySymbol, string> = {
  banana:      "🍌",
  grape:       "🍇",
  watermelon:  "🍉",
  plum:        "🍑",
  apple:       "🍎",
  blueCandy:   "🔵",
  greenCandy:  "💚",
  purpleCandy: "💜",
  redCandy:    "❤️",
  scatter:     "🍭",
};

// Symbol display names
export const SYMBOL_NAMES: Record<CandySymbol, string> = {
  banana:      "Banana",
  grape:       "Grapes",
  watermelon:  "Watermelon",
  plum:        "Peach",
  apple:       "Apple",
  blueCandy:   "Blue Candy",
  greenCandy:  "Green Candy",
  purpleCandy: "Purple Candy",
  redCandy:    "Red Heart",
  scatter:     "Lollipop",
};

export const SWEET_BONANZA_RTP = 0.965;
export const SWEET_BONANZA_HOUSE_EDGE = 0.035;
