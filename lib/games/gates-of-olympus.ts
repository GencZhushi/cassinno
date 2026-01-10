/**
 * Gates of Olympus - 6x5 Greek Mythology Slot by Pragmatic Play Style
 * 
 * Theme: Greek mythology / Zeus / Mount Olympus
 * Core mechanics:
 * - Pay Anywhere (Cluster Pays): 8+ matching symbols anywhere = win
 * - Tumble Feature: Winning symbols explode, new ones fall from above
 * - Multiplier Orbs: Zeus can drop multiplier orbs (2x-500x) on any spin
 * - Free Spins: 4+ scatter triggers 15 free spins where multipliers accumulate
 * - Max Win: 5,000x stake
 * 
 * RTP: ~96.5%
 */

export type OlympusSymbol =
  | "blueCrown"     // Blue Crown - lowest
  | "greenCrown"    // Green Crown
  | "purpleCrown"   // Purple Crown
  | "redCrown"      // Red Crown
  | "blueGem"       // Blue Gem - medium
  | "greenGem"      // Green Gem
  | "purpleGem"     // Purple Gem
  | "yellowGem"     // Yellow Gem
  | "redGem"        // Red Gem - highest paying
  | "scatter";      // Zeus hand with lightning - scatter

export interface GatesOfOlympusResult {
  grid: OlympusSymbol[][];        // 6 columns x 5 rows
  tumbles: TumbleResult[];        // All tumble sequences
  totalWin: bigint;
  freeSpinsWon: number;
  scatterCount: number;
  isFreeSpinMode: boolean;
  totalMultiplier: number;
  zeusMultipliers: number[];      // Multiplier orbs that appeared
}

export interface TumbleResult {
  grid: OlympusSymbol[][];
  winningPositions: [number, number][];  // [col, row] pairs
  winningSymbol: OlympusSymbol | null;
  symbolCount: number;
  multiplier: number;
  win: bigint;
  multiplierOrbs?: MultiplierOrb[];
}

export interface MultiplierOrb {
  position: [number, number];
  value: number;
}

// Symbol payouts based on count (8+, 10+, 12+, 15+, 20+, 25+, 30)
// Values are multipliers of total bet
export const SYMBOL_PAYOUTS: Record<OlympusSymbol, number[]> = {
  blueCrown:   [0.25, 0.5,  1,    2,    4,    6,    10],
  greenCrown:  [0.25, 0.5,  1,    2,    4,    6,    10],
  purpleCrown: [0.3,  0.6,  1.2,  2.5,  5,    8,    12],
  redCrown:    [0.4,  0.8,  1.5,  3,    6,    10,   15],
  blueGem:     [1,    1.5,  3,    5,    10,   20,   30],
  greenGem:    [1.5,  2,    4,    7,    15,   25,   40],
  purpleGem:   [2,    3,    5,    10,   20,   35,   50],
  yellowGem:   [4,    5,    8,    15,   30,   50,   75],
  redGem:      [10,   12,   20,   40,   75,   100,  150],
  scatter:     [0, 0, 0, 0, 0, 0, 0], // Scatter doesn't pay via clusters
};

// Min symbol count thresholds for payouts
export const COUNT_THRESHOLDS = [8, 10, 12, 15, 20, 25, 30];

// Symbol weights (higher = more common)
export const SYMBOL_WEIGHTS: Record<OlympusSymbol, number> = {
  blueCrown:   22,
  greenCrown:  22,
  purpleCrown: 18,
  redCrown:    16,
  blueGem:     8,
  greenGem:    6,
  purpleGem:   4,
  yellowGem:   2.5,
  redGem:      1.5,
  scatter:     2.5,
};

// Zeus multiplier orb values and weights (can go up to 500x!)
export const MULTIPLIER_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500];
export const MULTIPLIER_WEIGHTS = [35, 28, 22, 18, 15, 12, 10, 7, 5, 3, 2, 1, 0.5, 0.15, 0.05];

const GRID_COLS = 6;
const GRID_ROWS = 5;
const SCATTER_FOR_FREE_SPINS = 4;
const FREE_SPINS_COUNT = 15;
const FREE_SPINS_RETRIGGER = 5;

