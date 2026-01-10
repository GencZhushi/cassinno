/**
 * Mines Game
 * 
 * Grid: 5x5 (25 tiles)
 * User selects number of mines (1-24)
 * Reveal tiles, cashout anytime
 * Payout multiplier grows with each safe reveal
 * 
 * Multiplier calculation based on combinatorics:
 * After revealing k safe tiles from n total with m mines:
 * multiplier = (n choose k) / ((n-m) choose k) * (1 - houseEdge)
 */

import { generateUniqueRandomInts } from "../rng";

export const GRID_SIZE = 25; // 5x5 grid
export const MIN_MINES = 1;
export const MAX_MINES = 24;
export const MINES_HOUSE_EDGE = 0.01; // 1% house edge

export interface MinesState {
  minePositions: number[]; // Hidden from client
  revealedTiles: number[];
  mineCount: number;
  betAmount: bigint;
  currentMultiplier: number;
  gameOver: boolean;
  cashedOut: boolean;
  hitMine: boolean;
}

export interface MinesResult {
  tileIndex: number;
  isMine: boolean;
  gameOver: boolean;
  multiplier: number;
  payout: bigint;
  minePositions?: number[]; // Revealed on game over
}

/**
 * Calculate factorial (for small numbers)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate combinations (n choose k)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function combinations(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  
  // Use smaller k for efficiency
  if (k > n - k) k = n - k;
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Calculate multiplier for revealing k tiles with m mines
 * Formula: (n choose k) / ((n-m) choose k) * (1 - houseEdge)
 */
export function calculateMultiplier(
  mineCount: number,
  revealedCount: number,
  houseEdge: number = MINES_HOUSE_EDGE
): number {
  if (revealedCount === 0) return 1;
  
  const n = GRID_SIZE;
  const m = mineCount;
  const k = revealedCount;
  const safeTiles = n - m;
  
  if (k > safeTiles) return 0; // Can't reveal more than safe tiles
  
  // Probability of surviving k reveals
  // P = ((n-m)/n) * ((n-m-1)/(n-1)) * ... * ((n-m-k+1)/(n-k+1))
  let probability = 1;
  for (let i = 0; i < k; i++) {
    probability *= (safeTiles - i) / (n - i);
  }
  
  // Multiplier = 1/P * (1 - houseEdge)
  const rawMultiplier = 1 / probability;
  const adjustedMultiplier = rawMultiplier * (1 - houseEdge);
  
  // Round to 2 decimal places
  return Math.floor(adjustedMultiplier * 100) / 100;
}

/**
 * Calculate next multiplier (if next reveal is safe)
 */
export function calculateNextMultiplier(
  mineCount: number,
  currentRevealed: number,
  houseEdge: number = MINES_HOUSE_EDGE
): number {
  return calculateMultiplier(mineCount, currentRevealed + 1, houseEdge);
}

/**
 * Initialize a new mines game
 */
export function initializeMinesGame(
  mineCount: number,
  betAmount: bigint
): MinesState {
  if (mineCount < MIN_MINES || mineCount > MAX_MINES) {
    throw new Error(`Mine count must be between ${MIN_MINES} and ${MAX_MINES}`);
  }
  
  // Generate random mine positions
  const minePositions = generateUniqueRandomInts(0, GRID_SIZE - 1, mineCount);
  
  return {
    minePositions,
    revealedTiles: [],
    mineCount,
    betAmount,
    currentMultiplier: 1,
    gameOver: false,
    cashedOut: false,
    hitMine: false,
  };
}

/**
 * Reveal a tile
 */
export function revealTile(
  state: MinesState,
  tileIndex: number
): MinesResult {
  if (state.gameOver) {
    throw new Error("Game is already over");
  }
  
  if (tileIndex < 0 || tileIndex >= GRID_SIZE) {
    throw new Error("Invalid tile index");
  }
  
  if (state.revealedTiles.includes(tileIndex)) {
    throw new Error("Tile already revealed");
  }
  
  const isMine = state.minePositions.includes(tileIndex);
  
  if (isMine) {
    // Hit a mine - game over, lose bet
    return {
      tileIndex,
      isMine: true,
      gameOver: true,
      multiplier: 0,
      payout: BigInt(0),
      minePositions: state.minePositions,
    };
  }
  
  // Safe tile - update multiplier
  const newRevealedCount = state.revealedTiles.length + 1;
  const newMultiplier = calculateMultiplier(state.mineCount, newRevealedCount);
  const safeTilesRemaining = GRID_SIZE - state.mineCount - newRevealedCount;
  
  // Check if all safe tiles revealed (auto-cashout)
  const allSafeRevealed = safeTilesRemaining === 0;
  
  if (allSafeRevealed) {
    const payout = BigInt(Math.floor(Number(state.betAmount) * newMultiplier));
    return {
      tileIndex,
      isMine: false,
      gameOver: true,
      multiplier: newMultiplier,
      payout,
      minePositions: state.minePositions,
    };
  }
  
  return {
    tileIndex,
    isMine: false,
    gameOver: false,
    multiplier: newMultiplier,
    payout: BigInt(0), // No payout until cashout
  };
}

/**
 * Cash out current winnings
 */
export function cashOut(state: MinesState): {
  payout: bigint;
  multiplier: number;
  minePositions: number[];
} {
  if (state.gameOver) {
    throw new Error("Game is already over");
  }
  
  if (state.revealedTiles.length === 0) {
    throw new Error("Must reveal at least one tile before cashing out");
  }
  
  const multiplier = calculateMultiplier(state.mineCount, state.revealedTiles.length);
  const payout = BigInt(Math.floor(Number(state.betAmount) * multiplier));
  
  return {
    payout,
    multiplier,
    minePositions: state.minePositions,
  };
}

/**
 * Apply reveal to state (for server-side state management)
 */
export function applyReveal(state: MinesState, result: MinesResult): MinesState {
  if (result.isMine) {
    return {
      ...state,
      revealedTiles: [...state.revealedTiles, result.tileIndex],
      gameOver: true,
      hitMine: true,
      currentMultiplier: 0,
    };
  }
  
  return {
    ...state,
    revealedTiles: [...state.revealedTiles, result.tileIndex],
    currentMultiplier: result.multiplier,
    gameOver: result.gameOver,
    cashedOut: result.gameOver && !result.isMine && state.revealedTiles.length + 1 === GRID_SIZE - state.mineCount,
  };
}

/**
 * Apply cashout to state
 */
export function applyCashout(state: MinesState): MinesState {
  return {
    ...state,
    gameOver: true,
    cashedOut: true,
  };
}

/**
 * Get client-safe state (hide mine positions)
 */
export function getClientState(state: MinesState): Omit<MinesState, "minePositions"> & { minePositions?: number[] } {
  const { minePositions, ...rest } = state;
  
  if (state.gameOver) {
    return { ...rest, minePositions };
  }
  
  return rest;
}

/**
 * Serialize state for database storage
 */
export function serializeState(state: MinesState): string {
  return JSON.stringify(state, (_, value) =>
    typeof value === "bigint" ? value.toString() + "n" : value
  );
}

/**
 * Deserialize state from database
 */
export function deserializeState(json: string): MinesState {
  return JSON.parse(json, (_, value) => {
    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

// RTP for Mines: 99% (1% house edge)
export const MINES_RTP = 0.99;