// Generate a random symbol based on weights
function getRandomSymbol(random: number, excludeScatter: boolean = false): OlympusSymbol {
  const symbols = Object.keys(SYMBOL_WEIGHTS) as OlympusSymbol[];
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
export function generateGrid(randomFn: () => number): OlympusSymbol[][] {
  const grid: OlympusSymbol[][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const column: OlympusSymbol[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      column.push(getRandomSymbol(randomFn()));
    }
    grid.push(column);
  }
  return grid;
}

// Count symbols on grid (excluding scatters from cluster pays)
function countSymbols(grid: OlympusSymbol[][]): Map<OlympusSymbol, [number, number][]> {
  const counts = new Map<OlympusSymbol, [number, number][]>();
  
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
function getPayoutMultiplier(symbol: OlympusSymbol, count: number): number {
  const payouts = SYMBOL_PAYOUTS[symbol];
  for (let i = COUNT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= COUNT_THRESHOLDS[i]) {
      return payouts[i];
    }
  }
  return 0;
}

// Find winning clusters (8+ matching symbols)
function findWinningClusters(grid: OlympusSymbol[][]): { 
  symbol: OlympusSymbol; 
  positions: [number, number][]; 
  multiplier: number 
}[] {
  const symbolCounts = countSymbols(grid);
  const winners: { symbol: OlympusSymbol; positions: [number, number][]; multiplier: number }[] = [];
  
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
function countScatters(grid: OlympusSymbol[][]): { count: number; positions: [number, number][] } {
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

// Generate multiplier orbs from Zeus (can appear on ANY spin, not just free spins)
function generateMultiplierOrbs(
  randomFn: () => number, 
  grid: OlympusSymbol[][],
  isFreeSpinMode: boolean
): MultiplierOrb[] {
  const orbs: MultiplierOrb[] = [];
  // Higher chance during free spins, but can appear anytime
  const orbChance = isFreeSpinMode ? 0.20 : 0.08;
  
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (randomFn() < orbChance && grid[col][row] !== "scatter") {
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
        
        orbs.push({ position: [col, row], value });
      }
    }
  }
  
  return orbs;
}

// Tumble: Remove winning symbols and drop new ones
function tumbleGrid(
  grid: OlympusSymbol[][], 
  winningPositions: [number, number][],
  randomFn: () => number
): OlympusSymbol[][] {
  const newGrid = grid.map(col => [...col]);
  
  // Mark positions to remove
  const toRemove = new Set(winningPositions.map(([c, r]) => `${c},${r}`));
  
  // Process each column
  for (let col = 0; col < GRID_COLS; col++) {
    // Get surviving symbols (from bottom to top)
    const survivors: OlympusSymbol[] = [];
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
export function playGatesOfOlympus(
  betAmount: bigint,
  randomFn: () => number,
  isFreeSpinMode: boolean = false,
  existingMultiplier: number = 1
): GatesOfOlympusResult {
  const grid = generateGrid(randomFn);
  const tumbles: TumbleResult[] = [];
  let totalWin = BigInt(0);
  let freeSpinsWon = 0;
  let totalMultiplier = isFreeSpinMode ? existingMultiplier : 1;
  const allZeusMultipliers: number[] = [];
  
  // Check for scatter free spins trigger
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
    
    // Generate Zeus multiplier orbs
    const multiplierOrbs = generateMultiplierOrbs(randomFn, currentGrid, isFreeSpinMode);
    
    // In free spins, multipliers accumulate for the entire round
    // In base game, multipliers apply only to current tumble sequence
    if (isFreeSpinMode) {
      for (const orb of multiplierOrbs) {
        totalMultiplier += orb.value;
        allZeusMultipliers.push(orb.value);
      }
    } else {
      // Base game - multipliers only apply to current win
      for (const orb of multiplierOrbs) {
        allZeusMultipliers.push(orb.value);
      }
    }
    
    // Calculate wins for each cluster
    for (const cluster of clusters) {
      allWinningPositions.push(...cluster.positions);
      const clusterWin = BigInt(Math.floor(Number(betAmount) * cluster.multiplier));
      tumbleWin += clusterWin;
    }
    
    // Apply multiplier
    let currentOrbMultiplier = 1;
    if (!isFreeSpinMode && multiplierOrbs.length > 0) {
      currentOrbMultiplier = multiplierOrbs.reduce((sum, orb) => sum + orb.value, 0);
    }
    
    const multipliedWin = isFreeSpinMode 
      ? tumbleWin * BigInt(totalMultiplier) 
      : tumbleWin * BigInt(currentOrbMultiplier || 1);
    totalWin += multipliedWin;
    
    // Record tumble result
    tumbles.push({
      grid: currentGrid.map(col => [...col]),
      winningPositions: allWinningPositions,
      winningSymbol: clusters[0]?.symbol || null,
      symbolCount: clusters.reduce((sum, c) => sum + c.positions.length, 0),
      multiplier: isFreeSpinMode ? totalMultiplier : currentOrbMultiplier,
      win: multipliedWin,
      multiplierOrbs: multiplierOrbs.length > 0 ? multiplierOrbs : undefined,
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
    zeusMultipliers: allZeusMultipliers,
  };
}

// Serialize for JSON response
export function serializeGatesOfOlympusResult(result: GatesOfOlympusResult): object {
  return {
    ...result,
    totalWin: result.totalWin.toString(),
    tumbles: result.tumbles.map(t => ({
      ...t,
      win: t.win.toString(),
    })),
  };
}

// Symbol emoji mapping for frontend - Greek mythology themed
export const SYMBOL_EMOJIS: Record<OlympusSymbol, string> = {
  blueCrown:   "💎",     // Blue gem crown
  greenCrown:  "🔷",     // Green/teal crown
  purpleCrown: "🟣",     // Purple crown
  redCrown:    "🔴",     // Red crown
  blueGem:     "💠",     // Blue diamond gem
  greenGem:    "✳️",     // Green gem
  purpleGem:   "🔮",     // Purple crystal gem
  yellowGem:   "👑",     // Gold/yellow crown gem
  redGem:      "❤️‍🔥",   // Red premium gem (fire heart)
  scatter:     "⚡",     // Lightning bolt scatter
};

// Symbol display names
export const SYMBOL_NAMES: Record<OlympusSymbol, string> = {
  blueCrown:   "Blue Crown",
  greenCrown:  "Green Crown",
  purpleCrown: "Purple Crown",
  redCrown:    "Red Crown",
  blueGem:     "Sapphire Gem",
  greenGem:    "Emerald Gem",
  purpleGem:   "Amethyst Gem",
  yellowGem:   "Golden Chalice",
  redGem:      "Ruby Ring",
  scatter:     "Zeus Lightning",
};

export const GATES_OF_OLYMPUS_RTP = 0.965;
export const GATES_OF_OLYMPUS_HOUSE_EDGE = 0.035;
